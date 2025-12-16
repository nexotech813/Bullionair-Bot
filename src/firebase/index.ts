'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// A singleton pattern to ensure Firebase is initialized only once, compatible with server/client.
let firebaseApp: FirebaseApp | undefined;
function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!getApps().length) {
    // If no apps are initialized, initialize a new one.
    // This runs on first access on either client or server.
    try {
      // Prefer automatic initialization if App Hosting env vars are available
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback to the config file, which is normal for local dev
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    // If an app is already initialized, get that instance.
    // This is common on the client-side with Fast Refresh.
    firebaseApp = getApp();
  }
  return firebaseApp;
}

// Singleton instances for Auth and Firestore
let auth: Auth | undefined;
function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

let firestore: Firestore | undefined;
function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
  }
  return firestore;
}

// Main initialization function that returns all services.
export function initializeFirebase() {
  const app = getFirebaseApp();
  const authInstance = getFirebaseAuth();
  const firestoreInstance = getFirebaseFirestore();
  return {
    firebaseApp: app,
    auth: authInstance,
    firestore: firestoreInstance,
  };
}

// Legacy getSdks function for compatibility if needed, but initializeFirebase is preferred.
export function getSdks() {
    return initializeFirebase();
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';