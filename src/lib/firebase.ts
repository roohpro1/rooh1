import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  type User 
} from "firebase/auth";
import { initializeFirestore, doc, getDoc, setDoc, getDocFromServer } from "firebase/firestore";
import { getDatabase, ref as rtdbRef, set as rtdbSet, get as rtdbGet, onValue, update as rtdbUpdate, remove as rtdbRemove } from "firebase/database";
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";
import firebaseConfig from "../../firebase-applet-config.json";

const effectiveFirebaseConfig = {
  ...firebaseConfig,
  apiKey: (typeof process !== "undefined" && process.env?.VITE_FIREBASE_API_KEY) || firebaseConfig.apiKey || "YOUR_FIREBASE_API_KEY"
};

// Initialize Firebase
export const app = initializeApp(effectiveFirebaseConfig);

// Get Auth and Firestore instances
export const auth = getAuth(app);

// Configure Google OAuth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export { 
  signInWithPopup, 
  signOut, 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  type User,
  rtdbRef, 
  rtdbSet, 
  rtdbGet, 
  onValue, 
  rtdbUpdate, 
  rtdbRemove 
};

/**
 * Ensure Anonymous Authentication for the user
 * Used to give users a unique anonymous Firebase UID without prompting for login.
 */
export async function ensureAnonymousAuth(): Promise<User | null> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const credential = await signInAnonymously(auth);
    console.log("[Firebase Auth] Anonymous sign-in successful. UID:", credential.user.uid);
    return credential.user;
  } catch (error: any) {
    console.warn("[Firebase Auth] Anonymous sign-in notice:", error?.message || error);
    return null;
  }
}

export const isPlaceholderFirebase = !firebaseConfig.projectId || firebaseConfig.projectId === "remixed-project-id";

// Initialize Analytics safely
export let analytics: Analytics | null = null;
if (!isPlaceholderFirebase && typeof window !== "undefined" && firebaseConfig.measurementId) {
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.warn("Analytics init notice:", e);
      }
    }
  }).catch(() => {});
}

const dbId = firebaseConfig.firestoreDatabaseId && 
             firebaseConfig.firestoreDatabaseId !== "remixed-firestore-database-id" && 
             firebaseConfig.firestoreDatabaseId !== "(default)"
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

// Only initialize Firestore when a valid non-placeholder project ID exists
export const db = !isPlaceholderFirebase 
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, dbId)
  : null as any;

/**
 * Save lightweight settings/API keys to Firebase Firestore
 * Strictly used for tiny configs (<1KB), ensuring ZERO quota waste.
 */
export async function saveLightweightConfig(configKey: string, data: Record<string, any>): Promise<boolean> {
  if (isPlaceholderFirebase || !db) return false;
  try {
    const configDocRef = doc(db, "configs", configKey);
    await setDoc(configDocRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[saveLightweightConfig] Firestore notice for ${configKey}:`, err);
    return false;
  }
}

/**
 * Get lightweight settings/API keys from Firebase Firestore
 */
export async function getLightweightConfig<T = any>(configKey: string): Promise<T | null> {
  if (isPlaceholderFirebase || !db) return null;
  try {
    const configDocRef = doc(db, "configs", configKey);
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      return snap.data() as T;
    }
  } catch (err) {
    console.warn(`[getLightweightConfig] Firestore notice for ${configKey}:`, err);
  }
  return null;
}

// Initialize Firebase Realtime Database (قاعدة البيانات الخاصة بحفظ البيانات في الوقت اللحظي)
export const rtdb = !isPlaceholderFirebase && (firebaseConfig as any).databaseURL 
  ? getDatabase(app) 
  : null as any;

/**
 * Cooperative Realtime Sync Engine (نظام المزامنة اللحظية المزدوج الاحترافي)
 * Keeps Cloud Firestore (فاير ستوري) and Firebase Realtime Database (قاعدة البيانات في الوقت اللحظي)
 * synchronized simultaneously in real-time.
 */
export async function syncToRealtimeDatabase(path: string, data: any): Promise<void> {
  if (isPlaceholderFirebase || !rtdb) {
    // Fallback: sync to local storage instantly so local cache always matches in real-time
    try {
      if (typeof window !== "undefined" && data !== null && data !== undefined) {
        localStorage.setItem(`rtdb_sync_${path.replace(/\//g, '_')}`, JSON.stringify(data));
      }
    } catch (e) {}
    return;
  }
  try {
    const dbRef = rtdbRef(rtdb, path);
    if (data === null || data === undefined) {
      await rtdbRemove(dbRef);
    } else {
      await rtdbSet(dbRef, data);
    }
  } catch (error) {
    console.warn(`Notice: Cooperative Realtime DB sync notice for path [${path}]:`, error instanceof Error ? error.message : String(error));
  }
}

// Test connection on boot to satisfy the firebase skill requirement
async function testConnection() {
  if (isPlaceholderFirebase || !db) {
    console.log("Firebase initialized in standard seed configuration.");
    return;
  }
  try {
    await ensureAnonymousAuth();
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firebase Connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firebase status: Client is offline.");
    } else {
      console.warn("Firebase connection notice:", error instanceof Error ? error.message : String(error));
    }
  }
}
testConnection();

// Structured Error Handler conforming to FirestoreErrorInfo
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): string {
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
  const jsonString = JSON.stringify(errInfo);
  console.error("Firestore Error Detailed: ", jsonString);
  return jsonString;
}
