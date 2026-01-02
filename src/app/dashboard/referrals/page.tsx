'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useDoc, useFirestore, useUser } from "@/firebase";
import { useMemoFirebase } from "@/firebase/provider";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { collection, doc, query, where } from "firebase/firestore";
import { Award, Gift, Users, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ReferralsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  // The query for referrals is disabled because Firestore security rules
  // prevent querying the entire 'users' collection for security reasons.
  // A production implementation would use a backend function.
  const referrals = []; 
  const isLoadingReferrals = false;

  const totalReferrals = referrals?.length || 0;
  const monthlySavings = totalReferrals * 29.9; 

  if (isLoadingProfile || isLoadingReferrals) {
      return <div>Loading...</div>
  }

  return (
    <div className="grid gap-8">
      <div className="grid md:grid-cols-3 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              Number of users you've referred.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Savings</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlySavings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {totalReferrals * 20}% off your Pro plan
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leaderboard Rank</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">N/A</div>
            <p className="text-xs text-muted-foreground">
              Leaderboard is a backend feature.
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
          <CardDescription>Share your code with friends. They get 10% off their first month, and you get 20% off your next bill for each one!</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center space-x-2">
                <p className="text-2xl font-mono text-primary bg-muted p-4 rounded-lg">
                    {userProfile?.referralCode || 'Loading...'}
                </p>
            </div>
        </CardContent>
      </Card>
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Leaderboard Coming Soon</AlertTitle>
        <AlertDescription>
            A full referral leaderboard requires a secure backend process to aggregate user data without compromising privacy. This feature is planned for a future update. For now, you can track your total referrals and savings above.
        </AlertDescription>
      </Alert>
    </div>
  );
}
