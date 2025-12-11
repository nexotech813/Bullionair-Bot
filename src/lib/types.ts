'use client';

import { z } from 'zod';

export const TradeSchema = z.object({
  id: z.string(),
  tradingAccountId: z.string(),
  timestamp: z.string(),
  symbol: z.string(),
  type: z.enum(['BUY', 'SELL']),
  entryPrice: z.number(),
  exitPrice: z.number().optional().nullable(),
  volume: z.number(),
  profit: z.number().optional().nullable(),
  confidenceLevel: z.string(),
  status: z.enum(['WON', 'LOST', 'OPEN']),
  stopLoss: z.number().optional().nullable(),
  takeProfit: z.number().optional().nullable(),
});
export type Trade = z.infer<typeof TradeSchema>;


export const TradingDecisionInputSchema = z.object({
  tradingAccountId: z.string(),
  user: z.object({
    uid: z.string(),
  }),
  openTrade: TradeSchema.optional().nullable(),
  account: z.object({
    currentBalance: z.number(),
    dailyProfitTarget: z.number(),
    dailyRiskLimit: z.number(),
  }),
});
export type TradingDecisionInput = z.infer<typeof TradingDecisionInputSchema>;

export const TradingDecisionPromptInputSchema = TradingDecisionInputSchema.extend({
    marketData: z.object({
        price: z.number(),
        trend: z.string(),
    }),
    currentTime: z.string(),
});
export type TradingDecisionPromptInput = z.infer<typeof TradingDecisionPromptInputSchema>;


export const TradingDecisionOutputSchema = z.object({
  decision: z.enum(['OPEN_BUY', 'OPEN_SELL', 'CLOSE', 'WAIT']),
  reasoning: z.string().describe('Detailed reasoning for the trading decision.'),
  tradeDetails: z
    .object({
      symbol: z.string().optional(),
      volume: z.number().optional(),
      confidenceLevel: z.string().optional(),
      stopLoss: z.number().optional().describe('The calculated stop loss price level.'),
      takeProfit: z.number().optional().describe('The calculated take profit price level.'),
    })
    .optional(),
});
export type TradingDecisionOutput = z.infer<typeof TradingDecisionOutputSchema>;


export type DailySummary = {
  startingBalance: number;
  endingBalance: number;
  currentBalance: number;
  tradesTaken: number;
  winningTrades: number;
  totalProfit: number;
  maxDrawdown: number;
  winRate: number;
};

export type BotActivity = {
  id: string;
  timestamp: string;
  message: string;
  type: 'ANALYSIS' | 'SIGNAL' | 'RESULT' | 'UPDATE' | 'SUMMARY';
};

export type DailyGoal = {
  type: 'profit' | 'risk';
  value: number;
};

export type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  referralCode?: string;
  referredById?: string;
};

export type TradingAccount = {
  id: string;
  userProfileId: string;
  startingBalance: number;
  currentBalance: number;
  dailyRiskLimit: number;
  dailyProfitTarget: number;
  maxPositionSize: number;
  autoTradingActive: boolean;
};
