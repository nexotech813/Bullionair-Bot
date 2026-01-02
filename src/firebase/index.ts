'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// A singleton pattern to ensure Firebase is initialized only once ON THE CLIENT.
let firebaseApp: FirebaseApp | undefined;
function getClientFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!getApps().length) {
    // This runs on first access on the client.
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    // If an app is already initialized, get that instance.
    // This is common on the client-side with Fast Refresh.
    firebaseApp = getApp();
  }
  return firebaseApp;
}

// Singleton instances for Auth and Firestore for the client
let auth: Auth | undefined;
function getClientAuth(): Auth {
  if (!auth) {
    auth = getAuth(getClientFirebaseApp());
  }
  return auth;
}

let firestore: Firestore | undefined;
function getClientFirestore(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getClientFirebaseApp());
  }
  return firestore;
}

// Main CLIENT initialization function that returns all services.
// This should ONLY be called from client components.
export function initializeFirebase() {
  const app = getClientFirebaseApp();
  const authInstance = getClientAuth();
  const firestoreInstance = getClientFirestore();
  return {
    firebaseApp: app,
    auth: authInstance,
    firestore: firestoreInstance,
  };
}

// Export hooks and providers intended for client-side use
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
