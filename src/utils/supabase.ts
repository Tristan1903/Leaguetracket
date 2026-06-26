import { createClient, Session } from '@supabase/supabase-js';
import { FactionType, League, LeaguePlayer, MatchReport } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// ----------------------------------------------------------------
// Auth helpers
// ----------------------------------------------------------------

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export function onAuthChange(callback: (session: Session | null) => void) {
  // Bootstrap with current session (handles page refresh where INITIAL_SESSION may not fire)
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return { unsubscribe: () => subscription.unsubscribe() };
}

export async function getProfile(uid: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();
  return { data, error };
}

export async function saveProfile(uid: string, updates: Record<string, any>) {
  const row = { id: uid, username: updates.username || 'Warlord', ...updates };
  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error && error.code === '23503') {
    // Foreign key violation — profiles table exists but no auth user row yet
    return { data: null, error };
  }
  return { data, error };
}

// ----------------------------------------------------------------
// Roster helpers
// ----------------------------------------------------------------

export interface RosterItem {
  id: string;
  user_id?: string;
  faction: FactionType;
  spearheadId?: string;
  customName?: string;
  notes: string;
  wins: number;
  losses: number;
  draws: number;
}

// Convert Supabase snake_case row to camelCase item
function toRosterItem(row: any): RosterItem {
  return {
    id: row.id,
    user_id: row.user_id,
    faction: row.faction as FactionType,
    spearheadId: row.spearhead_id,
    customName: row.custom_name,
    notes: row.notes || '',
    wins: row.wins || 0,
    losses: row.losses || 0,
    draws: row.draws || 0,
  };
}

// Convert camelCase item to Supabase snake_case row
function fromRosterItem(item: Partial<RosterItem>): any {
  const row: any = {};
  if (item.id) row.id = item.id;
  if (item.user_id) row.user_id = item.user_id;
  if (item.faction) row.faction = item.faction;
  if (item.spearheadId !== undefined) row.spearhead_id = item.spearheadId;
  if (item.customName !== undefined) row.custom_name = item.customName;
  if (item.notes !== undefined) row.notes = item.notes;
  if (item.wins !== undefined) row.wins = item.wins;
  if (item.losses !== undefined) row.losses = item.losses;
  if (item.draws !== undefined) row.draws = item.draws;
  return row;
}

export async function getRosters(uid: string) {
  const { data, error } = await supabase
    .from('rosters')
    .select('*')
    .eq('user_id', uid);
  return { data: (data || []).map(toRosterItem) as RosterItem[] | null, error };
}

export async function saveRosterItem(uid: string, item: Partial<RosterItem>) {
  const payload = { ...fromRosterItem(item), user_id: uid };
  const { data, error } = await supabase
    .from('rosters')
    .upsert(payload)
    .select()
    .single();
  return { data: data ? toRosterItem(data) as RosterItem : null, error };
}

export async function deleteRosterItem(itemId: string) {
  const { error } = await supabase.from('rosters').delete().eq('id', itemId);
  return { error };
}

// ----------------------------------------------------------------
// League helpers
// ----------------------------------------------------------------

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

type LeagueRow = {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  created_by: string;
  created_by_name: string;
  is_public: boolean;
  created_at: string;
};

type LeagueMemberRow = {
  league_id: string;
  user_id: string;
  username: string;
  role: 'admin' | 'member';
  joined_at: string;
};

type JoinRequestRow = {
  id: string;
  league_id: string;
  user_id: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
};

type LeaguePlayerRow = {
  id: string;
  league_id: string;
  name: string;
  faction: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  vp_scored: number;
  casualties_slain: number;
  underdog_wins: number;
  linked_uid: string | null;
};

type MatchRow = {
  id: string;
  league_id: string;
  date: string;
  player_a_name: string;
  player_a_faction: string;
  player_a_score: number;
  player_a_casualties: number;
  player_a_spearhead_name: string | null;
  player_a_enhancement_name: string | null;
  player_a_regiment_ability_name: string | null;
  player_b_name: string;
  player_b_faction: string;
  player_b_score: number;
  player_b_casualties: number;
  player_b_spearhead_name: string | null;
  player_b_enhancement_name: string | null;
  player_b_regiment_ability_name: string | null;
  winner: 'A' | 'B' | 'Draw';
  underdog_played: 'A' | 'B' | null;
  underdog_awarded: boolean;
  verification_code: string;
};

// Fetch all leagues members/players/requests for a set of league ids
async function hydrateLeagues(leagueIds: string[]): Promise<League[]> {
  if (leagueIds.length === 0) return [];

  const [membersRes, playersRes, requestsRes] = await Promise.all([
    supabase.from('league_members').select('*').in('league_id', leagueIds),
    supabase.from('league_players').select('*').in('league_id', leagueIds),
    supabase.from('league_join_requests').select('*').in('league_id', leagueIds).eq('status', 'pending'),
  ]);

  const membersMap = new Map<string, LeagueMemberRow[]>();
  (membersRes.data as LeagueMemberRow[] | null)?.forEach(m => {
    if (!membersMap.has(m.league_id)) membersMap.set(m.league_id, []);
    membersMap.get(m.league_id)!.push(m);
  });

  const playersMap = new Map<string, LeaguePlayerRow[]>();
  (playersRes.data as LeaguePlayerRow[] | null)?.forEach(p => {
    if (!playersMap.has(p.league_id)) playersMap.set(p.league_id, []);
    playersMap.get(p.league_id)!.push(p);
  });

  const requestsMap = new Map<string, JoinRequestRow[]>();
  (requestsRes.data as JoinRequestRow[] | null)?.forEach(r => {
    if (!requestsMap.has(r.league_id)) requestsMap.set(r.league_id, []);
    requestsMap.get(r.league_id)!.push(r);
  });

  // Fetch leagues
  const { data: leagueRows } = await supabase.from('leagues').select('*').in('id', leagueIds);
  return ((leagueRows as LeagueRow[]) || []).map(row => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    inviteCode: row.invite_code,
    createdAt: row.created_at,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    isPublic: row.is_public,
    memberUids: (membersMap.get(row.id) || []).map(m => m.user_id),
    members: (membersMap.get(row.id) || []).map(m => ({
      uid: m.user_id,
      username: m.username,
      role: m.role,
      joinedAt: m.joined_at,
    })),
    players: (playersMap.get(row.id) || []).map(p => ({
      id: p.id,
      name: p.name,
      faction: p.faction as FactionType,
      points: p.points,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      vpScored: p.vp_scored,
      casualtiesSlain: p.casualties_slain,
      underdogWins: p.underdog_wins,
      linkedUid: p.linked_uid || undefined,
    })),
    joinRequests: [],
    matches: [],
  }));
}

// Subscribe to public leagues via polling + realtime
export function subscribeToPublicLeagues(callback: (leagues: League[]) => void): () => void {
  let mounted = true;

  const fetch = async () => {
    const { data: rows } = await supabase
      .from('leagues')
      .select('id')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    const ids = (rows || []).map(r => r.id);
    if (!mounted) return;
    const hydrated = await hydrateLeagues(ids);
    if (mounted) callback(hydrated);
  };

  fetch();

  // Realtime subscription for changes
  const channel = supabase
    .channel('public-leagues')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'leagues', filter: 'is_public=eq.true' },
      () => { if (mounted) fetch(); }
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'league_members' },
      () => { if (mounted) fetch(); }
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'league_players' },
      () => { if (mounted) fetch(); }
    )
    .subscribe();

  return () => {
    mounted = false;
    supabase.removeChannel(channel);
  };
}

// Subscribe to user's leagues
export function subscribeToUserLeagues(uid: string, callback: (leagues: League[]) => void): () => void {
  let mounted = true;

  const fetch = async () => {
    const { data: memberRows } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', uid);

    const ids = (memberRows || []).map(r => r.league_id);
    if (!mounted) return;
    const hydrated = await hydrateLeagues(ids);
    if (mounted) callback(hydrated);
  };

  fetch();

  const channel = supabase
    .channel(`user-leagues-${uid}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'league_members', filter: `user_id=eq.${uid}` },
      () => { if (mounted) fetch(); }
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'leagues' },
      () => { if (mounted) fetch(); }
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'league_players' },
      () => { if (mounted) fetch(); }
    )
    .subscribe();

  return () => {
    mounted = false;
    supabase.removeChannel(channel);
  };
}

// Fetch matches for a league
async function fetchMatches(leagueId: string): Promise<MatchReport[]> {
  const { data: rows } = await supabase
    .from('matches')
    .select('*')
    .eq('league_id', leagueId)
    .order('date', { ascending: false });

  return ((rows as MatchRow[]) || []).map(r => ({
    id: r.id,
    date: r.date,
    leagueId: r.league_id,
    playerA: {
      name: r.player_a_name,
      faction: r.player_a_faction as FactionType,
      score: r.player_a_score,
      casualties: r.player_a_casualties,
      spearheadName: r.player_a_spearhead_name || undefined,
      enhancementName: r.player_a_enhancement_name || undefined,
      regimentAbilityName: r.player_a_regiment_ability_name || undefined,
    },
    playerB: {
      name: r.player_b_name,
      faction: r.player_b_faction as FactionType,
      score: r.player_b_score,
      casualties: r.player_b_casualties,
      spearheadName: r.player_b_spearhead_name || undefined,
      enhancementName: r.player_b_enhancement_name || undefined,
      regimentAbilityName: r.player_b_regiment_ability_name || undefined,
    },
    winner: r.winner,
    underdogPlayed: r.underdog_played as 'A' | 'B' | null,
    underdogAwarded: r.underdog_awarded,
    verificationCode: r.verification_code,
  }));
}

export function subscribeToLeague(leagueId: string, callback: (league: League | null) => void): () => void {
  let mounted = true;

  const fetch = async () => {
    const hydrated = await hydrateLeagues([leagueId]);
    if (!mounted) return;
    if (hydrated.length === 0) { callback(null); return; }
    const league = hydrated[0];
    league.matches = await fetchMatches(leagueId);
    if (mounted) callback(league);
  };

  fetch();

  const channel = supabase
    .channel(`league-${leagueId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'leagues', filter: `id=eq.${leagueId}` },
      () => { if (mounted) fetch(); }
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'league_members', filter: `league_id=eq.${leagueId}` },
      () => { if (mounted) fetch(); }
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'league_players', filter: `league_id=eq.${leagueId}` },
      () => { if (mounted) fetch(); }
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'matches', filter: `league_id=eq.${leagueId}` },
      () => { if (mounted) fetch(); }
    )
    .subscribe();

  return () => {
    mounted = false;
    supabase.removeChannel(channel);
  };
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

  // Ensure creator has a profile row (handles sign-ups before trigger existed)
  await supabase.from('profiles').upsert(
    { id: data.createdBy, username: data.createdByName },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  const { error: leagueError } = await supabase.from('leagues').insert({
    id: leagueId,
    name: data.name,
    description: data.description,
    invite_code: generateInviteCode(),
    created_by: data.createdBy,
    created_by_name: data.createdByName,
    is_public: true,
    created_at: now,
  });
  if (leagueError) throw new Error(leagueError.message);

  const { error: memberError } = await supabase.from('league_members').insert({
    league_id: leagueId,
    user_id: data.createdBy,
    username: data.createdByName,
    role: 'admin',
    joined_at: now,
  });
  if (memberError) throw new Error(memberError.message);

  const { error: playerError } = await supabase.from('league_players').insert({
    id: generateId('player'),
    league_id: leagueId,
    name: data.createdByName,
    faction: FactionType.STORMCAST,
    points: 0, wins: 0, losses: 0, draws: 0,
    vp_scored: 0, casualties_slain: 0, underdog_wins: 0,
    linked_uid: data.createdBy,
  });
  if (playerError) throw new Error(playerError.message);

  return leagueId;
}

// Request to join
export async function requestJoinLeague(leagueId: string, uid: string, username: string): Promise<void> {
  const { error } = await supabase.from('league_join_requests').insert({
    league_id: leagueId,
    user_id: uid,
    username,
    status: 'pending',
  });
  if (error) {
    if (error.code === '23505') throw new Error('Join request already submitted');
    throw new Error(error.message);
  }
}

// Approve join request
export async function approveJoinRequest(leagueId: string, uid: string, username: string): Promise<void> {
  const now = new Date().toISOString();

  // Delete all pending requests from this user
  const { error: delError } = await supabase
    .from('league_join_requests')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', uid);
  if (delError) throw new Error(delError.message);

  const { error: memberError } = await supabase.from('league_members').insert({
    league_id: leagueId,
    user_id: uid,
    username,
    role: 'member',
    joined_at: now,
  });
  if (memberError) throw new Error(memberError.message);

  const { error: playerError } = await supabase.from('league_players').insert({
    id: generateId('player'),
    league_id: leagueId,
    name: username,
    faction: FactionType.STORMCAST,
    points: 0, wins: 0, losses: 0, draws: 0,
    vp_scored: 0, casualties_slain: 0, underdog_wins: 0,
    linked_uid: uid,
  });
  if (playerError) throw new Error(playerError.message);
}

// Reject join request
export async function rejectJoinRequest(leagueId: string, uid: string): Promise<void> {
  const { error } = await supabase
    .from('league_join_requests')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', uid);
  if (error) throw new Error(error.message);
}

// Promote member to admin
export async function promoteToAdmin(leagueId: string, targetUid: string): Promise<void> {
  const { error } = await supabase
    .from('league_members')
    .update({ role: 'admin' })
    .eq('league_id', leagueId)
    .eq('user_id', targetUid);
  if (error) throw new Error(error.message);
}

// Demote admin to member
export async function demoteFromAdmin(leagueId: string, targetUid: string): Promise<void> {
  // Check admin count first
  const { data: admins } = await supabase
    .from('league_members')
    .select('*', { count: 'exact' })
    .eq('league_id', leagueId)
    .eq('role', 'admin');

  if ((admins?.length || 0) <= 1) throw new Error('Cannot demote the last admin');

  const { error } = await supabase
    .from('league_members')
    .update({ role: 'member' })
    .eq('league_id', leagueId)
    .eq('user_id', targetUid);
  if (error) throw new Error(error.message);
}

// Add match to league
export async function addMatchToLeague(leagueId: string, report: MatchReport): Promise<void> {
  const now = new Date().toISOString();

  const { error: matchError } = await supabase.from('matches').insert({
    id: report.id,
    league_id: leagueId,
    date: now,
    player_a_name: report.playerA.name,
    player_a_faction: report.playerA.faction,
    player_a_score: report.playerA.score,
    player_a_casualties: report.playerA.casualties,
    player_a_spearhead_name: report.playerA.spearheadName || null,
    player_a_enhancement_name: report.playerA.enhancementName || null,
    player_a_regiment_ability_name: report.playerA.regimentAbilityName || null,
    player_b_name: report.playerB.name,
    player_b_faction: report.playerB.faction,
    player_b_score: report.playerB.score,
    player_b_casualties: report.playerB.casualties,
    player_b_spearhead_name: report.playerB.spearheadName || null,
    player_b_enhancement_name: report.playerB.enhancementName || null,
    player_b_regiment_ability_name: report.playerB.regimentAbilityName || null,
    winner: report.winner,
    underdog_played: report.underdogPlayed,
    underdog_awarded: report.underdogAwarded,
    verification_code: report.verificationCode || '',
  });
  if (matchError) {
    if (matchError.code === '23505') throw new Error('Duplicate match');
    throw new Error(matchError.message);
  }

  // Update player standings
  const { data: players } = await supabase
    .from('league_players')
    .select('*')
    .eq('league_id', leagueId);

  let playerList = (players as LeaguePlayerRow[]) || [];

  const ensurePlayer = async (name: string, faction: string, linkedUid?: string) => {
    let player = playerList.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!player) {
      const newPlayer = {
        id: generateId('player'),
        league_id: leagueId,
        name,
        faction,
        points: 0, wins: 0, losses: 0, draws: 0,
        vp_scored: 0, casualties_slain: 0, underdog_wins: 0,
        linked_uid: linkedUid || null,
      };
      const { data: inserted } = await supabase.from('league_players').insert(newPlayer).select().single();
      if (inserted) {
        playerList.push(inserted as LeaguePlayerRow);
        return inserted as LeaguePlayerRow;
      }
    }
    return player;
  };

  const playerA = await ensurePlayer(report.playerA.name, report.playerA.faction);
  const playerB = await ensurePlayer(report.playerB.name, report.playerB.faction);

  if (playerA && playerB) {
    const updates: Record<string, number> = {};
    if (report.winner === 'A') {
      updates.points = (playerA.points || 0) + 3;
      updates.wins = (playerA.wins || 0) + 1;
      updates.losses = (playerB.losses || 0) + 1;
      if (report.underdogPlayed === 'A') updates.underdog_wins = (playerA.underdog_wins || 0) + 1;
    } else if (report.winner === 'B') {
      updates.points = (playerB.points || 0) + 3;
      updates.wins = (playerB.wins || 0) + 1;
      updates.losses = (playerA.losses || 0) + 1;
      if (report.underdogPlayed === 'B') updates.underdog_wins = (playerB.underdog_wins || 0) + 1;
    } else {
      updates.points = (playerA.points || 0) + 1;
      updates.draws = (playerA.draws || 0) + 1;
      // player B updates done in second call
    }

    await supabase.from('league_players').update({
      points: (playerA.points || 0) + (report.winner === 'A' ? 3 : report.winner === 'Draw' ? 1 : 0),
      wins: (playerA.wins || 0) + (report.winner === 'A' ? 1 : 0),
      losses: (playerA.losses || 0) + (report.winner === 'B' ? 1 : 0),
      draws: (playerA.draws || 0) + (report.winner === 'Draw' ? 1 : 0),
      vp_scored: (playerA.vp_scored || 0) + report.playerA.score,
      casualties_slain: (playerA.casualties_slain || 0) + report.playerB.casualties,
      underdog_wins: (playerA.underdog_wins || 0) + (report.underdogPlayed === 'A' ? 1 : 0),
    }).eq('id', playerA.id);

    await supabase.from('league_players').update({
      points: (playerB.points || 0) + (report.winner === 'B' ? 3 : report.winner === 'Draw' ? 1 : 0),
      wins: (playerB.wins || 0) + (report.winner === 'B' ? 1 : 0),
      losses: (playerB.losses || 0) + (report.winner === 'A' ? 1 : 0),
      draws: (playerB.draws || 0) + (report.winner === 'Draw' ? 1 : 0),
      vp_scored: (playerB.vp_scored || 0) + report.playerB.score,
      casualties_slain: (playerB.casualties_slain || 0) + report.playerA.casualties,
      underdog_wins: (playerB.underdog_wins || 0) + (report.underdogPlayed === 'B' ? 1 : 0),
    }).eq('id', playerB.id);
  }
}

// Leave a league
export async function leaveLeague(leagueId: string, uid: string): Promise<void> {
  const { data: memberRow } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', uid)
    .single();

  if (!memberRow) throw new Error('Not a member');

  if ((memberRow as any).role === 'admin') {
    const { count } = await supabase
      .from('league_members')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('role', 'admin');
    if (count && count <= 1) throw new Error('Cannot leave as the last admin');
  }

  await supabase.from('league_members').delete().eq('league_id', leagueId).eq('user_id', uid);
  await supabase.from('league_players').delete().eq('league_id', leagueId).eq('linked_uid', uid);
}

// Delete a league
export async function deleteLeague(leagueId: string): Promise<void> {
  // CASCADE handles related tables
  const { error } = await supabase.from('leagues').delete().eq('id', leagueId);
  if (error) throw new Error(error.message);
}

// Check if a join request is pending
export async function getPendingRequest(leagueId: string, uid: string): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('league_join_requests')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', uid)
    .eq('status', 'pending')
    .maybeSingle();
  return data;
}
