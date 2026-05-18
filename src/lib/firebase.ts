import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  getAdditionalUserInfo,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  orderBy, 
  getDocFromServer,
  getDocFromCache
} from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app, config.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Connection Test
async function testConnection() {
  try {
    // We use a dummy doc to check if we can reach the server
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection established successfully.");
  } catch (error: any) {
    // If permission_denied, it actually means we ARE connected (since it reached the rules)
    if (error.code === 'permission-denied') {
      console.log("Firebase connected (Permission check passed).");
      return;
    }
    
    if(error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.error("Firebase connection failed: Client is offline or service unavailable.");
    } else {
      console.error("Firebase connection error:", error);
    }
  }
}
testConnection();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const additionalInfo = getAdditionalUserInfo(result);
    return { user: result.user, isNewUser: additionalInfo?.isNewUser || false };
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
}

export async function registerWithEmail(email: string, pass: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("Registration failed", error);
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("Email login failed", error);
    throw error;
  }
}

export async function sendMagicLink(email: string) {
  const actionCodeSettings = {
    // URL you want to redirect back to. The domain (www.example.com) for this
    // URL must be whitelisted in the Firebase Console.
    url: window.location.origin + '/login?magic_link=true',
    // This must be true.
    handleCodeInApp: true,
  };

  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('nikaah_email_for_sign_in', email);
    return true;
  } catch (error) {
    console.error("Failed to send magic link", error);
    throw error;
  }
}

export async function finishMagicLinkSignIn() {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('nikaah_email_for_sign_in');
    
    if (!email) {
      email = window.prompt('Please provide your email for confirmation');
    }

    if (email) {
      try {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem('nikaah_email_for_sign_in');
        const additionalInfo = getAdditionalUserInfo(result);
        return { user: result.user, isNewUser: additionalInfo?.isNewUser || false };
      } catch (error) {
        console.error("Failed to sign in with magic link", error);
        throw error;
      }
    }
  }
  return null;
}

export async function logout() {
  try {
    await signOut(auth);
    sessionStorage.removeItem('nikaah_session_active');
    // Clear remembered credentials on explicit logout if you want privacy
    // localStorage.removeItem('nikaah_remembered_email');
    // localStorage.removeItem('nikaah_remembered_pass');
  } catch (error) {
    console.error("Logout failed", error);
  }
}

export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error("Password reset failed", error);
    throw error;
  }
}

// Error handling helper as per instructions
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile Utils
export async function createUserProfile(uid: string, data: any) {
  try {
    const profileRef = doc(db, 'profiles', uid);
    const profileSnap = await getDoc(profileRef);
    
    const batch = [
      setDoc(doc(db, 'users_private', uid), {
        uid,
        email: data.email,
        updatedAt: serverTimestamp(),
      }, { merge: true }),
    ];

    if (!profileSnap.exists()) {
      batch.push(
        setDoc(profileRef, {
          uid,
          name: data.name,
          profileComplete: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true })
      );
    } else {
      // Only update name and email if they are provided and potentially empty in existing profile
      const updateData: any = {
        updatedAt: serverTimestamp()
      };
      if (data.name && !profileSnap.data()?.name) updateData.name = data.name;
      batch.push(setDoc(profileRef, updateData, { merge: true }));
    }

    await Promise.all(batch);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `profiles/${uid}`);
  }
}

export async function getUserProfile(uid: string) {
  const path = `profiles/${uid}`;
  try {
    const docRef = doc(db, 'profiles', uid);
    
    // Attempt cache
    try {
      const cacheSnap = await getDocFromCache(docRef);
      if (cacheSnap.exists()) return cacheSnap.data();
    } catch (e) {}

    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error: any) {
    if (error.message && error.message.includes('offline')) return null;
    handleFirestoreError(error, OperationType.GET, path);
  }
}
