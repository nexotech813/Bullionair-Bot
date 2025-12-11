'use server';
/**
 * @fileOverview This flow simulates one cycle of the trading bot's heartbeat.
 * It calls the decision flow, logs the reasoning, and executes the trade if necessary.
 */

import { ai } from '@/ai/genkit';
import { tradingDecisionFlow } from './trading-decision-flow';
import type { TradingDecisionInput } from '@/lib/types';
import { Firestore, collection, doc, addDoc } from 'firebase/firestore';
import { getMarketData, placeTrade, closeTrade } from '@/lib/brokerage-service';
import { getSdks, addDocumentNonBlocking } from '@/firebase';
import { z } from 'zod';

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
    await logActivity(firestore, tradingAccountId, user.uid, 'Analyzing market data and account status...');

    // 2. Call the AI to make a decision
    const decisionResult = await tradingDecisionFlow(input);
    const { decision, reasoning, tradeDetails } = decisionResult;

    // 3. Log the AI's reasoning
    await logActivity(firestore, tradingAccountId, user.uid, `AI Decision: ${decision}. Reasoning: ${reasoning}`, 'SIGNAL');

    // 4. Execute the decision
    switch (decision) {
      case 'OPEN_BUY':
      case 'OPEN_SELL':
        if (tradeDetails && tradeDetails.volume && tradeDetails.confidenceLevel) {
          const marketData = await getMarketData();
          await placeTrade(firestore, user.uid, tradingAccountId, {
            symbol: 'XAUUSD',
            type: decision === 'OPEN_BUY' ? 'BUY' : 'SELL',
            volume: tradeDetails.volume,
            entryPrice: marketData.price,
            confidenceLevel: tradeDetails.confidenceLevel,
            stopLoss: tradeDetails.stopLoss,
            takeProfit: tradeDetails.takeProfit,
          });
          await logActivity(firestore, tradingAccountId, user.uid, `EXECUTION: Placed ${decision} order for ${tradeDetails.volume} lots. SL: ${tradeDetails.stopLoss}, TP: ${tradeDetails.takeProfit}`, 'RESULT');
        } else {
            await logActivity(firestore, tradingAccountId, user.uid, `WARNING: AI decided to open but provided no details.`, 'UPDATE');
        }
        break;

      case 'CLOSE':
        if (openTrade) {
          const marketData = await getMarketData();
          const profit = (marketData.price - openTrade.entryPrice) * (openTrade.type === 'SELL' ? -1 : 1) * openTrade.volume * 100;
          await closeTrade(firestore, user.uid, tradingAccountId, openTrade.id, marketData.price, profit);
          await logActivity(firestore, tradingAccountId, user.uid, `EXECUTION: Closed trade for P/L: $${profit.toFixed(2)}`, 'RESULT');
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
