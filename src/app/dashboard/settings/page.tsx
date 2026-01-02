'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDoc, useCollection, useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, doc, query } from 'firebase/firestore';
import type { UserProfile, TradingAccount } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';

const profileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional(),
});

const tradingFormSchema = z.object({
  currentBalance: z.coerce.number().positive(),
  dailyProfitTarget: z.coerce.number().positive(),
  dailyRiskLimit: z.coerce.number().positive(),
  maxPositionSize: z.coerce.number().positive(),
});

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  const tradingAccountsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'tradingAccounts'));
  }, [firestore, user]);

  const { data: tradingAccounts, isLoading: isLoadingAccounts } = useCollection<TradingAccount>(tradingAccountsQuery);
  const tradingAccount = tradingAccounts?.[0];

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  const tradingForm = useForm<z.infer<typeof tradingFormSchema>>({
    resolver: zodResolver(tradingFormSchema),
    defaultValues: {
      currentBalance: 10000,
      dailyProfitTarget: 1000,
      dailyRiskLimit: 500,
      maxPositionSize: 1.0,
    },
  });

  useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
      });
    }
    if (tradingAccount) {
      tradingForm.reset({
        currentBalance: tradingAccount.currentBalance,
        dailyProfitTarget: tradingAccount.dailyProfitTarget,
        dailyRiskLimit: tradingAccount.dailyRiskLimit,
        maxPositionSize: tradingAccount.maxPositionSize,
      });
    }
  }, [userProfile, tradingAccount, profileForm, tradingForm]);

  function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
    if (!userProfileRef) return;
    updateDocumentNonBlocking(userProfileRef, {
        firstName: values.firstName,
        lastName: values.lastName,
    });
    toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved.',
    })
  }

  function onTradingSubmit(values: z.infer<typeof tradingFormSchema>) {
    if (!tradingAccount || !user) return;
    const tradingAccountRef = doc(firestore, 'users', user.uid, 'tradingAccounts', tradingAccount.id);
    updateDocumentNonBlocking(tradingAccountRef, {
        currentBalance: values.currentBalance,
        dailyProfitTarget: values.dailyProfitTarget,
        dailyRiskLimit: values.dailyRiskLimit,
        maxPositionSize: values.maxPositionSize,
    });
    toast({
        title: 'Trading Settings Updated',
        description: 'Your trading parameters have been saved.',
    })
  }
  
  if (isLoadingProfile || isLoadingAccounts) {
      return (
          <div className="space-y-8">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-80 w-full" />
          </div>
      )
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Manage your personal information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={profileForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="trader@example.com" {...field} disabled />
                    </FormControl>
                     <FormDescription>You cannot change your email address.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={profileForm.formState.isSubmitting}>Save</Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
       <Card>
        <Form {...tradingForm}>
          <form onSubmit={tradingForm.handleSubmit(onTradingSubmit)}>
            <CardHeader>
              <CardTitle>Trading Parameters</CardTitle>
              <CardDescription>
                Adjust the core settings for the auto-trading bot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={tradingForm.control}
                    name="currentBalance"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Current Account Balance</FormLabel>
                        <FormControl>
                        <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>Set this to your actual MT5 balance.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
              />
              <FormField
                control={tradingForm.control}
                name="dailyProfitTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Profit Target</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                     <FormDescription>The bot will aim to reach this profit amount each day.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={tradingForm.control}
                name="dailyRiskLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Risk Limit (Stop Loss)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>The maximum loss the bot will incur in a single day.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={tradingForm.control}
                name="maxPositionSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Position Size</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>The largest trade size (in lots) the bot can open.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={tradingForm.formState.isSubmitting}>Save</Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
