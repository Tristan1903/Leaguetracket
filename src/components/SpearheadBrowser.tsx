import React, { useState } from 'react';
import { FactionType, SpearheadData, SpearheadUnit, SpearheadWeapon } from '../types';
import { FACTIONS } from '../data/factions';
import { getSpearheadsByFaction } from '../utils/spearheadLoader';
import { 
  X, Sword, Shield, BookOpen, Activity, Heart, Sparkles, 
  ChevronRight, Award, Flame, Zap
} from 'lucide-react';

interface SpearheadBrowserProps {
  factionId: FactionType;
  onClose: () => void;
  getFactionColors: (faction: FactionType) => string;
}

export default function SpearheadBrowser({ factionId, onClose, getFactionColors }: SpearheadBrowserProps) {
  const faction = FACTIONS[factionId];
  const spearheads = getSpearheadsByFaction(factionId);
  
  const [activeMainTab, setActiveMainTab] = useState<'abilities' | 'spearheads'>('abilities');
  const [selectedSpearheadId, setSelectedSpearheadId] = useState<string>(spearheads[0]?.id || '');
  const [spearheadSubTab, setSpearheadSubTab] = useState<'rules' | 'units'>('rules');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  const selectedSpearhead = spearheads.find((s) => s.id === selectedSpearheadId);
  const selectedUnit = selectedSpearhead?.units.find((u) => u.id === selectedUnitId);

  // Set default selected unit when spearhead changes
  React.useEffect(() => {
    if (selectedSpearhead && selectedSpearhead.units.length > 0) {
      setSelectedUnitId(selectedSpearhead.units[0].id);
    } else {
      setSelectedUnitId('');
    }
  }, [selectedSpearheadId]);

  if (!faction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in text-zinc-300">
      <div className="rounded-2xl border border-zinc-850 bg-zinc-950 p-4 sm:p-6 max-w-4xl w-full h-[90vh] md:h-[80vh] flex flex-col relative shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-550 hover:text-white cursor-pointer transition p-1.5 rounded-lg hover:bg-zinc-900 border border-zinc-900/40 hover:border-zinc-800"
          id="close-spearhead-browser"
          title="Close Browser"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header section with faction theme banner */}
        <div className="mb-4">
          <span className={`text-[9px] font-mono uppercase tracking-widest font-extrabold border px-2.5 py-1 rounded-full ${getFactionColors(factionId)}`}>
            Realm-Scroll Archive
          </span>
          <h2 className="font-sans font-black text-2xl sm:text-3xl text-white mt-2.5 uppercase tracking-tight flex items-center gap-2">
            {faction.name}
          </h2>
          <p className="font-mono text-xs text-zinc-500 italic mt-0.5">{faction.subfaction}</p>
        </div>

        {/* Main Tabs Selection */}
        <div className="flex border-b border-zinc-900 mb-4 select-none">
          <button
            onClick={() => setActiveMainTab('abilities')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 font-mono flex items-center gap-2 cursor-pointer transition ${
              activeMainTab === 'abilities'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
            id="tab-faction-tactics"
          >
            <Sparkles className="h-3.5 w-3.5" /> Faction Tactics
          </button>
          
          {spearheads.length > 0 && (
            <button
              onClick={() => setActiveMainTab('spearheads')}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 font-mono flex items-center gap-2 cursor-pointer transition ${
                activeMainTab === 'spearheads'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
              id="tab-spearheads-codex"
            >
              <BookOpen className="h-3.5 w-3.5" /> Spearhead Codex ({spearheads.length})
            </button>
          )}
        </div>

        {/* Inner Scrolling Area */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-4">
          
          {/* TAB 1: FACTION TACTICS */}
          {activeMainTab === 'abilities' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/20">
                <span className="block text-[10px] font-mono text-zinc-500 uppercase font-extrabold tracking-wider">Subfaction Strategic Engine:</span>
                <span className="text-sm font-black text-amber-500 mt-1 block uppercase font-mono">
                  {faction.resourceName} <span className="text-xs text-zinc-500 font-normal capitalize">({faction.resourceName.includes('Points') ? 'replenishing resource' : 'accumulated resource'} - limit {faction.maxResource})</span>
                </span>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Phase Tactical Abilities</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {faction.abilities.map((ab, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-zinc-900/60 bg-zinc-950/45 space-y-1.5 hover:border-zinc-805 transition">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-white text-sm leading-tight">{ab.name}</span>
                        <span className="font-mono text-[9px] uppercase font-bold text-amber-400 bg-amber-400/5 border border-amber-505/20 px-1.5 py-0.5 rounded shrink-0">
                          {ab.phase}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono bg-zinc-850 text-amber-400/90 font-bold px-1.5 py-0.2 rounded">
                          Cost: {ab.cost} token{ab.cost !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed pt-1 select-text">
                        {ab.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPEARHEADS & WARBANDS */}
          {activeMainTab === 'spearheads' && selectedSpearhead && (
            <div className="flex flex-col md:flex-row gap-5 h-full min-h-0 animate-fade-in">
              
              {/* Left Column: Spearhead Selector & Quick-Subtabs */}
              <div className="w-full md:w-1/4 flex flex-col gap-3 shrink-0">
                {/* Spearheads list (if multiple option exist e.g. Yndrasta vs Vigilant etc) */}
                {spearheads.length > 1 && (
                  <div className="space-y-1.5">
                    <span className="block text-[9px] font-mono text-zinc-650 uppercase font-bold tracking-wider">Select Warband</span>
                    <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1 pb-1 md:pb-0">
                      {spearheads.map((sh) => (
                        <button
                          key={sh.id}
                          onClick={() => setSelectedSpearheadId(sh.id)}
                          className={`text-xs py-2 px-3 text-left rounded-lg font-bold border transition cursor-pointer shrink-0 md:w-full ${
                            selectedSpearheadId === sh.id
                              ? 'bg-amber-500 border-amber-500 text-black font-extrabold'
                              : 'bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800'
                          }`}
                        >
                          {sh.spearheadName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-Tabs Selector */}
                <div className="flex flex-row md:flex-col border border-zinc-900 rounded-xl p-1 bg-zinc-950/80 gap-1 mt-1">
                  <button
                    onClick={() => setSpearheadSubTab('rules')}
                    className={`flex-1 py-2 text-xs font-mono font-bold tracking-wider rounded-lg text-center cursor-pointer transition flex items-center justify-center gap-1.5 ${
                      spearheadSubTab === 'rules'
                        ? 'bg-zinc-900 border border-zinc-800 text-amber-400'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Award className="h-3.5 w-3.5" /> Warband Info
                  </button>
                  <button
                    onClick={() => setSpearheadSubTab('units')}
                    className={`flex-1 py-2 text-xs font-mono font-bold tracking-wider rounded-lg text-center cursor-pointer transition flex items-center justify-center gap-1.5 ${
                      spearheadSubTab === 'units'
                        ? 'bg-zinc-900 border border-zinc-800 text-amber-400'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Sword className="h-3.5 w-3.5" /> Cohort Units
                  </button>
                </div>
              </div>

              {/* Right Column: Dynamic Content Box */}
              <div className="flex-1 overflow-y-auto pr-1 min-h-0 bg-zinc-950/20 border border-zinc-900/60 rounded-xl p-4">
                
                {/* SUB TAB: RULES (Traits, Abilities, Enhancements) */}
                {spearheadSubTab === 'rules' && (
                  <div className="space-y-6 animate-fade-in">
                    <div>
                      <h3 className="font-sans font-black text-xl text-white tracking-tight uppercase border-b border-zinc-900 pb-2 flex items-center justify-between">
                        <span>{selectedSpearhead.spearheadName}</span>
                        <span className="text-[10px] font-mono lowercase text-zinc-500 font-normal">AoS Spearhead Format</span>
                      </h3>
                    </div>

                    {/* Battle Traits */}
                    {selectedSpearhead.battleTraits && selectedSpearhead.battleTraits.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-mono tracking-widest text-amber-500 font-bold uppercase flex items-center gap-1">
                          <Flame className="h-3.5 w-3.5 shrink-0" /> Faction Battle Traits
                        </h4>
                        <div className="space-y-2">
                          {selectedSpearhead.battleTraits.map((t, idx) => (
                            <div key={idx} className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/50 space-y-1 hover:bg-zinc-950/80 transition">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                                <span className="font-bold text-white text-xs">{t.name}</span>
                                <span className="text-[9px] font-mono text-zinc-500 font-semibold">{t.timing}</span>
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed mt-1 select-text">{t.effect}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regiment Abilities */}
                    {selectedSpearhead.regimentAbilities && selectedSpearhead.regimentAbilities.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-mono tracking-widest text-amber-500 font-bold uppercase flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5 shrink-0" /> Regiment Abilities
                        </h4>
                        <div className="space-y-2">
                          {selectedSpearhead.regimentAbilities.map((a, idx) => (
                            <div key={idx} className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/50 space-y-1 hover:bg-zinc-950/80 transition">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                                <span className="font-bold text-white text-xs">{a.name}</span>
                                <span className="text-[9px] font-mono text-zinc-500 font-semibold">{a.timing}</span>
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed mt-1 select-text">{a.effect}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Enhancements */}
                    {selectedSpearhead.enhancements && selectedSpearhead.enhancements.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-mono tracking-widest text-amber-500 font-bold uppercase flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 shrink-0" /> General Enhancements
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {selectedSpearhead.enhancements.map((e, idx) => (
                            <div key={idx} className="p-3 rounded-lg border border-zinc-900 bg-zinc-950/30 space-y-1 hover:bg-zinc-950/70 transition">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-white text-xs text-amber-400">{e.name}</span>
                                <span className="text-[8px] font-mono bg-zinc-900 py-0.5 px-1.5 rounded text-zinc-550">{e.timing}</span>
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed mt-1.5 select-text">{e.effect}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SUB TAB: COHORT UNITS (Interactive Warscroll views!) */}
                {spearheadSubTab === 'units' && (
                  <div className="flex flex-col gap-5 h-full min-h-0 animate-fade-in">
                    
                    {/* Unit Selector list & detail container split */}
                    <div className="flex flex-col sm:flex-row md:flex-row lg:flex-row gap-4 h-full min-h-0 items-start">
                      
                      {/* Left: Unit Roster Menu */}
                      <div className="w-full sm:w-1/3 flex flex-row sm:flex-col overflow-x-auto sm:overflow-visible gap-1 pb-2 sm:pb-0 shrink-0 border-b sm:border-b-0 sm:border-r border-zinc-900 pr-0 sm:pr-3">
                        {selectedSpearhead.units.map((unit) => (
                          <button
                            key={unit.id}
                            onClick={() => setSelectedUnitId(unit.id)}
                            className={`w-auto sm:w-full text-left py-2 px-3 rounded-lg text-xs leading-snug transition flex items-center justify-between gap-2 shrink-0 border cursor-pointer ${
                              selectedUnitId === unit.id
                                ? 'bg-zinc-905 border-zinc-800 text-white font-extrabold shadow-sm'
                                : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-350'
                            }`}
                          >
                            <span className="truncate">{unit.name}</span>
                            {unit.isGeneral && (
                              <span className="text-[8px] tracking-wider uppercase font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-0.1 rounded leading-none shrink-0">
                                Gen
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Right: Selected Unit Detail (The Interactive Warscroll Sheet!) */}
                      <div className="flex-1 w-full space-y-4 pr-1">
                        {selectedUnit ? (
                          <div className="space-y-4 animate-fade-in">
                            {/* Title banner */}
                            <div className="flex justify-between items-start border-b border-zinc-900 pb-3 gap-2">
                              <div>
                                <h3 className="font-sans font-black text-lg text-white tracking-tight uppercase flex items-center gap-1.5 leading-none">
                                  {selectedUnit.name}
                                  {selectedUnit.isGeneral && (
                                    <span className="text-[9px] bg-amber-500 text-black font-extrabold px-1.5 py-0.5 rounded leading-none">
                                      General
                                    </span>
                                  )}
                                </h3>
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {selectedUnit.keywords.map((kw, idx) => (
                                    <span key={idx} className="bg-zinc-900 py-0.5 px-1.5 text-[8px] font-mono tracking-wider font-bold rounded uppercase border border-zinc-850 text-zinc-500">
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-center font-mono">
                                <span className="block text-[8px] text-zinc-500 uppercase font-black leading-none">Models</span>
                                <span className="text-sm text-white font-black leading-none mt-1 inline-block">{selectedUnit.models}</span>
                              </div>
                            </div>

                            {/* Combat Vitality Profiles */}
                            <div className="grid grid-cols-4 gap-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 text-center font-mono">
                              <div className="p-1 rounded-lg border border-zinc-900 bg-zinc-900/10">
                                <span className="block text-[8px] text-zinc-550 font-bold uppercase tracking-wider mb-0.5">Move</span>
                                <span className="text-xs text-white font-black">{selectedUnit.stats.movement}</span>
                              </div>
                              <div className="p-1 rounded-lg border border-zinc-900 bg-zinc-900/10">
                                <span className="block text-[8px] text-zinc-550 font-bold uppercase tracking-wider mb-0.5">Health</span>
                                <span className="text-xs text-red-400 font-black flex items-center justify-center gap-1">
                                  <Heart className="h-3 w-3 fill-red-500/15" /> {selectedUnit.stats.health}
                                </span>
                              </div>
                              <div className="p-1 rounded-lg border border-zinc-900 bg-zinc-900/10">
                                <span className="block text-[8px] text-zinc-550 font-bold uppercase tracking-wider mb-0.5">Save</span>
                                <span className="text-xs text-white font-black flex items-center justify-center gap-1">
                                  <Shield className="h-3 w-3" /> {selectedUnit.stats.save}
                                </span>
                              </div>
                              <div className="p-1 rounded-lg border border-zinc-900 bg-zinc-900/10">
                                <span className="block text-[8px] text-zinc-550 font-bold uppercase tracking-wider mb-0.5">Control</span>
                                <span className="text-xs text-amber-500 font-black">{selectedUnit.stats.control}</span>
                              </div>
                            </div>

                            {/* Weapons Profile Cards */}
                            {selectedUnit.weapons && selectedUnit.weapons.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-mono tracking-wider font-extrabold text-zinc-550 uppercase flex items-center gap-1">
                                  <Sword className="h-3 w-3" /> Weapon Characteristics
                                </span>
                                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                  {selectedUnit.weapons.map((w, idx) => (
                                    <div key={idx} className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-2.5 space-y-2">
                                      <div className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-1.5 leading-none">
                                          <span className="font-bold text-white">{w.name}</span>
                                          <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-extrabold uppercase outline-hidden leading-none ${
                                            w.type === 'Melee' ? 'bg-amber-500/10 border border-amber-550/20 text-amber-500' : 'bg-cyan-505/10 border border-cyan-550/30 text-cyan-400'
                                          }`}>
                                            {w.type}
                                          </span>
                                        </div>
                                        {w.range && (
                                          <span className="font-mono text-[10px] text-zinc-500 font-semibold leading-none">
                                            Range: {w.range}
                                          </span>
                                        )}
                                      </div>

                                      {/* Combat Stats Grid */}
                                      <div className="grid grid-cols-5 gap-1 text-center font-mono text-[11px] bg-zinc-950 p-1.5 rounded-lg border border-zinc-900">
                                        <div>
                                          <span className="block text-[7px] text-zinc-550 font-extrabold mb-0.5 uppercase">Atks</span>
                                          <span className="text-white font-black">{w.attacks}</span>
                                        </div>
                                        <div>
                                          <span className="block text-[7px] text-zinc-550 font-extrabold mb-0.5 uppercase">To Hit</span>
                                          <span className="text-white font-black">{w.hit}</span>
                                        </div>
                                        <div>
                                          <span className="block text-[7px] text-zinc-550 font-extrabold mb-0.5 uppercase">To Wnd</span>
                                          <span className="text-white font-black">{w.wound}</span>
                                        </div>
                                        <div>
                                          <span className="block text-[7px] text-zinc-550 font-extrabold mb-0.5 uppercase">Rend</span>
                                          <span className="text-white font-black">{w.rend}</span>
                                        </div>
                                        <div>
                                          <span className="block text-[7px] text-zinc-550 font-extrabold mb-0.5 uppercase">Dmg</span>
                                          <span className="text-amber-500 font-black">{w.damage}</span>
                                        </div>
                                      </div>

                                      {w.keywords && w.keywords.length > 0 && (
                                        <div className="text-[9px] font-mono text-zinc-500 flex flex-wrap gap-1 leading-none align-center">
                                          <span className="text-zinc-650 font-extrabold">Weapon Traits:</span>
                                          {w.keywords.map((kw, kIdx) => (
                                            <span key={kIdx} className="bg-zinc-900/50 py-0.2 px-1 rounded text-zinc-400 border border-zinc-900">
                                              {kw}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Special Unit Abilities */}
                            {selectedUnit.abilities && selectedUnit.abilities.length > 0 && (
                              <div className="space-y-2 pt-1">
                                <span className="text-[10px] font-mono tracking-wider font-extrabold text-zinc-550 uppercase flex items-center gap-1">
                                  <Zap className="h-3 w-3" /> Special Abilities ({selectedUnit.abilities.length})
                                </span>
                                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                  {selectedUnit.abilities.map((ab, idx) => (
                                    <div key={idx} className="p-3 bg-zinc-900/10 border border-zinc-900 rounded-xl space-y-1">
                                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 border-b border-zinc-900/40 pb-1.5">
                                        <span className="font-bold text-white text-xs text-amber-500/90">{ab.name}</span>
                                        <span className="font-mono text-[9px] text-zinc-500 font-bold uppercase">{ab.timing}</span>
                                      </div>
                                      <p className="text-xs text-zinc-400 leading-relaxed pt-1 select-text">{ab.effect}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-900 rounded-xl">
                            <span className="text-zinc-600 font-bold text-xs">No unit selected</span>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
