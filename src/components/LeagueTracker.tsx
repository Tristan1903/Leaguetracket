import React, { useState, useEffect, useRef } from 'react';
import { League, LeagueMember, MatchReport, FactionType } from '../types';
import { FACTIONS } from '../data/factions';
import { encodeMatchReport, decodeMatchReport } from '../utils/qr';
import QRCode from 'qrcode';
import { useToast } from './Toast';
import {
  supabase, signIn, signUp, signOut as supabaseSignOut,
  onAuthChange, getProfile, saveProfile,
  subscribeToPublicLeagues,
  subscribeToUserLeagues,
  createLeague,
  requestJoinLeague,
  approveJoinRequest,
  rejectJoinRequest,
  promoteToAdmin,
  demoteFromAdmin,
  addMatchToLeague,
  leaveLeague,
  deleteLeague
} from '../utils/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import {
  Trophy, Users, Calendar, Award, Share2, Plus,
  FileInput, Check, Copy, Star, Skull, HelpCircle, ArrowUpRight,
  Search, UserPlus, UserCheck, Shield, ShieldCheck, LogOut,
  Crown, X, ArrowLeft, RefreshCw, User as UserIcon, Mail, Lock,
  Sparkles, AlertCircle, Ban, Timer
} from 'lucide-react';

interface LeagueTrackerProps {
  onStartLeagueGame: (leagueId: string, leagueName: string) => void;
  completedMatchQueue: MatchReport | null;
  onClearQueue: () => void;
  onLeaguesChange?: (leagues: League[]) => void;
}

export default function LeagueTracker({
  onStartLeagueGame,
  completedMatchQueue,
  onClearQueue,
  onLeaguesChange
}: LeagueTrackerProps) {
  // Auth state
  const [sbUser, setSbUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Navigation
  const [view, setView] = useState<'browse' | 'detail'>('browse');
  const [activeLeagueId, setActiveLeagueId] = useState<string>('');

  // Firestore data
  const [publicLeagues, setPublicLeagues] = useState<League[]>([]);
  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [activeLeague, setActiveLeague] = useState<League | null>(null);

  // Tab within browse view
  const [browseTab, setBrowseTab] = useState<'all' | 'mine'>('all');

  // Create league modal
  const [isCreating, setIsCreating] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDescription, setNewLeagueDescription] = useState('');

  // Player management
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerFaction, setNewPlayerFaction] = useState<FactionType>(FactionType.STORMCAST);

  // Match import
  const [isImportingReport, setIsImportingReport] = useState(false);
  const [pastedReportCode, setPastedReportCode] = useState('');
  const [importStatusMessage, setImportStatusMessage] = useState({ text: '', error: false });

  // QR code
  const [activeQRReport, setActiveQRReport] = useState<MatchReport | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Join request status message
  const [joinRequestMsg, setJoinRequestMsg] = useState({ text: '', error: false });
  const [leaveMsg, setLeaveMsg] = useState({ text: '', error: false });

  // Derived values
  const currentUsername = profile?.username || localStorage.getItem('sgc_username') || 'Anonymous';
  const isAdmin = activeLeague?.members?.some(m => m.uid === sbUser?.id && m.role === 'admin') ?? false;
  const isMember = activeLeague?.memberUids?.includes(sbUser?.id || '') ?? false;
  const pendingRequests = activeLeague?.joinRequests?.filter(r => r.status === 'pending') || [];
  const myPendingRequest = activeLeague?.joinRequests?.find(r => r.uid === sbUser?.id && r.status === 'pending');

  const { showToast } = useToast();

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthChange(async (session) => {
      const user = session?.user || null;
      setSbUser(user);
      setAuthLoading(false);
      if (user) {
        try {
          const { data: profileData } = await getProfile(user.id);
          setProfile(profileData);
        } catch (e) {
          console.error('Failed to load profile:', e);
        }
      } else {
        setProfile(null);
      }
    });
    return unsubscribe.unsubscribe;
  }, []);

  // Loading states for first data
  const [publicLeaguesLoading, setPublicLeaguesLoading] = useState(true);
  const [myLeaguesLoading, setMyLeaguesLoading] = useState(true);

  // Subscribe to public leagues
  useEffect(() => {
    setPublicLeaguesLoading(true);
    const unsubscribe = subscribeToPublicLeagues((leagues) => {
      setPublicLeagues(leagues);
      setPublicLeaguesLoading(false);
    });
    return unsubscribe;
  }, []);

  // Subscribe to user's leagues
  useEffect(() => {
    if (!sbUser) {
      setMyLeagues([]);
      setMyLeaguesLoading(false);
      onLeaguesChange?.([]);
      return;
    }
    setMyLeaguesLoading(true);
    const unsubscribe = subscribeToUserLeagues(sbUser.id, (leagues) => {
      setMyLeagues(leagues);
      setMyLeaguesLoading(false);
      onLeaguesChange?.(leagues);
    });
    return unsubscribe;
  }, [sbUser, onLeaguesChange]);

  // When active league changes, find it from available data
  useEffect(() => {
    if (!activeLeagueId) {
      setActiveLeague(null);
      return;
    }
    const found = [...publicLeagues, ...myLeagues].find(l => l.id === activeLeagueId);
    if (found) setActiveLeague(found);
  }, [activeLeagueId, publicLeagues, myLeagues]);

  // Handle incoming match from Match Hub
  useEffect(() => {
    if (completedMatchQueue && activeLeagueId && isMember) {
      const confirmAdd = confirm(
        `League Match Finished!\n\n${completedMatchQueue.playerA.name} (${completedMatchQueue.playerA.score}) VS ${completedMatchQueue.playerB.name} (${completedMatchQueue.playerB.score})\n\nSubmit this result to the active league standing?`
      );
      if (confirmAdd) {
        handleAddMatch(activeLeagueId, completedMatchQueue);
      }
      onClearQueue();
    }
  }, [completedMatchQueue, activeLeagueId, isMember]);

  // Generate QR code canvas
  useEffect(() => {
    if (activeQRReport && qrCanvasRef.current) {
      const code = encodeMatchReport(activeQRReport);
      QRCode.toCanvas(
        qrCanvasRef.current,
        code,
        { width: 210, margin: 2, color: { dark: '#18181b', light: '#f59e0b' } },
        (error) => { if (error) console.error('Failed to generate match QR:', error); }
      );
    }
  }, [activeQRReport]);

  const handleCreateLeague = async () => {
    if (!newLeagueName.trim() || !sbUser) return;
    try {
      const leagueId = await createLeague({
        name: newLeagueName.trim(),
        description: newLeagueDescription.trim(),
        createdBy: sbUser.id,
        createdByName: currentUsername
      });
      setActiveLeagueId(leagueId);
      setView('detail');
      setIsCreating(false);
      setNewLeagueName('');
      setNewLeagueDescription('');
    } catch (e: any) {
      showToast('Failed to create league: ' + e.message, 'error');
    }
  };

  const handleRequestJoin = async (leagueId: string) => {
    if (!sbUser) return;
    setJoinRequestMsg({ text: '', error: false });
    try {
      await requestJoinLeague(leagueId, sbUser.id, currentUsername);
      setJoinRequestMsg({ text: 'Join request submitted! Awaiting admin approval.', error: false });
    } catch (e: any) {
      setJoinRequestMsg({ text: e.message, error: true });
    }
    setTimeout(() => setJoinRequestMsg({ text: '', error: false }), 3000);
  };

  const handleApproveJoin = async (requestUid: string, username: string) => {
    if (!activeLeagueId) return;
    try {
      await approveJoinRequest(activeLeagueId, requestUid, username);
    } catch (e: any) {
      showToast('Failed to approve request: ' + e.message, 'error');
    }
  };

  const handleRejectJoin = async (requestUid: string) => {
    if (!activeLeagueId) return;
    try {
      await rejectJoinRequest(activeLeagueId, requestUid);
    } catch (e: any) {
      showToast('Failed to reject request: ' + e.message, 'error');
    }
  };

  const handlePromoteToAdmin = async (targetUid: string) => {
    if (!activeLeagueId) return;
    try {
      await promoteToAdmin(activeLeagueId, targetUid);
    } catch (e: any) {
      showToast('Failed to promote: ' + e.message, 'error');
    }
  };

  const handleDemoteFromAdmin = async (targetUid: string) => {
    if (!activeLeagueId) return;
    try {
      await demoteFromAdmin(activeLeagueId, targetUid);
    } catch (e: any) {
      showToast('Failed to demote: ' + e.message, 'error');
    }
  };

  const handleLeaveLeague = async () => {
    if (!activeLeagueId || !sbUser) return;
    if (!confirm('Leave this conclave? Your stats will be removed.')) return;
    try {
      await leaveLeague(activeLeagueId, sbUser.id);
      setView('browse');
      setActiveLeagueId('');
      setLeaveMsg({ text: 'You have left the conclave.', error: false });
    } catch (e: any) {
      setLeaveMsg({ text: e.message, error: true });
    }
    setTimeout(() => setLeaveMsg({ text: '', error: false }), 3000);
  };

  const handleDeleteLeague = async () => {
    if (!activeLeagueId || !isAdmin) return;
    if (!confirm('Permanently delete this entire conclave? This is irreversible.')) return;
    try {
      await deleteLeague(activeLeagueId);
      setView('browse');
      setActiveLeagueId('');
    } catch (e: any) {
      showToast('Failed to delete: ' + e.message, 'error');
    }
  };

  const handleAddMatch = async (leagueId: string, report: MatchReport) => {
    try {
      await addMatchToLeague(leagueId, report);
      setActiveQRReport(report);
    } catch (e: any) {
      if (e.message === 'Duplicate match') {
        showToast('This match has already been recorded.', 'info');
      } else {
        showToast('Failed to add match: ' + e.message, 'error');
      }
    }
  };

  const handleImportMatchCode = () => {
    if (!pastedReportCode.trim() || !activeLeagueId) return;
    const report = decodeMatchReport(pastedReportCode.trim());
    if (!report) {
      setImportStatusMessage({ text: 'Invalid Match Rune. Check format and retry.', error: true });
      return;
    }
    handleAddMatch(activeLeagueId, report);
    setImportStatusMessage({ text: 'Match honors successfully imported!', error: false });
    setPastedReportCode('');
    setTimeout(() => {
      setIsImportingReport(false);
      setImportStatusMessage({ text: '', error: false });
    }, 2000);
  };

  const addPlayerToLeague = () => {
    if (!newPlayerName.trim() || !activeLeague || !activeLeagueId) return;
    if (activeLeague.players.some(p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase())) {
      showToast('A combatant with this name already exists.', 'info');
      return;
    }
    showToast('Players are auto-created when they join or play a match.', 'info');
  };

  const metaData = computeMetaStats(activeLeague);

  // Color function
  function getFactionColors(faction: FactionType) {
    switch (faction) {
      case FactionType.STORMCAST: return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case FactionType.SKAVEN: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case FactionType.KHORNE: return 'bg-red-600/10 text-red-500 border-red-600/30';
      case FactionType.SLAANESH: return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30';
      case FactionType.TZEENTCH: return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case FactionType.SERAPHON: return 'bg-teal-500/10 text-teal-450 border-teal-500/30';
      case FactionType.SYLVANETH: return 'bg-green-600/10 text-green-400 border-green-600/30';
      case FactionType.SLAVES: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case FactionType.SOULBLIGHT: return 'bg-violet-600/10 text-violet-400 border-violet-600/30';
      case FactionType.SONS: return 'bg-rose-700/10 text-rose-450 border-rose-700/30';
      case FactionType.NURGLE: return 'bg-lime-700/10 text-lime-450 border-lime-700/30';
      case FactionType.KHARADRON: return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case FactionType.CITIES_OF_SIGMAR: return 'bg-sky-700/10 text-sky-400 border-sky-700/30';
      case FactionType.NIGHTHAUNT: return 'bg-emerald-400/5 text-emerald-350 border-emerald-400/20';
      case FactionType.FLESH_EATER: return 'bg-rose-600/10 text-rose-500 border-rose-600/30';
      case FactionType.IDONETH: return 'bg-blue-600/10 text-blue-400 border-blue-600/30';
      case FactionType.DAUGHTERS: return 'bg-pink-600/10 text-pink-400 border-pink-600/30';
      case FactionType.OGOR_MAWTRIBES: return 'bg-zinc-500/10 text-zinc-350 border-zinc-500/30';
      case FactionType.OSSIARCH: return 'bg-yellow-600/10 text-yellow-500 border-yellow-600/30';
      case FactionType.GLOOMSPITE: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case FactionType.LUMINETH: return 'bg-cyan-400/10 text-cyan-300 border-cyan-400/30';
      case FactionType.ORRUK_WARCLANS: return 'bg-green-700/10 text-green-500 border-green-700/30';
      case FactionType.HELFORGE: return 'bg-orange-600/10 text-orange-500 border-orange-600/30';
      case FactionType.FYRESLAYERS: return 'bg-amber-600/10 text-amber-500 border-amber-600/30';
      default: return 'bg-zinc-805/10 text-zinc-300 border-zinc-800/10';
    }
  }
  return (
    <div className="space-y-6">
      {authLoading ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Loading conclave data...</div>
      ) : view === 'detail' && activeLeague ? (
        renderDetailView()
      ) : (
        renderBrowseView()
      )}
    </div>
  );

  function renderBrowseView() {
    const leagues = browseTab === 'mine' ? (sbUser ? myLeagues : []) : publicLeagues;
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> Conclave Leagues
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Browse public leagues or create your own competitive season.</p>
          </div>
          <div className="flex items-center gap-2">
            {sbUser ? (
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 text-xs font-extrabold text-black bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer transition flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Create Conclave
              </button>
            ) : (
              <div className="text-xs text-zinc-500 italic">Sign in to create or join leagues</div>
            )}
          </div>
        </div>

        {/* Auth prompt for unauthenticated users */}
        {!sbUser && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-400">Create your Warlord profile to join the Conclave</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Head to the Career tab to sign up, then return here to create or join leagues.</p>
            </div>
          </div>
        )}

        {/* Join request / leave messages */}
        {joinRequestMsg.text && (
          <div className={`p-2 rounded-lg text-xs font-bold text-center border ${joinRequestMsg.error ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
            {joinRequestMsg.text}
          </div>
        )}
        {leaveMsg.text && (
          <div className={`p-2 rounded-lg text-xs font-bold text-center border ${leaveMsg.error ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
            {leaveMsg.text}
          </div>
        )}

        {/* Tab switcher */}
        {sbUser && (
          <div className="flex gap-2">
            <button
              onClick={() => setBrowseTab('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${browseTab === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white border border-zinc-800'}`}
            >
              Browse All
            </button>
            <button
              onClick={() => setBrowseTab('mine')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${browseTab === 'mine' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white border border-zinc-800'}`}
            >
              My Conclaves ({myLeagues.length})
            </button>
          </div>
        )}

        {/* League grid */}
        {(() => {
          const isLoading = browseTab === 'all' ? publicLeaguesLoading : myLeaguesLoading;
          if (isLoading) {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/20 space-y-3 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-20 rounded bg-zinc-800" />
                      <div className="h-4 w-16 rounded bg-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-5 w-3/4 rounded bg-zinc-800" />
                      <div className="h-3 w-full rounded bg-zinc-800" />
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                      <div className="h-3 w-24 rounded bg-zinc-800" />
                      <div className="h-3 w-16 rounded bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            );
          }
          if (leagues.length === 0) {
            return (
              <div className="text-center p-14 border border-dashed border-zinc-800 rounded-2xl max-w-lg mx-auto bg-zinc-900/10">
                <Trophy className="h-10 w-10 text-zinc-600 mx-auto" />
                <h3 className="font-display font-black text-white tracking-tight text-base uppercase mt-4">
                  {browseTab === 'mine' ? 'No Conclaves Yet' : 'No Public Leagues'}
                </h3>
                <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed">
                  {browseTab === 'mine'
                    ? 'You haven\'t joined any leagues yet. Browse all leagues to find one or create your own.'
                    : 'No leagues have been created yet. Be the first to assemble one!'}
                </p>
              </div>
            );
          }
          return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues.map((league) => {
              const userIsMember = league.memberUids?.includes(sbUser?.id || '');
              const userHasPendingRequest = league.joinRequests?.some(r => r.uid === sbUser?.id && r.status === 'pending');
              return (
                <div
                  key={league.id}
                  onClick={() => { setActiveLeagueId(league.id); setView('detail'); }}
                  className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 transition cursor-pointer group space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-wider font-extrabold text-amber-400 uppercase border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded">
                      Conclave
                    </span>
                    <span className="text-[10px] font-mono text-zinc-600">{league.inviteCode}</span>
                  </div>
                  <div>
                    <h3 className="font-display font-black text-white text-sm tracking-tight group-hover:text-amber-400 transition">
                      {league.name}
                    </h3>
                    {league.description && (
                      <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{league.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono border-t border-zinc-900 pt-3">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {league.members?.length || 0} members
                    </span>
                    <span>by {league.createdByName}</span>
                  </div>
                  {userIsMember ? (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <Check className="h-3 w-3" /> Joined
                    </div>
                  ) : userHasPendingRequest ? (
                    <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                      <Timer className="h-3 w-3" /> Request Pending
                    </div>
                  ) : sbUser ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRequestJoin(league.id); }}
                      className="w-full py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 font-bold text-[10px] transition border border-amber-500/20 cursor-pointer"
                    >
                      Request to Join
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          );
        })()}

        {/* Create League Modal */}
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsCreating(false)}>
            <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950 max-w-md w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-black text-white tracking-tight text-base uppercase flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" /> Form New Conclave
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 font-bold mb-1">Conclave Name</label>
                  <input
                    type="text"
                    placeholder="e.g. The Aqshy Scorch-League"
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 font-bold mb-1">Description (optional)</label>
                  <textarea
                    placeholder="e.g. A competitive league for Spearhead enthusiasts..."
                    value={newLeagueDescription}
                    onChange={(e) => setNewLeagueDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLeague}
                  disabled={!newLeagueName.trim()}
                  className="px-4 py-2 text-xs font-extrabold text-black bg-amber-500 rounded-lg hover:bg-amber-400 cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600"
                >
                  Convene League
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderDetailView() {
    if (!activeLeague) return null;
    const league = activeLeague;
    const sortedPlayers = [...league.players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.vpScored !== a.vpScored) return b.vpScored - a.vpScored;
      return b.casualtiesSlain - a.casualtiesSlain;
    });

    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => { setView('browse'); setActiveLeagueId(''); setActiveQRReport(null); }}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leagues
        </button>

        {/* League Banner */}
        <div className="p-5 rounded-2xl border border-zinc-800 bg-linear-to-b from-zinc-900 via-zinc-900 to-black relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono tracking-wider font-extrabold text-amber-400 uppercase border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded">
                  Conclave Active
                </span>
                <span className="font-mono text-[10px] text-zinc-500">Code: {league.inviteCode}</span>
                <span className="text-[10px] font-mono text-zinc-600">by {league.createdByName}</span>
              </div>
              <h2 className="font-display text-xl font-black tracking-tight text-white mt-2">{league.name}</h2>
              {league.description && (
                <p className="text-xs text-zinc-400 mt-1 max-w-lg">{league.description}</p>
              )}
              <p className="text-xs text-zinc-500 mt-1 font-mono">
                Founded {new Date(league.createdAt).toLocaleDateString()} &middot; {league.members.length} members &middot; {league.players.length} combatants &middot; {league.matches.length} battles
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isMember && (
                <button
                  onClick={() => onStartLeagueGame(league.id, league.name)}
                  className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs tracking-wider transition cursor-pointer"
                >
                  Launch Ranked Match
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Member info / actions bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isMember && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              <Check className="h-3 w-3" /> Member
            </span>
          )}
          {isAdmin && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              <Crown className="h-3 w-3" /> Admin
            </span>
          )}
          {myPendingRequest && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              <Timer className="h-3 w-3" /> Join Request Pending
            </span>
          )}
          {!isMember && !myPendingRequest && sbUser && (
            <button
              onClick={() => handleRequestJoin(league.id)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 font-bold border border-amber-500/20 cursor-pointer"
            >
              Request to Join
            </button>
          )}
          {isMember && (
            <button
              onClick={handleLeaveLeague}
              className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 font-bold cursor-pointer"
            >
              Leave Conclave
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleDeleteLeague}
              className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 font-bold cursor-pointer"
            >
              Delete Conclave
            </button>
          )}
        </div>

        {/* QR Code display */}
        {activeQRReport && (
          <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col md:flex-row items-center gap-6">
            <canvas ref={qrCanvasRef} className="rounded-lg border border-zinc-900 bg-white" />
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-amber-400 tracking-tight flex items-center gap-2">
                  <Star className="h-4 w-4" /> Match Signed QR Key
                </h4>
                <button
                  onClick={() => setActiveQRReport(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 py-0.5 px-2 border border-zinc-800 rounded hover:bg-zinc-900 cursor-pointer"
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Share this QR code or copy the match code below for other players to import the result.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={encodeMatchReport(activeQRReport)}
                  className="flex-1 rounded bg-zinc-950 border border-zinc-850 px-2.5 py-1.5 text-[10px] font-mono text-zinc-400 select-all"
                />
                <button
                    onClick={() => { navigator.clipboard.writeText(encodeMatchReport(activeQRReport)); showToast('Match Code copied!', 'success'); }}
                  className="p-1.5 border border-zinc-800 hover:text-white rounded bg-zinc-900 cursor-pointer"
                  title="Copy Match Code"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Panel */}
        {isAdmin && (
          <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-4">
            <h3 className="font-display font-black text-white tracking-tight text-sm uppercase flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" /> Admin Panel
            </h3>

            {/* Pending Join Requests */}
            {pendingRequests.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pending Join Requests ({pendingRequests.length})</p>
                {pendingRequests.map((req) => (
                  <div key={req.uid} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
                    <span className="text-sm font-bold text-white">{req.username}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveJoin(req.uid, req.username)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold hover:bg-emerald-500/25 cursor-pointer flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectJoin(req.uid)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/25 cursor-pointer flex items-center gap-1"
                      >
                        <X className="h-3 w-3" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">No pending join requests.</p>
            )}

            {/* Member Management */}
            <div className="space-y-2 pt-2 border-t border-amber-500/10">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Members ({league.members.length})</p>
              {league.members.map((member) => (
                <div key={member.uid} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{member.username}</span>
                    {member.role === 'admin' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold flex items-center gap-0.5">
                        <Crown className="h-2.5 w-2.5" /> Admin
                      </span>
                    )}
                    {member.role === 'member' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">Member</span>
                    )}
                  </div>
                  {member.uid !== sbUser?.id && (
                    <div className="flex gap-2">
                      {member.role === 'member' ? (
                        <button
                          onClick={() => handlePromoteToAdmin(member.uid)}
                          className="px-2.5 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-amber-400 text-[10px] font-bold cursor-pointer hover:border-amber-500/30 transition"
                        >
                          Promote to Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDemoteFromAdmin(member.uid)}
                          className="px-2.5 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-red-400 text-[10px] font-bold cursor-pointer hover:border-red-500/30 transition"
                        >
                          Demote
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending request status for non-members */}
        {myPendingRequest && !isMember && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
            <p className="text-xs text-amber-400 font-bold">Your join request is pending admin approval.</p>
          </div>
        )}

        {/* Main grid: Leaderboard + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-white tracking-tight text-sm uppercase flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" /> Live Standing Leaderboard
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-mono">
                    <th className="pb-2.5 font-bold text-center w-10">Rnk</th>
                    <th className="pb-2.5 font-bold">Player</th>
                    <th className="pb-2.5 font-bold text-center w-24">Points</th>
                    <th className="pb-2.5 font-bold text-center w-24">W-D-L</th>
                    <th className="pb-2.5 font-bold text-center w-16">VP</th>
                    <th className="pb-2.5 font-bold text-center w-16">Slain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {sortedPlayers.map((p, idx) => (
                    <tr key={p.id} className="text-zinc-300 hover:bg-zinc-950/40">
                      <td className="py-2.5 text-center font-bold font-mono">
                        {idx + 1 === 1 ? <span className="text-amber-400">#1</span>
                          : idx + 1 === 2 ? <span className="text-zinc-400">#2</span>
                          : idx + 1 === 3 ? <span className="text-amber-700">#3</span>
                          : idx + 1}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white block truncate max-w-[120px]">{p.name}</span>
                          {p.linkedUid && (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">Verified</span>
                          )}
                        </div>
                        <span className={`text-[9px] font-mono border px-1 py-0.2 rounded font-bold ${getFactionColors(p.faction)} mt-0.5 inline-block`}>
                          {FACTIONS[p.faction]?.name}
                        </span>
                        {(() => {
                          const recent = league.matches.find(m =>
                            m.playerA.name.toLowerCase() === p.name.toLowerCase() ||
                            m.playerB.name.toLowerCase() === p.name.toLowerCase()
                          );
                          if (recent) {
                            const isA = recent.playerA.name.toLowerCase() === p.name.toLowerCase();
                            const sp = isA ? recent.playerA.spearheadName : recent.playerB.spearheadName;
                            if (sp) return <span className="text-[9px] text-amber-500/85 font-mono block mt-1" title="Last deployed Spearhead force">{sp}</span>;
                          }
                          return null;
                        })()}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="font-display text-sm font-black text-amber-500">{p.points}</span>
                      </td>
                      <td className="py-2.5 text-center font-mono text-zinc-400">{p.wins}-{p.draws}-{p.losses}</td>
                      <td className="py-2.5 text-center font-mono font-bold text-zinc-500">{p.vpScored}</td>
                      <td className="py-2.5 text-center font-mono text-red-500/80 font-bold">{p.casualtiesSlain}</td>
                    </tr>
                  ))}
                  {sortedPlayers.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-zinc-500">No players yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {isMember && (
              <div className="border-t border-zinc-900 pt-4 space-y-3">
                <span className="text-[10px] font-mono tracking-wider font-extrabold text-zinc-500 uppercase">Enlist Combatant</span>
                <p className="text-[10px] text-zinc-600 italic">Players are auto-created when they join the conclave or play a match.</p>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6 lg:col-span-1">
            {/* Import Match */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
              <h3 className="font-display font-black text-white tracking-tight text-sm uppercase flex items-center gap-2">
                <FileInput className="h-4 w-4 text-emerald-400" /> Import Match
              </h3>
              <p className="text-xs text-zinc-500">Paste an SGC| match code from another device.</p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Paste SGC|... match token"
                  value={pastedReportCode}
                  onChange={(e) => setPastedReportCode(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-[10px] font-mono text-zinc-400 outline-hidden focus:border-emerald-500"
                />
                <button
                  onClick={handleImportMatchCode}
                  disabled={!pastedReportCode.trim()}
                  className="w-full py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs transition disabled:bg-zinc-900 disabled:text-zinc-650 cursor-pointer border border-emerald-500/20"
                >
                  Decode & Import
                </button>
              </div>
              {importStatusMessage.text && (
                <p className={`text-[10px] font-bold ${importStatusMessage.error ? 'text-red-400' : 'text-emerald-400'}`}>
                  {importStatusMessage.text}
                </p>
              )}
            </div>

            {/* Meta Stats */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
              <h3 className="font-display font-black text-white tracking-tight text-sm uppercase flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" /> Meta Win-Rates
              </h3>
              {metaData.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No games logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {metaData.map((meta, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-zinc-300">{FACTIONS[meta.faction].name}</span>
                        <span className="font-mono text-amber-400 font-bold">{meta.winRate}% <span className="text-zinc-600 text-[10px]">({meta.played}g)</span></span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900">
                        <div className="bg-amber-500 h-full opacity-80" style={{ width: `${meta.winRate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Match History */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-3">
          <h3 className="font-display font-black text-white tracking-tight text-sm uppercase flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-purple-400" /> Recent Activity
          </h3>
          <div className="divide-y divide-zinc-900/60 font-mono text-xs max-h-[380px] overflow-y-auto pr-1">
            {league.matches.map((m, idx) => (
              <div key={m.id} className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-zinc-300 border-b border-zinc-900/40 last:border-b-0">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 flex-1">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-xs font-bold font-sans">{m.playerA.name}</strong>
                      <span className={`text-[9px] font-mono border px-1.5 py-0.2 rounded font-extrabold ${getFactionColors(m.playerA.faction)}`}>
                        {FACTIONS[m.playerA.faction]?.name}
                      </span>
                    </div>
                    {m.playerA.spearheadName && (
                      <div className="text-[10px] text-zinc-400 font-mono">
                        <span className="text-amber-500 font-bold">{m.playerA.spearheadName}</span>
                        {(m.playerA.enhancementName || m.playerA.regimentAbilityName) && (
                          <span className="text-[9px] text-zinc-500 italic"> | {m.playerA.enhancementName}{m.playerA.enhancementName && m.playerA.regimentAbilityName ? ' | ' : ''}{m.playerA.regimentAbilityName}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 justify-center md:justify-start font-black">
                    <span className="font-display text-sm text-amber-500 font-black px-2.5 py-1 bg-zinc-950 rounded border border-zinc-900">{m.playerA.score}</span>
                    <span className="text-[10px] text-zinc-600 font-bold">VS</span>
                    <span className="font-display text-sm text-amber-500 font-black px-2.5 py-1 bg-zinc-950 rounded border border-zinc-900">{m.playerB.score}</span>
                  </div>
                  <div className="space-y-1.5 flex-1 text-left md:text-right">
                    <div className="flex items-center md:justify-end gap-2">
                      <strong className="text-white text-xs font-bold font-sans">{m.playerB.name}</strong>
                      <span className={`text-[9px] font-mono border px-1.5 py-0.2 rounded font-extrabold ${getFactionColors(m.playerB.faction)}`}>
                        {FACTIONS[m.playerB.faction]?.name}
                      </span>
                    </div>
                    {m.playerB.spearheadName && (
                      <div className="text-[10px] text-zinc-400 font-mono flex flex-col md:items-end">
                        <span className="text-amber-500 font-bold">{m.playerB.spearheadName}</span>
                        {(m.playerB.enhancementName || m.playerB.regimentAbilityName) && (
                          <span className="text-[9px] text-zinc-500 italic"> | {m.playerB.enhancementName}{m.playerB.enhancementName && m.playerB.regimentAbilityName ? ' | ' : ''}{m.playerB.regimentAbilityName}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setActiveQRReport(m)}
                    className="text-[10px] text-zinc-400 hover:text-white px-2 py-1 rounded border border-zinc-800 hover:bg-zinc-900 cursor-pointer font-bold"
                  >
                    Show QR
                  </button>
                </div>
              </div>
            ))}
            {league.matches.length === 0 && (
              <p className="text-xs text-zinc-650 italic py-4">No matches recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  }
}

// Helper: compute meta stats
function computeMetaStats(league: League | null) {
  if (!league || league.matches.length === 0) return [];
  const statsMap: Record<string, { played: number; wins: number }> = {};
  Object.values(FactionType).forEach((f) => { statsMap[f] = { played: 0, wins: 0 }; });
  league.matches.forEach((m) => {
    statsMap[m.playerA.faction].played += 1;
    statsMap[m.playerB.faction].played += 1;
    if (m.winner === 'A') statsMap[m.playerA.faction].wins += 1;
    else if (m.winner === 'B') statsMap[m.playerB.faction].wins += 1;
  });
  return Object.values(FactionType)
    .map((f) => ({ faction: f, played: statsMap[f].played, winRate: statsMap[f].played > 0 ? Math.round((statsMap[f].wins / statsMap[f].played) * 100) : 0 }))
    .filter((s) => s.played > 0)
    .sort((a, b) => b.winRate - a.winRate);
}
