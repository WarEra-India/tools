export const MIL_RANK_TIER1_MAX = 108;
export const MIL_RANK_TIER2_MAX = 116;
export const MIL_RANK_JUMP_THRESHOLD = 111;
export const MIL_BASE_BONUS_MULTIPLIER = 0.25;
export const MIL_HIGH_BONUS_MULTIPLIER = 0.5;

export const EFFECTIVE_STAT_DIVISOR = 40;

export const PRECISION_CAP = 100;
export const PRECISION_OVERFLOW_DAMAGE_PER_PERCENT = 4;

export const MODIFIER_PERCENTAGE = 60;

export const AMMO_PERCENTAGES = {
  lightAmmo: 10,
  ammo: 20,
  heavyAmmo: 40,
} as const;

export const SIM_MODIFIER_TYPES = ['debuff', 'no buff', 'buff'] as const;

export const FOOD_MULTIPLIERS: Record<string, number> = {
  bread: 0.10,
  steak: 0.15,
  cookedFish: 0.20,
};

export const SKILL_PROGRESSION = {
  health: { base: 100, inc: 10, maxLevel: 10 },
  hunger: { base: 4, inc: 1, maxLevel: 10 },
  attack: { base: 100, inc: 25, maxLevel: 10 },
  precision: { base: 50, inc: 5, maxLevel: 10 },
  criticalChance: { base: 10, inc: 5, maxLevel: 10 },
  criticalDamages: { base: 100, inc: 20, maxLevel: 10 },
  armor: { base: 0, inc: 6, maxLevel: 10 },
  dodge: { base: 0, inc: 4, maxLevel: 10 },
  lootChance: { base: 5, inc: 2, maxLevel: 10 },
} as const;


export const NOT_PERCENTAGE_SKILLS = ['health', 'hunger', 'attack', 'armor', 'dodge'];

export const EQUIPEMENTS = ['weapon', 'ammo', 'helmet', 'chest', 'gloves', 'pants', 'boots'] as const;

// Simulation constants
export const HIT_BASE_HEALTH_COST = 10;
export const MISS_DAMAGE_MULTIPLIER = 0.5;
export const CASE1_CHANCE_PER_LOOT_PERCENT = 1;       // 1% per 1% loot chance
export const CASE2_CHANCE_PER_LOOT_PERCENT = 0.01;    // 0.01% per 1% loot chance

// Equipment rarity scrap and steel costs
export const RARITY_COSTS: Record<string, { scraps: number; steel: number }> = {
  common: { scraps: 6, steel: 2 },
  uncommon: { scraps: 18, steel: 4 },
  rare: { scraps: 54, steel: 8 },
  epic: { scraps: 162, steel: 16 },
  legendary: { scraps: 486, steel: 32 },
  mythic: { scraps: 1458, steel: 64 },
};
