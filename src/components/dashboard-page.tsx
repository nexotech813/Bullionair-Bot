'use client';

import { useState, useEffect } from 'react';
import { DailyConfigForm } from '@/components/daily-config-form';
import { LiveDashboardView } from '@/components/live-dashboard-view';
import { PerformanceReview } from '@/components/performance-review';
import type { DailyGoal, TradingAccount } from '@/lib/types';
import { Separator } from './ui/separator';
import { useCollection, useFirestore, useUser, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Skeleton } from './ui/skeleton';

export function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const tradingAccountsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'tradingAccounts'));
  }, [firestore, user]);

  const { data: tradingAccounts, isLoading: isLoadingAccounts } = useCollection<TradingAccount>(tradingAccountsQuery);

  const [tradingAccount, setTradingAccount] = useState<TradingAccount | undefined>(undefined);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal | undefined>();
  const [isTradingActive, setIsTradingActive] = useState(false);

  useEffect(() => {
    if (tradingAccounts && tradingAccounts.length > 0) {
      const activeAccount = tradingAccounts[0];
      setTradingAccount(activeAccount);
      // Logic to auto-start trading is removed. User must initiate.
      if (!dailyGoal) {
        setDailyGoal({ type: 'profit', value: activeAccount.dailyProfitTarget || 1000 });
      }
    }
  }, [tradingAccounts, dailyGoal]);

  const handleStartTrading = (goal: DailyGoal, confirmation: string) => {
    if (!user || !tradingAccount) return;
    const accountRef = doc(firestore, 'users', user.uid, 'tradingAccounts', tradingAccount.id);
    const updateData = {
        autoTradingActive: true,
        dailyProfitTarget: goal.type === 'profit' ? goal.value : tradingAccount.dailyProfitTarget,
        dailyRiskLimit: goal.type === 'risk' ? goal.value : tradingAccount.dailyRiskLimit,
    };
    updateDocumentNonBlocking(accountRef, updateData);
    setTradingAccount(prev => prev ? { ...prev, ...updateData } : undefined);
    setDailyGoal(goal);
    setIsTradingActive(true); 
  };
  
  const handlePauseTrading = () => {
    if (!user || !tradingAccount) return;
    const accountRef = doc(firestore, 'users', user.uid, 'tradingAccounts', tradingAccount.id);
    updateDocumentNonBlocking(accountRef, { autoTradingActive: false });
    setTradingAccount(prev => prev ? { ...prev, autoTradingActive: false } : undefined);
    setIsTradingActive(false);
  };

  if (isLoadingAccounts) {
    return <Skeleton className="h-[400px] w-full" />
  }

  return (
    <div className="flex flex-col gap-8">
      {!isTradingActive ? (
        <DailyConfigForm onStartTrading={handleStartTrading} />
      ) : (
        tradingAccount && dailyGoal && <LiveDashboardView dailyGoal={dailyGoal} onPause={handlePauseTrading} tradingAccount={tradingAccount} />
      )}
      <Separator />
      <PerformanceReview />
    </div>
  );
}
