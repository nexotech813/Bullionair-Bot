// IMPORTANT: This file should NOT have 'use client' at the top.
// It is intended for server-side use only.

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// A singleton pattern to ensure Firebase is initialized only once on the server.
let firebaseApp: FirebaseApp | undefined;
function getServerFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Check if the default app is already initialized
  if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }
  return firebaseApp;
}

// Singleton instances for Auth and Firestore for the server
let auth: Auth | undefined;
function getServerAuth(): Auth {
  if (!auth) {
    auth = getAuth(getServerFirebaseApp());
  }
  return auth;
}

let firestore: Firestore | undefined;
function getServerFirestore(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getServerFirebaseApp());
  }
  return firestore;
}

// Main SERVER initialization function that returns all services.
// This should ONLY be called from server components or server actions.
export function initializeServerFirebase() {
  const app = getServerFirebaseApp();
  const authInstance = getServerAuth();
  const firestoreInstance = getServerFirestore();
  return {
    firebaseApp: app,
    auth: authInstance,
    firestore: firestoreInstance,
  };
}
