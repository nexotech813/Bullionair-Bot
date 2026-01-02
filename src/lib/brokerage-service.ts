'use client';

import {
  Firestore,
  collection,
  doc,
} from 'firebase/firestore';
import type { Trade } from './types';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
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
// API KEY is now read from server-side environment variables, not here.

async function getHistoricalData(symbol: string, interval: string, count: number): Promise<any[]> {
    const url = `${FXAPI_BASE_URL}/timeseries?symbol=${symbol}&interval=${interval}&count=${count}&apikey=${process.env.FXAPI_KEY}`;
    const response = await fetch(url, { cache: 'no-store' }); // Ensure fresh data
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch historical data from FxApi: ${response.statusText}`, errorText);
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
        const historicalData = await getHistoricalData('XAUUSD', '1m', 100);

        if (historicalData.length < 21) { 
            throw new Error('Not enough historical data to calculate indicators.');
        }

        const closePrices = historicalData.map(d => d[4]);
        const highPrices = historicalData.map(d => d[2]);
        const lowPrices = historicalData.map(d => d[3]);
        
        const latestPrice = closePrices[closePrices.length - 1];

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
        throw error;
    }
}


/**
 * Creates a new "OPEN" trade record in Firestore.
 * This function NO LONGER communicates with the MT5 bridge directly.
 */
export async function placeTradeInFirestore(
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
    const tradesCollection = collection(firestore, 'users', userId, 'tradingAccounts', tradingAccountId, 'trades');
    const newTradeRef = doc(tradesCollection);

    const newTrade: Trade = {
        id: newTradeRef.id,
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
 * Updates an existing trade in Firestore to be closed.
 * This function NO LONGER communicates with the MT5 bridge directly.
 */
export async function closeTradeInFirestore(
    firestore: Firestore,
    userId: string,
    tradingAccountId: string,
    trade: Trade,
    exitPrice: number,
    profit: number
) {
    const tradeRef = doc(firestore, 'users', userId, 'tradingAccounts', tradingAccountId, 'trades', trade.id);
    const tradeStatus = profit >= 0 ? 'WON' : 'LOST';

    updateDocumentNonBlocking(tradeRef, {
        exitPrice,
        profit,
        status: tradeStatus,
    });
}
