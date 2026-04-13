export const MIL_RANK_TIER1_MAX = 108;
export const MIL_RANK_TIER2_MAX = 116;
export const MIL_RANK_JUMP_THRESHOLD = 111;
export const MIL_BASE_BONUS_MULTIPLIER = 0.25;
export const MIL_HIGH_BONUS_MULTIPLIER = 0.5;

export const EFFECTIVE_STAT_DIVISOR = 40;

export const MODIFIER_PERCENTAGE = 60;

export const AMMO_PERCENTAGES = {
  lightAmmo: 10,
  ammo: 20,
  heavyAmmo: 30,
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
  criticalDamages: { base: 120, inc: 20, maxLevel: 10 },
  armor: { base: 0, inc: 6, maxLevel: 10 },
  dodge: { base: 0, inc: 4, maxLevel: 10 },
  lootChance: { base: 5, inc: 2, maxLevel: 10 },
} as const;


export const NOT_PERCENTAGE_SKILLS = ['health', 'hunger', 'attack', 'armor', 'dodge'];

export const EQUIPEMENTS = ['weapon', 'ammo', 'helmet', 'chest', 'gloves', 'pants', 'boots'] as const;
