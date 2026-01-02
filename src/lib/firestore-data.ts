'use client';

import {
  Firestore,
  doc,
  setDoc,
  collection,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

function generateReferralCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export const createInitialUserData = async (
  firestore: Firestore,
  user: User,
  firstName: string,
  lastName: string
) => {
  const userProfileRef = doc(firestore, 'users', user.uid);
  const userProfileData = {
    id: user.uid,
    email: user.email,
    firstName: firstName,
    lastName: lastName,
    referralCode: generateReferralCode(8),
  };
  // Use a non-blocking set for the user profile
  setDocumentNonBlocking(userProfileRef, userProfileData, { merge: true });

  const tradingAccountRef = doc(collection(userProfileRef, 'tradingAccounts'));
  const tradingAccountData = {
    id: tradingAccountRef.id,
    userProfileId: user.uid,
    startingBalance: 10000,
    currentBalance: 10000,
    dailyRiskLimit: 500,
    dailyProfitTarget: 1000,
    maxPositionSize: 1.0,
    autoTradingActive: false, // Explicitly set to false
  };
  // Use a non-blocking set for the trading account
  setDocumentNonBlocking(tradingAccountRef, tradingAccountData, { merge: true });
  
  // Create some initial bot activity
  const batch = writeBatch(firestore);
  const activitiesCollection = collection(tradingAccountRef, 'botActivities');

  const initialActivities = [
    { message: 'Welcome to Bullionaire Bot! Your account is set up.', type: 'UPDATE' },
    { message: 'Navigate to the dashboard to configure your first auto-trading session.', type: 'UPDATE' }
  ];

  initialActivities.forEach(activity => {
    const activityRef = doc(activitiesCollection);
    batch.set(activityRef, { 
      ...activity,
      timestamp: new Date().toISOString(),
      id: activityRef.id
    });
  });

  // You could also add some mock trades here if you want the user to have initial data
  // For now, we will just commit the activities
  await batch.commit();

};
