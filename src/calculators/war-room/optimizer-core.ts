import {
  SKILL_PROGRESSION,
  AMMO_PERCENTAGES,
  FOOD_MULTIPLIERS,
  EQUIPEMENTS,
  RARITY_COSTS,
  HIT_BASE_HEALTH_COST,
  MISS_DAMAGE_MULTIPLIER,
  EFFECTIVE_STAT_DIVISOR,
} from "./constants";
import { runFullSimulation } from "./utils";

// ─── Re-exports for worker ─────────────────────────────────────────

export { SKILL_PROGRESSION, AMMO_PERCENTAGES, FOOD_MULTIPLIERS };

export const WAR_SKILLS = [
  "attack", "health", "hunger", "precision",
  "criticalChance", "criticalDamages", "armor", "dodge",
] as const;

export type WarSkill = (typeof WAR_SKILLS)[number];
export type SkillAllocation = Record<WarSkill, number>;

// ─── Pure computation functions ────────────────────────────────────

export const skillLevelToCumulativeCost = (level: number): number =>
  (level * (level + 1)) / 2;

export const effectivePercentageValue = (totalValue: number): number =>
  Math.round((totalValue / (totalValue + EFFECTIVE_STAT_DIVISOR)) * 100);

export const effectiveTotalDamage = (
  skillValue: number,
  weaponValue: number,
  ammoBonusPercentage: number,
  buffPercentage: number,
): number =>
  Math.round(
    (skillValue + weaponValue)
    * (1 + ammoBonusPercentage / 100)
    * (1 + buffPercentage / 100)
  );

// ─── Analytical expected damage ────────────────────────────────────

export interface AnalyticalResult {
  expectedDamage: number;
  expectedHits: number;
}

export const computeAnalytical = (
  totalHealth: number,
  attackValue: number,
  armorEff: number,
  dodgeEff: number,
  precisionTotal: number,
  critChance: number,
  critDmg: number,
): AnalyticalResult => {
  const healthCost = HIT_BASE_HEALTH_COST * (1 - armorEff / 100);
  if (healthCost <= 0) return { expectedDamage: Infinity, expectedHits: Infinity };

  const maxNonDodged = Math.floor(totalHealth / healthCost);
  if (maxNonDodged <= 0) return { expectedDamage: 0, expectedHits: 0 };

  const dodgeFrac = Math.min(dodgeEff, 99) / 100;
  const expectedHits = maxNonDodged / (1 - dodgeFrac);

  const precFrac = Math.min(precisionTotal, 100) / 100;
  const critFrac = Math.min(critChance, 100) / 100;
  const critMult = 1 + critDmg / 100;

  const dmgPerHit = attackValue * (
    precFrac * (critFrac * critMult + (1 - critFrac))
    + (1 - precFrac) * MISS_DAMAGE_MULTIPLIER
  );

  return { expectedDamage: expectedHits * dmgPerHit, expectedHits };
};

// ─── Exhaustive skill enumeration ──────────────────────────────────

export interface WeaponSetup {
  weaponAttack: number;
  weaponCritChance: number;
}

export interface EquipSetup {
  helmetCritDmg: number;
  chestArmor: number;
  glovesPrecision: number;
  pantsArmor: number;
  bootsDodge: number;
}

export interface SearchConfig {
  budget: number;
  weaponSetups: { name: string; stats: WeaponSetup }[];
  foodTypes: (string | null)[];
  equipStats: EquipSetup;
  topN: number;
}

export interface SkillSearchResult {
  weaponName: string;
  food: string | null;
  allocations: { skills: SkillAllocation; expectedDamage: number }[];
}

export function exhaustiveSkillSearch(
  config: SearchConfig,
  onProgress?: (completedSetups: number, totalSetups: number) => void,
): SkillSearchResult[] {
  const { budget, weaponSetups, foodTypes, equipStats, topN } = config;
  const maxLevels = WAR_SKILLS.map(s => SKILL_PROGRESSION[s].maxLevel);
  const skillCosts = Array.from({ length: 11 }, (_, i) => skillLevelToCumulativeCost(i));

  const results: SkillSearchResult[] = [];
  const totalSetups = weaponSetups.length * foodTypes.length;
  let completedSetups = 0;

  for (const weapon of weaponSetups) {
    for (const food of foodTypes) {
      const foodMult = food ? (FOOD_MULTIPLIERS[food] ?? 0) : 0;
      const top: { skills: SkillAllocation; expectedDamage: number }[] = [];
      let minTopDamage = 0;

      const levels = new Int8Array(8);

      const enumerate = (idx: number, remaining: number) => {
        if (idx === 8) {
          const attackSkill = SKILL_PROGRESSION.attack.base + levels[0] * SKILL_PROGRESSION.attack.inc;
          const healthSkill = SKILL_PROGRESSION.health.base + levels[1] * SKILL_PROGRESSION.health.inc;
          const hungerSkill = SKILL_PROGRESSION.hunger.base + levels[2] * SKILL_PROGRESSION.hunger.inc;
          const precSkill = SKILL_PROGRESSION.precision.base + levels[3] * SKILL_PROGRESSION.precision.inc;
          const critCSkill = SKILL_PROGRESSION.criticalChance.base + levels[4] * SKILL_PROGRESSION.criticalChance.inc;
          const critDSkill = SKILL_PROGRESSION.criticalDamages.base + levels[5] * SKILL_PROGRESSION.criticalDamages.inc;
          const armorSkill = SKILL_PROGRESSION.armor.base + levels[6] * SKILL_PROGRESSION.armor.inc;
          const dodgeSkill = SKILL_PROGRESSION.dodge.base + levels[7] * SKILL_PROGRESSION.dodge.inc;

          const totalAttack = effectiveTotalDamage(attackSkill, weapon.stats.weaponAttack, 0, 0);
          const precision = precSkill + equipStats.glovesPrecision;
          const critChance = critCSkill + weapon.stats.weaponCritChance;
          const critDmg = critDSkill + equipStats.helmetCritDmg;
          const armorRaw = armorSkill + equipStats.chestArmor + equipStats.pantsArmor;
          const dodgeRaw = dodgeSkill + equipStats.bootsDodge;

          const healthRestored = foodMult > 0 ? Math.floor(healthSkill * foodMult * hungerSkill) : 0;
          const totalHealth = healthSkill + healthRestored;

          const { expectedDamage } = computeAnalytical(
            totalHealth, totalAttack,
            effectivePercentageValue(armorRaw),
            effectivePercentageValue(dodgeRaw),
            precision, critChance, critDmg,
          );

          if (expectedDamage > minTopDamage || top.length < topN) {
            const skills: SkillAllocation = {
              attack: levels[0], health: levels[1], hunger: levels[2],
              precision: levels[3], criticalChance: levels[4], criticalDamages: levels[5],
              armor: levels[6], dodge: levels[7],
            };
            top.push({ skills, expectedDamage });
            if (top.length > topN * 2) {
              top.sort((a, b) => b.expectedDamage - a.expectedDamage);
              top.length = topN;
              minTopDamage = top[top.length - 1].expectedDamage;
            }
          }
          return;
        }

        const max = maxLevels[idx];
        for (let lvl = 0; lvl <= max; lvl++) {
          const cost = skillCosts[lvl];
          if (cost > remaining) break;
          levels[idx] = lvl;
          enumerate(idx + 1, remaining - cost);
        }
        levels[idx] = 0;
      };

      enumerate(0, budget);

      top.sort((a, b) => b.expectedDamage - a.expectedDamage);
      results.push({
        weaponName: weapon.name,
        food,
        allocations: top.slice(0, topN),
      });

      completedSetups++;
      if (onProgress) onProgress(completedSetups, totalSetups);
    }
  }

  return results;
}

// ─── Monte Carlo simulation for verification ───────────────────────

export interface CandidateBuild {
  weapon: string;
  ammo: string | null;
  armorTier: number[];
  food: string | null;
  pill: string;
  skills: SkillAllocation;
}

export interface VerifiedBuild extends CandidateBuild {
  avgDamage: number;
  avgCostPer1k: number;
  avgNetCost: number;
  avgHits: number;
}

export interface LandscapePoint {
  damage: number;
  costPer1k: number;
  netCost: number;
  hits: number;
  weapon: string;
  ammo: string | null;
  food: string | null;
  pill: string;
  tier: number;
  pickCode?: string;
}

export interface TaggedBuild extends VerifiedBuild {
  shortCode: string;
  label: string;
  description: string;
  targetMiss?: boolean;
}

export interface OptimizerResult {
  builds: TaggedBuild[];
  stats: { uniqueSkills: number; viableBuilds: number; mcVerified: number };
  landscape: LandscapePoint[];
  pareto: LandscapePoint[];
}

function getEquipStatsMid(code: string, gameConfig: any): Record<string, number> {
  const rawStats = gameConfig?.equipments?.find((e: any) => e.code === code)?.dynamicStats;
  if (!rawStats) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawStats)) {
    out[k] = Array.isArray(v) ? Math.ceil(((v as number[])[0] + (v as number[])[1]) / 2) : v as number;
  }
  return out;
}

function calculateBuildCost(
  build: CandidateBuild, totalHits: number, dodgedHits: number,
  gameConfig: any, livePrices: any, equipPrices: any, hungerPoints: number,
): number {
  let totalCost = 0;
  if (build.pill === "buff") totalCost += livePrices?.prices?.cocain ?? 0;
  if (build.food) totalCost += (livePrices?.prices?.[build.food] ?? 0) * hungerPoints;
  if (build.ammo) totalCost += (livePrices?.prices?.[build.ammo] ?? 0) * totalHits;

  const otherHits = totalHits - dodgedHits;
  const slots = [
    { name: "weapon", code: build.weapon, hits: totalHits },
    { name: "helmet", code: `helmet${build.armorTier[0]}`, hits: otherHits },
    { name: "chest", code: `chest${build.armorTier[1]}`, hits: otherHits },
    { name: "gloves", code: `gloves${build.armorTier[2]}`, hits: otherHits },
    { name: "pants", code: `pants${build.armorTier[3]}`, hits: otherHits },
    { name: "boots", code: `boots${build.armorTier[4]}`, hits: otherHits },
  ];

  let scrapReceived = 0;
  for (const s of slots) {
    if (s.hits > 0) totalCost += Math.ceil(s.hits / 100) * (equipPrices?.[s.code] ?? 0);
    const itemsBroken = Math.floor(s.hits / 100);
    if (itemsBroken > 0) {
      const equip = gameConfig?.equipments?.find((e: any) => e.code === s.code);
      if (equip?.rarity) {
        scrapReceived += itemsBroken * Math.round((RARITY_COSTS[equip.rarity]?.scraps ?? 0) / 3);
      }
    }
  }
  totalCost -= scrapReceived * (livePrices?.prices?.scraps ?? 0);
  return totalCost;
}

// ─── Full optimization pipeline ────────────────────────────────────

export interface OptimizeConfig {
  budget: number;
  targetMode: "damage" | "budget" | "costPer1k" | null;
  targetValue: number | null;
  gameConfig: any;
  livePrices: any;
  equipPrices: any;
}

const WEAPONS = ["knife", "gun", "rifle", "sniper", "tank", "jet"] as const;
const AMMO_TYPES = ["lightAmmo", "ammo", "heavyAmmo"] as const;
const FOOD_TYPES = [null, "bread", "steak", "cookedFish"] as const;
const PILL_STATES = ["no buff", "buff"] as const;
const TIERS = [3, 4, 5, 6] as const;
const MC_RUNS = 20;
const MC_CANDIDATES = 50;
const MAX_LANDSCAPE = 2000;

function tierToCode(slot: string, tier: number): string {
  return `${slot}${tier}`;
}

function sampleArray<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  const result: T[] = [];
  for (let i = 0; i < n; i++) result.push(arr[Math.floor(i * step)]);
  return result;
}

function computeParetoFrontier(points: LandscapePoint[]): LandscapePoint[] {
  const sorted = [...points].sort((a, b) => a.costPer1k - b.costPer1k);
  const frontier: LandscapePoint[] = [];
  let maxDmg = -Infinity;
  for (const p of sorted) {
    if (p.damage > maxDmg) { frontier.push(p); maxDmg = p.damage; }
  }
  return frontier;
}

export function runFullOptimization(
  config: OptimizeConfig,
  onProgress: (phase: string, current: number, total: number) => void,
): OptimizerResult {
  const { budget, targetMode, targetValue, gameConfig, livePrices, equipPrices } = config;

  // Pre-cache all equipment stats
  const statsCache = new Map<string, Record<string, number>>();
  const cached = (code: string): Record<string, number> => {
    let s = statsCache.get(code);
    if (!s) { s = getEquipStatsMid(code, gameConfig); statsCache.set(code, s); }
    return s;
  };

  // Pre-resolve per-tier slot stats
  const helmetCritDmg = TIERS.map(t => cached(tierToCode("helmet", t)).criticalDamages ?? 0);
  const chestArmor = TIERS.map(t => cached(tierToCode("chest", t)).armor ?? 0);
  const glovesPrecision = TIERS.map(t => cached(tierToCode("gloves", t)).precision ?? 0);
  const pantsArmor = TIERS.map(t => cached(tierToCode("pants", t)).armor ?? 0);
  const bootsDodge = TIERS.map(t => cached(tierToCode("boots", t)).dodge ?? 0);

  const weaponCache = WEAPONS.map(w => ({
    name: w as string,
    attack: cached(w).attack ?? 0,
    critChance: cached(w).criticalChance ?? 0,
  }));

  // ─── Phase 1: Exhaustive skill search ──────────────────────────
  onProgress("Phase 1: Searching skill allocations...", 0, 1);

  const weaponSetups = weaponCache.map(w => ({
    name: w.name,
    stats: { weaponAttack: w.attack, weaponCritChance: w.critChance },
  }));

  const midTierEquip = {
    helmetCritDmg: cached("helmet5").criticalDamages ?? 0,
    chestArmor: cached("chest5").armor ?? 0,
    glovesPrecision: cached("gloves5").precision ?? 0,
    pantsArmor: cached("pants5").armor ?? 0,
    bootsDodge: cached("boots5").dodge ?? 0,
  };

  const searchResults = exhaustiveSkillSearch({
    budget,
    weaponSetups,
    foodTypes: [...FOOD_TYPES],
    equipStats: midTierEquip,
    topN: 20,
  }, (done, total) => {
    onProgress(`Phase 1: Searching skills... (${done}/${total} setups)`, done, total);
  });

  const seen = new Set<string>();
  const uniqueSkills: SkillAllocation[] = [];
  for (const wr of searchResults) {
    for (const a of wr.allocations) {
      const key = JSON.stringify(a.skills);
      if (!seen.has(key)) { seen.add(key); uniqueSkills.push(a.skills); }
    }
  }

  // ─── Phase 2: Full equipment sweep with diverse candidate pools ─
  onProgress(`Phase 2: Sweeping ${uniqueSkills.length} skill sets × all equipment...`, 0, uniqueSkills.length);

  type ScoredCandidate = { build: CandidateBuild; expectedDamage: number; expectedHits: number; estimatedCostPer1k: number };

  // Maintain bounded top-N pools for different objectives
  const POOL_SIZE = 25;
  const topByDamage: ScoredCandidate[] = [];
  const topByCost: ScoredCandidate[] = [];
  const topByTarget: ScoredCandidate[] = [];
  let minPoolDamage = 0, maxPoolCostPer1k = Infinity;
  let totalViable = 0;

  // For landscape sampling — reservoir sample as we go
  const landscapeSample: ScoredCandidate[] = [];
  let candidateCount = 0;

  const estimateCostInline = (
    build: CandidateBuild, hits: number,
  ): number => {
    let cost = 0;
    if (build.pill === "buff") cost += livePrices?.prices?.cocain ?? 0;
    if (build.food) {
      const hs = SKILL_PROGRESSION.hunger.base + build.skills.hunger * SKILL_PROGRESSION.hunger.inc;
      cost += (livePrices?.prices?.[build.food] ?? 0) * (build.pill === "buff" ? Math.floor(hs * 1.8) : hs);
    }
    if (build.ammo) cost += (livePrices?.prices?.[build.ammo] ?? 0) * hits;
    cost += Math.ceil(hits / 100) * (equipPrices?.[build.weapon] ?? 0);
    for (let s = 0; s < 5; s++) {
      cost += Math.ceil(hits / 100) * (equipPrices?.[tierToCode(["helmet", "chest", "gloves", "pants", "boots"][s], build.armorTier[s])] ?? 0);
    }
    return cost;
  };

  const insertTopN = (pool: ScoredCandidate[], c: ScoredCandidate, n: number, compare: (a: ScoredCandidate, b: ScoredCandidate) => number) => {
    pool.push(c);
    if (pool.length > n * 2) {
      pool.sort(compare);
      pool.length = n;
    }
  };

  for (let si = 0; si < uniqueSkills.length; si++) {
    const skills = uniqueSkills[si];
    const attackSkill = SKILL_PROGRESSION.attack.base + skills.attack * SKILL_PROGRESSION.attack.inc;
    const precSkill = SKILL_PROGRESSION.precision.base + skills.precision * SKILL_PROGRESSION.precision.inc;
    const critCSkill = SKILL_PROGRESSION.criticalChance.base + skills.criticalChance * SKILL_PROGRESSION.criticalChance.inc;
    const critDSkill = SKILL_PROGRESSION.criticalDamages.base + skills.criticalDamages * SKILL_PROGRESSION.criticalDamages.inc;
    const armorSkill = SKILL_PROGRESSION.armor.base + skills.armor * SKILL_PROGRESSION.armor.inc;
    const dodgeSkill = SKILL_PROGRESSION.dodge.base + skills.dodge * SKILL_PROGRESSION.dodge.inc;
    const baseHealthSkill = SKILL_PROGRESSION.health.base + skills.health * SKILL_PROGRESSION.health.inc;
    const baseHungerSkill = SKILL_PROGRESSION.hunger.base + skills.hunger * SKILL_PROGRESSION.hunger.inc;

    for (const wc of weaponCache) {
      const ammoChoices: (string | null)[] = wc.name === "knife" ? [null] : [...AMMO_TYPES];
      for (const ammo of ammoChoices) {
        const ammoPercent = ammo ? AMMO_PERCENTAGES[ammo as keyof typeof AMMO_PERCENTAGES] || 0 : 0;
        for (const food of FOOD_TYPES) {
          const foodMult = food ? (FOOD_MULTIPLIERS[food] ?? 0) : 0;
          for (const pill of PILL_STATES) {
            const hasBuff = pill === "buff";
            const totalAttack = effectiveTotalDamage(attackSkill, wc.attack, ammoPercent, hasBuff ? 60 : 0);
            const healthSkill = hasBuff ? Math.floor(baseHealthSkill * 1.8) : baseHealthSkill;
            const hungerSkill = hasBuff ? Math.floor(baseHungerSkill * 1.8) : baseHungerSkill;
            const healthRestored = foodMult > 0 ? Math.floor(baseHealthSkill * foodMult * hungerSkill) : 0;
            const totalHealth = healthSkill + healthRestored;
            const critChanceBase = critCSkill + wc.critChance;

            for (let hi = 0; hi < 4; hi++) {
              const cd = critDSkill + helmetCritDmg[hi];
              for (let ci = 0; ci < 4; ci++) {
                const ca1 = chestArmor[ci];
                for (let gi = 0; gi < 4; gi++) {
                  const prec = precSkill + glovesPrecision[gi];
                  for (let pi = 0; pi < 4; pi++) {
                    const ar = armorSkill + ca1 + pantsArmor[pi];
                    const armorEff = effectivePercentageValue(ar);
                    for (let bi = 0; bi < 4; bi++) {
                      const dr = dodgeSkill + bootsDodge[bi];
                      const { expectedDamage, expectedHits } = computeAnalytical(
                        totalHealth, totalAttack, armorEff,
                        effectivePercentageValue(dr),
                        prec, critChanceBase, cd,
                      );
                      if (expectedDamage > 0 && isFinite(expectedDamage)) {
                        totalViable++;
                        const build: CandidateBuild = {
                          weapon: wc.name, ammo,
                          armorTier: [TIERS[hi], TIERS[ci], TIERS[gi], TIERS[pi], TIERS[bi]],
                          food, pill, skills,
                        };
                        const estCost = estimateCostInline(build, expectedHits);
                        const estimatedCostPer1k = expectedDamage > 0 ? estCost / (expectedDamage / 1000) : Infinity;
                        const c: ScoredCandidate = { build, expectedDamage, expectedHits, estimatedCostPer1k };

                        // Top by damage (for BD)
                        if (expectedDamage > minPoolDamage || topByDamage.length < POOL_SIZE) {
                          insertTopN(topByDamage, c, POOL_SIZE, (a, b) => b.expectedDamage - a.expectedDamage);
                          minPoolDamage = topByDamage.length >= POOL_SIZE ? topByDamage[topByDamage.length - 1].expectedDamage : 0;
                        }

                        // Top by cost efficiency (for BC)
                        if (isFinite(estimatedCostPer1k) && estimatedCostPer1k > 0) {
                          if (estimatedCostPer1k < maxPoolCostPer1k || topByCost.length < POOL_SIZE) {
                            insertTopN(topByCost, c, POOL_SIZE, (a, b) => a.estimatedCostPer1k - b.estimatedCostPer1k);
                            maxPoolCostPer1k = topByCost.length >= POOL_SIZE ? topByCost[topByCost.length - 1].estimatedCostPer1k : Infinity;
                          }
                        }

                        // Top by target criteria (for BT)
                        if (targetMode && targetValue && targetValue > 0) {
                          if (targetMode === "damage" && expectedDamage >= targetValue) {
                            insertTopN(topByTarget, c, POOL_SIZE, (a, b) => a.estimatedCostPer1k - b.estimatedCostPer1k);
                          } else if (targetMode === "budget" && estCost <= targetValue) {
                            insertTopN(topByTarget, c, POOL_SIZE, (a, b) => b.expectedDamage - a.expectedDamage);
                          } else if (targetMode === "costPer1k" && estimatedCostPer1k <= targetValue) {
                            insertTopN(topByTarget, c, POOL_SIZE, (a, b) => b.expectedDamage - a.expectedDamage);
                          }
                        }

                        // Reservoir sampling for landscape
                        candidateCount++;
                        if (landscapeSample.length < MAX_LANDSCAPE) {
                          landscapeSample.push(c);
                        } else {
                          const j = Math.floor(Math.random() * candidateCount);
                          if (j < MAX_LANDSCAPE) landscapeSample[j] = c;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    onProgress(`Phase 2: ${si + 1}/${uniqueSkills.length} skill sets — ${totalViable.toLocaleString()} viable`, si + 1, uniqueSkills.length);
  }

  // ─── Phase 3: Monte Carlo verification on diverse pool ─────────
  // Merge pools and deduplicate
  const mcPool = new Map<string, ScoredCandidate>();
  const buildKey = (b: CandidateBuild) => `${b.weapon}|${b.ammo}|${b.armorTier}|${b.food}|${b.pill}|${JSON.stringify(b.skills)}`;

  for (const c of topByDamage) mcPool.set(buildKey(c.build), c);
  for (const c of topByCost) mcPool.set(buildKey(c.build), c);
  for (const c of topByTarget) mcPool.set(buildKey(c.build), c);

  const mcCandidates = [...mcPool.values()];
  onProgress(`Phase 3: Verifying ${mcCandidates.length} diverse builds (${MC_RUNS} sims each)...`, 0, mcCandidates.length);

  const mcVerify = (build: CandidateBuild): VerifiedBuild => {
    const wStats = cached(build.weapon);
    const hStats = cached(tierToCode("helmet", build.armorTier[0]));
    const cStats = cached(tierToCode("chest", build.armorTier[1]));
    const gStats = cached(tierToCode("gloves", build.armorTier[2]));
    const pStats = cached(tierToCode("pants", build.armorTier[3]));
    const bStats = cached(tierToCode("boots", build.armorTier[4]));

    const ammoPercent = build.ammo ? AMMO_PERCENTAGES[build.ammo as keyof typeof AMMO_PERCENTAGES] || 0 : 0;
    const attackSkill = SKILL_PROGRESSION.attack.base + build.skills.attack * SKILL_PROGRESSION.attack.inc;
    const hasBuff = build.pill === "buff";
    const totalAttack = effectiveTotalDamage(attackSkill, wStats.attack ?? 0, ammoPercent, hasBuff ? 60 : 0);

    const precisionTotal = SKILL_PROGRESSION.precision.base + build.skills.precision * SKILL_PROGRESSION.precision.inc + (gStats.precision ?? 0);
    const critChanceTotal = SKILL_PROGRESSION.criticalChance.base + build.skills.criticalChance * SKILL_PROGRESSION.criticalChance.inc + (wStats.criticalChance ?? 0);
    const critDmgTotal = SKILL_PROGRESSION.criticalDamages.base + build.skills.criticalDamages * SKILL_PROGRESSION.criticalDamages.inc + (hStats.criticalDamages ?? 0);
    const armorTotal = SKILL_PROGRESSION.armor.base + build.skills.armor * SKILL_PROGRESSION.armor.inc + (cStats.armor ?? 0) + (pStats.armor ?? 0);
    const dodgeTotal = SKILL_PROGRESSION.dodge.base + build.skills.dodge * SKILL_PROGRESSION.dodge.inc + (bStats.dodge ?? 0);

    const baseHealth = SKILL_PROGRESSION.health.base + build.skills.health * SKILL_PROGRESSION.health.inc;
    const baseHunger = SKILL_PROGRESSION.hunger.base + build.skills.hunger * SKILL_PROGRESSION.hunger.inc;
    const healthSkill = hasBuff ? Math.floor(baseHealth * 1.8) : baseHealth;
    const hungerSkill = hasBuff ? Math.floor(baseHunger * 1.8) : baseHunger;

    let healthRestored = 0;
    if (build.food) healthRestored = Math.floor(baseHealth * (FOOD_MULTIPLIERS[build.food] || 0) * hungerSkill);

    let totalDamage = 0, totalNetCost = 0, totalHits = 0;
    for (let i = 0; i < MC_RUNS; i++) {
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
      totalNetCost += calculateBuildCost(build, result.totalHits, result.hitBreakdown.dodged, gameConfig, livePrices, equipPrices, hungerSkill);
    }

    const avgDamage = totalDamage / MC_RUNS;
    const avgNetCost = totalNetCost / MC_RUNS;
    const avgHits = totalHits / MC_RUNS;
    return { ...build, avgDamage, avgCostPer1k: avgDamage > 0 ? avgNetCost / (avgDamage / 1000) : Infinity, avgNetCost, avgHits };
  };

  const verified: VerifiedBuild[] = [];
  for (let i = 0; i < mcCandidates.length; i++) {
    const v = mcVerify(mcCandidates[i].build);
    if (v.avgDamage > 0) verified.push(v);
    if ((i + 1) % 5 === 0 || i === mcCandidates.length - 1) {
      onProgress(`Phase 3: Verified ${i + 1}/${mcCandidates.length} builds`, i + 1, mcCandidates.length);
    }
  }

  // ─── Pick winners ──────────────────────────────────────────────
  const fmtCompact = (n: number) =>
    new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

  const builds: TaggedBuild[] = [];

  if (verified.length > 0) {
    // BD: highest damage
    const bd = [...verified].sort((a, b) => b.avgDamage - a.avgDamage)[0];
    builds.push({ ...bd, shortCode: "BD", label: "Best Damage", description: "Maximum total damage output" });

    // BC: lowest cost/1k
    const validCost = verified.filter(r => r.avgCostPer1k < Infinity && r.avgCostPer1k > 0);
    if (validCost.length > 0) {
      const bc = [...validCost].sort((a, b) => a.avgCostPer1k - b.avgCostPer1k)[0];
      builds.push({ ...bc, shortCode: "BC", label: "Best Cost / 1k", description: "Cheapest cost per 1,000 damage" });
    }

    // BO: median between BD and BC — closest to the midpoint of both axes
    if (builds.length >= 2) {
      const bdBuild = builds[0];
      const bcBuild = builds[1];
      const midDamage = (bdBuild.avgDamage + bcBuild.avgDamage) / 2;
      const midCostPer1k = (bdBuild.avgCostPer1k + bcBuild.avgCostPer1k) / 2;
      const bdK = buildKey(bd);
      const bcK = buildKey(bcBuild);
      const dRange = Math.abs(bdBuild.avgDamage - bcBuild.avgDamage) || 1;
      const cRange = Math.abs(bdBuild.avgCostPer1k - bcBuild.avgCostPer1k) || 1;

      const boPool = validCost.filter(r => buildKey(r) !== bdK && buildKey(r) !== bcK);
      if (boPool.length > 0) {
        let best: VerifiedBuild | null = null, bestDist = Infinity;
        for (const e of boPool) {
          const dist = Math.sqrt(
            Math.pow((e.avgDamage - midDamage) / dRange, 2) +
            Math.pow((e.avgCostPer1k - midCostPer1k) / cRange, 2),
          );
          if (dist < bestDist) { bestDist = dist; best = e; }
        }
        if (best) builds.push({ ...best, shortCode: "BO", label: "Best Overall", description: "Median between best damage and best cost" });
      }
    }

    // BT: target-based — always show closest if exact match not found
    if (targetMode && targetValue && targetValue > 0) {
      let bt: VerifiedBuild | null = null, btLabel = "", btDesc = "", miss = false;
      if (targetMode === "damage") {
        const reaching = verified.filter(r => r.avgDamage >= targetValue);
        if (reaching.length > 0) {
          bt = [...reaching].sort((a, b) => a.avgNetCost - b.avgNetCost)[0];
          btLabel = `Target ${fmtCompact(targetValue)}`;
          btDesc = `Cheapest to reach ${fmtCompact(targetValue)} damage`;
        } else {
          bt = [...verified].sort((a, b) => b.avgDamage - a.avgDamage)[0];
          btLabel = `Target ${fmtCompact(targetValue)}`;
          btDesc = `No build reaches ${fmtCompact(targetValue)} — closest at ${fmtCompact(bt.avgDamage)}`;
          miss = true;
        }
      } else if (targetMode === "budget") {
        const affordable = verified.filter(r => r.avgNetCost <= targetValue);
        if (affordable.length > 0) {
          bt = [...affordable].sort((a, b) => b.avgDamage - a.avgDamage)[0];
          btLabel = `Budget ${fmtCompact(targetValue)}`;
          btDesc = `Best damage within ${fmtCompact(targetValue)} budget`;
        } else {
          bt = [...verified].sort((a, b) => a.avgNetCost - b.avgNetCost)[0];
          btLabel = `Budget ${fmtCompact(targetValue)}`;
          btDesc = `No build under budget — cheapest at ${fmtCompact(bt.avgNetCost)}`;
          miss = true;
        }
      } else if (targetMode === "costPer1k") {
        const withinCost = validCost.filter(r => r.avgCostPer1k <= targetValue);
        if (withinCost.length > 0) {
          bt = [...withinCost].sort((a, b) => b.avgDamage - a.avgDamage)[0];
          btLabel = `≤${targetValue.toFixed(1)}/1k`;
          btDesc = `Best damage at ≤${targetValue.toFixed(1)} cost/1k`;
        } else {
          bt = [...validCost].sort((a, b) => a.avgCostPer1k - b.avgCostPer1k)[0];
          btLabel = `≤${targetValue.toFixed(1)}/1k`;
          btDesc = `No build at target — closest at ${bt?.avgCostPer1k.toFixed(1)}/1k`;
          miss = true;
        }
      }
      if (bt) builds.push({ ...bt, shortCode: "BT", label: btLabel, description: btDesc, targetMiss: miss });
    }
  }

  // ─── Landscape for scatter plot ────────────────────────────────
  onProgress("Building landscape...", 0, 1);

  const pickKeySet = new Set(builds.map(b => buildKey(b)));
  const landscape: LandscapePoint[] = landscapeSample
    .map(r => {
      const netCost = estimateCostInline(r.build, r.expectedHits);
      const costPer1k = r.expectedDamage > 0 ? netCost / (r.expectedDamage / 1000) : Infinity;
      return {
        damage: r.expectedDamage,
        costPer1k: isFinite(costPer1k) ? costPer1k : 0,
        netCost,
        hits: r.expectedHits,
        weapon: r.build.weapon,
        ammo: r.build.ammo,
        food: r.build.food,
        pill: r.build.pill,
        tier: r.build.armorTier[0],
        pickCode: undefined as string | undefined,
      };
    })
    .filter(p => p.costPer1k > 0);

  // Add pick builds as explicit landscape points
  for (const b of builds) {
    landscape.push({
      damage: b.avgDamage,
      costPer1k: b.avgCostPer1k,
      netCost: b.avgNetCost,
      hits: b.avgHits,
      weapon: b.weapon,
      ammo: b.ammo,
      food: b.food,
      pill: b.pill,
      tier: b.armorTier[0],
      pickCode: b.shortCode,
    });
  }

  const pareto = computeParetoFrontier(landscape);

  return {
    builds,
    stats: { uniqueSkills: uniqueSkills.length, viableBuilds: totalViable, mcVerified: verified.length },
    landscape,
    pareto,
  };
}
