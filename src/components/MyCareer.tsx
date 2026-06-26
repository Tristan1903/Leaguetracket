import React, { useState, useEffect } from 'react';
import { MatchReport, FactionType } from '../types';
import { FACTIONS } from '../data/factions';
import { ALL_SPEARHEADS, getSpearheadsByFaction } from '../utils/spearheadLoader';
import { useToast } from './Toast';
import { 
  supabase, signIn, signUp, signOut as supabaseSignOut, 
  onAuthChange, getProfile, saveProfile,
  getRosters, saveRosterItem, deleteRosterItem, RosterItem 
} from '../utils/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
  uid: string;
  email: string;
  username: string;
  roster: RosterItem[];
  favFaction: string | null;
}
import { 
  Trophy, 
  Sword, 
  Shield, 
  Activity, 
  User, 
  BookOpen, 
  Clock, 
  Trash2, 
  Edit, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Plus, 
  Sparkles, 
  Mail, 
  Lock, 
  Check, 
  X,
  FileText
} from 'lucide-react';

interface MyCareerProps {
  onSelectFaction: (faction: FactionType) => void;
  gameHistory: MatchReport[];
  onClearHistory: () => void;
}

export default function MyCareer({ onSelectFaction, gameHistory, onClearHistory }: MyCareerProps) {
  // Authentication & Profile States
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Profile customization states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Roster Management States
  const [showAddRosterForm, setShowAddRosterForm] = useState(false);
  const [rosterFaction, setRosterFaction] = useState<FactionType>(FactionType.STORMCAST);
  const [rosterSpearheadId, setRosterSpearheadId] = useState('');
  const [rosterCustomName, setRosterCustomName] = useState('');
  const [rosterNotes, setRosterNotes] = useState('');
  const [rosterWins, setRosterWins] = useState(0);
  const [rosterLosses, setRosterLosses] = useState(0);
  const [rosterDraws, setRosterDraws] = useState(0);

  // State to support editing an existing roster item
  const [editingRosterId, setEditingRosterId] = useState<string | null>(null);

  const { showToast } = useToast();

  // Monitor auth state changes via Supabase
  useEffect(() => {
    const unsubscribe = onAuthChange(async (session) => {
      const sbUser = session?.user || null;
      setUser(sbUser);
      if (sbUser) {
        setAuthLoading(true);
        try {
          const { data: profileData } = await getProfile(sbUser.id);
          const { data: rosterData } = await getRosters(sbUser.id);

          const username = profileData?.username || sbUser.email?.split('@')[0] || 'Warlord';
          setProfile({
            uid: sbUser.id,
            email: sbUser.email || '',
            username,
            roster: rosterData || [],
            favFaction: profileData?.fav_faction || null,
          });
          setEditedName(username);
        } catch (err: any) {
          console.error("Error loading user profile:", err);
        } finally {
          setAuthLoading(false);
        }
      } else {
        setProfile(null);
      }
    });

    return () => unsubscribe.unsubscribe();
  }, []);

  // Set default spearhead whenever roster faction changes
  useEffect(() => {
    const available = getSpearheadsByFaction(rosterFaction);
    if (available.length > 0) {
      setRosterSpearheadId(available[0].id);
    } else {
      setRosterSpearheadId('');
    }
  }, [rosterFaction]);

  // Auth Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email || !password) {
      setAuthError('Email and password must be filled.');
      return;
    }
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        if (!usernameInput.trim()) {
          setAuthError('Please enter a custom warlord handle.');
          setAuthLoading(false);
          return;
        }
        const { error } = await signUp(email, password);
        if (error) throw error;

        // Update profile username via Supabase
        const session = (await supabase.auth.getSession()).data.session;
        if (session?.user) {
          await saveProfile(session.user.id, { username: usernameInput.trim() });
        }
      }
      setEmail('');
      setPassword('');
      setUsernameInput('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'invalid_credentials') {
        setAuthError('Incorrect email or credentials.');
      } else if (err.code === 'email_already_exists' || err.message?.includes('already registered')) {
        setAuthError('This email is already registered.');
      } else if (err.code === 'weak_password' || err.message?.includes('weak')) {
        setAuthError('Password must exceed 6 characters.');
      } else {
        setAuthError(err.message || 'Authentication error.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabaseSignOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
    } catch (err: any) {
      console.error("Logout failed:", err);
    }
  };

  // Profile display name update
  const handleSaveDisplayName = async () => {
    if (!profile || !user || !editedName.trim()) return;

    try {
      await saveProfile(user.id, { username: editedName.trim() });
      setProfile({
        ...profile,
        username: editedName.trim()
      });
      setIsEditingName(false);
    } catch (err) {
      console.error("Display name update failed:", err);
    }
  };

  // Add / Edit Roster Force Handler
  const handleSaveRosterForce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    const chosenSpearhead = ALL_SPEARHEADS.find(s => s.id === rosterSpearheadId);
    const spearheadLabel = chosenSpearhead ? chosenSpearhead.spearheadName : 'Custom Host';

    const itemData: Partial<RosterItem> = {
      id: editingRosterId || Math.random().toString(36).substring(2, 11),
      faction: rosterFaction,
      spearheadId: rosterSpearheadId,
      customName: rosterCustomName.trim() || `${FACTIONS[rosterFaction]?.name} Detachment`,
      notes: rosterNotes.trim(),
      wins: Number(rosterWins) || 0,
      losses: Number(rosterLosses) || 0,
      draws: Number(rosterDraws) || 0,
    };

    if (!editingRosterId && profile.roster.length >= 3) {
      showToast("Maximum roster limit of 3 forces reached.", 'info');
      return;
    }

    try {
      await saveRosterItem(user.id, itemData);

      // Refresh roster from Supabase
      const { data: freshRosters } = await getRosters(user.id);

      const counts: Record<string, number> = {};
      (freshRosters || []).forEach(v => {
        counts[v.faction] = (counts[v.faction] || 0) + 1;
      });
      let topFaction: string | null = null;
      let maxC = 0;
      Object.entries(counts).forEach(([f, c]) => {
        if (c > maxC) { maxC = c; topFaction = f; }
      });

      // Update profile favFaction
      if (topFaction) {
        await saveProfile(user.id, { fav_faction: topFaction });
      }

      setProfile({
        ...profile,
        roster: freshRosters || [],
        favFaction: topFaction as FactionType | null,
      });

      setShowAddRosterForm(false);
      setEditingRosterId(null);
      setRosterCustomName('');
      setRosterNotes('');
      setRosterWins(0);
      setRosterLosses(0);
      setRosterDraws(0);
    } catch (err) {
      console.error("Failed to commit roster update:", err);
    }
  };

  const handleEditRosterClick = (item: RosterItem) => {
    setEditingRosterId(item.id);
    setRosterFaction(item.faction);
    setRosterSpearheadId(item.spearheadId);
    setRosterCustomName(item.customName);
    setRosterNotes(item.notes);
    setRosterWins(item.wins);
    setRosterLosses(item.losses);
    setRosterDraws(item.draws);
    setShowAddRosterForm(true);
  };

  const handleDeleteRosterItem = async (itemId: string) => {
    if (!profile || !user) return;
    if (!confirm("Are you sure you want to dismiss this army from your active battle standard roster?")) return;

    try {
      const { error } = await deleteRosterItem(itemId);
      if (error) throw error;
      const { data: freshRosters } = await getRosters(user.id);
      setProfile({
        ...profile,
        roster: freshRosters || []
      });
    } catch (err) {
      console.error("Failed to remove roster item:", err);
    }
  };

  // Fallback / Display name resolution
  const activeWarlordName = profile ? profile.username : (localStorage.getItem('sgc_username') || 'Grand Marshal');

  // Let's compute career statistics based on either cloud wins + matches or local gameHistory
  const localGames = gameHistory.length;
  let localWins = 0;
  let localLosses = 0;
  let localDraws = 0;
  let localVP = 0;
  let localSlain = 0;

  const localFactionCounts: Record<FactionType, number> = {} as any;
  Object.values(FactionType).forEach((f) => {
    localFactionCounts[f] = 0;
  });

  gameHistory.forEach((match) => {
    const isPlayerA = match.playerA.name === activeWarlordName;
    const isPlayerB = match.playerB.name === activeWarlordName;

    if (isPlayerA) {
      localVP += match.playerA.score;
      localSlain += match.playerB.casualties;
      
      const faction = match.playerA.faction;
      localFactionCounts[faction] = (localFactionCounts[faction] || 0) + 1;
      if (match.winner === 'A') localWins++;
      else if (match.winner === 'B') localLosses++;
      else localDraws++;
    } else if (isPlayerB) {
      localVP += match.playerB.score;
      localSlain += match.playerA.casualties;

      const faction = match.playerB.faction;
      localFactionCounts[faction] = (localFactionCounts[faction] || 0) + 1;
      if (match.winner === 'B') localWins++;
      else if (match.winner === 'A') localLosses++;
      else localDraws++;
    } else {
      // fallback
      localVP += match.playerA.score;
      localSlain += match.playerB.casualties;
      const faction = match.playerA.faction;
      localFactionCounts[faction] = (localFactionCounts[faction] || 0) + 1;
      if (match.winner === 'A') localWins++;
      else if (match.winner === 'B') localLosses++;
      else localDraws++;
    }
  });

  // Blend Roster individual stats + local list game stats
  let totalWins = localWins;
  let totalLosses = localLosses;
  let totalDraws = localDraws;
  let totalGames = localGames;

  if (profile && profile.roster.length > 0) {
    profile.roster.forEach(r => {
      totalWins += r.wins;
      totalLosses += r.losses;
      totalDraws += r.draws;
    });
    totalGames = totalWins + totalLosses + totalDraws;
  }

  const overallWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const getFactionColors = (faction: FactionType) => {
    switch (faction) {
      case FactionType.STORMCAST: return 'border-amber-500 bg-amber-500/10 text-amber-400';
      case FactionType.SKAVEN: return 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
      case FactionType.KHORNE: return 'border-red-600 bg-red-600/10 text-red-500';
      case FactionType.SLAANESH: return 'border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-400';
      case FactionType.TZEENTCH: return 'border-cyan-500 bg-cyan-500/10 text-cyan-400';
      case FactionType.SERAPHON: return 'border-teal-500 bg-teal-500/10 text-teal-450';
      case FactionType.SYLVANETH: return 'border-green-600 bg-green-600/10 text-green-400';
      case FactionType.SLAVES: return 'border-indigo-500 bg-indigo-500/10 text-indigo-400';
      case FactionType.SOULBLIGHT: return 'border-violet-600 bg-violet-600/10 text-violet-400';
      case FactionType.SONS: return 'border-rose-700 bg-rose-700/10 text-rose-450';
      case FactionType.NURGLE: return 'border-lime-700 bg-lime-700/10 text-lime-450';
      case FactionType.KHARADRON: return 'border-orange-500 bg-orange-500/10 text-orange-400';
      case FactionType.CITIES_OF_SIGMAR: return 'border-sky-700 bg-sky-700/10 text-sky-400';
      case FactionType.NIGHTHAUNT: return 'border-emerald-400 bg-emerald-400/5 text-emerald-350';
      case FactionType.FLESH_EATER: return 'border-rose-600 bg-rose-600/10 text-rose-500';
      case FactionType.IDONETH: return 'border-blue-600 bg-blue-600/10 text-blue-400';
      case FactionType.DAUGHTERS: return 'border-pink-600 bg-pink-600/10 text-pink-400';
      case FactionType.OGOR_MAWTRIBES: return 'border-zinc-500 bg-zinc-500/10 text-zinc-350';
      case FactionType.OSSIARCH: return 'border-yellow-600 bg-yellow-600/10 text-yellow-500';
      case FactionType.GLOOMSPITE: return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      case FactionType.LUMINETH: return 'border-cyan-400 bg-cyan-400/10 text-cyan-300';
      case FactionType.ORRUK_WARCLANS: return 'border-green-700 bg-green-700/10 text-green-500';
      case FactionType.HELFORGE: return 'border-orange-600 bg-orange-600/10 text-orange-500';
      case FactionType.FYRESLAYERS: return 'border-amber-600 bg-amber-600/10 text-amber-500';
      default: return 'border-zinc-700 bg-zinc-800 text-zinc-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Profiler Card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-linear-to-b from-zinc-900 via-zinc-900 to-black p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-400/10 text-amber-400">
              <User className="h-7 w-7" />
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
              </span>
            </div>

            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter warlord name"
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm font-semibold text-white outline-hidden focus:border-amber-500"
                    maxLength={16}
                    id="warlord-name-input"
                  />
                  <button
                    onClick={handleSaveDisplayName}
                    className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-black hover:bg-amber-400 cursor-pointer"
                    id="save-warlord-name-btn"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                    id="cancel-warlord-name-btn"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-black tracking-tight text-white">
                    {activeWarlordName}
                  </h2>
                  {profile && (
                    <button
                      onClick={() => {
                        setEditedName(profile.username);
                        setIsEditingName(true);
                      }}
                      className="text-zinc-500 hover:text-amber-400 transition"
                      id="edit-warlord-name-btn"
                      title="Edit Display Name"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-[9px] text-zinc-500 uppercase">Mortal Realms Campaigner</span>
                {profile ? (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 font-mono px-1.5 py-0.2 rounded border border-amber-500/20">
                    ☁️ Cloud Sync Live
                  </span>
                ) : (
                  <span className="text-[9px] bg-zinc-800 text-zinc-400 font-mono px-1.5 py-0.2 rounded">
                    💾 Offline Mode Only
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-center">
              <span className="block font-mono text-xs text-zinc-400">Combat winrate</span>
              <span className="font-sans text-xl font-black text-amber-400">{overallWinRate}%</span>
            </div>
            {profile && (
              <button
                onClick={handleSignOut}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 hover:border-red-500/40 bg-zinc-900/60 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                id="warlord-signout-btn"
                title="Warlord Logout"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>

        {/* Ambient background light */}
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      {/* Ranged Status Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-semibold">Tale of battles</span>
            <Activity className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">{totalGames}</p>
          <span className="text-xs text-zinc-500">total games logged</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-semibold">Victories</span>
            <Trophy className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-400">{totalWins}</p>
          <span className="text-xs text-emerald-500">wins achieved</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-semibold">Draws & Losses</span>
            <Shield className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-zinc-300">
            {totalDraws} <span className="text-sm text-zinc-500">/</span> {totalLosses}
          </p>
          <span className="text-xs text-zinc-500">balance tally</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-semibold">favored faction</span>
            <Sword className="h-4 w-4 text-purple-400" />
          </div>
          {profile && profile.favFaction ? (
            <p className="mt-2 text-sm font-bold text-white truncate">
              {FACTIONS[profile.favFaction]?.name || profile.favFaction}
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-500 font-medium">None configured</p>
          )}
          <span className="text-xs text-zinc-500">most active army</span>
        </div>
      </div>

      {/* CLOUD WARLORD ACCOUNT SETUP BUTTONS (WHEN LOGGED OUT) */}
      {!profile && (
        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-medium text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-amber-500 animate-pulse" /> Unlock Warlord Cloud Conclave ☁️
              </h3>
              <p className="text-xs text-zinc-400 max-w-2xl mt-1 font-mono">
                Claim your custom email conisgned profile to register independent personal statistics, configure up to 3 custom roster armies with individual battle tallies, and synchronize instantly across phones.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  authMode === 'login' 
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' 
                    : 'text-zinc-400 bg-zinc-900 border border-zinc-800 hover:text-white'
                }`}
                id="auth-mode-login-tab"
              >
                <LogIn className="h-3.5 w-3.5" /> Sign In
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  authMode === 'signup' 
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' 
                    : 'text-zinc-400 bg-zinc-900 border border-zinc-800 hover:text-white'
                }`}
                id="auth-mode-signup-tab"
              >
                <UserPlus className="h-3.5 w-3.5" /> Create Roster ID
              </button>
            </div>
          </div>

          <form onSubmit={handleAuth} className="border-t border-zinc-900 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="warlord@sigmar.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-8.5 pr-3 py-2 text-xs text-white focus:border-amber-500 outline-hidden font-mono"
                  id="auth-email-input"
                />
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-600" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-8.5 pr-3 py-2 text-xs text-white focus:border-amber-500 outline-hidden font-mono"
                  id="auth-password-input"
                />
                <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-600" />
              </div>
            </div>

            {authMode === 'signup' ? (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Warlord Handle</label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. Grand Marshal Tristan"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500 outline-hidden font-mono"
                  id="auth-username-input"
                />
              </div>
            ) : (
              <div className="flex items-center text-[11px] text-zinc-500 font-mono py-2 italic">
                Logs and sessions will back up securely to database.
              </div>
            )}

            <div className="md:col-span-3 flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
              {authError && (
                <span className="text-xs text-red-400 font-mono bg-red-500/5 px-2.5 py-1.5 rounded-lg border border-red-500/20 max-w-md">
                  ⚠️ {authError}
                </span>
              )}
              {!authError && <div />}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full md:w-auto bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-2 px-5 rounded-xl transition cursor-pointer select-none shadow-md"
                id="auth-submit-btn"
              >
                {authLoading ? 'Communicating to Heavens...' : authMode === 'login' ? 'Proceed to Conclave' : 'Inscribe My War Seal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ACTIVE ROSTER COMPONENT (ONLY FOR AUTHENTICATED USERS) */}
      {profile && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
            <div>
              <h3 className="font-display font-black text-sm text-white tracking-tight uppercase flex items-center gap-1.5">
                ⚔️ Custom Warband Roster ({profile.roster.length}/3)
              </h3>
              <span className="block font-mono text-[10px] text-zinc-500 mt-1 max-w-xl leading-relaxed">
                Configure up to 3 individual war forces. For each, pick their faction, specify their active Spearhead command deck, and monitor their separate battle logs.
              </span>
            </div>

            {profile.roster.length < 3 && !showAddRosterForm && (
              <button
                onClick={() => {
                  setEditingRosterId(null);
                  setRosterCustomName('');
                  setRosterNotes('');
                  setRosterWins(0);
                  setRosterLosses(0);
                  setRosterDraws(0);
                  setShowAddRosterForm(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-black bg-amber-500 hover:bg-amber-400 rounded-xl transition cursor-pointer select-none"
                id="add-roster-btn"
              >
                <Plus className="h-4 w-4" /> Enlist New Army
              </button>
            )}
          </div>

          {/* Enlist / Edit form */}
          {showAddRosterForm && (
            <form onSubmit={handleSaveRosterForce} className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4 max-w-3xl mx-auto">
              <h4 className="font-display text-white text-xs font-bold uppercase tracking-wider flex items-center justify-between border-b border-zinc-850 pb-2">
                <span>{editingRosterId ? 'Modify War Standard' : 'Inscribe New Force to Roster'}</span>
                <button
                  type="button"
                  onClick={() => setShowAddRosterForm(false)}
                  className="text-zinc-500 hover:text-white"
                  title="Close Form"
                >
                  <X className="h-4 w-4" />
                </button>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase font-mono">Faction Standard</label>
                  <select
                    value={rosterFaction}
                    onChange={(e) => setRosterFaction(e.target.value as FactionType)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 outline-hidden font-medium cursor-pointer"
                    id="roster-faction-select"
                  >
                    {Object.values(FACTIONS).map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase font-mono">Spearhead Force rules</label>
                  <select
                    value={rosterSpearheadId}
                    onChange={(e) => setRosterSpearheadId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 outline-hidden font-medium cursor-pointer"
                    id="roster-spearhead-select"
                  >
                    {getSpearheadsByFaction(rosterFaction).map(s => (
                      <option key={s.id} value={s.id}>{s.spearheadName}</option>
                    ))}
                    {getSpearheadsByFaction(rosterFaction).length === 0 && (
                      <option value="">-- Generic Host --</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase font-mono">Custom Force Title</label>
                  <input
                    type="text"
                    value={rosterCustomName}
                    onChange={(e) => setRosterCustomName(e.target.value)}
                    placeholder="e.g. Scions of the Burning Skull"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 outline-hidden font-mono"
                    id="roster-customname-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase font-mono">General Notes</label>
                  <input
                    type="text"
                    value={rosterNotes}
                    onChange={(e) => setRosterNotes(e.target.value)}
                    placeholder="e.g. Heavy Vanguard focus, aggressive tactics"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 outline-hidden font-mono"
                    id="roster-notes-input"
                  />
                </div>

                {/* Optional manually adjustable stat tallies for this army */}
                <div className="md:col-span-2 grid grid-cols-3 gap-2.5 border-t border-zinc-850 pt-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase font-mono">Wins</label>
                    <input
                      type="number"
                      value={rosterWins}
                      onChange={(e) => setRosterWins(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase font-mono">Losses</label>
                    <input
                      type="number"
                      value={rosterLosses}
                      onChange={(e) => setRosterLosses(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase font-mono">Draws</label>
                    <input
                      type="number"
                      value={rosterDraws}
                      onChange={(e) => setRosterDraws(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-850 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddRosterForm(false)}
                  className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white transition cursor-pointer select-none font-medium"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-1.5 px-4 rounded-xl transition cursor-pointer select-none"
                  id="save-roster-item-btn"
                >
                  {editingRosterId ? 'Commit Modifications' : 'Warrant New Army Force'}
                </button>
              </div>
            </form>
          )}

          {/* Roster list */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profile.roster.map((item) => {
              const specObj = ALL_SPEARHEADS.find(s => s.id === item.spearheadId);
              const spearheadName = specObj ? specObj.spearheadName : 'Default Regiment';
              const rTotal = item.wins + item.losses + item.draws;
              const rWinrate = rTotal > 0 ? Math.round((item.wins / rTotal) * 100) : 0;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between p-4.5 rounded-xl border ${getFactionColors(item.faction)} relative overflow-hidden`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="text-[9px] font-mono tracking-widest uppercase border border-white/15 px-2 py-0.5 rounded-full text-zinc-300">
                        {FACTIONS[item.faction]?.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditRosterClick(item)}
                          className="p-1 rounded text-zinc-400 hover:text-amber-400 transition"
                          title="Modify Settings"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteRosterItem(item.id)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 transition"
                          title="Dismiss Force"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="font-display font-black text-sm text-white truncate max-w-[170px]" title={item.customName}>
                        {item.customName}
                      </h4>
                      <p className="font-mono text-[10px] text-amber-500 font-bold flex items-center gap-1">
                        🛡️ {spearheadName}
                      </p>
                    </div>

                    {item.notes && (
                      <p className="text-[10px] text-zinc-400 block line-clamp-2 italic font-mono leading-relaxed bg-black/3 py-1 border-t border-zinc-900 mt-1">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  <div className="border-t border-zinc-900/60 pt-2.5 mt-3 flex justify-between items-center text-[10px] font-mono">
                    <div className="text-zinc-400">
                      Record: <strong className="text-white">{item.wins}W</strong> - <strong className="text-white">{item.losses}L</strong>
                    </div>
                    <div className="text-amber-500 font-bold">
                      {rWinrate}% winrate
                    </div>
                  </div>
                </div>
              );
            })}

            {profile.roster.length === 0 && !showAddRosterForm && (
              <div
                onClick={() => {
                  setEditingRosterId(null);
                  setRosterCustomName('');
                  setRosterNotes('');
                  setRosterWins(0);
                  setRosterLosses(0);
                  setRosterDraws(0);
                  setShowAddRosterForm(true);
                }}
                className="col-span-3 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-zinc-800 rounded-xl hover:border-amber-500/35 hover:bg-zinc-900/5 transition cursor-pointer group"
              >
                <Plus className="h-6 w-6 text-zinc-500 group-hover:text-amber-500 transition mb-2" />
                <p className="text-xs text-white font-bold uppercase tracking-wider">Your personal roster is currently vacant</p>
                <p className="text-[11px] text-zinc-500 mt-1">Deploy an army standard (max 3) to configure your own warlord combat statistics.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Campaign Log and Narrative guides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Rules & Narrative Quick-Ref */}
        <div className="lg:col-span-1 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <BookOpen className="h-5 w-5" />
            <h3 className="font-display font-black text-white tracking-tight text-sm uppercase">Spearhead Codex</h3>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Spearhead (AoS) is a swift, highly tactical format using fixed warbands and dedicated decks. Victory belongs to generals who master positioning and phase maneuvers.
          </p>

          <div className="border-t border-zinc-800 pt-3">
            <h4 className="text-xs font-bold text-zinc-300 mb-2">Primary Combat Standards:</h4>
            <ul className="text-xs text-zinc-500 space-y-2">
              <li className="flex items-start gap-1">
                <span className="text-amber-500 font-bold">•</span>
                <span>Matches terminate tightly at the end of **Turn 4**.</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-amber-500 font-bold">•</span>
                <span>The **Underdog** is determined based on VP differences, unlocking unique powerful tacticals.</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-amber-500 font-bold">•</span>
                <span>Resource mechanics (Blood Tithe, Depravity, etc.) enable devastating faction behaviors.</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-zinc-800 pt-3">
            <h4 className="text-xs font-bold text-zinc-300 mb-2">Faction Directory</h4>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {Object.values(FACTIONS).map((fact) => (
                <button
                  key={fact.id}
                  onClick={() => onSelectFaction(fact.id)}
                  className={`text-[10px] font-mono p-1 text-left rounded-md border text-xs truncate transition ${getFactionColors(fact.id)} hover:scale-105 active:scale-95 cursor-pointer`}
                  id={`career-faction-${fact.id}`}
                >
                  {fact.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Battle History */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="h-5 w-5" />
              <h3 className="font-display font-black text-white tracking-tight text-sm uppercase">Chronicles of Valor</h3>
            </div>
            {gameHistory.length > 0 && (
              <button
                onClick={onClearHistory}
                className="flex items-center gap-1.5 text-xs text-red-500/80 hover:text-red-400 font-medium transition py-1 px-2.5 rounded-lg border border-red-500/20 hover:bg-red-500/5 cursor-pointer"
                id="clear-history-btn"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Chronology
              </button>
            )}
          </div>

          {gameHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800 rounded-xl">
              <p className="text-sm text-zinc-400 font-medium">Your war scrolls are currently clean.</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-xs">Use "Quick Play" or create a "League" match to log your first combat and record your warlord legacy.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {gameHistory.map((match) => {
                const isWinner =
                  (match.winner === 'A' && match.playerA.name === activeWarlordName) ||
                  (match.winner === 'B' && match.playerB.name === activeWarlordName);
                const isDraw = match.winner === 'Draw';

                return (
                  <div
                    key={match.id}
                    className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700/80 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full font-bold ${
                          isDraw ? 'bg-zinc-800 text-zinc-400' : isWinner ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {isDraw ? 'Draw' : isWinner ? 'Victory' : 'Defeat'}
                        </span>
                        {match.leagueId && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                            League
                          </span>
                        )}
                        <span className="font-mono text-xs text-zinc-500">
                          {new Date(match.date).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-white max-w-[120px] truncate">{match.playerA.name}</span>
                          <span className="text-xs text-zinc-500 font-mono italic">
                            {FACTIONS[match.playerA.faction]?.name}
                          </span>
                          {match.playerA.spearheadName && (
                            <span className="text-[10px] text-amber-500/85 font-mono leading-none mt-1">
                              🛡️ {match.playerA.spearheadName}
                            </span>
                          )}
                          {match.playerA.enhancementName && (
                            <span className="text-[9px] text-zinc-500 font-mono italic mt-0.5" title="Enhancement Selected">
                              ✦ {match.playerA.enhancementName}
                            </span>
                          )}
                        </div>
                        <span className="font-black text-amber-500 text-lg px-2 bg-zinc-900 rounded border border-zinc-800 self-start mt-1">
                          {match.playerA.score}
                        </span>
                        <span className="text-xs text-zinc-600 font-bold font-mono self-start mt-2">VS</span>
                        <span className="font-black text-amber-500 text-lg px-2 bg-zinc-900 rounded border border-zinc-800 self-start mt-1">
                          {match.playerB.score}
                        </span>
                        <div className="flex flex-col text-right md:text-left">
                          <span className="font-bold text-white max-w-[120px] truncate">{match.playerB.name}</span>
                          <span className="text-xs text-zinc-500 font-mono italic">
                            {FACTIONS[match.playerB.faction]?.name}
                          </span>
                          {match.playerB.spearheadName && (
                            <span className="text-[10px] text-amber-500/85 font-mono leading-none mt-1">
                              🛡️ {match.playerB.spearheadName}
                            </span>
                          )}
                          {match.playerB.enhancementName && (
                            <span className="text-[9px] text-zinc-500 font-mono italic mt-0.5" title="Enhancement Selected">
                              ✦ {match.playerB.enhancementName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-end gap-2 pr-1 border-t md:border-t-0 border-zinc-900 pt-2 md:pt-0 justify-between md:justify-start">
                      <div className="text-[11px] text-zinc-500 font-semibold font-mono flex items-center gap-4">
                        <span>Slain A: {match.playerB.casualties}</span>
                        <span>Slain B: {match.playerA.casualties}</span>
                      </div>
                      <div className="text-[10px] text-zinc-600 font-mono truncate max-w-[150px]">
                        ID: {match.id.substring(0, 10)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
