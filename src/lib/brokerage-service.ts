'use client';

import {
  Firestore,
  collection,
  doc,
  Timestamp,
} from 'firebase/firestore';
import type { Trade } from './types';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';

export type MarketData = {
  price: number;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
};

const FXAPI_BASE_URL = 'https://api.fxapi.com/v1';
const API_KEY = process.env.NEXT_PUBLIC_FXAPI_KEY; 

/**
 * Fetches live market data for gold (XAU/USD) from FxApi.
 */
export async function getMarketData(): Promise<MarketData> {
  // This is a simplified example. FxApi might have a different structure.
  // We'll simulate trend analysis based on recent price movement.
  try {
    const response = await fetch(`${FXAPI_BASE_URL}/latest?symbols=XAUUSD&api_key=${API_KEY}`);
    if (!response.ok) {
        throw new Error('Failed to fetch market data from FxApi');
    }
    const data = await response.json();
    const price = data.quotes.XAUUSD.price;

    // Simple trend simulation based on price - replace with real analysis
    const trendRoll = Math.random();
    const trend = trendRoll < 0.4 ? 'UP' : trendRoll < 0.8 ? 'DOWN' : 'SIDEWAYS';

    return { price, trend };
  } catch (error) {
    console.error("Error fetching market data:", error);
    // Fallback to mock data on error
    return { price: 1950 + Math.random() * 20 - 10, trend: 'SIDEWAYS' };
  }
}

/**
 * Places a new trade using FxApi.
 * It creates a new "OPEN" trade in Firestore and simulates a brokerage call.
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
  }
): Promise<string> {
    // In a real scenario, you would first call the FxApi here to open the position.
    // const brokerageResponse = await fetch(`${FXAPI_BASE_URL}/trade`, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ instrument: tradeDetails.symbol, units: tradeDetails.volume, side: tradeDetails.type })
    // });
    // if (!brokerageResponse.ok) throw new Error('Failed to place trade with brokerage.');
    // const brokerageTrade = await brokerageResponse.json();
    
    // For now, we immediately write to Firestore as before.
    const tradesCollection = collection(firestore, 'users', userId, 'tradingAccounts', tradingAccountId, 'trades');
    const newTradeRef = doc(tradesCollection);

    const newTrade: Trade = {
        id: newTradeRef.id,
        // brokerageId: brokerageTrade.id, // Store the ID from the broker
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
 * Closes an existing trade using FxApi.
 * It updates the trade's status and profit in Firestore.
 */
export function closeTrade(
    firestore: Firestore,
    userId: string,
    tradingAccountId: string,
    tradeId: string,
    exitPrice: number,
    profit: number
) {
    // In a real scenario, you would call FxApi to close the position.
    // await fetch(`${FXAPI_BASE_URL}/trade/${trade.brokerageId}/close`, { method: 'PUT', ... });
    
    const tradeRef = doc(firestore, 'users', userId, 'tradingAccounts', tradingAccountId, 'trades', tradeId);
    
    const tradeStatus = profit >= 0 ? 'WON' : 'LOST';

    updateDocumentNonBlocking(tradeRef, {
        exitPrice,
        profit,
        status: tradeStatus,
    });
}
