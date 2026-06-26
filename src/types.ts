export enum FactionType {
  STORMCAST = 'stormcast',
  SKAVEN = 'skaven',
  KHORNE = 'khorne',
  SLAANESH = 'slaanesh',
  TZEENTCH = 'tzeentch',
  SERAPHON = 'seraphon',
  SYLVANETH = 'sylvaneth',
  SLAVES = 'slaves',
  SOULBLIGHT = 'soulblight',
  SONS = 'sons',
  NURGLE = 'nurgle',
  KHARADRON = 'kharadron',
  CITIES_OF_SIGMAR = 'cities_of_sigmar',
  NIGHTHAUNT = 'nighthaunt',
  FLESH_EATER = 'flesh_eater',
  IDONETH = 'idoneth',
  DAUGHTERS = 'daughters',
  OGOR_MAWTRIBES = 'ogor_mawtribes',
  OSSIARCH = 'ossiarch',
  GLOOMSPITE = 'gloomspite',
  LUMINETH = 'lumineth',
  ORRUK_WARCLANS = 'orruk_warclans',
  HELFORGE = 'helforge',
  FYRESLAYERS = 'fyreslayers'
}

export interface FactionData {
  id: FactionType;
  name: string;
  subfaction: string;
  themeColor: string; // Tailwind class like gold, red, etc.
  resourceName: string;
  maxResource: number;
  abilities: {
    name: string;
    cost: number;
    description: string;
    phase: 'hero' | 'movement' | 'shooting' | 'charge' | 'combat' | 'battleshock' | 'any';
  }[];
}

export interface MatchState {
  playerAFaction: FactionType;
  playerBFaction: FactionType;
  playerAName: string;
  playerBName: string;
  playerAVP: number;
  playerBVP: number;
  playerACasualties: number; // Models Slain by player B
  playerBCasualties: number; // Models Slain by player A
  playerAResource: number; // e.g. blood tithe, depravity, command pts
  playerBResource: number;
  playerATzeentchDice?: number[]; // Destiny dice roll values
  playerBTzeentchDice?: number[];
  playerASpearheadId?: string;
  playerBSpearheadId?: string;
  playerAEnhancementName?: string;
  playerBEnhancementName?: string;
  playerARegimentAbilityName?: string;
  playerBRegimentAbilityName?: string;
  currentTurn: number; // 1 to 4
  currentPhase: 'hero' | 'movement' | 'shooting' | 'charge' | 'combat' | 'battleshock';
  activePlayer: 'A' | 'B';
  underdog: 'A' | 'B' | null;
  logs: string[];
}

export interface MatchReport {
  id: string; // unique hash
  date: string;
  leagueId: string | null;
  playerA: {
    name: string;
    faction: FactionType;
    score: number;
    casualties: number;
    spearheadName?: string;
    enhancementName?: string;
    regimentAbilityName?: string;
  };
  playerB: {
    name: string;
    faction: FactionType;
    score: number;
    casualties: number;
    spearheadName?: string;
    enhancementName?: string;
    regimentAbilityName?: string;
  };
  winner: 'A' | 'B' | 'Draw';
  underdogPlayed: 'A' | 'B' | null;
  underdogAwarded: boolean;
  notes?: string;
  verificationCode: string; // Hash verification string
}

export interface LeagueMember {
  uid: string;
  username: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface JoinRequest {
  uid: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export interface LeaguePlayer {
  id: string;
  name: string;
  faction: FactionType;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  vpScored: number;
  casualtiesSlain: number;
  underdogWins: number;
  linkedUid?: string;
}

export interface League {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  isPublic: boolean;
  memberUids: string[];
  members: LeagueMember[];
  players: LeaguePlayer[];
  matches: MatchReport[];
  joinRequests: JoinRequest[];
}

export interface UserCareer {
  username: string;
  favFaction: FactionType | null;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalVP: number;
  totalModelsSlain: number;
  recentHistory: MatchReport[];
}

export interface SpearheadBattleTrait {
  name: string;
  timing: string;
  declare?: string;
  effect: string;
  phases: string[];
}

export interface SpearheadEnhancement {
  name: string;
  timing: string;
  effect: string;
  phases: string[];
  modifiers?: any[];
}

export interface SpearheadRegimentAbility {
  name: string;
  timing: string;
  effect: string;
  phases: string[];
}

export interface SpearheadWeapon {
  name: string;
  type: string;
  range?: string;
  attacks: number | string;
  hit: string;
  wound: string;
  rend: number;
  damage: number | string;
  keywords: string[];
}

export interface SpearheadUnitAbility {
  name: string;
  timing: string;
  effect: string;
  phases: string[];
}

export interface SpearheadUnitStats {
  movement: string;
  health: number;
  save: string;
  control: number;
}

export interface SpearheadUnit {
  id: string;
  name: string;
  isGeneral: boolean;
  models: number;
  stats: SpearheadUnitStats;
  weapons: SpearheadWeapon[];
  abilities: SpearheadUnitAbility[];
  keywords: string[];
}

export interface SpearheadData {
  id: string;
  faction: string;
  spearheadName: string;
  battleTraits: SpearheadBattleTrait[];
  enhancements: SpearheadEnhancement[];
  regimentAbilities: SpearheadRegimentAbility[];
  units: SpearheadUnit[];
}

