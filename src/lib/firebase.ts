import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Data Sanitizer to prevent "Unsupported field value: undefined" errors in Firestore
export function sanitizeFirestoreData<T extends Record<string, any>>(data: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue; // omit undefined keys completely
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizeFirestoreData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Test Connection on Boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✓ Firestore connection verified.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Designate Admin helper
export const ADMIN_EMAIL = 'bethelgoodgift3@gmail.com';

export function isUserAdmin(user: User | null): boolean {
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// Sign In with Google popup
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Sync User Profile in Firestore
    const userRef = doc(db, 'users', user.uid);
    const isAdmin = isUserAdmin(user);
    
    const userProfileData = sanitizeFirestoreData({
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Promoter',
      photoURL: user.photoURL || '',
      role: isAdmin ? 'admin' : 'promoter',
      isAdmin: isAdmin,
      totalEarned: 0,
      totalAdsPublished: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await setDoc(userRef, userProfileData, { merge: true });

    // Ensure Admin Record exists if this is the target admin email
    if (isAdmin) {
      try {
        await setDoc(doc(db, 'admins', user.uid), sanitizeFirestoreData({
          email: user.email,
          role: 'super_admin',
          grantedAt: new Date().toISOString()
        }), { merge: true });
      } catch (e) {
        console.warn('Admin record sync note:', e);
      }
    }

    return user;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users');
  }
}

export async function logoutUser() {
  await signOut(auth);
}
