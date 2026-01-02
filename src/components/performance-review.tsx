'use client';

import { useState, useEffect } from 'react';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { BarChart, Wand2, Lightbulb } from 'lucide-react';
import { suggestNextDayPositionSize } from '@/ai/flows/suggest-next-day-position-size';
import type { SuggestNextDayPositionSizeOutput } from '@/ai/flows/suggest-next-day-position-size';
import { useToast } from '@/hooks/use-toast';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, where } from 'firebase/firestore';
import type { Trade, TradingAccount } from '@/lib/types';
import { Skeleton } from './ui/skeleton';

const suggestionFormSchema = z.object({
  previousTradingData: z.string().min(10, { message: 'Please provide more detail about previous trading.' }),
  currentMarketConditions: z.string().min(10, { message: 'Please provide more detail about market conditions.' }),
  technicalIndicators: z.string().min(10, { message: 'Please provide more detail about technical indicators.' }),
});

export function PerformanceReview() {
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState<SuggestNextDayPositionSizeOutput | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();

  const tradingAccountsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'tradingAccounts'));
  }, [firestore, user]);

  const { data: tradingAccounts, isLoading: isLoadingAccounts } = useCollection<TradingAccount>(tradingAccountsQuery);
  const tradingAccount = tradingAccounts?.[0];

  const tradesQuery = useMemoFirebase(() => {
    if(!firestore || !user || !tradingAccount) return null;
    return query(collection(firestore, 'users', user.uid, 'tradingAccounts', tradingAccount.id, 'trades'), where('status', '!=', 'OPEN'));
  }, [firestore, user, tradingAccount]);

  const { data: trades, isLoading: isLoadingTrades } = useCollection<Trade>(tradesQuery);

  const form = useForm<z.infer<typeof suggestionFormSchema>>({
    resolver: zodResolver(suggestionFormSchema),
    defaultValues: {
      previousTradingData: '',
      currentMarketConditions: 'Moderate volatility, potential for range-bound movement in Asian session, awaiting London open for trend confirmation.',
      technicalIndicators: 'RSI is neutral (55), MACD showing potential bullish crossover, Bollinger Bands are contracting suggesting a breakout is possible.',
    },
  });

  const totalProfit = trades?.reduce((acc, trade) => acc + (trade.profit || 0), 0) || 0;
  const winRate = trades && trades.length > 0 ? (trades.filter(t => (t.profit || 0) > 0).length / trades.length) * 100 : 0;
  const tradesTaken = trades?.length || 0;
  const startingBalance = tradingAccount?.startingBalance || 10000;
  const currentBalance = startingBalance + totalProfit;

  // Update form default value when data loads
  useEffect(() => {
      if (trades && !form.getValues('previousTradingData')) {
        form.reset({
          ...form.getValues(),
          previousTradingData: `Total Profit: $${totalProfit.toFixed(2)}, Win Rate: ${winRate.toFixed(1)}%, Trades: ${tradesTaken}`,
        });
      }
  }, [trades, totalProfit, winRate, tradesTaken, form]);


  async function onSubmit(values: z.infer<typeof suggestionFormSchema>) {
    try {
      const result = await suggestNextDayPositionSize(values);
      setSuggestion(result);
      toast({
        title: '💡 Suggestion Generated',
        description: 'Your AI-powered suggestion for tomorrow is ready.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '❌ Generation Failed',
        description: 'Could not generate a suggestion. Please try again.',
      });
    }
  }
  
  if (isLoadingAccounts || isLoadingTrades) {
    return (
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><BarChart /> Today's Performance Report</CardTitle>
                    <CardDescription>A summary of the bot's trading activity for the day.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Wand2 /> Tomorrow's AI Suggestion</CardTitle>
                    <CardDescription>Get an AI-driven recommendation for tomorrow's position sizing based on today's market.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-36 ml-auto" />
                </CardFooter>
            </Card>
        </div>
    )
  }

  const summaryData = [
    { label: 'Starting Balance', value: `$${startingBalance.toLocaleString()}` },
    { label: 'Ending Balance', value: `$${currentBalance.toLocaleString()}`, change: `+${((currentBalance / startingBalance * 100) - 100).toFixed(2)}%` },
    { label: 'Total Profit', value: `$${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}`, isPositive: totalProfit >= 0 },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%` },
    { label: 'Trades Taken', value: tradesTaken },
    // Max drawdown would need a more complex calculation, so we'll omit it for now
    // { label: 'Max Drawdown', value: `-$${Math.abs(performanceSummary.maxDrawdown || 0).toLocaleString()}`, isNegative: true },
  ];


  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><BarChart /> Today's Performance Report</CardTitle>
          <CardDescription>A summary of the bot's trading activity for the day.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {summaryData.map((item) => (
                <TableRow key={item.label}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="text-right">
                    <span className={item.isPositive ? "text-green-400" : item.isPositive === false ? "text-red-400" : ""}>{item.value}</span>
                    {item.change && <span className="ml-2 text-xs text-muted-foreground">{item.change}</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2"><Wand2 /> Tomorrow's AI Suggestion</CardTitle>
              <CardDescription>Get an AI-driven recommendation for tomorrow's position sizing based on today's market.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestion ? (
                <Alert className="border-accent">
                  <Lightbulb className="h-4 w-4 text-accent" />
                  <AlertTitle className="text-accent">AI Recommendation</AlertTitle>
                  <AlertDescription>
                    <p className="font-bold text-lg mb-2">{suggestion.suggestedPositionSize}</p>
                    <p className="text-sm">{suggestion.reasoning}</p>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <FormField control={form.control} name="previousTradingData" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous Trading Data</FormLabel>
                      <FormControl><Textarea rows={2} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currentMarketConditions" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Market Conditions</FormLabel>
                      <FormControl><Textarea rows={2} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="technicalIndicators" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Technical Indicators</FormLabel>
                      <FormControl><Textarea rows={2} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              {suggestion && <Button variant="outline" onClick={() => setSuggestion(null)}>Refine & Regenerate</Button>}
              <Button type="submit" disabled={form.formState.isSubmitting || !!suggestion}>
                {form.formState.isSubmitting ? "Generating..." : "Generate Suggestion"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
