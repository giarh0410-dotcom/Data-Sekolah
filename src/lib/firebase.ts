import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signIn = async () => {
  console.log("Firebase: Starting sign-in flow...");
  try {
    console.log("Firebase: Attempting popup...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Firebase: Popup success!", result.user.email);
    return result;
  } catch (error: any) {
    console.error("Firebase: Popup failed", error.code, error.message);
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      console.log("Firebase: Falling back to redirect...");
      const { signInWithRedirect } = await import('firebase/auth');
      return await signInWithRedirect(auth, googleProvider);
    }
    throw error;
  }
};
export const logOut = () => signOut(auth);
