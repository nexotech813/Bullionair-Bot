'use client';

import {
  Firestore,
  doc,
  setDoc,
  collection,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';

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
  
  const tradingAccountRef = doc(collection(userProfileRef, 'tradingAccounts'));
  const tradingAccountData = {
    id: tradingAccountRef.id,
    userProfileId: user.uid,
    startingBalance: 10000,
    currentBalance: 10000,
    dailyRiskLimit: 500,
    dailyProfitTarget: 1000,
    autoTradingActive: false, // Explicitly ensure trading is NOT active for new users.
  };

  const batch = writeBatch(firestore);

  batch.set(userProfileRef, userProfileData, { merge: true });
  batch.set(tradingAccountRef, tradingAccountData, { merge: true });
  
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

  // Commit all writes together as a single atomic operation.
  await batch.commit();
};
