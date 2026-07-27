import type { FullProfile } from "@/lib/wareraApi";
import {
  MIL_RANK_TIER1_MAX,
  MIL_RANK_TIER2_MAX,
  MIL_RANK_JUMP_THRESHOLD,
  MIL_BASE_BONUS_MULTIPLIER,
  MIL_HIGH_BONUS_MULTIPLIER,
  EFFECTIVE_STAT_DIVISOR,
  MODIFIER_PERCENTAGE,
  SKILL_PROGRESSION,
  HIT_BASE_HEALTH_COST,
  MISS_DAMAGE_MULTIPLIER,
  CASE1_CHANCE_PER_LOOT_PERCENT,
  CASE2_CHANCE_PER_LOOT_PERCENT,
} from "./constants";

/** Total skill points available for a given player level (4 per level). */
export const totalSkillPointsForLevel = (level: number): number => level * 4;

/** Cumulative skill points cost to reach a given skill level: level*(level+1)/2 */
export const skillLevelToCumulativeCost = (skillLevel: number): number =>
  (skillLevel * (skillLevel + 1)) / 2;

/**
 * Returns the ECO "companies" skill points required for a given number of companies.
 * Base (skill level 0) = 2 companies. Each skill level adds 1 company.
 * So for `count` companies, skill level needed = max(0, count - 2).
 */
export const companiesSkillPointsCost = (companiesCount: number): number => {
  const skillLevel = Math.max(0, companiesCount - 2);
  return skillLevelToCumulativeCost(skillLevel);
};

export const getSimSkillValue = (profile: FullProfile, sim: any, skillName: keyof typeof SKILL_PROGRESSION) => {
  if (sim?.skills?.[skillName] !== undefined) {
    const level = sim.skills[skillName];
    const { base, inc } = SKILL_PROGRESSION[skillName];
    return base + (level * inc);
  }
  return profile.user.skills[skillName]?.value || 0;
};

export const calcMilBonus = (rank: number): number => {
  const localRank = Math.min(rank, MIL_RANK_TIER1_MAX);
  let bonus = (localRank - 1) * MIL_BASE_BONUS_MULTIPLIER + Math.floor((localRank - 1) / 4) * MIL_BASE_BONUS_MULTIPLIER;

  // base logic
  if (rank <= MIL_RANK_TIER1_MAX) {
    return bonus;
  }

  const phase1 = Math.min(rank, MIL_RANK_TIER2_MAX) - MIL_RANK_TIER1_MAX;

  if (phase1 > 0) {
    bonus += phase1 * MIL_BASE_BONUS_MULTIPLIER;

    // extra jump
    if (rank >= MIL_RANK_JUMP_THRESHOLD) bonus += MIL_BASE_BONUS_MULTIPLIER;
  }

  if (rank >= MIL_RANK_TIER2_MAX + 1) {
    bonus += (rank - MIL_RANK_TIER2_MAX) * MIL_HIGH_BONUS_MULTIPLIER;
  }

  return bonus;
};


export const effectivePercentageValue = (totalValue: number): number => {
  return Math.round((totalValue / (totalValue + EFFECTIVE_STAT_DIVISOR)) * 100);
}

export const effectiveTotalDamage = (
  skillValue: number = 0,
  weaponValue: number = 0,
  ammoBonusPercentage: number | 0 | 10 | 20 | 30 = 0,
  militaryBonusPercentage: number = 0,
  ordersBonusPercentage: number = 0,
  buffPercentage: number | 0 | 60 | -60 = 0,
): number => {
  const base = skillValue + weaponValue;
  return Math.round(
    base
    * (1 + ammoBonusPercentage / 100)
    * (1 + militaryBonusPercentage / 100)
    * (1 + ordersBonusPercentage / 100)
    * (1 + buffPercentage / 100)
  )
}

export const getAttackTotalAndBreakDown = (profile: FullProfile, sim?: any): {
  breakdown: { skill: number; weapon: number; ammo: number; military: number; orders: number; buff: number; debuff: number; }; total: number;
} => {
  const getStatAvg = (val: any) => val ? Math.ceil(Array.isArray(val) ? (val[0] + val[1]) / 2 : val) : 0;

  const breakdown = {
    skill: getSimSkillValue(profile, sim, 'attack'),
    weapon: getStatAvg(sim?.weaponStats?.attack || profile.equipment?.weapon?.skills?.attack),
    ammo: (sim?.ammoPercent ?? profile.user.skills?.attack?.ammoPercent) || 0,
    military: sim?.militaryRank !== undefined ? calcMilBonus(sim.militaryRank) : (profile.user.skills.attack?.militaryRankPercent || 0),
    orders: sim?.orders !== undefined ? sim.orders : 0,
    buff: sim?.modifier === 'buff' ? MODIFIER_PERCENTAGE : (sim?.modifier === 'no buff' ? 0 : (sim?.modifier === 'debuff' ? 0 : (profile.user.skills.attack?.buffsPercent || 0))),
    debuff: sim?.modifier === 'debuff' ? MODIFIER_PERCENTAGE : (sim?.modifier === 'no buff' ? 0 : (sim?.modifier === 'buff' ? 0 : (profile.user.skills.attack?.debuffsPercent || 0))),
  }
  return {
    breakdown,
    total: effectiveTotalDamage(
      breakdown.skill,
      breakdown.weapon,
      breakdown.ammo,
      breakdown.military,
      breakdown.orders,
      breakdown.buff ? breakdown.buff : breakdown.debuff * -1,
    )
  }
}

export const getEffectiveStats = (profile: FullProfile, sim?: any) => {
  const { user, equipment } = profile;

  const getStatAvg = (val: any) => val ? Math.ceil(Array.isArray(val) ? (val[0] + val[1]) / 2 : val) : 0;

  const armorTotal = getSimSkillValue(profile, sim, 'armor') +
    getStatAvg(sim?.chestStats?.armor || equipment?.chest?.skills?.armor) +
    getStatAvg(sim?.pantsStats?.armor || equipment?.pants?.skills?.armor);

  const dodgeTotal = getSimSkillValue(profile, sim, 'dodge') +
    getStatAvg(sim?.bootsStats?.dodge || equipment?.boots?.skills?.dodge);

  return {
    precision: {
      skill: getSimSkillValue(profile, sim, 'precision'),
      equipment: getStatAvg(sim?.glovesStats?.precision || equipment?.gloves?.skills?.precision),
      total: getSimSkillValue(profile, sim, 'precision') + getStatAvg(sim?.glovesStats?.precision || equipment?.gloves?.skills?.precision),
    },
    criticalChance: {
      skill: getSimSkillValue(profile, sim, 'criticalChance'),
      equipment: getStatAvg(sim?.weaponStats?.criticalChance || equipment?.weapon?.skills?.criticalChance),
      total: getSimSkillValue(profile, sim, 'criticalChance') + getStatAvg(sim?.weaponStats?.criticalChance || equipment?.weapon?.skills?.criticalChance),
    },
    criticalDamages: {
      skill: getSimSkillValue(profile, sim, 'criticalDamages'),
      equipment: getStatAvg(sim?.helmetStats?.criticalDamages || equipment?.helmet?.skills?.criticalDamages),
      total: getSimSkillValue(profile, sim, 'criticalDamages') + getStatAvg(sim?.helmetStats?.criticalDamages || equipment?.helmet?.skills?.criticalDamages),
    },
    armor: {
      skill: getSimSkillValue(profile, sim, 'armor'),
      chest: getStatAvg(sim?.chestStats?.armor || equipment?.chest?.skills?.armor),
      pants: getStatAvg(sim?.pantsStats?.armor || equipment?.pants?.skills?.armor),
      raw: armorTotal,
      effective: effectivePercentageValue(armorTotal),
    },
    dodge: {
      skill: getSimSkillValue(profile, sim, 'dodge'),
      boots: getStatAvg(sim?.bootsStats?.dodge || equipment?.boots?.skills?.dodge),
      raw: dodgeTotal,
      effective: effectivePercentageValue(dodgeTotal),
    },
    health: {
      skill: getSimSkillValue(profile, sim, 'health'),
    },
    hunger: {
      skill: getSimSkillValue(profile, sim, 'hunger'),
    },
    lootChance: {
      skill: getSimSkillValue(profile, sim, 'lootChance'),
    }
  };
};

// ─── Analytical Expected Damage (used by optimizer) ────────────────

export interface AnalyticalParams {
  totalHealth: number;
  attackValue: number;
  armorEffective: number;   // 0–100
  dodgeEffective: number;   // 0–100
  precisionTotal: number;   // 0–100
  criticalChance: number;   // 0–100
  criticalDamages: number;  // e.g. 189 means +189%
}

export interface AnalyticalResult {
  expectedDamage: number;
  expectedHits: number;
  expectedDmgPerHit: number;
}

export const computeAnalyticalDamage = (p: AnalyticalParams): AnalyticalResult => {
  const healthCostPerHit = HIT_BASE_HEALTH_COST * (1 - p.armorEffective / 100);
  if (healthCostPerHit <= 0) {
    return { expectedDamage: Infinity, expectedHits: Infinity, expectedDmgPerHit: p.attackValue };
  }

  const maxNonDodgedHits = Math.floor(p.totalHealth / healthCostPerHit);
  if (maxNonDodgedHits <= 0) {
    return { expectedDamage: 0, expectedHits: 0, expectedDmgPerHit: 0 };
  }

  const dodgeFraction = Math.min(p.dodgeEffective, 99) / 100;
  const expectedHits = maxNonDodgedHits / (1 - dodgeFraction);

  const precFrac = Math.min(p.precisionTotal, 100) / 100;
  const critFrac = Math.min(p.criticalChance, 100) / 100;
  const critMult = 1 + p.criticalDamages / 100;

  const expectedDmgPerHit = p.attackValue * (
    precFrac * (critFrac * critMult + (1 - critFrac))
    + (1 - precFrac) * MISS_DAMAGE_MULTIPLIER
  );

  return {
    expectedDamage: expectedHits * expectedDmgPerHit,
    expectedHits,
    expectedDmgPerHit,
  };
};

// ─── Simulation Engine ───────────────────────────────────────────────

export type HitType = 'miss' | 'normal' | 'critical';

export interface HitResult {
  hitNumber: number;
  type: HitType;
  isDodged: boolean;
  damageDealt: number;
  healthUsed: number;
  healthRemaining: number;
  casesEarned: number[]; // [] = none, [1] = case1, etc.
}

export interface SimulationParams {
  totalHealth: number;        // health skill + food restored
  attackValue: number;        // total attack damage
  armorEffective: number;     // effective armor % (0-100)
  dodgeEffective: number;     // effective dodge % (0-100)
  precisionTotal: number;     // precision % (0-100)
  criticalChance: number;     // crit chance % (0-100)
  criticalDamages: number;    // crit damage % (e.g. 189 means +189%)
  lootChance: number;         // loot chance % (e.g. 15 means 15%)
}

export interface SimulationResult {
  hits: HitResult[];
  totalHits: number;
  totalDamageDealt: number;
  case1Count: number;
  case2Count: number;
  hitBreakdown: { dodged: number; miss: number; normal: number; critical: number };
}

/**
 * Simulates a single independent hit.
 * Returns null if remaining health cannot cover the hit's health cost (simulation ends).
 */
export const simulateHit = (
  params: SimulationParams,
  healthRemaining: number,
  hitNumber: number,
): HitResult | null => {
  const {
    attackValue,
    armorEffective,
    dodgeEffective,
    precisionTotal,
    criticalChance,
    criticalDamages,
    lootChance,
  } = params;

  // Calculate the health cost for this hit (armor reduces the base 10 HP cost)
  const healthCostPerHit = HIT_BASE_HEALTH_COST * (1 - armorEffective / 100);

  // Check if we have enough health to take this hit
  if (healthRemaining < healthCostPerHit) {
    return null; // Can't take the hit, simulation ends
  }

  // 1. Roll dodge — only determines if health is used, NOT damage type
  const dodgeRoll = Math.random() * 100;
  const isDodged = dodgeRoll < dodgeEffective;

  // 2. Roll precision (determines miss vs direct hit)
  const precisionRoll = Math.random() * 100;
  const isMiss = precisionRoll >= precisionTotal;

  let type: HitType;
  let damageDealt: number;

  if (isMiss) {
    // Miss hit — half damage, cannot crit
    type = 'miss';
    damageDealt = Math.round(attackValue * MISS_DAMAGE_MULTIPLIER);
  } else {
    // Direct hit — roll for crit
    const critRoll = Math.random() * 100;
    if (critRoll < criticalChance) {
      type = 'critical';
      damageDealt = Math.round(attackValue * (1 + criticalDamages / 100));
    } else {
      type = 'normal';
      damageDealt = attackValue;
    }
  }

  // If dodged, use 0 health
  const healthUsed = isDodged ? 0 : healthCostPerHit;
  const newHealthRemaining = isDodged ? healthRemaining : Math.max(0, healthRemaining - healthCostPerHit);

  // 3. Roll loot (independent of everything)
  const casesEarned = rollLoot(lootChance);

  return {
    hitNumber,
    type,
    isDodged,
    damageDealt,
    healthUsed,
    healthRemaining: newHealthRemaining,
    casesEarned,
  };
};

/**
 * Roll for loot drops.
 * Returns an array of case numbers earned.
 */
const rollLoot = (lootChance: number): number[] => {
  const cases: number[] = [];
  const case2Chance = lootChance * CASE2_CHANCE_PER_LOOT_PERCENT;
  const case2Roll = Math.random() * 100;
  if (case2Roll < case2Chance) cases.push(2);

  const case1Chance = lootChance * CASE1_CHANCE_PER_LOOT_PERCENT;
  const case1Roll = Math.random() * 100;
  if (case1Roll < case1Chance) cases.push(1);

  return cases;
};

/**
 * Runs the full simulation hit-by-hit until health cannot cover the next hit.
 */
export const runFullSimulation = (params: SimulationParams): SimulationResult => {
  const hits: HitResult[] = [];
  let healthRemaining = params.totalHealth;
  let hitNumber = 0;
  let totalDamageDealt = 0;
  let case1Count = 0;
  let case2Count = 0;
  const hitBreakdown = { dodged: 0, miss: 0, normal: 0, critical: 0 };

  while (true) {
    hitNumber++;
    const result = simulateHit(params, healthRemaining, hitNumber);

    if (result === null) {
      // Can't take this hit — simulation ends
      break;
    }

    hits.push(result);
    healthRemaining = result.healthRemaining;
    totalDamageDealt += result.damageDealt;
    hitBreakdown[result.type]++;
    if (result.isDodged) hitBreakdown.dodged++;

    if (result.casesEarned.includes(1)) case1Count++;
    if (result.casesEarned.includes(2)) case2Count++;
  }

  return {
    hits,
    totalHits: hits.length,
    totalDamageDealt,
    case1Count,
    case2Count,
    hitBreakdown,
  };
};

/**
 * Runs exactly `hitCount` hits without stopping on health (for wear backtracking
 * from a known battle hit count). Uses Infinity health so dodge/precision/crit
 * rolls still apply for armor durability.
 */
export const runFixedHitsSimulation = (
  params: SimulationParams,
  hitCount: number,
): SimulationResult => {
  const hits: HitResult[] = [];
  let healthRemaining = Number.POSITIVE_INFINITY;
  let totalDamageDealt = 0;
  let case1Count = 0;
  let case2Count = 0;
  const hitBreakdown = { dodged: 0, miss: 0, normal: 0, critical: 0 };

  const capped = Math.max(0, Math.floor(hitCount));
  for (let hitNumber = 1; hitNumber <= capped; hitNumber++) {
    const result = simulateHit(params, healthRemaining, hitNumber);
    if (result === null) break;

    hits.push(result);
    healthRemaining = result.healthRemaining;
    totalDamageDealt += result.damageDealt;
    hitBreakdown[result.type]++;
    if (result.isDodged) hitBreakdown.dodged++;

    if (result.casesEarned.includes(1)) case1Count++;
    if (result.casesEarned.includes(2)) case2Count++;
  }

  return {
    hits,
    totalHits: hits.length,
    totalDamageDealt,
    case1Count,
    case2Count,
    hitBreakdown,
  };
};
