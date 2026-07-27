import type { BattleLootSummary } from "@/lib/api/warera";
import type { FullProfile } from "@/lib/wareraApi";
import type { GameData } from "@/lib/hooks/useGameConfig";
import type { LivePrices } from "@/lib/hooks/useLivePrices";
import {
  AMMO_PERCENTAGES,
  EQUIPEMENTS,
  FOOD_MULTIPLIERS,
  RARITY_COSTS,
} from "../war-room/constants";
import {
  getAttackTotalAndBreakDown,
  getEffectiveStats,
  runFixedHitsSimulation,
  type SimulationParams,
} from "../war-room/utils";
import type { SimEquipmentState } from "../war-room/Simulator";

export const WEAR_SIM_RUNS = 5;

export type EquipSlot = "weapon" | "helmet" | "chest" | "gloves" | "pants" | "boots";

export interface SlotWearSummary {
  slot: EquipSlot;
  code: string;
  avgHits: number;
  avgBroken: number;
  avgRemainingStatePct: number;
  avgPartialWearFraction: number;
  price: number;
  /** Estimated cost: (avgHits / 100) * price */
  cost: number;
  scrapYield: number;
  scrapValue: number;
  estimated: true;
}

export interface BattlePnLResult {
  runs: number;
  avgDodged: number;
  avgWeaponHits: number;
  avgArmorHits: number;
  slots: SlotWearSummary[];
  equipCost: number;
  scrapReceived: number;
  scrapValue: number;
  ammoCost: number;
  foodCost: number;
  pillCost: number;
  totalSpent: number;
  case1Value: number;
  case2Value: number;
  poolLootValue: number;
  poolLootItems: { code: string; price: number }[];
  bountyMoney: number;
  contractMoney: number;
  totalGained: number;
  /** gains - spent */
  net: number;
  estimated: true;
}

function remainingStatePct(hits: number): number {
  if (hits <= 0) return 100;
  if (hits % 100 === 0) return 0;
  return 100 - (hits % 100);
}

function partialWearFraction(hits: number): number {
  if (hits <= 0) return 0;
  return (hits % 100) / 100;
}

function buildSimOverride(loadout: SimEquipmentState, gameConfig: GameData | null) {
  const getStats = (slot: string, code: string | null) => {
    if (!code || !gameConfig) return null;
    const rawStats = gameConfig.equipments.find((e) => e.code === code)?.dynamicStats;
    if (!rawStats) return null;

    const overriddenStats: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawStats)) {
      if (loadout.equipmentStatsOverride?.[slot]?.[k] !== undefined) {
        overriddenStats[k] = loadout.equipmentStatsOverride[slot][k];
      } else if (Array.isArray(v)) {
        overriddenStats[k] = Math.ceil((v[0] + v[1]) / 2);
      } else {
        overriddenStats[k] = v as number;
      }
    }
    return overriddenStats;
  };

  return {
    weaponStats: getStats("weapon", loadout.weapon),
    helmetStats: getStats("helmet", loadout.helmet),
    chestStats: getStats("chest", loadout.chest),
    glovesStats: getStats("gloves", loadout.gloves),
    pantsStats: getStats("pants", loadout.pants),
    bootsStats: getStats("boots", loadout.boots),
    ammoPercent: loadout.ammo
      ? AMMO_PERCENTAGES[loadout.ammo as keyof typeof AMMO_PERCENTAGES] || 0
      : 0,
    modifier: loadout.modifier,
    militaryRank: loadout.militaryRank,
    orders: loadout.orders,
    skills: loadout.skills,
  };
}

export function loadoutFromProfile(profile: FullProfile): SimEquipmentState {
  const equipment = profile.equipment;
  const user = profile.user;

  return {
    weapon: equipment?.weapon?.code ?? null,
    ammo: equipment?.ammo ?? null,
    helmet: equipment?.helmet?.code ?? null,
    chest: equipment?.chest?.code ?? null,
    gloves: equipment?.gloves?.code ?? null,
    pants: equipment?.pants?.code ?? null,
    boots: equipment?.boots?.code ?? null,
    food: null,
    modifier:
      (user.skills.attack?.buffsPercent ?? 0) > 0
        ? "buff"
        : (user.skills.attack?.debuffsPercent ?? 0) > 0
          ? "debuff"
          : "no buff",
    militaryRank: user.militaryRank ?? 1,
    orders: 0,
    playerLevel: user.leveling?.level ?? 1,
    ecoSkillsPoints: 0,
    equipmentStatsOverride: {
      weapon: equipment?.weapon?.skills || {},
      helmet: equipment?.helmet?.skills || {},
      chest: equipment?.chest?.skills || {},
      gloves: equipment?.gloves?.skills || {},
      pants: equipment?.pants?.skills || {},
      boots: equipment?.boots?.skills || {},
    },
    skills: {
      health: user.skills.health?.level ?? 0,
      hunger: user.skills.hunger?.level ?? 0,
      attack: user.skills.attack?.level ?? 0,
      precision: user.skills.precision?.level ?? 0,
      criticalChance: user.skills.criticalChance?.level ?? 0,
      criticalDamages: user.skills.criticalDamages?.level ?? 0,
      armor: user.skills.armor?.level ?? 0,
      dodge: user.skills.dodge?.level ?? 0,
      lootChance: user.skills.lootChance?.level ?? 0,
    },
  };
}

export function estimateBattlePnL({
  hitCount,
  loot,
  profile,
  loadout,
  equipPrices,
  livePrices,
  gameConfig,
  runs = WEAR_SIM_RUNS,
}: {
  hitCount: number;
  loot: BattleLootSummary;
  profile: FullProfile;
  loadout: SimEquipmentState;
  equipPrices: Record<string, number>;
  livePrices: LivePrices | null;
  gameConfig: GameData | null;
  runs?: number;
}): BattlePnLResult {
  const simOverride = buildSimOverride(loadout, gameConfig);
  const attackData = getAttackTotalAndBreakDown(profile, simOverride);
  const effectiveStats = getEffectiveStats(profile, simOverride);

  const hasBuff = loadout.modifier === "buff";
  const baseHealth = effectiveStats.health.skill || 0;
  const baseHunger = effectiveStats.hunger.skill || 0;
  const totalHungerPoints = hasBuff ? Math.floor(baseHunger * 1.8) : baseHunger;
  const foodMult = loadout.food ? FOOD_MULTIPLIERS[loadout.food] || 0 : 0;
  const healthRestored =
    foodMult > 0 ? Math.floor(baseHealth * foodMult * totalHungerPoints) : 0;
  const totalHealth = (hasBuff ? Math.floor(baseHealth * 1.8) : baseHealth) + healthRestored;

  const params: SimulationParams = {
    totalHealth: Math.max(totalHealth, 1),
    attackValue: attackData.total,
    armorEffective: effectiveStats.armor.effective,
    dodgeEffective: effectiveStats.dodge.effective,
    precisionTotal: effectiveStats.precision.total,
    criticalChance: effectiveStats.criticalChance.total,
    criticalDamages: effectiveStats.criticalDamages.total,
    lootChance: effectiveStats.lootChance.skill,
  };

  let sumDodged = 0;
  let sumWeaponHits = 0;
  let sumArmorHits = 0;

  for (let i = 0; i < runs; i++) {
    const result = runFixedHitsSimulation(params, hitCount);
    sumDodged += result.hitBreakdown.dodged;
    sumWeaponHits += result.totalHits;
    sumArmorHits += result.totalHits - result.hitBreakdown.dodged;
  }

  const avgDodged = sumDodged / runs;
  const avgWeaponHits = sumWeaponHits / runs;
  const avgArmorHits = sumArmorHits / runs;

  const prices = livePrices?.prices ?? {};
  const scrapPrice = prices.scraps ?? 0;

  const slots: SlotWearSummary[] = [];
  let equipCost = 0;
  let scrapReceived = 0;

  for (const slot of EQUIPEMENTS) {
    if (slot === "ammo") continue;
    const code = loadout[slot];
    if (!code || typeof code !== "string") continue;

    const equipSlot = slot as EquipSlot;
    const avgHitsRaw = equipSlot === "weapon" ? avgWeaponHits : avgArmorHits;
    const avgHits = Math.round(avgHitsRaw);
    const avgBroken = Math.floor(avgHits / 100);
    const avgRemainingStatePct = remainingStatePct(avgHits);
    const avgPartialWearFraction = partialWearFraction(avgHits);
    const price = equipPrices[code] ?? 0;
    const cost = (avgHits / 100) * price;

    const equip = gameConfig?.equipments?.find((e) => e.code === code);
    let scrapYield = 0;
    if (equip?.rarity && avgBroken > 0) {
      scrapYield = Math.round((RARITY_COSTS[equip.rarity]?.scraps ?? 0) / 3) * avgBroken;
    }

    equipCost += cost;
    scrapReceived += scrapYield;

    slots.push({
      slot: equipSlot,
      code,
      avgHits,
      avgBroken,
      avgRemainingStatePct,
      avgPartialWearFraction,
      price,
      cost,
      scrapYield,
      scrapValue: scrapYield * scrapPrice,
      estimated: true,
    });
  }

  const scrapValue = scrapReceived * scrapPrice;

  const ammoCost =
    loadout.ammo && hitCount > 0
      ? hitCount * (prices[loadout.ammo] ?? 0)
      : 0;

  const foodCost =
    loadout.food
      ? (prices[loadout.food] ?? 0) * totalHungerPoints
      : 0;

  const pillCost = hasBuff ? (prices.cocain ?? 0) : 0;

  const totalSpent = equipCost + ammoCost + foodCost + pillCost;

  const case1Price = prices.case1 ?? 0;
  const case2Price = prices.case2 ?? 0;
  const case1Value = (loot.case1Count ?? 0) * case1Price;
  const case2Value = (loot.case2Count ?? 0) * case2Price;

  const poolLootItems = (loot.poolLoot ?? []).map((entry) => ({
    code: entry.item.code,
    price: equipPrices[entry.item.code] ?? 0,
  }));
  const poolLootValue = poolLootItems.reduce((sum, item) => sum + item.price, 0);

  const bountyMoney = loot.totalMoneyFromBounty ?? 0;
  const contractMoney = loot.totalMoneyFromContract ?? 0;

  const totalGained =
    case1Value + case2Value + poolLootValue + bountyMoney + contractMoney + scrapValue;

  return {
    runs,
    avgDodged,
    avgWeaponHits,
    avgArmorHits,
    slots,
    equipCost,
    scrapReceived,
    scrapValue,
    ammoCost,
    foodCost,
    pillCost,
    totalSpent,
    case1Value,
    case2Value,
    poolLootValue,
    poolLootItems,
    bountyMoney,
    contractMoney,
    totalGained,
    net: totalGained - totalSpent,
    estimated: true,
  };
}

/** Slots used by the loadout editor (excludes skill-only state). */
export const LOADOUT_EQUIP_SLOTS = [
  "weapon",
  "ammo",
  "helmet",
  "chest",
  "gloves",
  "pants",
  "boots",
  "food",
] as const satisfies readonly (
  | "weapon"
  | "ammo"
  | "helmet"
  | "chest"
  | "gloves"
  | "pants"
  | "boots"
  | "food"
)[];

export type LoadoutEquipSlot = (typeof LOADOUT_EQUIP_SLOTS)[number];
