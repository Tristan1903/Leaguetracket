import { SpearheadData, FactionType } from '../types';
import { FACTIONS } from '../data/factions';

// Eagerly import all json files from the spearheads directory using Vite's glob import
const spearheadModules = (import.meta as any).glob('../data/spearheads/*.json', { eager: true }) as Record<string, any>;

export const ALL_SPEARHEADS: SpearheadData[] = Object.entries(spearheadModules).map(([filePath, mod]) => {
  const data = mod && mod.default ? mod.default : mod;
  const derivedId = data.id || filePath.split('/').pop()?.replace('.json', '') || 'unknown';
  return {
    ...data,
    id: derivedId,
  } as SpearheadData;
});

/**
 * Retrieve all spearhead armies mapped to a particular faction ID.
 * This dynamically filters the loaded spearhead profiles by matching their faction fields.
 */
export function getSpearheadsByFaction(factionId: FactionType): SpearheadData[] {
  const faction = FACTIONS[factionId];
  if (!faction) return [];

  // Loosely handle matches to ensure robust pairing (e.g. ignoring casing differences)
  return ALL_SPEARHEADS.filter(
    (s) => s.faction.toLowerCase().trim() === faction.name.toLowerCase().trim()
  );
}

/**
 * Look up a single spearhead by its unique identifier.
 */
export function getSpearheadById(id: string): SpearheadData | undefined {
  return ALL_SPEARHEADS.find((s) => s.id === id);
}

/**
 * Robustly maps any faction name string to a proper FactionType enum value.
 */
export function getFactionTypeFromName(factionName: string): FactionType {
  const norm = factionName.toLowerCase().trim();
  if (norm.includes('stormcast')) return FactionType.STORMCAST;
  if (norm.includes('skaven')) return FactionType.SKAVEN;
  if (norm.includes('khorne')) return FactionType.KHORNE;
  if (norm.includes('slaanesh')) return FactionType.SLAANESH;
  if (norm.includes('tzeentch')) return FactionType.TZEENTCH;
  if (norm.includes('seraphon')) return FactionType.SERAPHON;
  if (norm.includes('sylvaneth')) return FactionType.SYLVANETH;
  if (norm.includes('slaves')) return FactionType.SLAVES;
  if (norm.includes('soulblight')) return FactionType.SOULBLIGHT;
  if (norm.includes('behemat')) return FactionType.SONS;
  if (norm.includes('nurgle')) return FactionType.NURGLE;
  if (norm.includes('kharadron')) return FactionType.KHARADRON;
  if (norm.includes('cities')) return FactionType.CITIES_OF_SIGMAR;
  if (norm.includes('nighthaunt')) return FactionType.NIGHTHAUNT;
  if (norm.includes('eater')) return FactionType.FLESH_EATER;
  if (norm.includes('idoneth')) return FactionType.IDONETH;
  if (norm.includes('daughters') || norm.includes('khaine')) return FactionType.DAUGHTERS;
  if (norm.includes('ogor')) return FactionType.OGOR_MAWTRIBES;
  if (norm.includes('ossiarch') || norm.includes('bonereaper')) return FactionType.OSSIARCH;
  if (norm.includes('gloomspite') || norm.includes('gitz')) return FactionType.GLOOMSPITE;
  if (norm.includes('lumineth')) return FactionType.LUMINETH;
  if (norm.includes('orruk')) return FactionType.ORRUK_WARCLANS;
  if (norm.includes('hashut') || norm.includes('helsmith')) return FactionType.HELFORGE;
  if (norm.includes('fyreslayers') || norm.includes('fyreslayer')) return FactionType.FYRESLAYERS;
  
  return FactionType.STORMCAST; // Safe fallback
}
