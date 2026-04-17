import { useState, useCallback, useRef } from "react";
import { Hammer, Loader2, Target, Zap, Download } from "lucide-react";
import MilitaryRankIcon from "@/components/MilitaryRankIcon";
import { GameItemIcon } from "@/components/GameItemIcon";
import {
  PUBLIC_IMAGES_BASE_URL,
  COIN_ICON,
  ResourceInput,
} from "./components";
import {
  totalSkillPointsForLevel,
  skillLevelToCumulativeCost,
  companiesSkillPointsCost,
  calcMilBonus,
  effectiveTotalDamage,
  effectivePercentageValue,
  runFullSimulation,
} from "./utils";
import {
  SKILL_PROGRESSION,
  AMMO_PERCENTAGES,
  FOOD_MULTIPLIERS,
  EQUIPEMENTS,
  RARITY_COSTS,
} from "./constants";
import { INITIAL_SIM_STATE, type SimEquipmentState } from "./Simulator";
import type { FullProfile } from "@/lib/wareraApi";

// ─── Types ──────────────────────────────────────────────────────────────

interface BuildResult {
  label: string;
  shortCode: string;
  simState: SimEquipmentState;
  avgDamage: number;
  avgCostPer1k: number;
  avgNetCost: number;
  avgHits: number;
  description: string;
}

interface BuilderProgress {
  current: number;
  total: number;
  phase: string;
}

// ─── Constants ──────────────────────────────────────────────────────────

const WEAPONS = ["knife", "gun", "rifle", "sniper", "tank", "jet"] as const;
const AMMO_TYPES = ["lightAmmo", "ammo", "heavyAmmo"] as const;
const FOOD_TYPES = [null, "bread", "steak", "cookedFish"] as const;
const PILL_STATES = ["no buff", "buff"] as const;

const WAR_SKILLS = [
  "attack", "health", "hunger", "precision",
  "criticalChance", "criticalDamages", "armor", "dodge",
] as const;

const SIM_RUNS_PER_BUILD = 5;

// ─── Intl Formatter ─────────────────────────────────────────────────────

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

// ─── Target Types ───────────────────────────────────────────────────────

type TargetMode = "damage" | "budget" | "costPer1k";

const TARGET_MODES: { value: TargetMode; label: string; placeholder: string; icon: string }[] = [
  { value: "damage", label: "Damage", placeholder: "Target Damage", icon: "damage" },
  { value: "budget", label: "Budget", placeholder: "Total Budget", icon: "game_coin" },
  { value: "costPer1k", label: "Cost / 1k", placeholder: "Cost per 1k DMG", icon: "game_coin" },
];

// ─── Skill Distribution Strategies ──────────────────────────────────────

type SkillAllocation = Record<(typeof WAR_SKILLS)[number], number>;

function generateSkillAllocations(warBudget: number): SkillAllocation[] {
  const strategies: { name: string; priorities: (typeof WAR_SKILLS)[number][] }[] = [
    { name: "attack_heavy", priorities: ["attack", "hunger", "health", "precision", "criticalChance", "criticalDamages", "armor", "dodge"] },
    { name: "crit_build", priorities: ["criticalDamages", "criticalChance", "attack", "precision", "hunger", "health", "armor", "dodge"] },
    { name: "balanced", priorities: ["attack", "criticalChance", "criticalDamages", "precision", "hunger", "health", "armor", "dodge"] },
    { name: "tank", priorities: ["health", "hunger", "armor", "dodge", "attack", "precision", "criticalChance", "criticalDamages"] },
    { name: "precision", priorities: ["precision", "attack", "criticalChance", "criticalDamages", "hunger", "health", "armor", "dodge"] },
    { name: "glass_cannon", priorities: ["attack", "hunger", "criticalDamages", "criticalChance", "precision", "health", "armor", "dodge"] },
    { name: "endurance", priorities: ["hunger", "health", "attack", "precision", "criticalChance", "criticalDamages", "dodge", "armor"] },
    { name: "dodge_build", priorities: ["dodge", "hunger", "health", "attack", "precision", "criticalChance", "criticalDamages", "armor"] },
    { name: "armor_build", priorities: ["armor", "hunger", "health", "attack", "precision", "criticalChance", "criticalDamages", "dodge"] },
    { name: "crit_precision", priorities: ["criticalChance", "precision", "criticalDamages", "attack", "hunger", "health", "armor", "dodge"] },
    { name: "max_dps", priorities: ["attack", "criticalDamages", "criticalChance", "precision", "hunger", "health", "armor", "dodge"] },
    { name: "sustain_dps", priorities: ["hunger", "health", "attack", "criticalDamages", "criticalChance", "precision", "dodge", "armor"] },
  ];

  for (let baseLevel = 1; baseLevel <= 5; baseLevel++) {
    strategies.push({
      name: `spread_${baseLevel}`,
      priorities: ["attack", "criticalDamages", "criticalChance", "precision", "hunger", "health", "armor", "dodge"],
    });
  }

  const results: SkillAllocation[] = [];
  const seen = new Set<string>();

  for (const strategy of strategies) {
    const allocation = allocateByPriority(warBudget, strategy.priorities, strategy.name.startsWith("spread_") ? parseInt(strategy.name.split("_")[1]) : 0);
    const key = JSON.stringify(allocation);
    if (!seen.has(key)) {
      seen.add(key);
      results.push(allocation);
    }
  }

  return results;
}

function allocateByPriority(
  budget: number,
  priorities: (typeof WAR_SKILLS)[number][],
  baseLevel: number = 0,
): SkillAllocation {
  const alloc: SkillAllocation = {
    attack: 0, health: 0, hunger: 0, precision: 0,
    criticalChance: 0, criticalDamages: 0, armor: 0, dodge: 0,
  };
  let remaining = budget;

  if (baseLevel > 0) {
    for (const skill of WAR_SKILLS) {
      const maxLvl = Math.min(baseLevel, SKILL_PROGRESSION[skill].maxLevel);
      const cost = skillLevelToCumulativeCost(maxLvl);
      if (remaining >= cost) { alloc[skill] = maxLvl; remaining -= cost; }
    }
  }

  for (const skill of priorities) {
    const maxLevel = SKILL_PROGRESSION[skill].maxLevel;
    while (alloc[skill] < maxLevel) {
      const nextLevel = alloc[skill] + 1;
      if (remaining >= nextLevel) { remaining -= nextLevel; alloc[skill] = nextLevel; }
      else break;
    }
  }
  return alloc;
}

// ─── Equipment Tier Combos ──────────────────────────────────────────────

function getEquipmentTiers(): number[][] {
  return [
    [6, 6, 6, 6, 6], [5, 5, 5, 5, 5], [4, 4, 4, 4, 4], [3, 3, 3, 3, 3],
    [6, 6, 6, 6, 5], [5, 5, 5, 5, 4], [4, 4, 4, 4, 3],
  ];
}

function tierToCode(slot: string, tier: number): string {
  return `${slot}${tier}`;
}

// ─── Cost Calculator ───────────────────────────────────────────────────

function calculateBuildCost(
  simState: SimEquipmentState, totalHits: number, dodgedHits: number,
  gameConfig: any, livePrices: any, equipPrices: any, hungerPoints: number,
): number {
  let totalCost = 0;

  if (simState.modifier === "buff") totalCost += livePrices?.prices?.cocain ?? 0;
  if (simState.food && typeof simState.food === "string")
    totalCost += (livePrices?.prices?.[simState.food] ?? 0) * hungerPoints;
  if (simState.ammo) totalCost += (livePrices?.prices?.[simState.ammo] ?? 0) * totalHits;

  const otherHits = totalHits - dodgedHits;
  for (const slot of EQUIPEMENTS) {
    if (slot === "ammo") continue;
    const code = simState[slot as keyof typeof simState];
    if (!code || typeof code !== "string") continue;
    const hits = slot === "weapon" ? totalHits : otherHits;
    if (hits > 0) totalCost += Math.ceil(hits / 100) * (equipPrices?.[code] ?? 0);
  }

  let scrapReceived = 0;
  for (const slot of EQUIPEMENTS) {
    if (slot === "ammo") continue;
    const code = simState[slot as keyof typeof simState];
    if (!code || typeof code !== "string") continue;
    const hits = slot === "weapon" ? totalHits : otherHits;
    const itemsBroken = Math.floor(hits / 100);
    const equip = gameConfig?.equipments?.find((e: any) => e.code === code);
    if (equip?.rarity && itemsBroken > 0) {
      scrapReceived += itemsBroken * Math.round((RARITY_COSTS[equip.rarity]?.scraps ?? 0) / 3);
    }
  }

  totalCost -= scrapReceived * (livePrices?.prices?.scraps ?? 0);
  return totalCost;
}

// ─── Build Simulator ────────────────────────────────────────────────────

function simulateBuild(
  simState: SimEquipmentState, gameConfig: any, livePrices: any, equipPrices: any,
): { avgDamage: number; avgCostPer1k: number; avgNetCost: number; avgHits: number } {
  const getStats = (slot: string, code: string | null) => {
    if (!code) return null;
    const rawStats = gameConfig.equipments.find((e: any) => e.code === code)?.dynamicStats;
    if (!rawStats) return null;
    const out: any = {};
    for (const [k, v] of Object.entries(rawStats)) {
      out[k] = Array.isArray(v) ? Math.ceil(((v as number[])[0] + (v as number[])[1]) / 2) : v;
    }
    return out;
  };

  const weaponStats = getStats("weapon", simState.weapon);
  const helmetStats = getStats("helmet", simState.helmet);
  const chestStats = getStats("chest", simState.chest);
  const glovesStats = getStats("gloves", simState.gloves);
  const pantsStats = getStats("pants", simState.pants);
  const bootsStats = getStats("boots", simState.boots);

  const ammoPercent = simState.ammo ? AMMO_PERCENTAGES[simState.ammo as keyof typeof AMMO_PERCENTAGES] || 0 : 0;
  const getStatVal = (val: any) => (val ? (Array.isArray(val) ? Math.ceil((val[0] + val[1]) / 2) : val) : 0);

  const attackSkill = SKILL_PROGRESSION.attack.base + simState.skills.attack * SKILL_PROGRESSION.attack.inc;
  const milBonus = calcMilBonus(simState.militaryRank);
  const buffPct = simState.modifier === "buff" ? 60 : simState.modifier === "debuff" ? -60 : 0;
  const totalAttack = effectiveTotalDamage(attackSkill, getStatVal(weaponStats?.attack), ammoPercent, milBonus, simState.orders, buffPct);

  const precisionTotal = SKILL_PROGRESSION.precision.base + simState.skills.precision * SKILL_PROGRESSION.precision.inc + getStatVal(glovesStats?.precision);
  const critChanceTotal = SKILL_PROGRESSION.criticalChance.base + simState.skills.criticalChance * SKILL_PROGRESSION.criticalChance.inc + getStatVal(weaponStats?.criticalChance);
  const critDmgTotal = SKILL_PROGRESSION.criticalDamages.base + simState.skills.criticalDamages * SKILL_PROGRESSION.criticalDamages.inc + getStatVal(helmetStats?.criticalDamages);

  const armorTotal = SKILL_PROGRESSION.armor.base + simState.skills.armor * SKILL_PROGRESSION.armor.inc + getStatVal(chestStats?.armor) + getStatVal(pantsStats?.armor);
  const dodgeTotal = SKILL_PROGRESSION.dodge.base + simState.skills.dodge * SKILL_PROGRESSION.dodge.inc + getStatVal(bootsStats?.dodge);

  const healthSkill = SKILL_PROGRESSION.health.base + simState.skills.health * SKILL_PROGRESSION.health.inc;
  const hungerSkill = SKILL_PROGRESSION.hunger.base + simState.skills.hunger * SKILL_PROGRESSION.hunger.inc;

  let healthRestored = 0;
  if (simState.food) {
    const mult = FOOD_MULTIPLIERS[simState.food] || 0;
    healthRestored = Math.floor(healthSkill * mult * hungerSkill);
  }

  let totalDamage = 0, totalNetCost = 0, totalHits = 0;

  for (let i = 0; i < SIM_RUNS_PER_BUILD; i++) {
    const result = runFullSimulation({
      totalHealth: healthSkill + healthRestored,
      attackValue: totalAttack,
      armorEffective: effectivePercentageValue(armorTotal),
      dodgeEffective: effectivePercentageValue(dodgeTotal),
      precisionTotal, criticalChance: critChanceTotal,
      criticalDamages: critDmgTotal,
      lootChance: SKILL_PROGRESSION.lootChance.base,
    });

    totalDamage += result.totalDamageDealt;
    totalHits += result.totalHits;
    totalNetCost += calculateBuildCost(simState, result.totalHits, result.hitBreakdown.dodged, gameConfig, livePrices, equipPrices, hungerSkill);
  }

  const avgDamage = totalDamage / SIM_RUNS_PER_BUILD;
  const avgNetCost = totalNetCost / SIM_RUNS_PER_BUILD;
  const avgHits = totalHits / SIM_RUNS_PER_BUILD;
  return { avgDamage, avgCostPer1k: avgDamage > 0 ? avgNetCost / (avgDamage / 1000) : Infinity, avgNetCost, avgHits };
}

// ─── Component ──────────────────────────────────────────────────────────

export default function WarBuilder({
  profile, gameConfig, livePrices, equipPrices, onLoadBuild,
}: {
  profile: FullProfile | null; gameConfig: any; livePrices: any; equipPrices: any;
  onLoadBuild: (state: SimEquipmentState, presetName: string) => void;
}) {
  const [playerLevel, setPlayerLevel] = useState<number>(profile?.user?.leveling?.level ?? 20);
  const [companiesCount, setCompaniesCount] = useState<number>(profile?.companies?.length ?? 5);
  const [militaryRank, setMilitaryRank] = useState<number>(profile?.user?.militaryRank ?? 61);
  const [targetMode, setTargetMode] = useState<TargetMode>("damage");
  const [targetValue, setTargetValue] = useState<string>("");
  const [results, setResults] = useState<BuildResult[] | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [progress, setProgress] = useState<BuilderProgress>({ current: 0, total: 0, phase: "" });
  const cancelRef = useRef(false);

  const totalPoints = totalSkillPointsForLevel(playerLevel);
  const ecoPointsUsed = companiesSkillPointsCost(companiesCount);
  const warBudget = Math.max(0, totalPoints - ecoPointsUsed);

  const runOptimizer = useCallback(async () => {
    if (!gameConfig || !livePrices || !equipPrices) return;
    setIsBuilding(true);
    setResults(null);
    cancelRef.current = false;

    const skillAllocations = generateSkillAllocations(warBudget);
    const equipTiers = getEquipmentTiers();

    type CandidateBuild = {
      weapon: string; ammo: string; armorTier: number[];
      food: string | null; pill: string; skills: SkillAllocation;
    };

    const candidates: CandidateBuild[] = [];
    for (const skills of skillAllocations)
      for (const weapon of WEAPONS)
        for (const ammo of AMMO_TYPES)
          for (const food of FOOD_TYPES)
            for (const pill of PILL_STATES)
              for (const tiers of equipTiers)
                candidates.push({ weapon, ammo, armorTier: tiers, food, pill, skills });

    const total = candidates.length;
    setProgress({ current: 0, total, phase: "Simulating builds..." });

    type SimResult = { build: CandidateBuild; result: ReturnType<typeof simulateBuild> };
    const allResults: SimResult[] = [];
    const parsedTarget = targetValue ? parseFloat(targetValue.replace(/,/g, "")) : null;
    const CHUNK_SIZE = 200;
    let processed = 0;

    for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
      if (cancelRef.current) break;
      const chunk = candidates.slice(i, i + CHUNK_SIZE);

      for (const candidate of chunk) {
        const simState: SimEquipmentState = {
          ...structuredClone(INITIAL_SIM_STATE),
          weapon: candidate.weapon, ammo: candidate.ammo,
          helmet: tierToCode("helmet", candidate.armorTier[0]),
          chest: tierToCode("chest", candidate.armorTier[1]),
          gloves: tierToCode("gloves", candidate.armorTier[2]),
          pants: tierToCode("pants", candidate.armorTier[3]),
          boots: tierToCode("boots", candidate.armorTier[4]),
          food: candidate.food, modifier: candidate.pill as any,
          militaryRank, orders: 50, playerLevel,
          ecoSkillsPoints: ecoPointsUsed, equipmentStatsOverride: {},
          skills: { ...candidate.skills, lootChance: 0 },
        };

        const result = simulateBuild(simState, gameConfig, livePrices, equipPrices);
        if (result.avgDamage > 0) allResults.push({ build: candidate, result });
      }

      processed += chunk.length;
      setProgress({ current: processed, total, phase: `Simulating... (${allResults.length} viable)` });
      await new Promise((r) => setTimeout(r, 5));
    }

    setProgress({ current: total, total, phase: "Analyzing results..." });
    await new Promise((r) => setTimeout(r, 10));

    const mkState = (c: CandidateBuild): SimEquipmentState => ({
      ...structuredClone(INITIAL_SIM_STATE),
      weapon: c.weapon, ammo: c.ammo,
      helmet: tierToCode("helmet", c.armorTier[0]),
      chest: tierToCode("chest", c.armorTier[1]),
      gloves: tierToCode("gloves", c.armorTier[2]),
      pants: tierToCode("pants", c.armorTier[3]),
      boots: tierToCode("boots", c.armorTier[4]),
      food: c.food, modifier: c.pill as any,
      militaryRank, orders: 50, playerLevel,
      ecoSkillsPoints: ecoPointsUsed, equipmentStatsOverride: {},
      skills: { ...c.skills, lootChance: 0 },
    });

    const buildResults: BuildResult[] = [];

    if (allResults.length > 0) {
      // 1. Best Damage
      const byDmg = [...allResults].sort((a, b) => b.result.avgDamage - a.result.avgDamage);
      const bd = byDmg[0];
      const bdKey = JSON.stringify(bd.build);
      buildResults.push({
        label: "Best Damage", shortCode: "BD", simState: mkState(bd.build),
        avgDamage: bd.result.avgDamage, avgCostPer1k: bd.result.avgCostPer1k,
        avgNetCost: bd.result.avgNetCost, avgHits: bd.result.avgHits,
        description: "Maximum total damage output",
      });

      // 2. Best Cost/1k
      const validCost = allResults.filter(r => r.result.avgCostPer1k < Infinity && r.result.avgCostPer1k > 0);
      let bcKey = "";
      if (validCost.length > 0) {
        const byCost = [...validCost].sort((a, b) => a.result.avgCostPer1k - b.result.avgCostPer1k);
        const bc = byCost[0];
        bcKey = JSON.stringify(bc.build);
        buildResults.push({
          label: "Best Cost / 1k", shortCode: "BC", simState: mkState(bc.build),
          avgDamage: bc.result.avgDamage, avgCostPer1k: bc.result.avgCostPer1k,
          avgNetCost: bc.result.avgNetCost, avgHits: bc.result.avgHits,
          description: "Cheapest cost per 1,000 damage",
        });
      }

      // 3. Best Overall — exclude BD & BC, then find best balanced build
      const overallPool = validCost.filter(r => {
        const key = JSON.stringify(r.build);
        return key !== bdKey && key !== bcKey;
      });
      if (overallPool.length > 0) {
        const damages = overallPool.map(r => r.result.avgDamage);
        const costs = overallPool.map(r => r.result.avgCostPer1k);
        const minD = Math.min(...damages), maxD = Math.max(...damages);
        const minC = Math.min(...costs), maxC = Math.max(...costs);
        const dR = maxD - minD || 1, cR = maxC - minC || 1;

        let best: SimResult | null = null;
        let bestScore = -Infinity;
        for (const e of overallPool) {
          const dN = (e.result.avgDamage - minD) / dR;
          const cN = 1 - (e.result.avgCostPer1k - minC) / cR;
          const score = dN * 0.5 + cN * 0.5;
          if (score > bestScore) { bestScore = score; best = e; }
        }
        if (best) {
          buildResults.push({
            label: "Best Overall", shortCode: "BO", simState: mkState(best.build),
            avgDamage: best.result.avgDamage, avgCostPer1k: best.result.avgCostPer1k,
            avgNetCost: best.result.avgNetCost, avgHits: best.result.avgHits,
            description: "Best balance of damage and cost",
          });
        }
      }

      // 4. Target-based
      if (parsedTarget && parsedTarget > 0) {
        if (targetMode === "damage") {
          const reaching = allResults.filter(r => r.result.avgDamage >= parsedTarget);
          if (reaching.length > 0) {
            const bt = [...reaching].sort((a, b) => a.result.avgNetCost - b.result.avgNetCost)[0];
            buildResults.push({
              label: `Target ${fmtCompact(parsedTarget)}`, shortCode: "BT", simState: mkState(bt.build),
              avgDamage: bt.result.avgDamage, avgCostPer1k: bt.result.avgCostPer1k,
              avgNetCost: bt.result.avgNetCost, avgHits: bt.result.avgHits,
              description: `Cheapest to reach ${fmtCompact(parsedTarget)} damage`,
            });
          }
        } else if (targetMode === "budget") {
          const affordable = allResults.filter(r => r.result.avgNetCost <= parsedTarget);
          if (affordable.length > 0) {
            const bt = [...affordable].sort((a, b) => b.result.avgDamage - a.result.avgDamage)[0];
            buildResults.push({
              label: `Budget ${fmtCompact(parsedTarget)}`, shortCode: "BT", simState: mkState(bt.build),
              avgDamage: bt.result.avgDamage, avgCostPer1k: bt.result.avgCostPer1k,
              avgNetCost: bt.result.avgNetCost, avgHits: bt.result.avgHits,
              description: `Best damage within ${fmtCompact(parsedTarget)} budget`,
            });
          }
        } else if (targetMode === "costPer1k") {
          const withinCost = validCost.filter(r => r.result.avgCostPer1k <= parsedTarget);
          if (withinCost.length > 0) {
            const bt = [...withinCost].sort((a, b) => b.result.avgDamage - a.result.avgDamage)[0];
            buildResults.push({
              label: `≤${parsedTarget.toFixed(1)}/1k`, shortCode: "BT", simState: mkState(bt.build),
              avgDamage: bt.result.avgDamage, avgCostPer1k: bt.result.avgCostPer1k,
              avgNetCost: bt.result.avgNetCost, avgHits: bt.result.avgHits,
              description: `Best damage at ≤${parsedTarget.toFixed(1)} cost/1k`,
            });
          }
        }
      }
    }

    setResults(buildResults);
    setIsBuilding(false);
    setProgress({ current: total, total, phase: "Done!" });
  }, [warBudget, playerLevel, militaryRank, ecoPointsUsed, targetValue, targetMode, gameConfig, livePrices, equipPrices]);

  const handleLoad = (build: BuildResult) => {
    const presetName = `L${playerLevel} C${companiesCount} M${militaryRank} ${build.shortCode}`;
    onLoadBuild(build.simState, presetName);
  };

  const activeTargetMode = TARGET_MODES.find(m => m.value === targetMode)!;

  return (
    <div className="flex flex-col gap-6 p-8 bg-zinc-900/10 rounded-3xl border border-zinc-800/30">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner">
          <Hammer className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">War Builder</h2>
          <p className="text-xs text-zinc-500">Analyze constraints and find the optimal combat loadout</p>
        </div>
      </div>

      {/* Constraints */}
      <div className="flex flex-col items-center gap-4 w-full bg-zinc-900/40 rounded-3xl p-6 border border-zinc-800/40 relative">
        <span className="absolute -top-2.5 left-8 px-2 bg-zinc-950 text-[10px] font-black text-zinc-600 uppercase tracking-widest rounded shadow">Constraints</span>
        <div className="flex items-center justify-center gap-8 flex-wrap w-full">
          <ResourceInput icon="level" iconNode={<img src={`${PUBLIC_IMAGES_BASE_URL}skills.svg`} className="h-5 w-5 opacity-80" alt="level" />} label="Player Level" value={playerLevel} formatter={v => v} onDecrease={() => setPlayerLevel(Math.max(1, playerLevel - 1))} onIncrease={() => setPlayerLevel(Math.min(200, playerLevel + 1))} />
          <ResourceInput icon="companies" iconNode={<div className="h-5 w-5 flex items-center justify-center"><img src={`${PUBLIC_IMAGES_BASE_URL}companies.svg`} className="h-4 w-4" alt="eco" /></div>} label="Companies" value={companiesCount} formatter={v => v} onDecrease={() => setCompaniesCount(Math.max(2, companiesCount - 1))} onIncrease={() => setCompaniesCount(Math.min(12, companiesCount + 1))} />
          <ResourceInput icon="battle" iconNode={<MilitaryRankIcon rank={militaryRank} imgClassName="h-6 w-6" />} label="Military Rank" value={militaryRank} formatter={() => null} onDecrease={() => setMilitaryRank(Math.max(1, militaryRank - 1))} onIncrease={() => setMilitaryRank(Math.min(120, militaryRank + 1))} />

          <div className="flex flex-col items-center gap-1 px-4 py-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-2">
              <img src={`${PUBLIC_IMAGES_BASE_URL}skills.svg`} className="h-4 w-4 opacity-60" alt="skills" />
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">War Budget</span>
            </div>
            <span className="text-2xl font-mono font-black text-white leading-none">{warBudget}</span>
            <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-mono">
              <span>{totalPoints} total</span><span>−</span><span>{ecoPointsUsed} eco</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 px-4 py-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-2">
              <img src={`${PUBLIC_IMAGES_BASE_URL}orders.svg`} className="h-4 w-4 opacity-60" alt="orders" />
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Orders</span>
            </div>
            <span className="text-xl font-mono font-black text-zinc-300 leading-none">50%</span>
            <span className="text-[9px] text-zinc-600 font-mono">fixed</span>
          </div>
        </div>
      </div>

      {/* Target & Build */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-0 bg-zinc-900/40 rounded-xl border border-zinc-800/40 overflow-hidden">
          <div className="flex flex-col border-r border-zinc-800/40">
            {TARGET_MODES.map(mode => (
              <button key={mode.value} onClick={() => setTargetMode(mode.value)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${targetMode === mode.value ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500" : "text-zinc-600 hover:text-zinc-400 border-l-2 border-transparent"}`}
              >{mode.label}</button>
            ))}
          </div>
          <div className="flex flex-col gap-0.5 p-3">
            <div className="flex items-center gap-3">
              <img src={`${PUBLIC_IMAGES_BASE_URL}${activeTargetMode.icon}.svg`} className="h-4 w-4 opacity-50" alt="target" />
              <input type="text" placeholder={`${activeTargetMode.placeholder} (optional)`} value={targetValue}
                onChange={(e) => setTargetValue(e.target.value.replace(/[^0-9,.]/g, ""))}
                className="bg-transparent border-none text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none w-56" />
            </div>
            {targetValue && parseFloat(targetValue.replace(/,/g, "")) > 0 && (
              <span className="text-[9px] font-mono font-bold text-amber-500/60 pl-7">
                {fmtCompact(parseFloat(targetValue.replace(/,/g, "")))}
                {targetMode === "damage" ? " dmg" : targetMode === "budget" ? " CC" : " CC/1k"}
              </span>
            )}
          </div>
        </div>

        <button onClick={runOptimizer} disabled={isBuilding}
          className="flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:shadow-none disabled:scale-100">
          {isBuilding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Hammer className="h-5 w-5" />}
          {isBuilding ? "Building..." : "Build"}
        </button>
      </div>

      {/* Progress Bar */}
      {isBuilding && (
        <div className="flex flex-col gap-2 px-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{progress.phase}</span>
            <span className="text-[10px] font-mono font-bold text-zinc-400">
              {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
              <span className="text-zinc-600 ml-2">({progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%)</span>
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-100"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-black text-white uppercase tracking-widest">Recommended Builds</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {results.map((build) => (
              <BuildResultCard key={build.shortCode} build={build} onLoad={() => handleLoad(build)} />
            ))}
          </div>
        </div>
      )}

      {results && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 opacity-50">
          <Target className="h-8 w-8 text-zinc-600" />
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">No viable builds found</p>
        </div>
      )}
    </div>
  );
}

// ─── Build Result Card ──────────────────────────────────────────────────

function BuildResultCard({ build, onLoad }: { build: BuildResult; onLoad: () => void }) {
  const isBD = build.shortCode === "BD";
  const isBC = build.shortCode === "BC";
  const isBO = build.shortCode === "BO";
  const isBT = build.shortCode === "BT";

  const border = isBD ? "border-red-500/30 hover:border-red-500/50" : isBC ? "border-green-500/30 hover:border-green-500/50" : isBO ? "border-purple-500/30 hover:border-purple-500/50" : "border-amber-500/30 hover:border-amber-500/50";
  const accent = isBD ? "text-red-400" : isBC ? "text-green-400" : isBO ? "text-purple-400" : "text-amber-400";
  const bg = isBD ? "bg-red-500/5" : isBC ? "bg-green-500/5" : isBO ? "bg-purple-500/5" : "bg-amber-500/5";

  const equipCodes = [build.simState.weapon, build.simState.ammo, build.simState.helmet, build.simState.chest, build.simState.gloves, build.simState.pants, build.simState.boots].filter(Boolean);

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-2xl border-[2px] transition-all ${border} ${bg} bg-zinc-950/30`}>
      <div className="flex flex-col gap-0.5">
        <span className={`text-[10px] font-black uppercase tracking-widest ${accent}`}>{build.label}</span>
        <span className="text-[9px] font-bold text-zinc-600">{build.description}</span>
      </div>

      <div className="flex flex-col items-center gap-1 py-2">
        {isBD || isBO || isBT ? (
          <>
            <div className="flex items-center gap-2">
              <img src={`${PUBLIC_IMAGES_BASE_URL}damage.svg`} className="h-5 w-5 opacity-70" alt="dmg" />
              <span className={`text-3xl font-black font-mono leading-none ${accent}`}>{fmtCompact(build.avgDamage)}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <img src={COIN_ICON} className="h-3 w-3 opacity-50" alt="coin" />
              <span className="text-[10px] font-mono font-bold text-zinc-500">{build.avgCostPer1k.toFixed(2)} / 1k</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <img src={COIN_ICON} className="h-5 w-5 opacity-70" alt="coin" />
              <span className={`text-3xl font-black font-mono leading-none ${accent}`}>{build.avgCostPer1k.toFixed(2)}</span>
              <span className="text-xs font-bold text-zinc-600">/ 1k</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <img src={`${PUBLIC_IMAGES_BASE_URL}damage.svg`} className="h-3 w-3 opacity-50" alt="dmg" />
              <span className="text-[10px] font-mono font-bold text-zinc-500">{fmtCompact(build.avgDamage)} dmg</span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-1 flex-wrap">
        {equipCodes.map((code) => <GameItemIcon key={code} itemCode={code!} className="h-7 w-7 rounded-md" />)}
        {build.simState.food && <GameItemIcon itemCode={build.simState.food} className="h-7 w-7 rounded-md" />}
        {build.simState.modifier === "buff" && <GameItemIcon itemCode="cocain" className="h-7 w-7 rounded-md" />}
      </div>

      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {Object.entries(build.simState.skills).map(([skill, level]) => {
          if (level === 0 || skill === "lootChance") return null;
          return (
            <div key={skill} className="flex items-center gap-0.5 bg-zinc-900/50 px-1.5 py-0.5 rounded-md border border-zinc-800/50">
              <img src={`${PUBLIC_IMAGES_BASE_URL}${skill}.svg`} className="h-3 w-3 opacity-70" alt={skill} />
              <span className="text-[9px] font-mono font-bold text-zinc-400">{level}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2">
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">~{Math.round(build.avgHits)} hits</span>
        <span className="text-[9px] font-bold text-zinc-700">•</span>
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">
          <img src={COIN_ICON} className="h-2.5 w-2.5 inline opacity-50" alt="coin" /> {fmtCompact(Math.abs(build.avgNetCost))} net
        </span>
      </div>

      <button onClick={onLoad}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all border border-zinc-700/50 hover:scale-[1.02] active:scale-[0.98]">
        <Download className="h-3.5 w-3.5" />
        Load
      </button>
    </div>
  );
}
