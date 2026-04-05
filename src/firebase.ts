import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, PhoneAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, query, where, getDocs, onSnapshot, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

// Firebase configuration with environment variable support for production deployment
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (typeof firebaseConfigJson !== 'undefined' ? (firebaseConfigJson as any).apiKey : ''),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (typeof firebaseConfigJson !== 'undefined' ? (firebaseConfigJson as any).authDomain : ''),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (typeof firebaseConfigJson !== 'undefined' ? (firebaseConfigJson as any).projectId : ''),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (typeof firebaseConfigJson !== 'undefined' ? (firebaseConfigJson as any).storageBucket : ''),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (typeof firebaseConfigJson !== 'undefined' ? (firebaseConfigJson as any).messagingSenderId : ''),
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (typeof firebaseConfigJson !== 'undefined' ? (firebaseConfigJson as any).appId : ''),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || (typeof firebaseConfigJson !== 'undefined' ? (firebaseConfigJson as any).measurementId : ''),
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (typeof firebaseConfigJson !== 'undefined' ? (firebaseConfigJson as any).firestoreDatabaseId : '(default)')
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const phoneProvider = new PhoneAuthProvider(auth);

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
