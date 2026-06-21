import { useState, useEffect, useRef } from 'react';
import { FactionType, MatchState, MatchReport, League } from '../types';
import { FACTIONS } from '../data/factions';
import { ALL_SPEARHEADS, getFactionTypeFromName, getSpearheadById } from '../utils/spearheadLoader';
import { Sword, RotateCcw, Plus, Minus, ShieldAlert, Heart, Calendar, PlusCircle, Play, Sparkles, Scroll, Trophy } from 'lucide-react';

interface QuickPlayProps {
  onGameFinished: (report: MatchReport) => void;
  activeLeagueId?: string | null;
  activeLeagueName?: string | null;
  onSelectFaction?: (faction: FactionType) => void;
  allLeagues?: League[];
}

export default function QuickPlay({ onGameFinished, activeLeagueId = null, activeLeagueName = null, onSelectFaction, allLeagues = [] }: QuickPlayProps) {
  // Game Setup State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerAName, setPlayerAName] = useState('Player 1');
  const [playerBName, setPlayerBName] = useState('Player 2');
  const [playerAFaction, setPlayerAFaction] = useState<FactionType>(FactionType.STORMCAST);
  const [playerBFaction, setPlayerBFaction] = useState<FactionType>(FactionType.SKAVEN);

  // Sort all 48 spearheads alphabetically for clean selection
  const sortedSpearheads = [...ALL_SPEARHEADS].sort((a, b) =>
    `${a.faction} - ${a.spearheadName}`.localeCompare(`${b.faction} - ${b.spearheadName}`)
  );

  const [selectedASpearheadId, setSelectedASpearheadId] = useState<string>(
    sortedSpearheads.find(s => s.id === 'vigilant_brotherhood')?.id || sortedSpearheads[0]?.id || ''
  );
  const [selectedBSpearheadId, setSelectedBSpearheadId] = useState<string>(
    sortedSpearheads.find(s => s.id === 'gnawfeast_clawpack')?.id || sortedSpearheads[1]?.id || sortedSpearheads[0]?.id || ''
  );

  const [selectedAEnhancement, setSelectedAEnhancement] = useState<string>('');
  const [selectedBEnhancement, setSelectedBEnhancement] = useState<string>('');

  const [selectedARegimentAbility, setSelectedARegimentAbility] = useState<string>('');
  const [selectedBRegimentAbility, setSelectedBRegimentAbility] = useState<string>('');

  // Update Player A selections based on Spearhead change
  useEffect(() => {
    const sp = ALL_SPEARHEADS.find(s => s.id === selectedASpearheadId);
    if (sp) {
      const defaultEnh = sp.enhancements?.[0]?.name || '';
      setSelectedAEnhancement(defaultEnh);
      const defaultTrait = sp.battleTraits?.[0]?.name || sp.regimentAbilities?.[0]?.name || '';
      setSelectedARegimentAbility(defaultTrait);
      
      const factType = getFactionTypeFromName(sp.faction);
      setPlayerAFaction(factType);
    }
  }, [selectedASpearheadId]);

  // Update Player B selections based on Spearhead change
  useEffect(() => {
    const sp = ALL_SPEARHEADS.find(s => s.id === selectedBSpearheadId);
    if (sp) {
      const defaultEnh = sp.enhancements?.[0]?.name || '';
      setSelectedBEnhancement(defaultEnh);
      const defaultTrait = sp.battleTraits?.[0]?.name || sp.regimentAbilities?.[0]?.name || '';
      setSelectedBRegimentAbility(defaultTrait);
      
      const factType = getFactionTypeFromName(sp.faction);
      setPlayerBFaction(factType);
    }
  }, [selectedBSpearheadId]);

  // Load defaults from local storage
  useEffect(() => {
    const savedName = localStorage.getItem('sgc_username');
    if (savedName) {
      setPlayerAName(savedName);
    }
  }, []);

  // Match Engine State
  const [gameState, setGameState] = useState<MatchState>({
    playerAFaction: FactionType.STORMCAST,
    playerBFaction: FactionType.SKAVEN,
    playerAName: 'Player A',
    playerBName: 'Player B',
    playerAVP: 0,
    playerBVP: 0,
    playerACasualties: 0,
    playerBCasualties: 0,
    playerAResource: 0,
    playerBResource: 0,
    playerATzeentchDice: [6, 4, 3, 1], // Initial Fate Dice
    playerBTzeentchDice: [5, 5, 2, 1],
    currentTurn: 1,
    currentPhase: 'hero',
    activePlayer: 'A',
    underdog: null,
    logs: ['Warlords have aligned. Match Hub primed.']
  });

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState.logs]);

  // Recalculate Underdog whenever VP changes
  useEffect(() => {
    if (!isPlaying) return;
    let underdog: 'A' | 'B' | null = null;
    if (gameState.playerAVP < gameState.playerBVP) {
      underdog = 'A';
    } else if (gameState.playerBVP < gameState.playerAVP) {
      underdog = 'B';
    }
    setGameState((prev) => ({ ...prev, underdog }));
  }, [gameState.playerAVP, gameState.playerBVP, isPlaying]);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setGameState((prev) => ({
      ...prev,
      logs: [...prev.logs, `[${time}] ${message}`]
    }));
  };

  const startMatch = () => {
    // Initialize Faction Resources
    const pARes = playerAFaction === FactionType.TZEENTCH ? 5 : 1; // start with 5 fate dice or 1 normal CP
    const pBRes = playerBFaction === FactionType.TZEENTCH ? 5 : 1;

    const spA = getSpearheadById(selectedASpearheadId);
    const spB = getSpearheadById(selectedBSpearheadId);

    setGameState({
      playerAFaction,
      playerBFaction,
      playerAName: playerAName.trim() || 'Player 1',
      playerBName: playerBName.trim() || 'Player 2',
      playerAVP: 0,
      playerBVP: 0,
      playerACasualties: 0,
      playerBCasualties: 0,
      playerAResource: pARes,
      playerBResource: pBRes,
      playerATzeentchDice: playerAFaction === FactionType.TZEENTCH ? [1, 3, 4, 5, 6].map(() => Math.floor(Math.random() * 6) + 1) : [],
      playerBTzeentchDice: playerBFaction === FactionType.TZEENTCH ? [1, 3, 4, 5, 6].map(() => Math.floor(Math.random() * 6) + 1) : [],
      playerASpearheadId: selectedASpearheadId,
      playerBSpearheadId: selectedBSpearheadId,
      playerAEnhancementName: selectedAEnhancement,
      playerBEnhancementName: selectedBEnhancement,
      playerARegimentAbilityName: selectedARegimentAbility,
      playerBRegimentAbilityName: selectedBRegimentAbility,
      currentTurn: 1,
      currentPhase: 'hero',
      activePlayer: 'A',
      underdog: null,
      logs: [
        `⚔️ The cosmic clash begins!`,
        `🛡️ [Challenger A] ${playerAName} command: ${spA?.spearheadName || 'Custom'} (${FACTIONS[playerAFaction].name})`,
        `🔱 Enhancement: "${selectedAEnhancement || 'None'}" | Trait: "${selectedARegimentAbility || 'None'}"`,
        `🛡️ [Challenger B] ${playerBName} command: ${spB?.spearheadName || 'Custom'} (${FACTIONS[playerBFaction].name})`,
        `🔱 Enhancement: "${selectedBEnhancement || 'None'}" | Trait: "${selectedBRegimentAbility || 'None'}"`
      ]
    });
    setIsPlaying(true);
  };

  const handleResourceChange = (player: 'A' | 'B', change: number) => {
    const isPlayerA = player === 'A';
    const currentRes = isPlayerA ? gameState.playerAResource : gameState.playerBResource;
    const faction = isPlayerA ? gameState.playerAFaction : gameState.playerBFaction;
    const maxRes = FACTIONS[faction].maxResource;

    const newValue = Math.min(Math.max(0, currentRes + change), maxRes);
    if (newValue === currentRes) return;

    if (isPlayerA) {
      setGameState((prev) => ({ ...prev, playerAResource: newValue }));
      addLog(`${gameState.playerAName} (${FACTIONS[faction].name}) adjusted ${FACTIONS[faction].resourceName} to ${newValue}`);
    } else {
      setGameState((prev) => ({ ...prev, playerBResource: newValue }));
      addLog(`${gameState.playerBName} (${FACTIONS[faction].name}) adjusted ${FACTIONS[faction].resourceName} to ${newValue}`);
    }
  };

  const handleVPChange = (player: 'A' | 'B', change: number) => {
    const isPlayerA = player === 'A';
    const currentVP = isPlayerA ? gameState.playerAVP : gameState.playerBVP;
    const newValue = Math.max(0, currentVP + change);
    if (newValue === currentVP) return;

    if (isPlayerA) {
      setGameState((prev) => ({ ...prev, playerAVP: newValue }));
      addLog(`${gameState.playerAName} VP: ${newValue} (was ${currentVP})`);
    } else {
      setGameState((prev) => ({ ...prev, playerBVP: newValue }));
      addLog(`${gameState.playerBName} VP: ${newValue} (was ${currentVP})`);
    }
  };

  const handleCasualtyChange = (player: 'A' | 'B', change: number) => {
    const isPlayerA = player === 'A';
    // Casualties refers to how many models are SLAIN.
    // If we increment casualties for Player A, it means Player A has lost models (Player B slew them).
    const currentUnits = isPlayerA ? gameState.playerACasualties : gameState.playerBCasualties;
    const newValue = Math.max(0, currentUnits + change);
    if (newValue === currentUnits) return;

    if (isPlayerA) {
      setGameState((prev) => ({ ...prev, playerACasualties: newValue }));
      addLog(`${gameState.playerAName} lost ${change > 0 ? 'a model' : 'a resurrected unit'} (Total Slain: ${newValue})`);

      // Special Slaanesh & Khorne hook: Khorne gains Blood Tithe when models are slain
      if (change > 0) {
        if (gameState.playerBFaction === FactionType.KHORNE) {
          handleResourceChange('B', 1);
          addLog(`🩸 Khorne rejoices! ${gameState.playerBName} gains 1 Blood Tithe.`);
        }
        if (gameState.playerBFaction === FactionType.SLAANESH) {
          handleResourceChange('B', 1);
          addLog(`😈 Slaanesh relishes the agony! ${gameState.playerBName} gains 1 Depravity.`);
        }
      }
    } else {
      setGameState((prev) => ({ ...prev, playerBCasualties: newValue }));
      addLog(`${gameState.playerBName} lost ${change > 0 ? 'a model' : 'a resurrected unit'} (Total Slain: ${newValue})`);

      if (change > 0) {
        if (gameState.playerAFaction === FactionType.KHORNE) {
          handleResourceChange('A', 1);
          addLog(`🩸 Khorne rejoices! ${gameState.playerAName} gains 1 Blood Tithe.`);
        }
        if (gameState.playerAFaction === FactionType.SLAANESH) {
          handleResourceChange('A', 1);
          addLog(`😈 Slaanesh relishes the agony! ${gameState.playerAName} gains 1 Depravity.`);
        }
      }
    }
  };

  const rerollTzeentchDice = (player: 'A' | 'B') => {
    const diceCount = player === 'A' ? (gameState.playerATzeentchDice?.length || 0) : (gameState.playerBTzeentchDice?.length || 0);
    const newDice = Array.from({ length: Math.max(3, diceCount) }, () => Math.floor(Math.random() * 6) + 1);

    if (player === 'A') {
      setGameState((prev) => ({ ...prev, playerATzeentchDice: newDice }));
      addLog(`🔮 ${gameState.playerAName} rerolled Destiny Dice: [${newDice.join(', ')}]`);
    } else {
      setGameState((prev) => ({ ...prev, playerBTzeentchDice: newDice }));
      addLog(`🔮 ${gameState.playerBName} rerolled Destiny Dice: [${newDice.join(', ')}]`);
    }
  };

  const useTzeentchDice = (player: 'A' | 'B', index: number) => {
    const dice = player === 'A' ? [...(gameState.playerATzeentchDice || [])] : [...(gameState.playerBTzeentchDice || [])];
    if (index < 0 || index >= dice.length) return;

    const val = dice[index];
    dice.splice(index, 1);

    if (player === 'A') {
      setGameState((prev) => ({ ...prev, playerATzeentchDice: dice }));
      addLog(`🔮 ${gameState.playerAName} consumed Destiny Die value ${val}. Remaining: [${dice.join(', ')}]`);
    } else {
      setGameState((prev) => ({ ...prev, playerBTzeentchDice: dice }));
      addLog(`🔮 ${gameState.playerBName} consumed Destiny Die value ${val}. Remaining: [${dice.join(', ')}]`);
    }
  };

  const advancePhase = () => {
    const phases: MatchState['currentPhase'][] = ['hero', 'movement', 'shooting', 'charge', 'combat', 'battleshock'];
    const currentIndex = phases.indexOf(gameState.currentPhase);

    if (currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1];
      setGameState((prev) => ({ ...prev, currentPhase: nextPhase }));
      addLog(`➡️ Advanced to ${nextPhase.toUpperCase()} Phase.`);
    } else {
      // Advance Turn
      if (gameState.currentTurn < 4) {
        setGameState((prev) => ({
          ...prev,
          currentTurn: prev.currentTurn + 1,
          currentPhase: 'hero'
        }));
        addLog(`🏆 --- TURN ${gameState.currentTurn + 1} BEGINS ---`);
        addLog(`Command Points / general energies refreshed.`);
        // Refresh Command Points slightly
        if (gameState.playerAFaction !== FactionType.TZEENTCH) handleResourceChange('A', 1);
        if (gameState.playerBFaction !== FactionType.TZEENTCH) handleResourceChange('B', 1);
      } else {
        // End game
        addLog(`🏆 Match limit reached (End of Turn 4). Gathering Battle Honors.`);
        finishMatch();
      }
    }
  };

  const handleReset = () => {
    if (confirm('Are you certain you want to restart this matches? Current scores will be abandoned.')) {
      setIsPlaying(false);
    }
  };

  const spendResource = (player: 'A' | 'B', cost: number, abilityName: string) => {
    const isPlayerA = player === 'A';
    const currentRes = isPlayerA ? gameState.playerAResource : gameState.playerBResource;
    if (currentRes < cost) return;

    if (isPlayerA) {
      setGameState((prev) => ({ ...prev, playerAResource: prev.playerAResource - cost }));
      addLog(`🌟 ${gameState.playerAName} unleashed [${abilityName}] for ${cost} points!`);
    } else {
      setGameState((prev) => ({ ...prev, playerBResource: prev.playerBResource - cost }));
      addLog(`🌟 ${gameState.playerBName} unleashed [${abilityName}] for ${cost} points!`);
    }
  };

  const finishMatch = () => {
    const winner: MatchReport['winner'] =
      gameState.playerAVP > gameState.playerBVP
        ? 'A'
        : gameState.playerBVP > gameState.playerAVP
        ? 'B'
        : 'Draw';

    const cleanReport: MatchReport = {
      id: `sgc-${Math.random().toString(36).substring(2, 11)}`,
      date: new Date().toISOString(),
      leagueId: activeLeagueId,
      playerA: {
        name: gameState.playerAName,
        faction: gameState.playerAFaction,
        score: gameState.playerAVP,
        casualties: gameState.playerACasualties,
        spearheadName: getSpearheadById(gameState.playerASpearheadId)?.spearheadName || undefined,
        enhancementName: gameState.playerAEnhancementName || undefined,
        regimentAbilityName: gameState.playerARegimentAbilityName || undefined
      },
      playerB: {
        name: gameState.playerBName,
        faction: gameState.playerBFaction,
        score: gameState.playerBVP,
        casualties: gameState.playerBCasualties,
        spearheadName: getSpearheadById(gameState.playerBSpearheadId)?.spearheadName || undefined,
        enhancementName: gameState.playerBEnhancementName || undefined,
        regimentAbilityName: gameState.playerBRegimentAbilityName || undefined
      },
      winner,
      underdogPlayed: gameState.underdog,
      underdogAwarded: gameState.underdog !== null, // If trailing player engaged, they held underdog honors
      verificationCode: ''
    };

    onGameFinished(cleanReport);
    setIsPlaying(false);
  };

  const getPhaseColor = (ph: MatchState['currentPhase']) => {
    switch (ph) {
      case 'hero': return 'text-amber-400 border-amber-500 bg-amber-500/10';
      case 'movement': return 'text-blue-400 border-blue-500 bg-blue-500/10';
      case 'shooting': return 'text-cyan-400 border-cyan-500 bg-cyan-500/10';
      case 'charge': return 'text-orange-400 border-orange-500 bg-orange-500/10';
      case 'combat': return 'text-red-400 border-red-500 bg-red-500/10';
      case 'battleshock': return 'text-purple-400 border-purple-500 bg-purple-500/10';
      default: return 'text-zinc-400 border-zinc-500 bg-zinc-500/10';
    }
  };

  const getThemeClass = (faction: FactionType) => {
    const fc = FACTIONS[faction];
    switch (fc.themeColor) {
      case 'amber': return 'border-amber-500 bg-amber-500/5 hover:border-amber-400';
      case 'emerald': return 'border-emerald-500 bg-emerald-500/5 hover:border-emerald-400';
      case 'red': return 'border-red-600 bg-red-600/5 hover:border-red-500';
      case 'purple': return 'border-purple-600 bg-purple-600/5 hover:border-purple-500';
      case 'cyan': return 'border-cyan-500 bg-cyan-500/5 hover:border-cyan-400';
      case 'teal': return 'border-teal-500 bg-teal-500/5 hover:border-teal-400';
      case 'green': return 'border-green-500 bg-green-500/5 hover:border-green-400';
      case 'indigo': return 'border-indigo-500 bg-indigo-500/5 hover:border-indigo-400';
      case 'violet': return 'border-violet-500 bg-violet-500/5 hover:border-violet-400';
      case 'rose': return 'border-rose-500 bg-rose-500/5 hover:border-rose-400';
      default: return 'border-zinc-800 bg-zinc-900/40';
    }
  };

  return (
    <div className="space-y-6">
      {!isPlaying ? (
        /* Configuration Screen */
        (() => {
          const spearheadA = ALL_SPEARHEADS.find(s => s.id === selectedASpearheadId);
          const spearheadB = ALL_SPEARHEADS.find(s => s.id === selectedBSpearheadId);
          const currentLeague = allLeagues?.find(l => l.id === activeLeagueId);
          const leaguePlayers = currentLeague?.players || [];

          return (
            <div className="max-w-xl mx-auto rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="font-display text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                  <Sword className="h-6 w-6 text-amber-500" /> Match Hub Setup
                </h2>
                <p className="text-sm text-zinc-500">Pick warbands and alignment paths to load the live gaming dashboard.</p>
              </div>

              {activeLeagueId && (
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-center">
                  <span className="text-xs font-semibold text-amber-400">
                    Playing Grand Conclave League Game: **{activeLeagueName}**
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Player A Setup */}
                <div className="space-y-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40">
                  <span className="text-xs font-mono text-zinc-500 tracking-wider">CHALLENGER A</span>
                  {leaguePlayers.length > 0 ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-amber-500">Pick League Roster Fighter</label>
                      <select
                        value={playerAName}
                        onChange={(e) => {
                          const nameVal = e.target.value;
                          setPlayerAName(nameVal);
                          const matched = leaguePlayers.find(p => p.name === nameVal);
                          if (matched) {
                            const foundSp = sortedSpearheads.find(s => getFactionTypeFromName(s.faction) === matched.faction);
                            if (foundSp) {
                              setSelectedASpearheadId(foundSp.id);
                            }
                          }
                        }}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500 font-medium"
                        id="setup-player-a-roster-select"
                      >
                        <option value="">-- Choose Roster Fighter --</option>
                        {leaguePlayers.map((lp) => (
                          <option key={`lp-a-${lp.id}`} value={lp.name}>
                            {lp.name} ({FACTIONS[lp.faction]?.name})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-500 pt-1">
                        <span>Or custom name:</span>
                        <input
                          type="text"
                          value={playerAName}
                          onChange={(e) => setPlayerAName(e.target.value)}
                          placeholder="Fighter Name"
                          className="w-1/2 bg-zinc-950 border border-zinc-850 rounded px-1.5 py-0.5 text-[10px] text-white"
                          id="setup-player-a-name-override"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-400">Warlord Name</label>
                      <input
                        type="text"
                        value={playerAName}
                        onChange={(e) => setPlayerAName(e.target.value)}
                        placeholder="Enter name"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500"
                        id="setup-player-a-name"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-400">Spearhead Army</label>
                    <select
                      value={selectedASpearheadId}
                      onChange={(e) => setSelectedASpearheadId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500 text-ellipsis overflow-hidden"
                      id="setup-player-a-spearhead"
                    >
                      {sortedSpearheads.map((s) => (
                        <option key={`sp-a-${s.id}`} value={s.id}>
                          {s.faction} — {s.spearheadName}
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] font-mono font-bold text-zinc-500 mt-1 pl-1">
                      Faction: {FACTIONS[playerAFaction]?.name || 'Unknown'} (Subfaction: {FACTIONS[playerAFaction]?.subfaction || 'Generic'})
                    </div>
                  </div>

                  {/* Enhancement Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-400">Select Enhancement</label>
                    <select
                      value={selectedAEnhancement}
                      onChange={(e) => setSelectedAEnhancement(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500"
                      id="setup-player-a-enhancement"
                    >
                      {spearheadA?.enhancements?.map((enh, i) => (
                        <option key={`enh-a-${i}`} value={enh.name}>
                          {enh.name}
                        </option>
                      )) || <option value="">No custom enhancements found</option>}
                    </select>
                    {spearheadA?.enhancements?.find(e => e.name === selectedAEnhancement) && (
                      <div className="p-2 border border-zinc-850 bg-zinc-950/30 rounded-lg text-[11px] text-zinc-400 leading-normal pl-2 font-medium italic select-text">
                        {spearheadA.enhancements.find(e => e.name === selectedAEnhancement)?.effect}
                      </div>
                    )}
                  </div>

                  {/* Battle Trait / Regiment Ability selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-400">Select Primary Combat Buff</label>
                    <select
                      value={selectedARegimentAbility}
                      onChange={(e) => setSelectedARegimentAbility(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500"
                      id="setup-player-a-trait"
                    >
                      {spearheadA?.battleTraits?.map((t, i) => (
                        <option key={`trait-a-${i}`} value={t.name}>
                          [Trait] {t.name}
                        </option>
                      ))}
                      {spearheadA?.regimentAbilities?.map((r, i) => (
                        <option key={`reg-a-${i}`} value={r.name}>
                          [Regiment Ab.] {r.name}
                        </option>
                      ))}
                      {(!spearheadA?.battleTraits?.length && !spearheadA?.regimentAbilities?.length) && (
                        <option value="">No selective combat traits found</option>
                      )}
                    </select>
                    {(() => {
                      const selectedObj = spearheadA?.battleTraits?.find(t => t.name === selectedARegimentAbility) ||
                                          spearheadA?.regimentAbilities?.find(r => r.name === selectedARegimentAbility);
                      return selectedObj ? (
                        <div className="p-2 border border-zinc-850 bg-zinc-950/30 rounded-lg text-[11px] text-zinc-400 leading-normal pl-2 font-medium italic select-text">
                          {selectedObj.effect}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* Player B Setup */}
                <div className="space-y-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40">
                  <span className="text-xs font-mono text-zinc-500 tracking-wider">CHALLENGER B</span>
                  {leaguePlayers.length > 0 ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-amber-500">Pick League Roster Fighter</label>
                      <select
                        value={playerBName}
                        onChange={(e) => {
                          const nameVal = e.target.value;
                          setPlayerBName(nameVal);
                          const matched = leaguePlayers.find(p => p.name === nameVal);
                          if (matched) {
                            const foundSp = sortedSpearheads.find(s => getFactionTypeFromName(s.faction) === matched.faction);
                            if (foundSp) {
                              setSelectedBSpearheadId(foundSp.id);
                            }
                          }
                        }}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500 font-medium"
                        id="setup-player-b-roster-select"
                      >
                        <option value="">-- Choose Roster Fighter --</option>
                        {leaguePlayers.map((lp) => (
                          <option key={`lp-b-${lp.id}`} value={lp.name}>
                            {lp.name} ({FACTIONS[lp.faction]?.name})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-500 pt-1">
                        <span>Or custom name:</span>
                        <input
                          type="text"
                          value={playerBName}
                          onChange={(e) => setPlayerBName(e.target.value)}
                          placeholder="Fighter Name"
                          className="w-1/2 bg-zinc-950 border border-zinc-850 rounded px-1.5 py-0.5 text-[10px] text-white"
                          id="setup-player-b-name-override"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-400">Warlord Name</label>
                      <input
                        type="text"
                        value={playerBName}
                        onChange={(e) => setPlayerBName(e.target.value)}
                        placeholder="Enter name"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500"
                        id="setup-player-b-name"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-400">Spearhead Army</label>
                    <select
                      value={selectedBSpearheadId}
                      onChange={(e) => setSelectedBSpearheadId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500 text-ellipsis overflow-hidden"
                      id="setup-player-b-spearhead"
                    >
                      {sortedSpearheads.map((s) => (
                        <option key={`sp-b-${s.id}`} value={s.id}>
                          {s.faction} — {s.spearheadName}
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] font-mono font-bold text-zinc-500 mt-1 pl-1">
                      Faction: {FACTIONS[playerBFaction]?.name || 'Unknown'} (Subfaction: {FACTIONS[playerBFaction]?.subfaction || 'Generic'})
                    </div>
                  </div>

                  {/* Enhancement Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-400">Select Enhancement</label>
                    <select
                      value={selectedBEnhancement}
                      onChange={(e) => setSelectedBEnhancement(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500"
                      id="setup-player-b-enhancement"
                    >
                      {spearheadB?.enhancements?.map((enh, i) => (
                        <option key={`enh-b-${i}`} value={enh.name}>
                          {enh.name}
                        </option>
                      )) || <option value="">No custom enhancements found</option>}
                    </select>
                    {spearheadB?.enhancements?.find(e => e.name === selectedBEnhancement) && (
                      <div className="p-2 border border-zinc-850 bg-zinc-950/30 rounded-lg text-[11px] text-zinc-400 leading-normal pl-2 font-medium italic select-text">
                        {spearheadB.enhancements.find(e => e.name === selectedBEnhancement)?.effect}
                      </div>
                    )}
                  </div>

                  {/* Battle Trait / Regiment Ability selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-400">Select Primary Combat Buff</label>
                    <select
                      value={selectedBRegimentAbility}
                      onChange={(e) => setSelectedBRegimentAbility(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-hidden focus:border-amber-500"
                      id="setup-player-b-trait"
                    >
                      {spearheadB?.battleTraits?.map((t, i) => (
                        <option key={`trait-b-${i}`} value={t.name}>
                          [Trait] {t.name}
                        </option>
                      ))}
                      {spearheadB?.regimentAbilities?.map((r, i) => (
                        <option key={`reg-b-${i}`} value={r.name}>
                          [Regiment Ab.] {r.name}
                        </option>
                      ))}
                      {(!spearheadB?.battleTraits?.length && !spearheadB?.regimentAbilities?.length) && (
                        <option value="">No selective combat traits found</option>
                      )}
                    </select>
                    {(() => {
                      const selectedObj = spearheadB?.battleTraits?.find(t => t.name === selectedBRegimentAbility) ||
                                          spearheadB?.regimentAbilities?.find(r => r.name === selectedBRegimentAbility);
                      return selectedObj ? (
                        <div className="p-2 border border-zinc-850 bg-zinc-950/30 rounded-lg text-[11px] text-zinc-400 leading-normal pl-2 font-medium italic select-text">
                          {selectedObj.effect}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>

              <button
                onClick={startMatch}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold tracking-wide text-sm transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
                id="start-match-btn"
              >
                <Play className="h-4 w-4" /> BEGIN SPEARHEAD MATCH
              </button>
            </div>
          );
        })()
      ) : (
        /* GAME DASHBOARD */
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 gap-4">
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-amber-500 text-black font-black text-center rounded-lg leading-tight">
                <span className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-amber-950">Round</span>
                <span className="font-display text-xl">{gameState.currentTurn} / 4</span>
              </div>
              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold border inline-block select-none tracking-widest uppercase ${getPhaseColor(gameState.currentPhase)}`}>
                  {gameState.currentPhase} Phase
                </span>
                <div className="flex gap-1.5 mt-2">
                  {['hero', 'movement', 'shooting', 'charge', 'combat', 'battleshock'].map((ph) => (
                    <span
                      key={ph}
                      className={`h-1.5 w-1.5 rounded-full ${
                        gameState.currentPhase === ph ? 'bg-amber-400 scale-125' : 'bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={advancePhase}
                className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs tracking-wider transition cursor-pointer flex items-center gap-1.5"
                id="advance-phase-btn"
              >
                Assemble Next Phase →
              </button>
              <button
                onClick={handleReset}
                className="p-2.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                id="reset-match-btn"
                title="Restart Game"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={finishMatch}
                className="px-4 py-2.5 rounded-lg border border-emerald-500/40 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-400 text-xs font-extrabold cursor-pointer transition uppercase tracking-wider"
                id="force-abandon-btn"
              >
                End Game
              </button>
            </div>
          </div>

          {/* Underdog indicator */}
          {gameState.underdog && (
            <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-blue-400">
                <ShieldAlert className="h-5 w-5" />
                <span className="text-xs font-semibold">
                  Underdog Bonus active: **{gameState.underdog === 'A' ? gameState.playerAName : gameState.playerBName}** holds the tactical advantage.
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold font-mono text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded">
                +1 Victory Point per Secret Agenda
              </span>
            </div>
          )}

          {/* Player Sheets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PLAYER A CARD */}
            <div className={`p-5 rounded-2xl border transition ${getThemeClass(gameState.playerAFaction)}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-black text-xl text-white tracking-tight">{gameState.playerAName}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono italic flex items-center gap-1.5">
                    {FACTIONS[gameState.playerAFaction].name} — {FACTIONS[gameState.playerAFaction].subfaction}
                    {onSelectFaction && (
                      <button
                        onClick={() => onSelectFaction(gameState.playerAFaction)}
                        className="inline-flex items-center text-amber-500 hover:text-amber-400 transition cursor-pointer p-0.5 rounded hover:bg-zinc-900/45"
                        title="View Spearhead Codex & Unit Warscrolls"
                        id="player-a-codex-btn"
                      >
                        <Scroll className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </p>
                  {gameState.playerASpearheadId && (
                    <div className="mt-2 space-y-1 pl-1.5 border-l border-amber-500/30">
                      <div className="text-[10px] font-bold text-amber-400 font-mono">
                        ⚔️ {getSpearheadById(gameState.playerASpearheadId)?.spearheadName || 'Spearhead Army'}
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        <div className="text-[10px] text-zinc-450 font-mono">
                          <span className="text-zinc-500 uppercase font-black text-[9px]">Enhancement:</span> {gameState.playerAEnhancementName || 'None Selected'}
                        </div>
                        <div className="text-[10px] text-zinc-450 font-mono">
                          <span className="text-zinc-500 uppercase font-black text-[9px]">Combat Buff:</span> {gameState.playerARegimentAbilityName || 'None Selected'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {gameState.underdog === 'A' && (
                  <span className="text-[10px] font-bold font-mono tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
                    UNDERDOG
                  </span>
                )}
              </div>

              {/* Victory Points Block */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center relative overflow-hidden">
                  <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Victory Points</span>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <button
                      onClick={() => handleVPChange('A', -1)}
                      className="p-1 rounded bg-zinc-850 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer"
                      id="minus-vp-a"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-display text-3xl font-black text-amber-500">{gameState.playerAVP}</span>
                    <button
                      onClick={() => handleVPChange('A', 1)}
                      className="p-1 rounded bg-zinc-850 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer"
                      id="plus-vp-a"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center relative overflow-hidden">
                  <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Models Lost</span>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <button
                      onClick={() => handleCasualtyChange('A', -1)}
                      className="p-1 rounded bg-zinc-850 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer"
                      id="minus-cas-a"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-display text-3xl font-black text-red-500">{gameState.playerACasualties}</span>
                    <button
                      onClick={() => handleCasualtyChange('A', 1)}
                      className="p-1 rounded bg-zinc-850 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer"
                      id="plus-cas-a"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Resource Mechanics (Khorne Blood Tithe, Slaanesh Depravity, Destiny Dice) */}
              <div className="mt-5 p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    {FACTIONS[gameState.playerAFaction].resourceName}
                  </span>
                  {gameState.playerAFaction === FactionType.TZEENTCH ? (
                    <button
                      onClick={() => rerollTzeentchDice('A')}
                      className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-extrabold border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition cursor-pointer"
                      id="reroll-tzeentch-a"
                    >
                      RE-ROLL DICE
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleResourceChange('A', -1)}
                        className="h-5 w-5 flex items-center justify-center rounded bg-zinc-850 text-zinc-400 text-xs border border-zinc-750 cursor-pointer"
                        id="minus-res-a"
                      >
                        -
                      </button>
                      <span className="font-sans text-sm font-bold text-white">
                        {gameState.playerAResource} / {FACTIONS[gameState.playerAFaction].maxResource}
                      </span>
                      <button
                        onClick={() => handleResourceChange('A', 1)}
                        className="h-5 w-5 flex items-center justify-center rounded bg-zinc-850 text-zinc-400 text-xs border border-zinc-750 cursor-pointer"
                        id="plus-res-a"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {/* Destiny Dice Pools visual for Tzeentch */}
                {gameState.playerAFaction === FactionType.TZEENTCH ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(gameState.playerATzeentchDice || []).length === 0 ? (
                      <span className="text-xs text-zinc-600 font-mono">No dice remaining. Press re-roll to manifest destiny.</span>
                    ) : (
                      (gameState.playerATzeentchDice || []).map((die, idx) => (
                        <button
                          key={idx}
                          onClick={() => useTzeentchDice('A', idx)}
                          className="h-9 w-9 rounded-xl border border-cyan-500/30 bg-cyan-700/10 text-cyan-400 hover:border-cyan-400 flex items-center justify-center font-bold text-sm tracking-tight cursor-pointer hover:scale-105 active:scale-95 transition"
                          title="Consume destiny die"
                          id={`use-die-a-${idx}`}
                        >
                          {die}
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  /* Progress Bar for standard resources */
                  <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full opacity-90 transition-all duration-300 ${
                        gameState.playerAFaction === FactionType.KHORNE
                          ? 'bg-red-600'
                          : gameState.playerAFaction === FactionType.SLAANESH
                          ? 'bg-purple-500'
                          : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${(gameState.playerAResource / FACTIONS[gameState.playerAFaction].maxResource) * 100}%`
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Faction active phase guidelines */}
              <div className="mt-5 space-y-2">
                <span className="text-[11px] font-mono tracking-wider font-extrabold text-zinc-500 uppercase">Phase Actions Directory</span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {FACTIONS[gameState.playerAFaction].abilities
                    .filter(
                      (ab) => ab.phase === gameState.currentPhase || ab.phase === 'any'
                    )
                    .map((ab, idx) => {
                      const costStatus =
                        gameState.playerAFaction !== FactionType.TZEENTCH &&
                        gameState.playerAResource >= ab.cost;

                      return (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-zinc-800/60 bg-zinc-950/40 text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{ab.name}</span>
                            <span className="text-zinc-400 leading-relaxed block mt-0.5">{ab.description}</span>
                          </div>
                          {gameState.playerAFaction !== FactionType.TZEENTCH && (
                            <button
                              onClick={() => spendResource('A', ab.cost, ab.name)}
                              disabled={!costStatus}
                              className={`px-2 py-1 rounded text-[10px] font-mono tracking-tight font-extrabold shrink-0 border ${
                                costStatus
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 cursor-pointer'
                                  : 'border-zinc-800 bg-zinc-900 text-zinc-650 cursor-not-allowed'
                              }`}
                              id={`spend-a-ab-${idx}`}
                            >
                              LOCK {ab.cost} PTS
                            </button>
                          )}
                        </div>
                      );
                    })}

                  {FACTIONS[gameState.playerAFaction].abilities.filter(
                    (ab) => ab.phase === gameState.currentPhase || ab.phase === 'any'
                  ).length === 0 && (
                    <p className="text-[11px] text-zinc-600 font-medium italic">No custom phase maneuvers. Refer to Core rules.</p>
                  )}
                </div>
              </div>
            </div>

            {/* PLAYER B CARD */}
            <div className={`p-5 rounded-2xl border transition ${getThemeClass(gameState.playerBFaction)}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-black text-xl text-white tracking-tight">{gameState.playerBName}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono italic flex items-center gap-1.5">
                    {FACTIONS[gameState.playerBFaction].name} — {FACTIONS[gameState.playerBFaction].subfaction}
                    {onSelectFaction && (
                      <button
                        onClick={() => onSelectFaction(gameState.playerBFaction)}
                        className="inline-flex items-center text-amber-500 hover:text-amber-400 transition cursor-pointer p-0.5 rounded hover:bg-zinc-900/45"
                        title="View Spearhead Codex & Unit Warscrolls"
                        id="player-b-codex-btn"
                      >
                        <Scroll className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </p>
                  {gameState.playerBSpearheadId && (
                    <div className="mt-2 space-y-1 pl-1.5 border-l border-amber-500/30">
                      <div className="text-[10px] font-bold text-amber-400 font-mono">
                        ⚔️ {getSpearheadById(gameState.playerBSpearheadId)?.spearheadName || 'Spearhead Army'}
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        <div className="text-[10px] text-zinc-450 font-mono">
                          <span className="text-zinc-500 uppercase font-black text-[9px]">Enhancement:</span> {gameState.playerBEnhancementName || 'None Selected'}
                        </div>
                        <div className="text-[10px] text-zinc-450 font-mono">
                          <span className="text-zinc-500 uppercase font-black text-[9px]">Combat Buff:</span> {gameState.playerBRegimentAbilityName || 'None Selected'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {gameState.underdog === 'B' && (
                  <span className="text-[10px] font-bold font-mono tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
                    UNDERDOG
                  </span>
                )}
              </div>

              {/* Victory Points Block */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center relative overflow-hidden">
                  <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Victory Points</span>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <button
                      onClick={() => handleVPChange('B', -1)}
                      className="p-1 rounded bg-zinc-850 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer"
                      id="minus-vp-b"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-display text-3xl font-black text-amber-500">{gameState.playerBVP}</span>
                    <button
                      onClick={() => handleVPChange('B', 1)}
                      className="p-1 rounded bg-zinc-850 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer"
                      id="plus-vp-b"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center relative overflow-hidden">
                  <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Models Lost</span>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <button
                      onClick={() => handleCasualtyChange('B', -1)}
                      className="p-1 rounded bg-zinc-850 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer"
                      id="minus-cas-b"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-display text-3xl font-black text-red-500">{gameState.playerBCasualties}</span>
                    <button
                      onClick={() => handleCasualtyChange('B', 1)}
                      className="p-1 rounded bg-zinc-850 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer"
                      id="plus-cas-b"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Resource Mechanics */}
              <div className="mt-5 p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    {FACTIONS[gameState.playerBFaction].resourceName}
                  </span>
                  {gameState.playerBFaction === FactionType.TZEENTCH ? (
                    <button
                      onClick={() => rerollTzeentchDice('B')}
                      className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-extrabold border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition cursor-pointer"
                      id="reroll-tzeentch-b"
                    >
                      RE-ROLL DICE
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleResourceChange('B', -1)}
                        className="h-5 w-5 flex items-center justify-center rounded bg-zinc-850 text-zinc-400 text-xs border border-zinc-750 cursor-pointer"
                        id="minus-res-b"
                      >
                        -
                      </button>
                      <span className="font-sans text-sm font-bold text-white">
                        {gameState.playerBResource} / {FACTIONS[gameState.playerBFaction].maxResource}
                      </span>
                      <button
                        onClick={() => handleResourceChange('B', 1)}
                        className="h-5 w-5 flex items-center justify-center rounded bg-zinc-850 text-zinc-400 text-xs border border-zinc-750 cursor-pointer"
                        id="plus-res-b"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {/* Destiny Dice Pools visual for Tzeentch */}
                {gameState.playerBFaction === FactionType.TZEENTCH ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(gameState.playerBTzeentchDice || []).length === 0 ? (
                      <span className="text-xs text-zinc-600 font-mono">No dice remaining. Press re-roll to manifest destiny.</span>
                    ) : (
                      (gameState.playerBTzeentchDice || []).map((die, idx) => (
                        <button
                          key={idx}
                          onClick={() => useTzeentchDice('B', idx)}
                          className="h-9 w-9 rounded-xl border border-cyan-500/30 bg-cyan-700/10 text-cyan-400 hover:border-cyan-400 flex items-center justify-center font-bold text-sm tracking-tight cursor-pointer hover:scale-105 active:scale-95 transition"
                          title="Consume destiny die"
                          id={`use-die-b-${idx}`}
                        >
                          {die}
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  /* Progress Bar for standard resources */
                  <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full opacity-90 transition-all duration-300 ${
                        gameState.playerBFaction === FactionType.KHORNE
                          ? 'bg-red-600'
                          : gameState.playerBFaction === FactionType.SLAANESH
                          ? 'bg-purple-500'
                          : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${(gameState.playerBResource / FACTIONS[gameState.playerBFaction].maxResource) * 100}%`
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Faction active phase guidelines */}
              <div className="mt-5 space-y-2">
                <span className="text-[11px] font-mono tracking-wider font-extrabold text-zinc-500 uppercase">Phase Actions Directory</span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {FACTIONS[gameState.playerBFaction].abilities
                    .filter(
                      (ab) => ab.phase === gameState.currentPhase || ab.phase === 'any'
                    )
                    .map((ab, idx) => {
                      const costStatus =
                        gameState.playerBFaction !== FactionType.TZEENTCH &&
                        gameState.playerBResource >= ab.cost;

                      return (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-zinc-800/60 bg-zinc-950/40 text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{ab.name}</span>
                            <span className="text-zinc-400 leading-relaxed block mt-0.5">{ab.description}</span>
                          </div>
                          {gameState.playerBFaction !== FactionType.TZEENTCH && (
                            <button
                              onClick={() => spendResource('B', ab.cost, ab.name)}
                              disabled={!costStatus}
                              className={`px-2 py-1 rounded text-[10px] font-mono tracking-tight font-extrabold shrink-0 border ${
                                costStatus
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 cursor-pointer'
                                  : 'border-zinc-800 bg-zinc-900 text-zinc-650 cursor-not-allowed'
                              }`}
                              id={`spend-b-ab-${idx}`}
                            >
                              LOCK {ab.cost} PTS
                            </button>
                          )}
                        </div>
                      );
                    })}

                  {FACTIONS[gameState.playerBFaction].abilities.filter(
                    (ab) => ab.phase === gameState.currentPhase || ab.phase === 'any'
                  ).length === 0 && (
                    <p className="text-[11px] text-zinc-600 font-medium italic">No custom phase maneuvers. Refer to Core rules.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scrolling Battle Tally logs */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <span className="font-mono text-xs font-bold text-zinc-500 flex items-center gap-1.5 mb-2 border-b border-zinc-900 pb-2">
              <Scroll className="h-4 w-4 text-amber-500" /> Chronology Tracker
            </span>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 text-xs font-mono">
              {gameState.logs.map((log, index) => (
                <div key={index} className="text-zinc-400 py-0.5 odd:bg-zinc-900/30 px-1 rounded">
                  {log}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
