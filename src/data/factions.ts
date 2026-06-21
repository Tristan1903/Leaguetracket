import { FactionType, FactionData } from '../types';

export const FACTIONS: Record<FactionType, FactionData> = {
  [FactionType.STORMCAST]: {
    id: FactionType.STORMCAST,
    name: 'Stormcast Eternals',
    subfaction: 'Vigilant Brotherhood',
    themeColor: 'amber', // Amber/Gold styling
    resourceName: 'Aetheric Focus',
    maxResource: 4,
    abilities: [
      {
        name: 'Sigmarite Shieldwall',
        cost: 1,
        description: 'Add 1 to save rolls for an friendly unit that was charged this turn.',
        phase: 'combat'
      },
      {
        name: 'Call Down the Tempest',
        cost: 2,
        description: 'Deal D3 mortal damage to an enemy unit within 12 inches on a roll of 3+.',
        phase: 'hero'
      },
      {
        name: 'Scions of the Storm',
        cost: 1,
        description: 'Set up one reserve unit from the celestial realm anywhere on the board more than 9 inches from enemies.',
        phase: 'movement'
      },
      {
        name: 'Lightning Chariot',
        cost: 1,
        description: 'Allows an active unit to redeploy or advance up to a guaranteed 6 inches.',
        phase: 'movement'
      }
    ]
  },
  [FactionType.SKAVEN]: {
    id: FactionType.SKAVEN,
    name: 'Skaven',
    subfaction: 'Gnawfeast Clawpack',
    themeColor: 'emerald', // Green/Warpstone styling
    resourceName: 'Warpstone Shards',
    maxResource: 5,
    abilities: [
      {
        name: 'More-More Warp-Lightning!',
        cost: 2,
        description: 'Shoot warp-lightning: Roll 3 dice. Each 4+ deals 2 mortal damage. But if you roll any 1s, take D3 mortal damage to the caster!',
        phase: 'shooting'
      },
      {
        name: 'Lead from the Back',
        cost: 1,
        description: 'If a Skaven Hero is behind friendly units, add 1 to the combat attack characteristic of unit in front.',
        phase: 'combat'
      },
      {
        name: 'Scurry Away',
        cost: 1,
        description: 'Use when an enemy finishes a charge within 3 inches. Retreat with this unit immediately without suffering strikes.',
        phase: 'charge'
      },
      {
        name: 'Replenish the Swarm',
        cost: 2,
        description: 'Bring back D6 slain Clanrats to a depleted unit within 6 inches of a gnawhole.',
        phase: 'hero'
      }
    ]
  },
  [FactionType.KHORNE]: {
    id: FactionType.KHORNE,
    name: 'Blades of Khorne',
    subfaction: 'Goreclash Brotherhood',
    themeColor: 'red', // Deep angry Red
    resourceName: 'Blood Tithe Points',
    maxResource: 8,
    abilities: [
      {
        name: 'Bloody Exemplar (Tithe 1)',
        cost: 1,
        description: 'Immediately gain 1 Command Point or allow a friendly unit to auto-pass their next Battleshock test.',
        phase: 'battleshock'
      },
      {
        name: 'Murderlust (Tithe 2)',
        cost: 2,
        description: 'Target unit moves 3 inches closer to the nearest enemy, or charges if they are within 8 inches.',
        phase: 'charge'
      },
      {
        name: 'Brass Volcano (Tithe 4)',
        cost: 4,
        description: 'Erupt a field of lava. Pick 3 enemy units. Deal D3 mortal damage to each of them on a 3+.',
        phase: 'shooting'
      },
      {
        name: 'Apocalyptic Stature (Tithe 6)',
        cost: 6,
        description: 'Target unit is imbued with Khorne\'s fury. Add 2 to the attacks characteristic of all its melee weapons until the end of turn.',
        phase: 'combat'
      },
      {
        name: 'Bring Forth the Slaughter (Tithe 8)',
        cost: 8,
        description: 'Call down a Bloodthirster! Summon a fresh Greater Daemon unit to the field adjacent to an enemy.',
        phase: 'hero'
      }
    ]
  },
  [FactionType.SLAANESH]: {
    id: FactionType.SLAANESH,
    name: 'Hedonites of Slaanesh',
    subfaction: 'Sybarite Blade-Carnival',
    themeColor: 'purple', // Glamorous sensual purple
    resourceName: 'Depravity Points',
    maxResource: 12,
    abilities: [
      {
        name: 'Excessive Speed (Depravity 3)',
        cost: 3,
        description: 'Always strike first: Unit gains the Strike-First effect for this combat round.',
        phase: 'combat'
      },
      {
        name: 'Euphoric Frenzy (Depravity 6)',
        cost: 6,
        description: 'Exploding hits: For each unmodified hit roll of 6, score 2 hits instead of 1.',
        phase: 'combat'
      },
      {
        name: 'Symphony of Pain (Depravity 9)',
        cost: 9,
        description: 'Subtract 1 from wound rolls for any enemy unit within 12 inches of a friendly Hedonite Hero.',
        phase: 'any'
      },
      {
        name: 'Lord of Excess (Depravity 12)',
        cost: 12,
        description: 'Instantly restore all lost wounds to a Hedonite General, or give them a 4+ ward save until game ends.',
        phase: 'hero'
      }
    ]
  },
  [FactionType.TZEENTCH]: {
    id: FactionType.TZEENTCH,
    name: 'Disciples of Tzeentch',
    subfaction: 'Fateweaver Seekers',
    themeColor: 'cyan', // Blue-green magic
    resourceName: 'Destiny Dice',
    maxResource: 9,
    abilities: [
      {
        name: 'Eldritch Storm',
        cost: 1,
        description: 'Consume a high Destiny Die (4+). Deal mortal damage equal to the die value to an enemy within 18 inches.',
        phase: 'shooting'
      },
      {
        name: 'Fate-weaving',
        cost: 1,
        description: 'Substitute any hit, wound, charge, or save roll of a friendly unit with one of your active Destiny Dice.',
        phase: 'any'
      },
      {
        name: 'Treason of Tzeentch',
        cost: 2,
        description: 'Cast on an enemy unit: They suffer -1 to hit and must hit themselves on any unmodified combat misses.',
        phase: 'combat'
      },
      {
        name: 'Form of the Spawn',
        cost: 3,
        description: 'Select an enemy small model that was slain. Replace it with a Chaos Spawn under your control.',
        phase: 'any'
      }
    ]
  },
  [FactionType.SERAPHON]: {
    id: FactionType.SERAPHON,
    name: 'Seraphon',
    subfaction: 'Starclaw Strike',
    themeColor: 'teal', // Mesoamerican jungle teal
    resourceName: 'Celestial Energy',
    maxResource: 6,
    abilities: [
      {
        name: 'Coalesced Toughness',
        cost: 1,
        description: 'Subtract 1 from the damage characteristic of attacks targeting Coalesced units (minimum 1).',
        phase: 'combat'
      },
      {
        name: 'Sacred Asterisms',
        cost: 2,
        description: 'Reroll run rolls and charge rolls for all friendly Seraphon units this turn.',
        phase: 'charge'
      },
      {
        name: 'Starlight Aegis',
        cost: 3,
        description: 'Seraphon unit gains a 5+ ward save until the end of the battle round.',
        phase: 'hero'
      }
    ]
  },
  [FactionType.SYLVANETH]: {
    id: FactionType.SYLVANETH,
    name: 'Sylvaneth',
    subfaction: 'Purge-Roots Lodge',
    themeColor: 'green', // Ancient forest green
    resourceName: 'Wyldwood Wildfire',
    maxResource: 6,
    abilities: [
      {
        name: 'Navigate Realmroots',
        cost: 1,
        description: 'Remove a unit from the board and set them up within 3 inches of an overgrown terrain feature.',
        phase: 'movement'
      },
      {
        name: 'Verdant Blessing',
        cost: 2,
        description: 'Set up an AWAKENED WYLDWOOD scenery piece within 12 inches of a Sylvaneth Wizard and more than 3 inches from enemies.',
        phase: 'hero'
      },
      {
        name: 'Regrowth Spells',
        cost: 1,
        description: 'Heal up to D3 lost wounds to a friendly Sylvaneth monster or model within 12 inches.',
        phase: 'hero'
      }
    ]
  },
  [FactionType.SLAVES]: {
    id: FactionType.SLAVES,
    name: 'Slaves to Darkness',
    subfaction: 'Bloodwind Legion',
    themeColor: 'indigo', // Dark chaos indigo
    resourceName: 'Favour of Chaos',
    maxResource: 6,
    abilities: [
      {
        name: 'Eye of the Gods',
        cost: 1,
        description: 'Roll on the Eye of the Gods table for a unit contesting an objective not controlled by the opponent or that destroyed an enemy unit.',
        phase: 'any'
      },
      {
        name: 'The Dread Banner',
        cost: 2,
        description: 'Let standard-bearers demand favor: Pick a Chaos Warriors or Chaos Knights unit and immediately roll for Eye of the Gods.',
        phase: 'hero'
      },
      {
        name: 'Fierce Conquerors',
        cost: 1,
        description: 'Add 3 to the control scores of friendly Chaos Warriors units contesting an objective.',
        phase: 'any'
      }
    ]
  },
  [FactionType.SOULBLIGHT]: {
    id: FactionType.SOULBLIGHT,
    name: 'Soulblight Gravelords',
    subfaction: 'Bloodcrave Hunt',
    themeColor: 'violet', // Undead vampire purple-violet
    resourceName: 'Grave-sand Magic',
    maxResource: 6,
    abilities: [
      {
        name: 'The Hunger',
        cost: 1,
        description: 'After a Vampire unit fighting resolves attacks, Heal (X) where X is the damage points allocated.',
        phase: 'combat'
      },
      {
        name: 'Endless Legions',
        cost: 2,
        description: 'Set up a replacement Deathrattle Skeletons unit with D6 models in friendly territory.',
        phase: 'movement'
      },
      {
        name: 'Skeleton Legion',
        cost: 1,
        description: 'For each slain model, make a legion roll. On a 6, return 1 slain model to that unit.',
        phase: 'combat'
      }
    ]
  },
  [FactionType.SONS]: {
    id: FactionType.SONS,
    name: 'Sons of Behemat',
    subfaction: 'Wallsmasher Stomp',
    themeColor: 'rose', // Giants rose-brown
    resourceName: 'Bellowing Fury',
    maxResource: 5,
    abilities: [
      {
        name: 'Stuff \'Em In Me Bag',
        cost: 1,
        description: 'Attempt to stuff a combatant in a bag. On a roll at least double target\'s Health, 1 model is slain.',
        phase: 'combat'
      },
      {
        name: 'Bellowing Roar',
        cost: 1,
        description: 'Unleash a terrifying roar: Pick an enemy unit in combat. On a 2+, subtract 1 from hit rolls for that unit.',
        phase: 'combat'
      },
      {
        name: 'Earth-Shaking Charge',
        cost: 2,
        description: 'Charge with earth-shattering power. On a 3+, pick an enemy unit in combat to suffer Strike-last status.',
        phase: 'charge'
      }
    ]
  },
  [FactionType.NURGLE]: {
    id: FactionType.NURGLE,
    name: 'Maggotkin of Nurgle',
    subfaction: 'Bubonic Cell',
    themeColor: 'lime',
    resourceName: 'Contagion Points',
    maxResource: 7,
    abilities: [
      {
        name: 'Plague Wind',
        cost: 1,
        description: 'Target a friendly unit to fly, leaving a trail of rot that inflicts 1 mortal damage on a roll of 4+ to enemy units.',
        phase: 'movement'
      },
      {
        name: 'Grandfather\'s Blessing',
        cost: 2,
        description: 'Heal D3 wounds on a friendly model.',
        phase: 'hero'
      },
      {
        name: 'Fleshly Abundance',
        cost: 1,
        description: 'Add 1 to the Health characteristic of models in a friendly Maggotkin unit for this phase.',
        phase: 'combat'
      }
    ]
  },
  [FactionType.KHARADRON]: {
    id: FactionType.KHARADRON,
    name: 'Kharadron Overlords',
    subfaction: 'Grundstok Trailblazers',
    themeColor: 'sky',
    resourceName: 'Share of Loot (Aether-gold)',
    maxResource: 6,
    abilities: [
      {
        name: 'Disengage',
        cost: 2,
        description: 'A friendly skyvessel can retreat and still shoot or charge this turn.',
        phase: 'movement'
      },
      {
        name: 'Fly High',
        cost: 1,
        description: 'Reposition a Kharadron unit to any location more than 9 inches away from enemy units.',
        phase: 'movement'
      },
      {
        name: 'Share the Gold',
        cost: 1,
        description: 'Re-roll hit rolls of 1 for friendly Kharadron units within 12 inches of your general.',
        phase: 'shooting'
      }
    ]
  },
  [FactionType.CITIES_OF_SIGMAR]: {
    id: FactionType.CITIES_OF_SIGMAR,
    name: 'Cities of Sigmar',
    subfaction: 'Castelite Company',
    themeColor: 'stone',
    resourceName: 'Tactical Orders',
    maxResource: 4,
    abilities: [
      {
        name: 'Form Shieldwall',
        cost: 1,
        description: 'Add 1 to save rolls for Cities of Sigmar units that did not make a move this turn.',
        phase: 'combat'
      },
      {
        name: 'Return Fire',
        cost: 1,
        description: 'Unleash a volley with a friendly ranged unit after being targeted by enemy shooting.',
        phase: 'shooting'
      },
      {
        name: 'Regroup & Rally',
        cost: 2,
        description: 'Bring back D3 slain human, aelf, or duardin models to a friendly unit.',
        phase: 'hero'
      }
    ]
  },
  [FactionType.NIGHTHAUNT]: {
    id: FactionType.NIGHTHAUNT,
    name: 'Nighthaunt',
    subfaction: 'Slasher Host',
    themeColor: 'emerald',
    resourceName: 'Spectral Terror',
    maxResource: 6,
    abilities: [
      {
        name: 'Wave of Terror',
        cost: 1,
        description: 'If a friendly unit makes a charge roll of 8+, pick one enemy unit to suffer Strike-last.',
        phase: 'charge'
      },
      {
        name: 'Shawl of Souls',
        cost: 1,
        description: 'Restore D3 slain models to any chainrasp or spirit unit.',
        phase: 'hero'
      },
      {
        name: 'Feed on Fright',
        cost: 2,
        description: 'Re-roll wound rolls for attacks targeting units that failed a battleshock test.',
        phase: 'combat'
      }
    ]
  },
  [FactionType.FLESH_EATER]: {
    id: FactionType.FLESH_EATER,
    name: 'Flesh-Eater Courts',
    subfaction: 'Charnel Watch',
    themeColor: 'rose',
    resourceName: 'Noble Deeds',
    maxResource: 6,
    abilities: [
      {
        name: 'Feed the Cohort',
        cost: 1,
        description: 'Revive 1 slain Knight model or D3 Serfs in a friendly unit.',
        phase: 'hero'
      },
      {
        name: 'Mustering Call',
        cost: 2,
        description: 'Return a destroyed serf unit to reserve with half of its models remaining.',
        phase: 'movement'
      },
      {
        name: 'Frenzied Gorging',
        cost: 1,
        description: 'Add 1 to the melee attack characteristic of a friendly Flesh-Eater unit.',
        phase: 'combat'
      }
    ]
  },
  [FactionType.IDONETH]: {
    id: FactionType.IDONETH,
    name: 'Idoneth Deepkin',
    subfaction: 'Akhelian Tide Guard',
    themeColor: 'blue',
    resourceName: 'Ethersea Resonance',
    maxResource: 4,
    abilities: [
      {
        name: 'Tides of Death',
        cost: 1,
        description: 'Allow an active unit to run and charge, or retreat and charge in the same turn.',
        phase: 'any'
      },
      {
        name: 'Ethersea Ambush',
        cost: 1,
        description: 'Place a friendly Deepkin unit in deep sea reserve to deploy at the end of a later movement phase.',
        phase: 'movement'
      },
      {
        name: 'Obliterating Flood',
        cost: 2,
        description: 'Add 1 to the hit roll of Akhelian units this combat phase.',
        phase: 'combat'
      }
    ]
  },
  [FactionType.DAUGHTERS]: {
    id: FactionType.DAUGHTERS,
    name: 'Daughters of Khaine',
    subfaction: 'Khainite Shadow Coven',
    themeColor: 'fuchsia',
    resourceName: 'Blood Rites Tier',
    maxResource: 5,
    abilities: [
      {
        name: 'Withering Gaze',
        cost: 1,
        description: 'Reduce the save characteristic of target enemy unit by 1 until the end of the phase.',
        phase: 'shooting'
      },
      {
        name: 'Fanatical Devotion',
        cost: 1,
        description: 'Friendly units gain a 6+ ward save (or 5+ if the general is currently on the battlefield).',
        phase: 'combat'
      },
      {
        name: 'Zealotry',
        cost: 2,
        description: 'Re-roll failed charge rolls and add 1 to pile-in distance for friendly units.',
        phase: 'charge'
      }
    ]
  },
  [FactionType.OGOR_MAWTRIBES]: {
    id: FactionType.OGOR_MAWTRIBES,
    name: 'Ogor Mawtribes',
    subfaction: 'Tyrant\'s Bellow',
    themeColor: 'amber',
    resourceName: 'Meat Tokens',
    maxResource: 5,
    abilities: [
      {
        name: 'Gruesome Gulp',
        cost: 2,
        description: 'Target friendly Ogor unit deals D3 mortal wounds to defender after completing a charge.',
        phase: 'combat'
      },
      {
        name: 'Bellow of Lands',
        cost: 1,
        description: 'Add 1 to the charge rolls of friendly Ogors for this phases.',
        phase: 'charge'
      },
      {
        name: 'Trollguts Regeneration',
        cost: 1,
        description: 'Heal D3 wounds on a friendly Ogor general or monster model.',
        phase: 'hero'
      }
    ]
  },
  [FactionType.OSSIARCH]: {
    id: FactionType.OSSIARCH,
    name: 'Ossiarch Bonereapers',
    subfaction: 'Kavalos Vanguard',
    themeColor: 'yellow',
    resourceName: 'Relentless Discipline Points',
    maxResource: 6,
    abilities: [
      {
        name: 'Shieldwall',
        cost: 1,
        description: 'Friendly Mortek Guards unit re-rolls save rolls of 1.',
        phase: 'combat'
      },
      {
        name: 'Reconstruct Objective',
        cost: 2,
        description: 'Heal up to 3 wounds or return a slain model to a friendly deathless Bonereaper unit.',
        phase: 'hero'
      },
      {
        name: 'Forward Unstoppable',
        cost: 1,
        description: 'Pick an active unit to make a guaranteed 6" run without rolling.',
        phase: 'movement'
      }
    ]
  },
  [FactionType.GLOOMSPITE]: {
    id: FactionType.GLOOMSPITE,
    name: 'Gloomspite Gitz',
    subfaction: 'Bad Moon Madmob',
    themeColor: 'lime',
    resourceName: 'Bad Moon Influence',
    maxResource: 5,
    abilities: [
      {
        name: 'Loonboss Command',
        cost: 1,
        description: 'Pick a friendly Gitz unit: their unmodified hit rolls of 6 deal 1 mortal wound in addition.',
        phase: 'combat'
      },
      {
        name: 'Squig Bouncing',
        cost: 1,
        description: 'Add 2 to the charge roll of friendly Squig units.',
        phase: 'charge'
      },
      {
        name: 'Replenish Gobbos',
        cost: 2,
        description: 'Bring back D6 slain Stabbas or Shootas to a friendly unit.',
        phase: 'hero'
      }
    ]
  },
  [FactionType.LUMINETH]: {
    id: FactionType.LUMINETH,
    name: 'Lumineth Realm-lords',
    subfaction: 'Glittering Phalanx',
    themeColor: 'cyan',
    resourceName: 'Aetherquartz Reserves',
    maxResource: 4,
    abilities: [
      {
        name: 'Light of Eltharion',
        cost: 1,
        description: 'Ignore all negative modifiers to saves for a friendly unit.',
        phase: 'combat'
      },
      {
        name: 'Shining Company',
        cost: 1,
        description: 'Subtract 1 from the hit rolls of attacks targeting a friendly Vanari unit.',
        phase: 'any'
      },
      {
        name: 'Chrysalis of Light',
        cost: 2,
        description: 'Heal D3 wounds to a friendly High-Aelf general, or subtract 1 from enemy casting charts.',
        phase: 'hero'
      }
    ]
  },
  [FactionType.ORRUK_WARCLANS]: {
    id: FactionType.ORRUK_WARCLANS,
    name: 'Orruk Warclans',
    subfaction: 'Ironjawz Bigmob',
    themeColor: 'orange',
    resourceName: 'Waaagh! Energy',
    maxResource: 6,
    abilities: [
      {
        name: 'Smash \'Em',
        cost: 1,
        description: 'Add 1 to the hit roll of friendly Ironjawz units for this phase.',
        phase: 'combat'
      },
      {
        name: 'Bash \'Em',
        cost: 1,
        description: 'If a friendly unit destroys an enemy unit, another friendly unit is immediately prompted to pile-in and attack.',
        phase: 'combat'
      },
      {
        name: 'Get \'Em Beat',
        cost: 2,
        description: 'Pick an Orruk unit to charge in the movement phase or charge with +3 inches.',
        phase: 'movement'
      }
    ]
  },
  [FactionType.HELFORGE]: {
    id: FactionType.HELFORGE,
    name: 'Helsmiths of Hashut',
    subfaction: 'Helforge Host',
    themeColor: 'red',
    resourceName: 'Hashut Brimstone',
    maxResource: 5,
    abilities: [
      {
        name: 'Hellhammer',
        cost: 1,
        description: 'Melee attacks of friendly units gain Rend +1 for this phase.',
        phase: 'combat'
      },
      {
        name: 'Magma Rebound',
        cost: 2,
        description: 'Inflict D3 mortal wounds on an enemy unit that targeted your unit in shooting.',
        phase: 'shooting'
      },
      {
        name: 'Brimstone Conduit',
        cost: 1,
        description: 'Your general emits a plume of choking sulfurous smoke, obscured from enemy view.',
        phase: 'hero'
      }
    ]
  },
  [FactionType.FYRESLAYERS]: {
    id: FactionType.FYRESLAYERS,
    name: 'Fyreslayers',
    subfaction: 'Saga Axeband',
    themeColor: 'orange',
    resourceName: 'Ur-Gold Runes',
    maxResource: 6,
    abilities: [
      {
        name: 'Rune of Fury',
        cost: 1,
        description: 'Add 1 to the attacks characteristic of melee weapons of friendly units.',
        phase: 'combat'
      },
      {
        name: 'Rune of Searing Heat',
        cost: 1,
        description: 'Improve the Rend characteristic of friendly melee weapons by 1.',
        phase: 'combat'
      },
      {
        name: 'Rune of Reignition',
        cost: 2,
        description: 'Pick a friendly Fyreslayer Hero. They heal completely or gain Ward (4+) for the round.',
        phase: 'hero'
      }
    ]
  }
};
