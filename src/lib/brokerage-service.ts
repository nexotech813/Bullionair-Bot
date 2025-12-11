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

const FXAPI_DATA_URL = 'https://api.fxapi.com/v1';
const API_KEY = "fxa_live_eafS87WotvTRRcyImLduqpdAWNXttUIxYmrLDkbM"; 

// The local address where your MT5 Bridge / Expert Advisor would be listening for commands.
const MT5_BRIDGE_URL = 'http://localhost:8000';


/**
 * Fetches live market data for gold (XAU/USD) from FxApi.
 */
export async function getMarketData(): Promise<MarketData> {
  try {
    const response = await fetch(`${FXAPI_DATA_URL}/latest?symbol=XAUUSD&api_key=${API_KEY}`);
    if (!response.ok) {
        console.warn('Failed to fetch market data from FxApi, using mock data.');
        return { price: 1950 + Math.random() * 20 - 10, trend: 'SIDEWAYS' };
    }
    const data = await response.json();
    // FxApi might return price under a different structure, adjust if necessary
    const price = data.quotes?.XAUUSD?.price || data.price;
    if (!price) {
        throw new Error("Price not found in FxApi response.")
    }

    // Simple trend simulation - in a real app, you'd use a more robust trend analysis
    const trendRoll = Math.random();
    const trend = trendRoll < 0.4 ? 'UP' : trendRoll < 0.8 ? 'DOWN' : 'SIDEWAYS';

    return { price, trend };
  } catch (error) {
    console.error("Error fetching market data:", error);
    // Fallback to mock data on error to prevent crashes
    return { price: 1950 + Math.random() * 20 - 10, trend: 'SIDEWAYS' };
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
