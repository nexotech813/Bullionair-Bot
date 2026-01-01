'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { DailyGoal, Trade } from '@/lib/types';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { runTradingCycleFlow } from '@/ai/flows/trading-cycle-flow';

import {
  TrendingUp,
  CircleDot,
  PauseCircle,
  Settings2,
  List,
  DollarSign,
  BarChart2,
  CheckCircle2,
  Timer,
  Target,
  Shield,
  Activity,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { BotActivity, TradingAccount } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type LiveDashboardViewProps = {
  dailyGoal: DailyGoal;
  onPause: () => void;
  tradingAccount: TradingAccount;
};

const StatCard = ({ title, value, icon, isProfit = false, profitValue = 0 }: { title: string, value: string, icon: React.ReactNode, isProfit?: boolean, profitValue?: number }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className={cn("text-2xl font-bold", isProfit && (profitValue > 0 ? "text-green-400" : profitValue < 0 ? "text-red-400" : ""))}>
                {value}
            </div>
        </CardContent>
    </Card>
);

export function LiveDashboardView({ dailyGoal, onPause, tradingAccount }: LiveDashboardViewProps) {
  const [nextAnalysisTime, setNextAnalysisTime] = useState(15);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const tradesQuery = useMemoFirebase(() => {
    if (!user || !tradingAccount) return null;
    return query(
      collection(firestore, 'users', user.uid, 'tradingAccounts', tradingAccount.id, 'trades'),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user, tradingAccount]);

  const { data: trades, isLoading: tradesLoading } = useCollection<Trade>(tradesQuery);
  const openTrade = useMemo(() => trades?.find(trade => trade.status === 'OPEN'), [trades]);

  const botActivitiesCollection = useMemoFirebase(() => {
    if(!user || !tradingAccount) return null;
    return collection(firestore, 'users', user.uid, 'tradingAccounts', tradingAccount.id, 'botActivities');
  }, [firestore, user, tradingAccount]);

  const botActivitiesQuery = useMemoFirebase(() => {
    if (!botActivitiesCollection) return null;
    return query(
      botActivitiesCollection,
      orderBy('timestamp', 'desc'),
      limit(10)
    );
  }, [botActivitiesCollection]);

  const { data: botActivities } = useCollection<BotActivity>(botActivitiesQuery);

  // AI Trading Cycle
  useEffect(() => {
    if (!user || !tradingAccount || !firestore) return;

    let isCancelled = false;

    const runCycle = async () => {
      try {
        await runTradingCycleFlow({
          tradingAccountId: tradingAccount.id,
          user: { uid: user.uid },
          account: {
            currentBalance: tradingAccount.currentBalance,
            dailyProfitTarget: tradingAccount.dailyProfitTarget,
            dailyRiskLimit: tradingAccount.dailyRiskLimit,
          },
          openTrade: openTrade || null,
        });
      } catch (e: any) {
        console.error("Trading cycle failed:", e);
        toast({
          variant: "destructive",
          title: "Trading Cycle Error",
          description: e.message || "The AI trading cycle encountered an error.",
        });
      }
      
      // Schedule next run
      if (!isCancelled) {
        setTimeout(runCycle, 15000); // Run every 15 seconds
      }
    };
    
    runCycle(); // Start the first cycle immediately

    return () => {
      isCancelled = true;
    };
  }, [user, tradingAccount, firestore, openTrade, toast]);


  useEffect(() => {
    const timer = setInterval(() => {
      setNextAnalysisTime(prev => {
        if (prev <= 1) {
            // This is where you might trigger the analysis refresh
            return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const closedTrades = trades?.filter(trade => trade.status !== 'OPEN') || [];
  const profit = closedTrades.reduce((acc, trade) => acc + (trade.profit || 0), 0);
  const wins = closedTrades.filter(trade => (trade.profit || 0) > 0).length;
  const losses = closedTrades.length - wins;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

  const balance = tradingAccount.currentBalance + profit;
  const profitPercentage = dailyGoal.type === 'profit' ? (profit / dailyGoal.value) * 100 : 0;

  const statCards = [
    {
      title: 'Current Balance',
      value: `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Today's P/L",
      value: `${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`,
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
      isProfit: true,
      profitValue: profit
    },
    {
      title: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      icon: <BarChart2 className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: 'Trades Today',
      value: `${closedTrades.length} (${wins}W, ${losses}L)`,
      icon: <CheckCircle2 className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="grid gap-8">
       {/* Top Row: Status and Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/50">
                  <CircleDot className="mr-2 h-3 w-3 animate-pulse text-green-400" /> ACTIVE
              </Badge>
              <span>Auto-Trading Status</span>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onPause}><PauseCircle className="mr-2 h-4 w-4"/> Pause Trading</Button>
                <Button variant="ghost" size="icon"><Settings2 className="h-4 w-4"/></Button>
            </div>
          </CardTitle>
          <CardDescription>Since {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | Next analysis in: {String(nextAnalysisTime).padStart(2, '0')}s</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {dailyGoal.type === 'profit' ? <Target className="h-5 w-5"/> : <Shield className="h-5 w-5"/>}
                    <span>{dailyGoal.type === 'profit' ? "Today's Goal" : "Risk Limit"}:</span>
                    <span className="text-lg font-bold text-foreground">${dailyGoal.value.toLocaleString()}</span>
                </div>
                <div className="flex-grow">
                    <Progress value={profitPercentage} aria-label={`${profitPercentage.toFixed(0)}% towards goal`} />
                    <p className="text-xs text-muted-foreground text-right mt-1">{profit >= 0 ? '+' : ''}${profit.toFixed(2)} ({profitPercentage > 0 ? profitPercentage.toFixed(0) : 0}% achieved)</p>
                </div>
            </div>
        </CardContent>
      </Card>
      
      {/* Second Row: Key Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* Third Row: Activity and Open Trade */}
      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
             <CardTitle className="font-headline flex items-center gap-2"><Activity className="h-5 w-5" /> Bot Activity Log</CardTitle>
             <CardDescription>A real-time feed of the AI's analysis and actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-y-auto">
              <Table>
                <TableBody>
                  {botActivities?.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="w-[100px] font-mono text-sm text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>{activity.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {openTrade ? (
          <Card>
            <CardHeader>
              <CardTitle>Open Trade</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={cn("hover:bg-blue-500/30", openTrade.type === 'BUY' ? "bg-blue-500/20 text-blue-300 border-blue-500/50" : "bg-red-500/20 text-red-300 border-red-500/50")}>⚡ {openTrade.type}</Badge>
                  <span className="font-semibold">{openTrade.volume} lots @ ${openTrade.entryPrice}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground text-center pt-2 border-t mt-2">
                  <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-red-400"/>
                      <span>SL: ${openTrade.stopLoss?.toFixed(2)}</span>
                  </div>
                   <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-green-400"/>
                      <span>TP: ${openTrade.takeProfit?.toFixed(2)}</span>
                  </div>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Running: {Math.floor((new Date().getTime() - new Date(openTrade.timestamp).getTime()) / 60000)} min | Confidence: {openTrade.confidenceLevel}
              </div>
            </CardContent>
          </Card>
        ) : (
            <Card>
                <CardHeader>
                    <CardTitle>Open Trade</CardTitle>
                </CardHeader>
                <CardContent className="flex h-48 flex-col items-center justify-center text-center">
                    <p className="text-muted-foreground">No open positions.</p>
                    <p className="text-sm text-muted-foreground/80 mt-2">The bot is currently waiting for a high-probability setup.</p>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
