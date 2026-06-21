/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import MyCareer from './components/MyCareer';
import QuickPlay from './components/QuickPlay';
import LeagueTracker from './components/LeagueTracker';
import SpearheadBrowser from './components/SpearheadBrowser';
import { MatchReport, League, FactionType } from './types';
import { Sword, Trophy, User, BookOpen, Shield, HelpCircle, X } from 'lucide-react';
import { FACTIONS } from './data/factions';

export default function App() {
  const [activeTab, setActiveTab] = useState<'career' | 'play' | 'leagues'>('career');

  // Persistence States
  const [gameHistory, setGameHistory] = useState<MatchReport[]>([]);
  const [allLeagues, setAllLeagues] = useState<League[]>([]);

  // Inter-component orchestration
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(null);
  const [activeLeagueName, setActiveLeagueName] = useState<string | null>(null);
  const [completedMatchQueue, setCompletedMatchQueue] = useState<MatchReport | null>(null);

  // Selected Faction info drawer for career referencing
  const [referencedFaction, setReferencedFaction] = useState<FactionType | null>(null);

  // Load from local storage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('sgc_history');
      if (savedHistory) {
        setGameHistory(JSON.parse(savedHistory));
      }

      const savedLeagues = localStorage.getItem('sgc_leagues');
      if (savedLeagues) {
        setAllLeagues(JSON.parse(savedLeagues));
      }
    } catch (e) {
      console.error('Failed to parse cached combat data:', e);
    }
  }, []);

  // Sync to local storage
  const updateHistory = (history: MatchReport[]) => {
    setGameHistory(history);
    localStorage.setItem('sgc_history', JSON.stringify(history));
  };

  const updateLeagues = (leagues: League[]) => {
    setAllLeagues(leagues);
    localStorage.setItem('sgc_leagues', JSON.stringify(leagues));
  };

  const handleGameFinished = (report: MatchReport) => {
    // 1. Add to personal career stats history
    const updatedHistory = [report, ...gameHistory];
    updateHistory(updatedHistory);

    // 2. Queue for league updates if we were running a league match
    if (activeLeagueId) {
      setCompletedMatchQueue(report);
      setActiveTab('leagues'); // Automatically route to Leagues tracker!
    } else {
      // Prompt quick play success
      alert(`⚔️ Quick Play Battle Completed!\n\n${report.playerA.name} [${report.playerA.score}] VS ${report.playerB.name} [${report.playerB.score}]\nResult: ${
        report.winner === 'Draw' ? 'Tactical Stand-off (Draw)' : `Warlord ${report.winner === 'A' ? report.playerA.name : report.playerB.name} is Victorious!`
      }`);
      setActiveTab('career'); // Route back to Career logs
    }

    // Reset active league game status
    setActiveLeagueId(null);
    setActiveLeagueName(null);
  };

  const handleStartLeagueGame = (leagueId: string, leagueName: string) => {
    setActiveLeagueId(leagueId);
    setActiveLeagueName(leagueName);
    setActiveTab('play'); // Shift straight to play
  };

  const clearCareerChronology = () => {
    if (confirm('Permanently wipe your career records from localStorage? Your league standing data will be untouched.')) {
      updateHistory([]);
    }
  };

  const getFactionColors = (faction: FactionType) => {
    switch (faction) {
      case FactionType.STORMCAST: return 'border-amber-500 text-amber-400 bg-amber-500/10';
      case FactionType.SKAVEN: return 'border-emerald-500 text-emerald-400 bg-emerald-500/10';
      case FactionType.KHORNE: return 'border-red-600 text-red-500 bg-red-600/10';
      case FactionType.SLAANESH: return 'border-fuchsia-500 text-fuchsia-400 bg-fuchsia-500/10';
      case FactionType.TZEENTCH: return 'border-cyan-500 text-cyan-400 bg-cyan-500/10';
      case FactionType.SERAPHON: return 'border-teal-500 text-teal-450 bg-teal-500/10';
      case FactionType.SYLVANETH: return 'border-green-600 text-green-400 bg-green-600/10';
      case FactionType.SLAVES: return 'border-indigo-500 text-indigo-400 bg-indigo-500/10';
      case FactionType.SOULBLIGHT: return 'border-violet-600 text-violet-400 bg-violet-600/10';
      case FactionType.SONS: return 'border-rose-700 text-rose-450 bg-rose-700/10';
      case FactionType.NURGLE: return 'border-lime-700 text-lime-450 bg-lime-700/10';
      case FactionType.KHARADRON: return 'border-orange-500 text-orange-400 bg-orange-500/10';
      case FactionType.CITIES_OF_SIGMAR: return 'border-sky-700 text-sky-400 bg-sky-700/10';
      case FactionType.NIGHTHAUNT: return 'border-emerald-400 text-emerald-350 bg-emerald-400/5';
      case FactionType.FLESH_EATER: return 'border-rose-600 text-rose-500 bg-rose-600/10';
      case FactionType.IDONETH: return 'border-blue-600 text-blue-400 bg-blue-600/10';
      case FactionType.DAUGHTERS: return 'border-pink-600 text-pink-400 bg-pink-600/10';
      case FactionType.OGOR_MAWTRIBES: return 'border-zinc-500 text-zinc-350 bg-zinc-500/10';
      case FactionType.OSSIARCH: return 'border-yellow-600 text-yellow-500 bg-yellow-600/10';
      case FactionType.GLOOMSPITE: return 'border-yellow-500 text-yellow-400 bg-yellow-500/10';
      case FactionType.LUMINETH: return 'border-cyan-400 text-cyan-300 bg-cyan-400/10';
      case FactionType.ORRUK_WARCLANS: return 'border-green-700 text-green-500 bg-green-700/10';
      case FactionType.HELFORGE: return 'border-orange-600 text-orange-500 bg-orange-600/10';
      case FactionType.FYRESLAYERS: return 'border-amber-600 text-amber-500 bg-amber-600/10';
      default: return 'border-zinc-800 text-zinc-300 bg-zinc-800/10';
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-300 flex flex-col antialiased">
      {/* Decorative cosmic header lights */}
      <div className="absolute top-0 left-1/4 h-72 w-96 rounded-full bg-amber-500/[0.03] blur-3xl" />
      <div className="absolute top-0 right-1/4 h-72 w-96 rounded-full bg-blue-500/[0.03] blur-3xl" />

      {/* Main Top Navigation Header */}
      <header className="relative z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 py-4.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/15">
              <Sword className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-sans font-black text-lg tracking-tight text-white uppercase">
                Spearhead <span className="text-amber-500 font-medium">Grand Conclave</span>
              </h1>
              <span className="block font-mono text-[9px] text-zinc-500 tracking-wider">AoS WARBAND ASSISTANT & LEAGUE PLATFORM</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex gap-1.5 bg-zinc-900 p-1.5 rounded-xl border border-zinc-850 self-start sm:self-auto select-none">
            <button
              onClick={() => {
                setActiveTab('career');
                setActiveLeagueId(null);
              }}
              className={`px-4.5 py-2.5 rounded-lg text-xs font-bold tracking-wider transition uppercase flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'career'
                  ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-white'
              }`}
              id="tab-career"
            >
              <User className="h-3.5 w-3.5" /> Career
            </button>

            <button
              onClick={() => setActiveTab('play')}
              className={`px-4.5 py-2.5 rounded-lg text-xs font-bold tracking-wider transition uppercase flex items-center gap-1.5 relative cursor-pointer ${
                activeTab === 'play'
                  ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-white'
              }`}
              id="tab-play"
            >
              <Sword className="h-3.5 w-3.5" /> Match Hub
              {activeLeagueId && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('leagues')}
              className={`px-4.5 py-2.5 rounded-lg text-xs font-bold tracking-wider transition uppercase flex items-center gap-1.5 relative cursor-pointer ${
                activeTab === 'leagues'
                  ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-white'
              }`}
              id="tab-leagues"
            >
              <Trophy className="h-3.5 w-3.5" /> Conclave Leagues
              {completedMatchQueue && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 relative z-10">
        {activeTab === 'career' && (
          <MyCareer
            onSelectFaction={(f) => setReferencedFaction(f)}
            gameHistory={gameHistory}
            onClearHistory={clearCareerChronology}
          />
        )}

        {activeTab === 'play' && (
          <QuickPlay
            onGameFinished={handleGameFinished}
            activeLeagueId={activeLeagueId}
            activeLeagueName={activeLeagueName}
            onSelectFaction={(f) => setReferencedFaction(f)}
            allLeagues={allLeagues}
          />
        )}

        {activeTab === 'leagues' && (
          <LeagueTracker
            onStartLeagueGame={handleStartLeagueGame}
            completedMatchQueue={completedMatchQueue}
            onClearQueue={() => setCompletedMatchQueue(null)}
            allLeagues={allLeagues}
            setAllLeagues={updateLeagues}
          />
        )}
      </main>

      {/* Modal / Slide-over Info Drawer for referenced faction */}
      {referencedFaction && (
        <SpearheadBrowser
          factionId={referencedFaction}
          onClose={() => setReferencedFaction(null)}
          getFactionColors={getFactionColors}
        />
      )}

      {/* Humble Footer, clean, readable, professional */}
      <footer className="border-t border-zinc-900 bg-zinc-950/40 py-6 text-center text-xs text-zinc-650">
        <p className="font-mono">SPEARHEAD COHORT CRUCIBLE — OFFLINE-SENSITIVE SECURE DATA RECORDED LOCALLY ON DEVICE — VERSION 1.4.0</p>
      </footer>
    </div>
  );
}
