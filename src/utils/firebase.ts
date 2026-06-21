import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { FactionType } from '../types';

// Web App's Firebase configuration
const firebaseConfig = {
  projectId: "gen-lang-client-0022729876",
  appId: "1:388326734366:web:6dd0670a843e7bbee98c0f",
  apiKey: "AIzaSyDbFC7QHOl42DxD1UjfGnjidwdrw_Z2Mso",
  authDomain: "gen-lang-client-0022729876.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-6251ef95-4866-4101-8d4b-bb9a7655e1a3",
  storageBucket: "gen-lang-client-0022729876.firebasestorage.app",
  messagingSenderId: "388326734366",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export interface RosterItem {
  id: string; // custom local unique id for items
  faction: FactionType;
  spearheadId: string;
  customName: string;
  notes: string;
  wins: number;
  losses: number;
  draws: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  roster: RosterItem[];
  favFaction: FactionType | null;
}

// Fetch user profile from Firestore or create a default one if it doesn't exist
export async function getUserProfile(uid: string, email: string): Promise<UserProfile> {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      uid,
      email: data.email || email,
      username: data.username || email.split('@')[0],
      roster: data.roster || [],
      favFaction: data.favFaction || null,
    };
  } else {
    // Create default profile
    const defaultProfile: UserProfile = {
      uid,
      email,
      username: email.split('@')[0],
      roster: [],
      favFaction: null,
    };
    await setDoc(docRef, defaultProfile);
    return defaultProfile;
  }
}

// Save profile updates to Firestore
export async function saveUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  const docRef = doc(db, 'users', uid);
  await setDoc(docRef, profile, { merge: true });
}
