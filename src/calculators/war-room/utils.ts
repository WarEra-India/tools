import type { FullProfile } from "@/lib/wareraApi";
import {
  MIL_RANK_TIER1_MAX,
  MIL_RANK_TIER2_MAX,
  MIL_RANK_JUMP_THRESHOLD,
  MIL_BASE_BONUS_MULTIPLIER,
  MIL_HIGH_BONUS_MULTIPLIER,
  EFFECTIVE_STAT_DIVISOR,
  MODIFIER_PERCENTAGE,
  SKILL_PROGRESSION
} from "./constants";

export const getSimSkillValue = (profile: FullProfile, sim: any, skillName: keyof typeof SKILL_PROGRESSION) => {
  if (sim?.skills?.[skillName] !== undefined) {
    const level = sim.skills[skillName];
    const { base, inc } = SKILL_PROGRESSION[skillName];
    return base + (level * inc);
  }
  return profile.user.skills[skillName]?.value || 0;
};

export const calcMilBonus = (rank: number): number => {
  let bonus = (rank - 1) * MIL_BASE_BONUS_MULTIPLIER + Math.floor((rank - 1) / 4) * MIL_BASE_BONUS_MULTIPLIER;

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
