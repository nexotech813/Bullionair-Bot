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
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Trade, TradingAccount } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { ArrowRight } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

function PerformanceMetric({
  label,
  value,
  isPositive,
}: {
  label: string;
  value: string;
  isPositive?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-muted/50 p-4 text-center">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'text-2xl font-bold',
          isPositive === true && 'text-green-400',
          isPositive === false && 'text-red-400'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const tradingAccountsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'tradingAccounts')
    );
  }, [firestore, user]);

  const { data: tradingAccounts, isLoading: isLoadingAccounts } =
    useCollection<TradingAccount>(tradingAccountsQuery);
  const tradingAccount = tradingAccounts?.[0];

  const tradesQuery = useMemoFirebase(() => {
    if (!user || !tradingAccount) return null;
    return query(
      collection(
        firestore,
        'users',
        user.uid,
        'tradingAccounts',
        tradingAccount.id,
        'trades'
      ),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, user, tradingAccount]);

  const { data: trades, isLoading: isLoadingTrades } =
    useCollection<Trade>(tradesQuery);

  if (isLoadingAccounts || isLoadingTrades) {
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startingBalance = tradingAccount?.startingBalance || 10000;
  const closedTrades = trades?.filter(trade => trade.status !== 'OPEN') || [];
  const totalProfit = closedTrades.reduce(
    (acc, trade) => acc + (trade.profit || 0),
    0
  );
  const winningTrades = closedTrades.filter(
    trade => (trade.profit || 0) > 0
  );
  const losingTrades = closedTrades.filter(
    trade => (trade.profit || 0) < 0
  );
  const winRate =
    closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;
  const avgProfit =
    winningTrades.length > 0
      ? winningTrades.reduce((acc, t) => acc + (t.profit || 0), 0) /
        winningTrades.length
      : 0;
  const avgLoss =
    losingTrades.length > 0
      ? Math.abs(
          losingTrades.reduce((acc, t) => acc + (t.profit || 0), 0) /
            losingTrades.length
        )
      : 0;
  const profitFactor = avgLoss > 0 ? (avgProfit * (winRate/100)) / (avgLoss * (1-(winRate/100))) : (avgProfit > 0 ? Infinity : 0);

  const balanceHistory = closedTrades.reduce((acc, trade, index) => {
    const prevBalance = index > 0 ? acc[index - 1].balance : startingBalance;
    acc.push({
      name: `Trade ${index + 1}`,
      balance: prevBalance + (trade.profit || 0),
    });
    return acc;
  }, [] as { name: string; balance: number }[]);

  const chartConfig: ChartConfig = {
    balance: {
      label: "Balance",
      color: "hsl(var(--chart-1))",
    },
  };


  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>
            A visual representation of your account growth over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ChartContainer config={chartConfig}>
              <AreaChart data={balanceHistory}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }}
                  content={<ChartTooltipContent indicator='dot' />}
                />
                <Area type="monotone" dataKey="balance" stroke="var(--color-balance)" fill="url(#colorBalance)" />
              </AreaChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PerformanceMetric label="Total P/L" value={`${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`} isPositive={totalProfit >= 0} />
        <PerformanceMetric label="Win Rate" value={`${winRate.toFixed(1)}%`} isPositive={winRate >= 50} />
        <PerformanceMetric label="Profit Factor" value={profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)} isPositive={profitFactor >= 1} />
        <PerformanceMetric label="Total Trades" value={closedTrades.length.toString()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>
            A complete log of all closed trades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entry / Exit</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closedTrades.length > 0 ? (
                closedTrades.map(trade => (
                  <TableRow key={trade.id}>
                    <TableCell>
                      {new Date(trade.timestamp).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                        <span className={cn('font-semibold', trade.type === 'BUY' ? 'text-blue-400' : 'text-red-400')}>
                            {trade.type}
                        </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                           {trade.entryPrice.toFixed(2)} <ArrowRight className="h-3 w-3" /> {trade.exitPrice?.toFixed(2) || 'N/A'}
                        </div>
                    </TableCell>
                    <TableCell>{trade.volume} lots</TableCell>
                    <TableCell className="text-right">
                      <span className={cn('font-semibold', (trade.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                        ${(trade.profit || 0).toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No closed trades yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
