import { db, auth } from './firebase-config'
import { doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Setup Firebase auth state listener 
 * Automatically syncs user data to Firestore on sign-in
 * Call this once during app initialization
 */
export function setupAuthStateListener() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);

        await setDoc(
          userDocRef,
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'User',
            photoUrl: user.photoURL || null,
            emailVerified: user.emailVerified,
            createdAt: new Date().toISOString(),
            lastSignIn: new Date().toISOString(),
          },
          { merge: true }
        );

        console.log('✅ User synced to Firestore:', user.uid);
      } catch (error) {
        console.error('✶ Error syncing user to Firestore:', error);
      }
    } else {
      console.log('User signed out');
    }
  });
}

/**
 * Sync user immediately after sign-in (alternative for sign-up flow)
 */
export async function syncUserOnSignIn(user: any) {
  if (!user) return;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(
      userDocRef,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'User',
        photoUrl: user.photoURL || null,
        emailVerified: user.emailVerified,
        createdAt: new Date().toISOString(),
        lastSignIn: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log('✅ User synced:', user.uid);
  } catch (error) {
    console.error('✶ Sync failed:', error);
    throw error;
  }
}
