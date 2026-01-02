'use client';

import { useState, useEffect } from 'react';
import { DailyConfigForm } from '@/components/daily-config-form';
import { LiveDashboardView } from '@/components/live-dashboard-view';
import { PerformanceReview } from '@/components/performance-review';
import type { DailyGoal, TradingAccount } from '@/lib/types';
import { Separator } from './ui/separator';
import { useCollection, useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Skeleton } from './ui/skeleton';

export function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // The query is simplified as we are querying a subcollection already under the user's UID.
  const tradingAccountsQuery = useMemoFirebase(() => {
    if (!user) return null;
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
      // We no longer automatically set trading to active here.
      // We set the daily goal from settings for the config form.
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
    setDocumentNonBlocking(accountRef, updateData, { merge: true });
    setTradingAccount(prev => prev ? { ...prev, ...updateData } : undefined);
    setDailyGoal(goal);
    setIsTradingActive(true); // This is now the ONLY place where trading is activated.
  };
  
  const handlePauseTrading = () => {
    if (!user || !tradingAccount) return;
    const accountRef = doc(firestore, 'users', user.uid, 'tradingAccounts', tradingAccount.id);
    setDocumentNonBlocking(accountRef, { autoTradingActive: false }, { merge: true });
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
