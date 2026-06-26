import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, runTransaction, collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { FactionType, League, LeaguePlayer, LeagueMember, JoinRequest, MatchReport } from '../types';

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

// ------------------------------------------------
// League Service - Firestore-backed League System
// ------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Subscribe to all public leagues (real-time)
export function subscribeToPublicLeagues(callback: (leagues: League[]) => void): () => void {
  const q = query(collection(db, 'leagues'), where('isPublic', '==', true));
  return onSnapshot(q, (snapshot) => {
    const leagues = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as unknown as League);
    callback(leagues);
  });
}

// Subscribe to leagues the user is a member of (real-time)
export function subscribeToUserLeagues(uid: string, callback: (leagues: League[]) => void): () => void {
  const q = query(collection(db, 'leagues'), where('memberUids', 'array-contains', uid));
  return onSnapshot(q, (snapshot) => {
    const leagues = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as unknown as League);
    callback(leagues);
  });
}

// Subscribe to a single league (real-time)
export function subscribeToLeague(leagueId: string, callback: (league: League | null) => void): () => void {
  const ref = doc(db, 'leagues', leagueId);
  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ ...snapshot.data(), id: snapshot.id } as unknown as League);
  });
}

// Subscribe to matches for a league (real-time)
export function subscribeToLeagueMatches(leagueId: string, callback: (matches: MatchReport[]) => void): () => void {
  const q = query(collection(db, 'leagues', leagueId, 'matches'), where('leagueId', '==', leagueId));
  return onSnapshot(q, (snapshot) => {
    const matches = snapshot.docs.map(doc => doc.data() as MatchReport);
    callback(matches);
  });
}

// Create a new league
export async function createLeague(data: {
  name: string;
  description: string;
  createdBy: string;
  createdByName: string;
}): Promise<string> {
  const leagueId = generateId('conclave');
  const now = new Date().toISOString();
  const newMember: LeagueMember = {
    uid: data.createdBy,
    username: data.createdByName,
    role: 'admin',
    joinedAt: now
  };
  const newPlayer: LeaguePlayer = {
    id: generateId('player'),
    name: data.createdByName,
    faction: FactionType.STORMCAST,
    points: 0, wins: 0, losses: 0, draws: 0,
    vpScored: 0, casualtiesSlain: 0, underdogWins: 0,
    linkedUid: data.createdBy
  };
  const league: Omit<League, 'matches'> = {
    id: leagueId,
    name: data.name,
    description: data.description,
    inviteCode: generateInviteCode(),
    createdAt: now,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    isPublic: true,
    memberUids: [data.createdBy],
    members: [newMember],
    players: [newPlayer],
    joinRequests: []
  };
  await setDoc(doc(db, 'leagues', leagueId), league);
  return leagueId;
}

// Request to join a league
export async function requestJoinLeague(leagueId: string, uid: string, username: string): Promise<void> {
  const leagueRef = doc(db, 'leagues', leagueId);
  const newRequest: JoinRequest = {
    uid, username, status: 'pending', requestedAt: new Date().toISOString()
  };
  await runTransaction(db, async (transaction) => {
    const leagueDoc = await transaction.get(leagueRef);
    if (!leagueDoc.exists()) throw new Error('League not found');
    const league = leagueDoc.data() as any;
    const existing = league.joinRequests?.find((r: JoinRequest) => r.uid === uid);
    if (existing) throw new Error('Join request already submitted');
    transaction.update(leagueRef, {
      joinRequests: arrayUnion(newRequest)
    });
  });
}

// Approve a join request
export async function approveJoinRequest(leagueId: string, requestUid: string, username: string): Promise<void> {
  const leagueRef = doc(db, 'leagues', leagueId);
  await runTransaction(db, async (transaction) => {
    const leagueDoc = await transaction.get(leagueRef);
    if (!leagueDoc.exists()) throw new Error('League not found');
    const league = leagueDoc.data() as any;
    const request = league.joinRequests?.find((r: JoinRequest) => r.uid === requestUid && r.status === 'pending');
    if (!request) throw new Error('Pending join request not found');

    const now = new Date().toISOString();
    const newMember: LeagueMember = {
      uid: requestUid, username, role: 'member', joinedAt: now
    };
    const newPlayer: LeaguePlayer = {
      id: generateId('player'),
      name: username,
      faction: FactionType.STORMCAST,
      points: 0, wins: 0, losses: 0, draws: 0,
      vpScored: 0, casualtiesSlain: 0, underdogWins: 0,
      linkedUid: requestUid
    };

    transaction.update(leagueRef, {
      joinRequests: arrayRemove(request),
      members: arrayUnion(newMember),
      memberUids: arrayUnion(requestUid),
      players: arrayUnion(newPlayer)
    });
  });
}

// Reject a join request
export async function rejectJoinRequest(leagueId: string, requestUid: string): Promise<void> {
  const leagueRef = doc(db, 'leagues', leagueId);
  await runTransaction(db, async (transaction) => {
    const leagueDoc = await transaction.get(leagueRef);
    if (!leagueDoc.exists()) throw new Error('League not found');
    const league = leagueDoc.data() as any;
    const request = league.joinRequests?.find((r: JoinRequest) => r.uid === requestUid && r.status === 'pending');
    if (!request) throw new Error('Pending join request not found');
    transaction.update(leagueRef, {
      joinRequests: arrayRemove(request)
    });
  });
}

// Promote a member to admin
export async function promoteToAdmin(leagueId: string, targetUid: string): Promise<void> {
  const leagueRef = doc(db, 'leagues', leagueId);
  await runTransaction(db, async (transaction) => {
    const leagueDoc = await transaction.get(leagueRef);
    if (!leagueDoc.exists()) throw new Error('League not found');
    const league = leagueDoc.data() as any;
    const member = league.members?.find((m: LeagueMember) => m.uid === targetUid);
    if (!member) throw new Error('Member not found');
    const updatedMembers = league.members.map((m: LeagueMember) =>
      m.uid === targetUid ? { ...m, role: 'admin' as const } : m
    );
    transaction.update(leagueRef, { members: updatedMembers });
  });
}

// Demote an admin to member
export async function demoteFromAdmin(leagueId: string, targetUid: string): Promise<void> {
  const leagueRef = doc(db, 'leagues', leagueId);
  await runTransaction(db, async (transaction) => {
    const leagueDoc = await transaction.get(leagueRef);
    if (!leagueDoc.exists()) throw new Error('League not found');
    const league = leagueDoc.data() as any;
    const member = league.members?.find((m: LeagueMember) => m.uid === targetUid && m.role === 'admin');
    if (!member) throw new Error('Admin not found');
    const adminCount = league.members?.filter((m: LeagueMember) => m.role === 'admin').length || 0;
    if (adminCount <= 1) throw new Error('Cannot demote the last admin');
    const updatedMembers = league.members.map((m: LeagueMember) =>
      m.uid === targetUid ? { ...m, role: 'member' as const } : m
    );
    transaction.update(leagueRef, { members: updatedMembers });
  });
}

// Add a match to a league (transactional to keep players in sync)
export async function addMatchToLeague(leagueId: string, report: MatchReport): Promise<void> {
  const leagueRef = doc(db, 'leagues', leagueId);
  const matchRef = doc(collection(db, 'leagues', leagueId, 'matches'));

  await runTransaction(db, async (transaction) => {
    const leagueDoc = await transaction.get(leagueRef);
    if (!leagueDoc.exists()) throw new Error('League not found');
    const league = leagueDoc.data() as any;

    // Prevent duplicate matches
    // (We check against the local matches array or we could check the subcollection)
    if (league.matches?.some((m: MatchReport) => m.id === report.id)) {
      throw new Error('Duplicate match');
    }

    let players = [...(league.players || [])];

    const ensurePlayerCreated = (name: string, faction: FactionType, uid?: string) => {
      const pIndex = players.findIndex((p: LeaguePlayer) => p.name.toLowerCase() === name.toLowerCase());
      if (pIndex === -1) {
        players.push({
          id: generateId('player'),
          name,
          faction,
          points: 0, wins: 0, losses: 0, draws: 0,
          vpScored: 0, casualtiesSlain: 0, underdogWins: 0,
          linkedUid: uid
        });
        return players.length - 1;
      }
      return pIndex;
    };

    const idxA = ensurePlayerCreated(report.playerA.name, report.playerA.faction);
    const idxB = ensurePlayerCreated(report.playerB.name, report.playerB.faction);

    if (report.winner === 'A') {
      players[idxA].points += 3;
      players[idxA].wins += 1;
      players[idxB].losses += 1;
      if (report.underdogPlayed === 'A') players[idxA].underdogWins += 1;
    } else if (report.winner === 'B') {
      players[idxB].points += 3;
      players[idxB].wins += 1;
      players[idxA].losses += 1;
      if (report.underdogPlayed === 'B') players[idxB].underdogWins += 1;
    } else {
      players[idxA].points += 1;
      players[idxA].draws += 1;
      players[idxB].points += 1;
      players[idxB].draws += 1;
    }

    players[idxA].vpScored += report.playerA.score;
    players[idxA].casualtiesSlain += report.playerB.casualties;
    players[idxB].vpScored += report.playerB.score;
    players[idxB].casualtiesSlain += report.playerA.casualties;

    const refreshedReport = { ...report, id: report.id || matchRef.id, leagueId };

    transaction.set(matchRef, refreshedReport);

    // Update the league doc with new player stats and the match ref in the array
    transaction.update(leagueRef, {
      players: players,
      matches: arrayUnion({ ...refreshedReport })
    });
  });
}

// Remove a member from a league (leave league)
export async function leaveLeague(leagueId: string, uid: string): Promise<void> {
  const leagueRef = doc(db, 'leagues', leagueId);
  await runTransaction(db, async (transaction) => {
    const leagueDoc = await transaction.get(leagueRef);
    if (!leagueDoc.exists()) throw new Error('League not found');
    const league = leagueDoc.data() as any;
    const member = league.members?.find((m: LeagueMember) => m.uid === uid);
    if (!member) throw new Error('Member not found');
    if (member.role === 'admin') {
      const adminCount = league.members?.filter((m: LeagueMember) => m.role === 'admin').length || 0;
      if (adminCount <= 1) throw new Error('Cannot leave as the last admin. Promote another member first.');
    }
    // Remove player entry linked to this uid
    const player = league.players?.find((p: LeaguePlayer) => p.linkedUid === uid);
    transaction.update(leagueRef, {
      members: arrayRemove(member),
      memberUids: arrayRemove(uid),
      players: player ? arrayRemove(player) : []
    });
  });
}

// Delete a league entirely
export async function deleteLeague(leagueId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const leagueRef = doc(db, 'leagues', leagueId);
    const leagueDoc = await transaction.get(leagueRef);
    if (!leagueDoc.exists()) throw new Error('League not found');
    transaction.delete(leagueRef);
  });
}
