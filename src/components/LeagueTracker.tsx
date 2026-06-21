import React, { useState, useEffect, useRef } from 'react';
import { League, LeaguePlayer, MatchReport, FactionType } from '../types';
import { FACTIONS } from '../data/factions';
import { encodeMatchReport, decodeMatchReport, generateInviteCode } from '../utils/qr';
import QRCode from 'qrcode';
import { 
  Trophy, Users, Calendar, Award, Share2, Plus, 
  FileInput, Check, Copy, RefreshCw, Star, Skull, HelpCircle, ArrowUpRight 
} from 'lucide-react';

interface LeagueTrackerProps {
  onStartLeagueGame: (leagueId: string, leagueName: string) => void;
  completedMatchQueue: MatchReport | null;
  onClearQueue: () => void;
  allLeagues: League[];
  setAllLeagues: (leagues: League[]) => void;
}

export default function LeagueTracker({
  onStartLeagueGame,
  completedMatchQueue,
  onClearQueue,
  allLeagues,
  setAllLeagues
}: LeagueTrackerProps) {
  // Navigation & interaction states
  const [activeLeagueId, setActiveLeagueId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerFaction, setNewPlayerFaction] = useState<FactionType>(FactionType.STORMCAST);

  // Manual code import models
  const [isImportingReport, setIsImportingReport] = useState(false);
  const [pastedReportCode, setPastedReportCode] = useState('');
  const [importStatusMessage, setImportStatusMessage] = useState({ text: '', error: false });

  const [isSyncingLeague, setIsSyncingLeague] = useState(false);
  const [pastedLeagueCode, setPastedLeagueCode] = useState('');
  const [showHowToJoin, setShowHowToJoin] = useState(false);

  // QR display elements
  const [activeQRReport, setActiveQRReport] = useState<MatchReport | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showCopyMessage, setShowCopyMessage] = useState(false);

  // Load username
  const [currentUsername, setCurrentUsername] = useState('My Warlord');
  useEffect(() => {
    const savedName = localStorage.getItem('sgc_username');
    if (savedName) {
      setCurrentUsername(savedName);
    }
  }, []);

  // Retrieve active league
  const activeLeague = allLeagues.find((l) => l.id === activeLeagueId);

  // Render QR Code canvas
  useEffect(() => {
    if (activeQRReport && qrCanvasRef.current) {
      const code = encodeMatchReport(activeQRReport);
      QRCode.toCanvas(
        qrCanvasRef.current,
        code,
        {
          width: 210,
          margin: 2,
          color: {
            dark: '#18181b', // zinc-900 / black
            light: '#f59e0b' // amber-500
          }
        },
        (error) => {
          if (error) console.error('Failed to generate match QR:', error);
        }
      );
    }
  }, [activeQRReport]);

  // Handle incoming match queued from Match Hub
  useEffect(() => {
    if (completedMatchQueue && activeLeagueId) {
      // Prompt user to add queued game to the active league
      const confirmAdd = confirm(
        `League Match Finished!\n\n${completedMatchQueue.playerA.name} (${completedMatchQueue.playerA.score}) VS ${completedMatchQueue.playerB.name} (${completedMatchQueue.playerB.score})\n\nSubmit this result to the active league standing?`
      );

      if (confirmAdd) {
        addMatchToLeague(activeLeagueId, completedMatchQueue);
      }
      onClearQueue(); // Always drain queue
    }
  }, [completedMatchQueue, activeLeagueId]);

  const createLeague = () => {
    if (!newLeagueName.trim()) return;

    const newLeague: League = {
      id: `conclave-${Math.random().toString(36).substring(2, 11)}`,
      name: newLeagueName.trim(),
      inviteCode: generateInviteCode(),
      createdAt: new Date().toISOString(),
      players: [
        {
          id: `player-${Math.random().toString(36).substring(2, 9)}`,
          name: currentUsername,
          faction: FactionType.STORMCAST,
          points: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          vpScored: 0,
          casualtiesSlain: 0,
          underdogWins: 0
        }
      ],
      matches: []
    };

    const updated = [...allLeagues, newLeague];
    setAllLeagues(updated);
    setActiveLeagueId(newLeague.id);
    setIsCreating(false);
    setNewLeagueName('');
  };

  const addPlayerToLeague = () => {
    if (!newPlayerName.trim() || !activeLeagueId) return;

    // Check duplicate
    const exists = activeLeague?.players.some(
      (p) => p.name.toLowerCase() === newPlayerName.trim().toLowerCase()
    );
    if (exists) {
      alert('A combatant with this name already resides in this league Standing.');
      return;
    }

    const newPlayer: LeaguePlayer = {
      id: `player-${Math.random().toString(36).substring(2, 9)}`,
      name: newPlayerName.trim(),
      faction: newPlayerFaction,
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      vpScored: 0,
      casualtiesSlain: 0,
      underdogWins: 0
    };

    const updated = allLeagues.map((l) => {
      if (l.id === activeLeagueId) {
        return {
          ...l,
          players: [...l.players, newPlayer]
        };
      }
      return l;
    });

    setAllLeagues(updated);
    setNewPlayerName('');
  };

  const addMatchToLeague = (leagueId: string, report: MatchReport) => {
    const targetL = allLeagues.find((l) => l.id === leagueId);
    if (!targetL) return;

    // Prevent duplicate matches
    if (targetL.matches.some((m) => m.id === report.id)) {
      alert('This match result has already been encoded in the league chronicles.');
      return;
    }

    // Adjust players data or add placeholder players if not exist
    let players = [...targetL.players];

    const ensurePlayerCreated = (name: string, faction: FactionType) => {
      const pIndex = players.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
      if (pIndex === -1) {
        players.push({
          id: `player-${Math.random().toString(36).substring(2, 9)}`,
          name,
          faction,
          points: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          vpScored: 0,
          casualtiesSlain: 0,
          underdogWins: 0
        });
      }
    };

    ensurePlayerCreated(report.playerA.name, report.playerA.faction);
    ensurePlayerCreated(report.playerB.name, report.playerB.faction);

    // Re-verify the index after ensuring they are parsed
    const idxA = players.findIndex((p) => p.name.toLowerCase() === report.playerA.name.toLowerCase());
    const idxB = players.findIndex((p) => p.name.toLowerCase() === report.playerB.name.toLowerCase());

    // Compute league points: Win = 3, Draw = 1, Loss = 0
    if (report.winner === 'A') {
      players[idxA].points += 3;
      players[idxA].wins += 1;
      players[idxB].losses += 1;

      if (report.underdogPlayed === 'A') {
        players[idxA].underdogWins += 1;
      }
    } else if (report.winner === 'B') {
      players[idxB].points += 3;
      players[idxB].wins += 1;
      players[idxA].losses += 1;

      if (report.underdogPlayed === 'B') {
        players[idxB].underdogWins += 1;
      }
    } else {
      players[idxA].points += 1;
      players[idxA].draws += 1;
      players[idxB].points += 1;
      players[idxB].draws += 1;
    }

    // Roll totals
    players[idxA].vpScored += report.playerA.score;
    players[idxA].casualtiesSlain += report.playerB.casualties; // Player B casualties are slain by player A

    players[idxB].vpScored += report.playerB.score;
    players[idxB].casualtiesSlain += report.playerA.casualties;

    const refreshedReport = { ...report, leagueId };

    const updated = allLeagues.map((l) => {
      if (l.id === leagueId) {
        return {
          ...l,
          players,
          matches: [refreshedReport, ...l.matches]
        };
      }
      return l;
    });

    setAllLeagues(updated);
    setActiveQRReport(refreshedReport); // Trigger QR code presentation for confirmation!
  };

  const handleImportMatchCode = () => {
    if (!pastedReportCode.trim() || !activeLeagueId) return;

    const report = decodeMatchReport(pastedReportCode.trim());
    if (!report) {
      setImportStatusMessage({ text: '⚠️ Invalid Match Rune. Check standard format and retry.', error: true });
      return;
    }

    addMatchToLeague(activeLeagueId, report);
    setImportStatusMessage({ text: '🎉 Match honors successfully imported to standings!', error: false });
    setPastedReportCode('');
    setTimeout(() => {
      setIsImportingReport(false);
      setImportStatusMessage({ text: '', error: false });
    }, 2000);
  };

  const exportLeagueConclave = () => {
    if (!activeLeague) return;
    const jsonStr = JSON.stringify(activeLeague);
    const code = btoa(unescape(encodeURIComponent(jsonStr)));
    navigator.clipboard.writeText(code);
    setShowCopyMessage(true);
    setTimeout(() => setShowCopyMessage(false), 2000);
  };

  const handleSyncLeagueConclave = () => {
    if (!pastedLeagueCode.trim()) return;
    try {
      const decodedJson = decodeURIComponent(escape(atob(pastedLeagueCode.trim())));
      const parsedLeague = JSON.parse(decodedJson) as League;

      if (!parsedLeague.id || !parsedLeague.name || !Array.isArray(parsedLeague.players)) {
        alert('Invalid League Chronicle Code. Check standard payload.');
        return;
      }

      // Check if league exists to overwrite or append
      const isExist = allLeagues.some((l) => l.id === parsedLeague.id);
      let updated: League[];

      if (isExist) {
        if (confirm(`Over-write existing standings for "${parsedLeague.name}" with imported chronicles?`)) {
          updated = allLeagues.map((l) => (l.id === parsedLeague.id ? parsedLeague : l));
        } else {
          return;
        }
      } else {
        updated = [...allLeagues, parsedLeague];
      }

      setAllLeagues(updated);
      setActiveLeagueId(parsedLeague.id);
      setPastedLeagueCode('');
      setIsSyncingLeague(false);
      alert(`League "${parsedLeague.name}" chronicle successfully synced!`);
    } catch (e) {
      alert('Decryption failed. Ensure you copied the absolute, unedited League Code.');
    }
  };

  // Helper arrays for faction wins
  const computeMetaStats = () => {
    if (!activeLeague || activeLeague.matches.length === 0) return [];

    const statsMap: Record<FactionType, { played: number; wins: number }> = {} as any;
    Object.values(FactionType).forEach((f) => {
      statsMap[f] = { played: 0, wins: 0 };
    });

    activeLeague.matches.forEach((m) => {
      const factionA = m.playerA.faction;
      const factionB = m.playerB.faction;

      statsMap[factionA].played += 1;
      statsMap[factionB].played += 1;

      if (m.winner === 'A') {
        statsMap[factionA].wins += 1;
      } else if (m.winner === 'B') {
        statsMap[factionB].wins += 1;
      }
    });

    return Object.values(FactionType)
      .map((f) => {
        const data = statsMap[f];
        const winRate = data.played > 0 ? Math.round((data.wins / data.played) * 100) : 0;
        return {
          faction: f,
          played: data.played,
          winRate
        };
      })
      .filter((s) => s.played > 0)
      .sort((a, b) => b.winRate - a.winRate);
  };

  const deleteLeague = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Permanently dismiss this faction league standings? This action is irreversible.')) {
      const filtered = allLeagues.filter((l) => l.id !== id);
      setAllLeagues(filtered);
      if (activeLeagueId === id) {
        setActiveLeagueId(filtered[0]?.id || '');
      }
    }
  };

  const metaData = computeMetaStats();

  const getFactionColors = (faction: FactionType) => {
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
  };

  return (
    <div className="space-y-6">
      {/* Top action selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-zinc-500 font-mono">ACTIVE CONCLAVE</label>
          <select
            value={activeLeagueId}
            onChange={(e) => setActiveLeagueId(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-white skeleton outline-hidden focus:border-amber-500 max-w-[240px]"
            id="league-switcher"
          >
            <option value="">-- Choose League --</option>
            {allLeagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreating(true)}
            className="px-4.5 py-2 text-xs font-extrabold text-black bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer transition flex items-center gap-1"
            id="create-new-league-trigger"
          >
            <Plus className="h-4 w-4" /> Assemble League
          </button>
          <button
            onClick={() => setIsSyncingLeague(true)}
            className="px-4.5 py-2 text-xs font-bold text-zinc-300 border border-zinc-800 bg-zinc-950/40 hover:text-white rounded-lg cursor-pointer transition flex items-center gap-1.5"
            id="sync-league-trigger"
          >
            <RefreshCw className="h-4 w-4 text-emerald-400" /> Sync League Chronicle
          </button>
        </div>
      </div>

      {/* Assemble League modal overlay */}
      {isCreating && (
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/90 max-w-md mx-auto space-y-4">
          <h3 className="font-display font-black text-white tracking-tight text-base uppercase flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" /> Form Competitive League
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Standings and meta trackers will run entirely client-side using robust storage.</p>
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs text-zinc-400 font-bold mb-1">League Campaign Name</label>
              <input
                type="text"
                placeholder="e.g. The Aqshy Scorch-League"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500"
                id="creation-league-name"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCreating(false)}
                className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded"
                id="cancel-create-league-btn"
              >
                Cancel
              </button>
              <button
                onClick={createLeague}
                disabled={!newLeagueName.trim()}
                className="px-4 py-2 text-xs font-extrabold text-black bg-amber-500 rounded-lg hover:bg-amber-400 cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600"
                id="save-create-league-btn"
              >
                Convene League
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync / Chronicle Import Modal */}
      {isSyncingLeague && (
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/90 max-w-md mx-auto space-y-4">
          <h3 className="font-display font-black text-white tracking-tight text-base uppercase flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-emerald-400" /> Sync Standings Chronicle
          </h3>
          <p className="text-xs text-zinc-500">Paste the encrypted League Chronicle payload shared by another player to restore stats.</p>
          <div className="space-y-3 pt-2">
            <textarea
              placeholder="Paste encrypted Chronicle Hash..."
              value={pastedLeagueCode}
              onChange={(e) => setPastedLeagueCode(e.target.value)}
              className="w-full h-24 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-400 outline-hidden focus:border-emerald-500"
              id="sync-league-textarea"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsSyncingLeague(false)}
                className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded"
                id="cancel-sync-league-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleSyncLeagueConclave}
                disabled={!pastedLeagueCode.trim()}
                className="px-4 py-2 text-xs font-bold text-black bg-emerald-400 rounded-lg hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-zinc-600 cursor-pointer"
                id="confirm-sync-league-btn"
              >
                Decrypt Chronicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main active league render area */}
      {activeLeague ? (
        <div className="space-y-6">
          {/* Active League Title Banner */}
          <div className="p-5 rounded-2xl border border-zinc-800 bg-linear-to-b from-zinc-900 via-zinc-900 to-black relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-wider font-extrabold text-amber-400 uppercase border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded">
                  Conclave Active
                </span>
                <span className="font-mono text-[10px] text-zinc-500">Invite Code: {activeLeague.inviteCode}</span>
              </div>
              <h2 className="font-display text-xl font-black tracking-tight text-white mt-2">{activeLeague.name}</h2>
              <p className="text-xs text-zinc-500 mt-1 font-mono">
                Running since {new Date(activeLeague.createdAt).toLocaleDateString()} with {activeLeague.players.length} combatants.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onStartLeagueGame(activeLeague.id, activeLeague.name)}
                className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs tracking-wider transition cursor-pointer"
                id="start-league-round-btn"
              >
                Launch Ranked Match ⚔️
              </button>
              <button
                onClick={exportLeagueConclave}
                className="px-4.5 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                id="export-league-btn"
              >
                <Share2 className="h-4 w-4" /> Share stood Chronicle
              </button>
            </div>
          </div>

          {showCopyMessage && (
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold text-center">
              Chronicle encrypted and copied to clipboard! Share this string with your gaming group.
            </div>
          )}

          {/* Interactive How to Join & Onboard Guide */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-2">
            <button
              onClick={() => setShowHowToJoin(!showHowToJoin)}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
              id="toggle-how-to-join"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                <span className="font-display font-medium text-xs text-white uppercase tracking-wider group-hover:text-amber-400 transition">
                  How do other players join and sync this league? 🤝
                </span>
              </div>
              <span className="text-xs text-zinc-550 group-hover:text-amber-500 font-mono">
                {showHowToJoin ? '[ Collapse Guide ]' : '[ Open Guide ]'}
              </span>
            </button>

            {showHowToJoin && (
              <div className="pt-3 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-zinc-400 leading-relaxed select-text">
                <div className="space-y-2.5 p-3 rounded-lg bg-zinc-900/40 border border-zinc-900">
                  <h4 className="text-white font-bold font-sans flex items-center gap-1.5 text-xs">
                    <span className="w-4.5 h-4.5 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center">1</span>
                    Sharing the Conclave
                  </h4>
                  <p>
                    As the host, click <strong className="text-white">"Share stood Chronicle"</strong> in the top-right banner. This encrypts and copies the full league settings and standings to your clipboard.
                  </p>
                  <p className="text-[11px] text-zinc-500 italic">
                    Paste and send this copied text line to your friends (via Telegram, Discord, WhatsApp, email, etc.).
                  </p>
                </div>

                <div className="space-y-2.5 p-3 rounded-lg bg-zinc-900/40 border border-zinc-900">
                  <h4 className="text-white font-bold font-sans flex items-center gap-1.5 text-xs">
                    <span className="w-4.5 h-4.5 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center">2</span>
                    Importing via Sync
                  </h4>
                  <p>
                    Your friends open this same web app URL on their own phones, navigate to this <strong className="text-white">Leagues</strong> tab, click <strong className="text-white">"Sync League Chronicle"</strong>, paste your code, and hit Sync!
                  </p>
                  <p className="text-[11px] text-emerald-450 italic">
                    Boom! They now have the complete roster, current statistics, and leaderboard standing loaded instantly!
                  </p>
                </div>

                <div className="space-y-2.5 p-3 rounded-lg bg-zinc-900/40 border border-zinc-900">
                  <h4 className="text-white font-bold font-sans flex items-center gap-1.5 text-xs">
                    <span className="w-4.5 h-4.5 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center">3</span>
                    Logging Matches Realtime
                  </h4>
                  <p>
                    Play a ranked match via the <strong className="text-white">Play</strong> tab. When one player finishes, a <strong className="text-white">Sign QR Code</strong> appears on his device screen.
                  </p>
                  <p>
                    The other player uses his own device to click the <strong className="text-white">"Sign with QR / Code"</strong> button on the Leagues tab and scan or input the results to auto-save to his phone.
                  </p>
                </div>

                <div className="space-y-2.5 p-3 rounded-lg bg-zinc-900/40 border border-zinc-900">
                  <h4 className="text-white font-bold font-sans flex items-center gap-1.5 text-xs">
                    <span className="w-4.5 h-4.5 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center">4</span>
                    Fully Offline & Serverless
                  </h4>
                  <p>
                    No personal logins, no passwords, no heavy server lag. State is synchronized locally via high-contrast QR scans or simple clipboard text strings for a lightweight, physical table top feel!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* QR Scan Display after match ends */}
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
                    className="text-xs text-zinc-500 hover:text-zinc-300 py-0.5 px-2 border border-zinc-800 rounded hover:bg-zinc-900"
                    id="close-qr-btn"
                  >
                    Close Banner
                  </button>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  To prevent "ghost scoring," let other players or the league commissioner scan this physical QR code or copy the match authentication code below to import results directly.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={encodeMatchReport(activeQRReport)}
                    className="flex-1 rounded bg-zinc-950 border border-zinc-850 px-2.5 py-1.5 text-[10px] font-mono text-zinc-400 select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(encodeMatchReport(activeQRReport));
                      alert('Match Code copied!');
                    }}
                    className="p-1.5 border border-zinc-800 hover:text-white rounded bg-zinc-900 cursor-pointer"
                    id="copy-report-code-btn"
                    title="Copy Match Code"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard and local meta directory */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Standings Leaderboard */}
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
                    {[...activeLeague.players]
                      .sort((a, b) => {
                        // Priority 1: Points
                        if (b.points !== a.points) return b.points - a.points;
                        // Priority 2: VP Scored
                        if (b.vpScored !== a.vpScored) return b.vpScored - a.vpScored;
                        // Priority 3: Models Slain
                        return b.casualtiesSlain - a.casualtiesSlain;
                      })
                      .map((p, idx) => (
                        <tr key={p.id} className="text-zinc-300 hover:bg-zinc-950/40">
                          <td className="py-2.5 text-center font-bold font-mono">
                            {idx + 1 === 1 ? (
                              <span className="text-amber-400">🥇</span>
                            ) : idx + 1 === 2 ? (
                              <span className="text-zinc-400">🥈</span>
                            ) : idx + 1 === 3 ? (
                              <span className="text-amber-700">🥉</span>
                            ) : (
                              idx + 1
                            )}
                          </td>
                          <td className="py-2.5">
                            <span className="font-bold text-white block truncate max-w-[140px]">{p.name}</span>
                            <span className={`text-[9px] font-mono border px-1 py-0.2 rounded font-bold ${getFactionColors(p.faction)} mt-0.5 inline-block`}>
                              {FACTIONS[p.faction]?.name}
                            </span>
                            {(() => {
                              const mostRecentMatch = activeLeague.matches.find(m => 
                                m.playerA.name.toLowerCase() === p.name.toLowerCase() || 
                                m.playerB.name.toLowerCase() === p.name.toLowerCase()
                              );
                              if (mostRecentMatch) {
                                const isA = mostRecentMatch.playerA.name.toLowerCase() === p.name.toLowerCase();
                                const spearhead = isA ? mostRecentMatch.playerA.spearheadName : mostRecentMatch.playerB.spearheadName;
                                if (spearhead) {
                                  return (
                                    <span className="text-[9px] text-amber-500/85 font-mono block mt-1 hover:text-amber-400 transition" title="Last deployed Spearhead force">
                                      🛡️ {spearhead}
                                    </span>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="font-display text-sm font-black text-amber-500">{p.points}</span>
                          </td>
                          <td className="py-2.5 text-center font-mono text-zinc-400">
                            {p.wins}-{p.draws}-{p.losses}
                          </td>
                          <td className="py-2.5 text-center font-mono font-bold text-zinc-500">{p.vpScored}</td>
                          <td className="py-2.5 text-center font-mono text-red-500/80 font-bold">{p.casualtiesSlain}</td>
                        </tr>
                      ))}

                    {activeLeague.players.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500">
                          No players currently indexed. Populate using the roster below.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Quick combatant addition list */}
              <div className="border-t border-zinc-900 pt-4 space-y-3">
                <span className="text-[10px] font-mono tracking-wider font-extrabold text-zinc-500 uppercase">Enlist Combatant</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Enter Player Name"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-hidden focus:border-amber-500"
                    id="new-player-name-input"
                  />
                  <select
                    value={newPlayerFaction}
                    onChange={(e) => setNewPlayerFaction(e.target.value as FactionType)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
                    id="new-player-faction-select"
                  >
                    {Object.values(FACTIONS).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addPlayerToLeague}
                    className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:text-white transition cursor-pointer text-xs font-bold"
                    id="add-roster-btn"
                  >
                    Roster Add
                  </button>
                </div>
              </div>
            </div>

            {/* Right sidebar: Faction Meta graph and Verification importer */}
            <div className="space-y-6 lg:col-span-1">
              {/* Import via Match Code */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
                <h3 className="font-display font-black text-white tracking-tight text-sm uppercase flex items-center gap-2">
                  <FileInput className="h-4 w-4 text-emerald-400" /> Decode Match Runes
                </h3>
                <p className="text-xs text-zinc-500">
                  Import a signed match report code generated at another device's "End of Game" panel.
                </p>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Paste SGC|... match token"
                    value={pastedReportCode}
                    onChange={(e) => setPastedReportCode(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-[10px] font-mono text-zinc-400 outline-hidden focus:border-emerald-500"
                    id="pasted-report-input"
                  />
                  <button
                    onClick={handleImportMatchCode}
                    disabled={!pastedReportCode.trim()}
                    className="w-full py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs transition disabled:bg-zinc-900 disabled:text-zinc-650 cursor-pointer border border-emerald-500/20"
                    id="submit-pasted-report-btn"
                  >
                    Decode Standings
                  </button>
                </div>

                {importStatusMessage.text && (
                  <p className={`text-[10px] font-bold ${importStatusMessage.error ? 'text-red-400' : 'text-emerald-400'}`}>
                    {importStatusMessage.text}
                  </p>
                )}
              </div>

              {/* Faction win rate local meta */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
                <h3 className="font-display font-black text-white tracking-tight text-sm uppercase flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" /> League Meta Win-Rates
                </h3>

                {metaData.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic">No games logged yet inside the Conclave. Ranks are stagnant.</p>
                ) : (
                  <div className="space-y-3">
                    {metaData.map((meta, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-zinc-300">{FACTIONS[meta.faction].name}</span>
                          <span className="font-mono text-amber-400 font-bold">{meta.winRate}% <span className="text-zinc-600 text-[10px]">({meta.played} g)</span></span>
                        </div>
                        <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900">
                          <div
                            className="bg-amber-500 h-full opacity-80"
                            style={{ width: `${meta.winRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chronology Activities feed list */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-3">
            <h3 className="font-display font-black text-white tracking-tight text-sm uppercase flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-purple-400" /> Recent League Activity
            </h3>
            <div className="divide-y divide-zinc-900/60 font-mono text-xs max-h-[380px] overflow-y-auto pr-1">
              {activeLeague.matches.map((m, idx) => (
                <div key={m.id} className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-zinc-300 border-b border-zinc-900/40 last:border-b-0">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 flex-1">
                    {/* Player A Details */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-xs font-bold font-sans">{m.playerA.name}</strong>
                        <span className={`text-[9px] font-mono border px-1.5 py-0.2 rounded font-extrabold ${getFactionColors(m.playerA.faction)}`}>
                          {FACTIONS[m.playerA.faction]?.name}
                        </span>
                      </div>
                      {m.playerA.spearheadName && (
                        <div className="text-[10px] text-zinc-400 font-mono flex flex-col gap-0.5">
                          <span className="text-amber-500 font-bold">🛡️ {m.playerA.spearheadName}</span>
                          {(m.playerA.enhancementName || m.playerA.regimentAbilityName) && (
                            <span className="text-[9px] text-zinc-500 italic">
                              {m.playerA.enhancementName && `✦ ${m.playerA.enhancementName}`}
                              {m.playerA.enhancementName && m.playerA.regimentAbilityName && ' | '}
                              {m.playerA.regimentAbilityName && `🌀 ${m.playerA.regimentAbilityName}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* VS & Score Section */}
                    <div className="flex items-center gap-3 justify-center md:justify-start font-black">
                      <span className="font-display text-sm text-amber-500 font-black px-2.5 py-1 bg-zinc-950 rounded border border-zinc-900 shadow-inner">
                        {m.playerA.score}
                      </span>
                      <span className="text-[10px] text-zinc-600 font-bold">VS</span>
                      <span className="font-display text-sm text-amber-500 font-black px-2.5 py-1 bg-zinc-950 rounded border border-zinc-900 shadow-inner">
                        {m.playerB.score}
                      </span>
                    </div>

                    {/* Player B Details */}
                    <div className="space-y-1.5 flex-1 text-left md:text-right">
                      <div className="flex items-center md:justify-end gap-2">
                        <strong className="text-white text-xs font-bold font-sans">{m.playerB.name}</strong>
                        <span className={`text-[9px] font-mono border px-1.5 py-0.2 rounded font-extrabold ${getFactionColors(m.playerB.faction)}`}>
                          {FACTIONS[m.playerB.faction]?.name}
                        </span>
                      </div>
                      {m.playerB.spearheadName && (
                        <div className="text-[10px] text-zinc-400 font-mono flex flex-col md:items-end gap-0.5">
                          <span className="text-amber-500 font-bold">🛡️ {m.playerB.spearheadName}</span>
                          {(m.playerB.enhancementName || m.playerB.regimentAbilityName) && (
                            <span className="text-[9px] text-zinc-500 italic">
                              {m.playerB.enhancementName && `✦ ${m.playerB.enhancementName}`}
                              {m.playerB.enhancementName && m.playerB.regimentAbilityName && ' | '}
                              {m.playerB.regimentAbilityName && `🌀 ${m.playerB.regimentAbilityName}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setActiveQRReport(m)}
                      className="text-[10px] text-zinc-400 hover:text-white px-2 py-1 rounded border border-zinc-800 hover:bg-zinc-900 cursor-pointer font-bold select-none h-fit"
                      id={`view-qr-activiy-${idx}`}
                    >
                      Show Sign QR
                    </button>
                  </div>
                </div>
              ))}
              {activeLeague.matches.length === 0 && (
                <p className="text-xs text-zinc-650 italic py-4">No recent matches archived. Log a game to activate the history log.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Prompt Select League */
        <div className="text-center p-14 border border-dashed border-zinc-800 rounded-2xl max-w-lg mx-auto bg-zinc-900/10">
          <Trophy className="h-10 w-10 text-zinc-600 mx-auto" />
          <h3 className="font-display font-black text-white tracking-tight text-base uppercase mt-4">Select or Create a Conclave Active Season</h3>
          <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed">
            The Conclave system tracking enables permanent faction statistics, win rate meta trackers, and peer-to-peer match verification keys. Select an existing cohort or compile one now.
          </p>
        </div>
      )}
    </div>
  );
}
