import type { FullProfile } from "@/lib/wareraApi";

export const calcMilBonus = (rank: number): number => {
  let bonus = (rank - 1) * 0.25 + Math.floor((rank - 1) / 4) * 0.25;

  // base logic (works till 108)
  if (rank <= 108) {
    return bonus;
  }

  const phase1 = Math.min(rank, 116) - 108;

  if (phase1 > 0) {
    bonus += phase1 * 0.25;

    // extra jump at 111
    if (rank >= 111) bonus += 0.25;
  }

  if (rank >= 117) {
    bonus += (rank - 116) * 0.5;
  }

  return bonus;
};


export const effectivePercentageValue = (totalValue: number): number => {
  return Math.round((totalValue / (totalValue + 40)) * 100);
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

export const getAttackTotalAndBreakDown = (profile: FullProfile): {
  breakdown: { skill: number; weapon: number; ammo: number; military: number; orders: number; buff: number; debuff: number; }; total: number;
} => {
  const breakdown = {
    skill: profile.user.skills.attack.value || 0,
    weapon: profile.equipment?.weapon?.skills?.attack || 0,
    ammo: profile.user.skills?.attack?.ammoPercent || 0,
    military: profile.user.skills.attack.militaryRankPercent || 0,
    orders: 0,
    buff: profile.user.skills.attack.buffsPercent || 0,
    debuff: profile.user.skills.attack.debuffsPercent || 0,
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

export const getEffectiveStats = (profile: FullProfile) => {
  const { user, equipment } = profile;

  const armorTotal = (user.skills.armor?.value || 0) + (equipment?.chest?.skills?.armor || 0) + (equipment?.pants?.skills?.armor || 0);
  const dodgeTotal = (user.skills.dodge?.value || 0) + (equipment?.boots?.skills?.dodge || 0);

  return {
    precision: {
      skill: user.skills.precision?.value || 0,
      equipment: equipment?.gloves?.skills?.precision || 0,
      total: (user.skills.precision?.value || 0) + (equipment?.gloves?.skills?.precision || 0),
    },
    criticalChance: {
      skill: user.skills.criticalChance?.value || 0,
      equipment: equipment?.weapon?.skills?.criticalChance || 0,
      total: (user.skills.criticalChance?.value || 0) + (equipment?.weapon?.skills?.criticalChance || 0),
    },
    criticalDamages: {
      skill: user.skills.criticalDamages?.value || 0,
      equipment: equipment?.helmet?.skills?.criticalDamages || 0,
      total: (user.skills.criticalDamages?.value || 0) + (equipment?.helmet?.skills?.criticalDamages || 0),
    },
    armor: {
      skill: user.skills.armor?.value || 0,
      chest: equipment?.chest?.skills?.armor || 0,
      pants: equipment?.pants?.skills?.armor || 0,
      raw: armorTotal,
      effective: effectivePercentageValue(armorTotal),
    },
    dodge: {
      skill: user.skills.dodge?.value || 0,
      boots: equipment?.boots?.skills?.dodge || 0,
      raw: dodgeTotal,
      effective: effectivePercentageValue(dodgeTotal),
    },
  };
};


// let base = Math.round((200 + 85) * 1.1 * 1.1825 * 1.6) // 593

// let attack_bonus_multiplier = 1.7

// let crit_bonus_multiplier = 2.89

// let miss_shot_multiplier = 0.5

// let precsion_percentage = 0.75



// let crit_shots = [
//   2730, 2920, 2950, 3050, 3130, 2820, 3090, 2860, 3040, 3060, 2650, 2660, 2800, 2940,
// ]

// let crit_dodge_shots = [
//   2630, 3140, 2690, 2790, 2680, 3190, 2930,
// ]

// let crit_expected = base * crit_bonus_multiplier * attack_bonus_multiplier // 2913.409

// let crits_avg = 2892.85




// let dodge_shots = [
//   945, 933, 990, 996, 930, 922, 909, 996, 926, 936, 988, 1090, 970, 1040, 1070,
// ]

// let normal_shots = [
//   1060, 967, 950, 1030, 964, 925, 990, 1100, 1020, 1020,
// ]

// let normal_expected = base * attack_bonus_multiplier // 1008.1

// let normal_avg = 986.68





// let miss_shots = [
//   503, 483, 518, 531, 475, 502,
// ]

// let miss_dodge_shots = [
//   464, 464, 519, 464,
// ]

// let miss_expected = base * miss_shot_multiplier * attack_bonus_multiplier // 504.05

// let miss_avg = 492.3





// let total = 96_880 - 6540 // 90340

