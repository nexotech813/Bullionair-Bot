'use server';
/**
 * @fileOverview This flow simulates one cycle of the trading bot's heartbeat.
 * It calls the decision flow, logs the reasoning, and executes the trade if necessary.
 */

import { ai } from '@/ai/genkit';
import { tradingDecisionFlow } from './trading-decision-flow';
import type { Trade, TradingDecisionInput } from '@/lib/types';
import { Firestore, collection, doc } from 'firebase/firestore';
import { getTechnicalIndicators, placeTradeInFirestore, closeTradeInFirestore } from '@/lib/brokerage-service';
import { getSdks, addDocumentNonBlocking } from '@/firebase';
import { z } from 'zod';
import { sendTradeCommand } from '@/lib/command-queue';

async function logActivity(firestore: Firestore, tradingAccountId: string, userId: string, message: string, type: 'ANALYSIS' | 'SIGNAL' | 'RESULT' | 'UPDATE' = 'ANALYSIS') {
    const activitiesCollection = collection(firestore, 'users', userId, 'tradingAccounts', tradingAccountId, 'botActivities');
    const activityRef = doc(activitiesCollection);
    addDocumentNonBlocking(activitiesCollection, {
        id: activityRef.id,
        message,
        timestamp: new Date().toISOString(),
        type,
    });
}

// This is a wrapper flow that orchestrates the decision and execution.
export const runTradingCycleFlow = ai.defineFlow(
  {
    name: 'runTradingCycleFlow',
    inputSchema: z.any(),
    outputSchema: z.void(),
  },
  async (input: TradingDecisionInput) => {
    const { firestore } = getSdks();
    const { tradingAccountId, user, openTrade } = input;
    
    // 1. Log that we are starting the analysis
    await logActivity(firestore, tradingAccountId, user.uid, 'Analyzing market data...');

    // 2. Call the AI to make a decision
    const decisionResult = await tradingDecisionFlow(input);
    const { decision, reasoning, tradeDetails } = decisionResult;

    // 3. Log the AI's reasoning
    await logActivity(firestore, tradingAccountId, user.uid, `AI Decision: ${decision}. Reasoning: ${reasoning}`, 'SIGNAL');

    // 4. Execute the decision
    switch (decision) {
      case 'OPEN_BUY':
      case 'OPEN_SELL':
        if (tradeDetails && tradeDetails.volume && tradeDetails.confidenceLevel && tradeDetails.stopLoss && tradeDetails.takeProfit) {
          // A. Log the trade in Firestore immediately with 'OPEN' status
          const marketData = await getTechnicalIndicators();
          const newTradeId = await placeTradeInFirestore(firestore, user.uid, tradingAccountId, {
            symbol: 'XAUUSD',
            type: decision === 'OPEN_BUY' ? 'BUY' : 'SELL',
            volume: tradeDetails.volume,
            entryPrice: marketData.price, // This is an estimate, bridge should confirm final price
            confidenceLevel: tradeDetails.confidenceLevel,
            stopLoss: tradeDetails.stopLoss,
            takeProfit: tradeDetails.takeProfit,
          });

          // B. Send command to Firestore for the bridge to execute
          sendTradeCommand(firestore, {
              action: 'OPEN',
              details: {
                  symbol: 'XAUUSD',
                  volume: tradeDetails.volume,
                  type: decision === 'OPEN_BUY' ? 'BUY' : 'SELL',
                  stopLoss: tradeDetails.stopLoss,
                  takeProfit: tradeDetails.takeProfit,
              }
          });
          await logActivity(firestore, tradingAccountId, user.uid, `EXECUTION: Sent ${decision} command to queue. SL: ${tradeDetails.stopLoss}, TP: ${tradeDetails.takeProfit}`, 'RESULT');
        } else {
            await logActivity(firestore, tradingAccountId, user.uid, `WARNING: AI decided to open but provided incomplete details.`, 'UPDATE');
        }
        break;

      case 'CLOSE':
        if (openTrade) {
          // A. Update trade in Firestore
          const marketData = await getTechnicalIndicators();
          const profit = (marketData.price - openTrade.entryPrice) * (openTrade.type === 'SELL' ? -1 : 1) * openTrade.volume * 100;
          await closeTradeInFirestore(firestore, user.uid, tradingAccountId, openTrade, marketData.price, profit);

          // B. Send command to Firestore for the bridge to execute
          sendTradeCommand(firestore, {
              action: 'CLOSE',
              details: {
                  ticketId: openTrade.id, // The bridge will need to map this to its internal ticket ID
              }
          });
          await logActivity(firestore, tradingAccountId, user.uid, `EXECUTION: Sent CLOSE command for trade ${openTrade.id}. Estimated P/L: $${profit.toFixed(2)}`, 'RESULT');
        } else {
            await logActivity(firestore, tradingAccountId, user.uid, `WARNING: AI decided to close but there was no open trade.`, 'UPDATE');
        }
        break;

      case 'WAIT':
        // No action needed, the reasoning is already logged.
        break;
    }
  }
);
