'use client';

import {
  Firestore,
  collection,
  doc,
  Timestamp,
} from 'firebase/firestore';
import type { Trade } from './types';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { EMA, RSI, ATR } from 'technicalindicators';


export type MarketData = {
  price: number;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
};

// Represents full technical indicator data
export type TechnicalIndicators = {
  price: number;
  ema9: number;
  ema21: number;
  rsi: number;
  atr: number;
}

const FXAPI_BASE_URL = 'https://api.fxapi.com/v1';
const API_KEY = "fxa_live_eafS87WotvTRRcyImLduqpdAWNXttUIxYmrLDkbM"; 

// The local address where your MT5 Bridge / Expert Advisor would be listening for commands.
const MT5_BRIDGE_URL = 'http://localhost:8000';

async function getHistoricalData(symbol: string, interval: string, count: number): Promise<any[]> {
    const url = `${FXAPI_BASE_URL}/timeseries?symbol=${symbol}&interval=${interval}&count=${count}&api_key=${API_KEY}`;
    const response = await fetch(url, { cache: 'no-store' }); // Ensure fresh data
    if (!response.ok) {
        throw new Error(`Failed to fetch historical data from FxApi: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data || [];
}

/**
 * Fetches live market data and calculates technical indicators.
 * This now uses real data from FxApi and the 'technicalindicators' library.
 */
export async function getTechnicalIndicators(): Promise<TechnicalIndicators> {
    try {
        // Fetch the last 100 1-minute candles to have enough data for calculations
        const historicalData = await getHistoricalData('XAUUSD', '1m', 100);

        if (historicalData.length < 21) { // Need at least 21 periods for the longest EMA
            throw new Error('Not enough historical data to calculate indicators.');
        }

        // FxApi returns [timestamp, open, high, low, close]
        const closePrices = historicalData.map(d => d[4]);
        const highPrices = historicalData.map(d => d[2]);
        const lowPrices = historicalData.map(d => d[3]);
        
        const latestPrice = closePrices[closePrices.length - 1];

        // Calculate Indicators
        const ema9Values = EMA.calculate({ period: 9, values: closePrices });
        const ema21Values = EMA.calculate({ period: 21, values: closePrices });
        const rsiValues = RSI.calculate({ period: 14, values: closePrices });
        const atrValues = ATR.calculate({
            period: 14,
            high: highPrices,
            low: lowPrices,
            close: closePrices,
        });

        return {
            price: parseFloat(latestPrice.toFixed(2)),
            ema9: parseFloat(ema9Values[ema9Values.length - 1].toFixed(2)),
            ema21: parseFloat(ema21Values[ema21Values.length - 1].toFixed(2)),
            rsi: parseFloat(rsiValues[rsiValues.length - 1].toFixed(2)),
            atr: parseFloat(atrValues[atrValues.length - 1].toFixed(2)),
        };

    } catch (error) {
        console.error("Critical Error in getTechnicalIndicators:", error);
        // Fallback to prevent crashing the entire bot loop, but this indicates a serious problem.
        // In a real production system, you might want to send an alert here.
        return { price: 0, ema9: 0, ema21: 0, rsi: 50, atr: 0 };
    }
}


/**
 * Places a new trade by sending a request to the local MT5 bridge.
 * It also creates a new "OPEN" trade in Firestore to track it.
 */
export async function placeTrade(
  firestore: Firestore,
  userId: string,
  tradingAccountId: string,
  tradeDetails: {
    symbol: string;
    type: 'BUY' | 'SELL';
    volume: number;
    entryPrice: number;
    confidenceLevel: string;
    stopLoss?: number;
    takeProfit?: number;
  }
): Promise<string> {
    console.log(`Sending trade to MT5 Bridge: ${tradeDetails.type} ${tradeDetails.volume} lots of ${tradeDetails.symbol}`);

    const response = await fetch(`${MT5_BRIDGE_URL}/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          action: 'OPEN',
          symbol: tradeDetails.symbol, 
          volume: tradeDetails.volume, 
          type: tradeDetails.type,
          stopLoss: tradeDetails.stopLoss,
          takeProfit: tradeDetails.takeProfit,
      })
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to place trade via MT5 bridge:", errorText);
        throw new Error('Failed to place trade with brokerage. Ensure the MT5 bridge is running.');
    }
    
    // Assuming the bridge returns the brokerage trade ID
    const brokerageResponse = await response.json();
    const brokerageTradeId = brokerageResponse.ticketId;
    
    // Now, log this trade in Firestore
    const tradesCollection = collection(firestore, 'users', userId, 'tradingAccounts', tradingAccountId, 'trades');
    const newTradeRef = doc(tradesCollection);

    const newTrade: Trade = {
        id: newTradeRef.id,
        // brokerageId: brokerageTradeId, // Store the ID from the broker
        tradingAccountId,
        timestamp: new Date().toISOString(),
        status: 'OPEN',
        ...tradeDetails,
        profit: 0,
    };

    setDocumentNonBlocking(newTradeRef, newTrade, { merge: false });
    return newTradeRef.id;
}


/**
 * Closes an existing trade by sending a request to the local MT5 bridge.
 * It updates the trade's status and profit in Firestore.
 */
export async function closeTrade(
    firestore: Firestore,
    userId: string,
    tradingAccountId: string,
    trade: Trade, // Pass the whole trade object
    exitPrice: number,
    profit: number
) {
    console.log(`Sending close signal to MT5 Bridge for trade ID: ${trade.id}`);

    // Call the MT5 bridge to close the position.
    // The bridge would need to know which trade to close, e.g., by its brokerageId/ticketId.
    const response = await fetch(`${MT5_BRIDGE_URL}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'CLOSE',
            // ticketId: trade.brokerageId, // You'd pass the ticket ID here
            symbol: trade.symbol,
            volume: trade.volume
        })
    });
     if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to close trade via MT5 bridge:", errorText);
        throw new Error('Failed to close trade with brokerage. Ensure the MT5 bridge is running.');
    }
    
    const tradeRef = doc(firestore, 'users', userId, 'tradingAccounts', tradingAccountId, 'trades', trade.id);
    
    const tradeStatus = profit >= 0 ? 'WON' : 'LOST';

    updateDocumentNonBlocking(tradeRef, {
        exitPrice,
        profit,
        status: tradeStatus,
    });
}
