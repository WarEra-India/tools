import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, RotateCcw, Zap, FastForward, ArrowRight } from "lucide-react";
import { PUBLIC_IMAGES_BASE_URL, COIN_ICON, DAMAGE_ICON } from "./components";
import { EQUIPEMENTS, RARITY_COSTS } from "./constants";
import {
  runFullSimulation,
  type SimulationParams,
  type SimulationResult,
  type HitResult,
  type HitType,
} from "./utils";
import { GameItemIcon } from "@/components/GameItemIcon";

const BATTLE_ICON = `${PUBLIC_IMAGES_BASE_URL}battle.svg`;

const HIT_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; glow: string }> = {
  dodged: {
    label: "DODGE",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.3)]",
  },
  miss: {
    label: "MISS",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
  },
  normal: {
    label: "HIT",
    color: "text-zinc-300",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/30",
    glow: "",
  },
  critical: {
    label: "CRIT",
    color: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/40",
    glow: "shadow-[0_0_16px_rgba(239,68,68,0.4)]",
  },
};

const ANIMATION_SPEEDS = {
  normal: 150,
  fast: 40,
};

interface BattleSimulationProps {
  attackData: { total: number };
  effectiveStats: {
    precision: { total: number };
    criticalChance: { total: number };
    criticalDamages: { total: number };
    armor: { effective: number };
    dodge: { effective: number };
    health: { skill: number };
    lootChance: { skill: number };
  };
  healthRestored: number;
  simEquipment?: any;
  gameConfig?: any;
  livePrices?: any;
  equipPrices?: any;
  totalHungerPoints?: number;
}

const HIT_ICONS = {
  dodged: "dodge",
  miss: "miss",
  normal: "attack",
  critical: "criticalChance",
};

const TYPE_COLORS = {
  dodged: "#E7B098",
  miss: "#BBC8D0",
  normal: "#E7B098",
  critical: "#E69494",
}

export default function BattleSimulation({
  attackData,
  effectiveStats,
  healthRestored,
  simEquipment,
  gameConfig,
  livePrices,
  equipPrices,
  totalHungerPoints = 0,
}: BattleSimulationProps) {
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [displayedHits, setDisplayedHits] = useState<HitResult[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [speed, setSpeed] = useState<"normal" | "fast">("fast");
  const hitLogRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const totalHealth = effectiveStats.health.skill + healthRestored;

  const cleanupAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const costsIncurred = useMemo(() => {
    if (!animationComplete || !simulationResult || !simEquipment) return null;

    const weaponHits = simulationResult.totalHits;
    const ammoUsed = simulationResult.totalHits;
    const otherHits = simulationResult.totalHits - simulationResult.hitBreakdown.dodged;

    let totalCost = 0;
    let scrapReceived = 0;

    // Pills
    const pillPrice = simEquipment.modifier === 'buff' ? (livePrices?.prices?.cocain ?? 0) : 0;
    totalCost += pillPrice;

    // Food
    const foodPrice = simEquipment.food ? (livePrices?.prices?.[simEquipment.food] ?? 0) * totalHungerPoints : 0;
    totalCost += foodPrice;

    // Ammo
    if (simEquipment.ammo) {
      const ammoPrice = livePrices?.prices?.[simEquipment.ammo] ?? 0;
      totalCost += ammoPrice * ammoUsed;
    }

    const itemsSummary: { code: string; label: string; used: number; broken: number; price: number; scraps: number; remainingHealth: number }[] = [];

    // Equipment
    EQUIPEMENTS.forEach(slot => {
      if (slot === 'ammo') return;
      const code = simEquipment[slot];
      if (!code) return;

      const hits = slot === 'weapon' ? weaponHits : otherHits;

      const itemsUsed = Math.ceil(hits / 100);
      const itemsBroken = Math.floor(hits / 100);
      const price = equipPrices?.[code] ?? 0;

      const remainingHealth = hits === 0 ? 100 : (hits % 100 === 0 ? 0 : 100 - (hits % 100));

      if (hits > 0) {
        totalCost += itemsUsed * price;
      }

      const equip = gameConfig?.equipments?.find((e: any) => e.code === code);
      let yieldScraps = 0;
      if (equip?.rarity && itemsBroken > 0) {
        yieldScraps = (RARITY_COSTS[equip.rarity]?.scraps ?? 0) / 3;
        scrapReceived += itemsBroken * yieldScraps;
      }

      itemsSummary.push({
        code,
        label: slot,
        used: itemsUsed,
        broken: itemsBroken,
        price,
        scraps: yieldScraps * itemsBroken,
        remainingHealth
      });
    });

    const scrapPrice = livePrices?.prices?.scraps ?? 0;
    const scrapValue = scrapReceived * scrapPrice;

    const case1Yield = simulationResult.case1Count;
    const case2Yield = simulationResult.case2Count;
    const case1Price = livePrices?.prices?.case1 ?? 0;
    const case2Price = livePrices?.prices?.case2 ?? 0;
    const case1Value = case1Yield * case1Price;
    const case2Value = case2Yield * case2Price;

    const totalReturnsValue = scrapValue + case1Value + case2Value;
    const netCost = totalCost - totalReturnsValue;
    const costPer1kDamage = simulationResult.totalDamageDealt > 0 ? (netCost / (simulationResult.totalDamageDealt / 1000)) : 0;

    return {
      weaponHits,
      otherHits,
      pillPrice,
      foodPrice,
      ammoUsed,
      itemsSummary,
      totalCost,
      scrapReceived,
      scrapValue,
      case1Yield,
      case2Yield,
      case1Value,
      case2Value,
      totalReturnsValue,
      netCost,
      scrapPrice,
      costPer1kDamage,
    };
  }, [animationComplete, simulationResult, simEquipment, gameConfig, livePrices, equipPrices, totalHungerPoints]);

  useEffect(() => {
    return cleanupAnimation;
  }, [cleanupAnimation]);

  // Auto-scroll hit log to bottom
  useEffect(() => {
    if (hitLogRef.current) {
      hitLogRef.current.scrollTop = hitLogRef.current.scrollHeight;
    }
  }, [displayedHits]);

  const startSimulation = useCallback(() => {
    cleanupAnimation();
    cancelledRef.current = false;

    const params: SimulationParams = {
      totalHealth,
      attackValue: attackData.total,
      armorEffective: effectiveStats.armor.effective,
      dodgeEffective: effectiveStats.dodge.effective,
      precisionTotal: effectiveStats.precision.total,
      criticalChance: effectiveStats.criticalChance.total,
      criticalDamages: effectiveStats.criticalDamages.total,
      lootChance: effectiveStats.lootChance.skill,
    };

    const result = runFullSimulation(params);
    setSimulationResult(result);
    setDisplayedHits([]);
    setIsAnimating(true);
    setAnimationComplete(false);

    // Animate hits one by one
    let index = 0;
    const animateNext = () => {
      if (cancelledRef.current || index >= result.hits.length) {
        setIsAnimating(false);
        setAnimationComplete(true);
        return;
      }
      const hit = result.hits[index];
      index++;
      setDisplayedHits(prev => [...prev, hit]);
      animationRef.current = window.setTimeout(animateNext, ANIMATION_SPEEDS[speed]);
    };

    animationRef.current = window.setTimeout(animateNext, 300);
  }, [totalHealth, attackData, effectiveStats, speed, cleanupAnimation]);

  const skipAnimation = useCallback(() => {
    if (!simulationResult) return;
    cancelledRef.current = true;
    cleanupAnimation();
    setDisplayedHits(simulationResult.hits);
    setIsAnimating(false);
    setAnimationComplete(true);
  }, [simulationResult, cleanupAnimation]);

  const resetSimulation = useCallback(() => {
    cancelledRef.current = true;
    cleanupAnimation();
    setSimulationResult(null);
    setDisplayedHits([]);
    setIsAnimating(false);
    setAnimationComplete(false);
  }, [cleanupAnimation]);

  const lastHit = displayedHits.length > 0 ? displayedHits[displayedHits.length - 1] : null;
  const healthPercent = lastHit ? (lastHit.healthRemaining / totalHealth) * 100 : 100;
  const currentHealth = lastHit ? lastHit.healthRemaining : totalHealth;

  return (
    <div className="w-full mt-6 bg-black/30 rounded-3xl p-8 border border-zinc-500/10 shadow-[inset_0_0_80px_rgba(0,0,0,0.5)]">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-inner">
              <Zap className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Battle Simulation</h2>
              <p className="text-[11px] text-zinc-500 font-medium">Simulate combat hit-by-hit with your current loadout</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed toggle */}
            {!animationComplete && (
              <button
                onClick={() => setSpeed(s => s === "normal" ? "fast" : "normal")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${speed === "fast"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800"
                  }`}
              >
                <FastForward className="h-3.5 w-3.5" />
                {speed === "fast" ? "Fast" : "Normal"}
              </button>
            )}

            {/* Skip / Re-simulate / Simulate button */}
            {isAnimating ? (
              <button
                onClick={skipAnimation}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all border border-zinc-700/50"
              >
                <FastForward className="h-4 w-4" />
                Skip
              </button>
            ) : simulationResult ? (
              <button
                onClick={resetSimulation}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all border border-zinc-700/50"
              >
                <RotateCcw className="h-4 w-4" />
                Re-simulate
              </button>
            ) : null}

            {!isAnimating && (
              <button
                onClick={startSimulation}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-current" />
                Simulate
              </button>
            )}
          </div>
        </div>

        {/* Health Bar */}
        {(isAnimating || animationComplete) && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={`${PUBLIC_IMAGES_BASE_URL}health.svg`} className="h-4 w-4 opacity-80" alt="health" />
                <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">Health</span>
              </div>
              <span className="text-sm font-mono font-bold text-zinc-300">
                {currentHealth.toFixed(1)} <span className="text-zinc-600">/ {totalHealth}</span>
              </span>
            </div>
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${Math.max(0, healthPercent)}%`,
                  background: healthPercent > 50
                    ? "linear-gradient(90deg, #22c55e, #16a34a)"
                    : healthPercent > 25
                      ? "linear-gradient(90deg, #eab308, #f59e0b)"
                      : "linear-gradient(90deg, #ef4444, #dc2626)",
                }}
              />
            </div>
          </div>
        )}

        {/* Hit Log */}
        {displayedHits.length > 0 && (
          <div
            ref={hitLogRef}
            className="sim-hit-log flex flex-col gap-1.5 max-h-80 overflow-y-auto overflow-x-visible p-1 items-center"
          >
            {displayedHits.map((hit, i) => {
              const hitTypeForGlow = hit.isDodged ? "dodged" : hit.type;
              const config = HIT_TYPE_CONFIG[hitTypeForGlow];
              const isLatest = i === displayedHits.length - 1;
              return (
                <div
                  key={hit.hitNumber}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-300 w-max min-w-[22rem] ${isLatest && isAnimating
                    ? `${config.bg} ${config.border} ${config.glow}`
                    : "bg-zinc-900/30 border-zinc-800/30"
                    }`}
                >
                  {/* Hit number */}
                  <span className="text-[10px] font-mono font-bold text-zinc-600 w-8 text-right shrink-0">
                    #{hit.hitNumber}
                  </span>

                  {/* Hit type badge */}
                  {/* <span className={`text-[10px] font-black uppercase tracking-wider w-12 ${config.color}`}>
                    {config.label}
                  </span> */}

                  {/* Hit Icon */}
                  <div className="flex items-center gap-2 min-w-[50px]">
                    <img src={`${PUBLIC_IMAGES_BASE_URL}${HIT_ICONS[hit.type]}.svg`} className="h-3 w-3 opacity-60" alt="hit" />
                    {hit.isDodged && (
                      <img src={`${PUBLIC_IMAGES_BASE_URL}dodge.svg`} className="h-3 w-3 opacity-70" alt="dodge" />
                    )}
                  </div>

                  {/* Damage */}
                  <div className="flex items-center gap-1 min-w-[70px]">
                    <img src={`${PUBLIC_IMAGES_BASE_URL}damage.svg`} className="h-3 w-3 opacity-60" alt="dmg" />
                    <span className={`text-[11px] font-mono font-bold text-[${TYPE_COLORS[hit.type]}] ${hit.type == "miss" ? "opacity-50" : ""}`}>
                      {hit.damageDealt.toLocaleString()}
                    </span>
                  </div>

                  {/* Health used */}
                  <div className="flex items-center gap-1 min-w-[60px]">
                    {hit.healthUsed > 0 && (
                      <>
                        <img src={`${PUBLIC_IMAGES_BASE_URL}health.svg`} className="h-3 w-3 opacity-50" alt="hp" />
                        <span className={`text-[11px] font-mono font-bold text-[#DE6F6F]`}>
                          -{hit.healthUsed.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Loot */}
                  {hit.casesEarned.length > 0 && (
                    <div className={`flex items-center gap-2`}>
                      {hit.casesEarned.map(c => (
                        <GameItemIcon key={c} itemCode={c === 2 ? 'case2' : 'case1'} className="h-5 w-5" />
                      ))}
                    </div>
                  )}

                  {/* Remaining health */}
                  {/* <div className={`flex ml-auto`}>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {hit.healthRemaining.toFixed(1)} HP
                    </span>
                  </div> */}

                </div>
              );
            })}
          </div>
        )}

        {/* Summary Panel — shown when simulation is complete */}
        {animationComplete && simulationResult && (
          <div className="mt-2 p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
            {/* Big Numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Total Hits */}
              <div className="flex flex-col items-center gap-1 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/40">
                <img src={BATTLE_ICON} className="h-5 w-5 opacity-60 mb-1" alt="hits" />
                <span className="text-3xl font-black text-white font-mono leading-none">
                  {simulationResult.totalHits}
                </span>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Hits</span>
              </div>

              {/* Total Damage */}
              <div className="flex flex-col items-center gap-1 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/40">
                <img src={`${PUBLIC_IMAGES_BASE_URL}damage.svg`} className="h-5 w-5 opacity-60 mb-1" alt="damage" />
                <span className="text-3xl font-black text-[#E69494] font-mono leading-none">
                  {simulationResult.totalDamageDealt.toLocaleString()}
                </span>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Damage</span>
              </div>

              {/* Case 1 */}
              <div className="flex flex-col items-center gap-1 p-4 bg-zinc-950/50 rounded-xl border border-yellow-500/10">
                <GameItemIcon itemCode="case1" className="h-7 w-7" />
                <span className="text-3xl font-black text-white font-mono leading-none">
                  {simulationResult.case1Count}
                </span>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Case</span>
              </div>

              {/* Case 2 */}
              <div className="flex flex-col items-center gap-1 p-4 bg-zinc-950/50 rounded-xl border border-purple-500/10">
                <GameItemIcon itemCode="case2" className="h-7 w-7" />
                <span className="text-3xl font-black text-white font-mono leading-none">
                  {simulationResult.case2Count}
                </span>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Elite Case</span>
              </div>
            </div>

          </div>
        )}

        {/* Cost Summary Array */}
        {animationComplete && simulationResult && costsIncurred && (
          <div className="flex flex-col gap-4 p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">

            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Incurred Costs & Returns</h3>
              <div className={`flex items-center gap-1.5`}>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-zinc-900/50 border-zinc-800/50 text-zinc-400`}>
                    <img src={COIN_ICON} className="h-3 w-3 opacity-70" alt="coin" />
                    <span className="text-xs font-mono font-bold">{costsIncurred.costPer1kDamage.toFixed(2)}</span>
                    <span className="text-xs font-mono font-bold">/ 1k</span>
                    <img src={DAMAGE_ICON} className="h-3 w-3 opacity-70" alt="dmg" />
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-zinc-900/50 border-zinc-800/50 text-zinc-400`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{costsIncurred.netCost > 0 ? "Net Cost" : "Net Profit"}</span>
                    <img src={COIN_ICON} className="h-3 w-3" alt="coin" />
                    <span className="text-xs font-mono font-bold">{Math.abs(costsIncurred.netCost).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-8">
              {/* Costs Side */}
              <div className="flex flex-col gap-2 bg-zinc-900/50 p-4 rounded-lg min-w-[350px]">
                {costsIncurred.pillPrice > 0 && (
                  <div className="flex items-center justify-between text-sm gap-4">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-zinc-300">1x</span>
                      <GameItemIcon itemCode="cocain" className="h-4 w-4 rounded-sm" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono text-zinc-300 min-w-16 justify-end">
                        {costsIncurred.pillPrice.toFixed(2)}
                        <img src={COIN_ICON} className="h-3 w-3 opacity-70" alt="coin" />
                      </span>
                    </div>
                  </div>
                )}
                {costsIncurred.foodPrice > 0 && (
                  <div className="flex items-center justify-between text-sm gap-4">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-zinc-300">{totalHungerPoints}x</span>
                      <GameItemIcon itemCode={simEquipment.food} className="h-4 w-4 rounded-sm" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono text-zinc-300 min-w-16 justify-end">
                        {costsIncurred.foodPrice.toFixed(2)}
                        <img src={COIN_ICON} className="h-3 w-3 opacity-70" alt="coin" />
                      </span>
                    </div>
                  </div>
                )}
                {simEquipment?.ammo && costsIncurred.ammoUsed > 0 && (
                  <div className="flex items-center justify-between text-sm gap-4">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-zinc-300">{costsIncurred.ammoUsed}x</span>
                      <GameItemIcon itemCode={simEquipment.ammo} className="h-4 w-4 rounded-sm" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono text-zinc-300 min-w-16 justify-end">
                        {((livePrices?.prices?.[simEquipment.ammo] ?? 0) * costsIncurred.ammoUsed).toFixed(2)}
                        <img src={COIN_ICON} className="h-3 w-3 opacity-70" alt="coin" />
                      </span>
                    </div>
                  </div>
                )}
                {costsIncurred.itemsSummary.map(item => item.used > 0 ? (
                  <div key={item.code} className="flex items-center justify-between text-sm gap-4">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-zinc-300">{item.used}x</span>
                      <GameItemIcon itemCode={item.code} className="h-4 w-4 rounded-sm" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono text-zinc-300 min-w-16 justify-end">
                        {(item.price * item.used).toFixed(2)}
                        <img src={COIN_ICON} className="h-3 w-3 opacity-70" alt="coin" />
                      </span>
                    </div>
                  </div>
                ) : null)}
                <div className="border-t border-zinc-800/50 pt-2 mt-1 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Est. Cost</span>
                  <span className="flex items-center gap-1 font-mono font-bold text-red-400 ml-4">
                    {costsIncurred.totalCost.toFixed(2)}
                    <img src={COIN_ICON} className="h-3.5 w-3.5" alt="coin" />
                  </span>
                </div>
              </div>

              {/* Returns / Scraps Side */}
              <div className="flex flex-col gap-2 bg-zinc-900/50 p-4 rounded-lg min-w-[350px]">
                {costsIncurred.itemsSummary.map(item => item.broken > 0 ? (
                  <div key={item.code + "-broke"} className="flex items-center justify-between text-sm gap-4">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-zinc-300">{item.broken}x</span>
                      <GameItemIcon itemCode={item.code} className="h-4 w-4 rounded-sm" />
                      <ArrowRight className="h-4 w-6" />
                      <span className="font-mono text-zinc-300">{item.scraps}x</span>
                      <GameItemIcon itemCode="scraps" className="h-4 w-4 rounded-sm" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-16 justify-end">
                        <span className="font-mono text-zinc-300">{(item.scraps * livePrices?.prices["scraps"]).toFixed(2)}</span>
                        <img src={COIN_ICON} className="h-3 w-3 opacity-70" alt="coin" />
                      </div>
                    </div>
                  </div>
                ) : null)}
                {costsIncurred.case1Yield > 0 && (
                  <div className="flex items-center justify-between text-sm gap-4">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-zinc-300">{costsIncurred.case1Yield}x</span>
                      <GameItemIcon itemCode="case1" className="h-4 w-4 rounded-sm" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono text-zinc-300 min-w-16 justify-end">
                        {(costsIncurred.case1Value).toFixed(2)}
                        <img src={COIN_ICON} className="h-3 w-3 opacity-70" alt="coin" />
                      </span>
                    </div>
                  </div>
                )}
                {costsIncurred.case2Yield > 0 && (
                  <div className="flex items-center justify-between text-sm gap-4">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-zinc-300">{costsIncurred.case2Yield}x</span>
                      <GameItemIcon itemCode="case2" className="h-4 w-4 rounded-sm" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono text-zinc-300 min-w-16 justify-end">
                        {(costsIncurred.case2Value).toFixed(2)}
                        <img src={COIN_ICON} className="h-3 w-3 opacity-70" alt="coin" />
                      </span>
                    </div>
                  </div>
                )}
                {costsIncurred.scrapReceived === 0 && costsIncurred.case1Yield === 0 && costsIncurred.case2Yield === 0 && (
                  <div className="flex items-center justify-center h-full opacity-40">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">No Returns Generated</span>
                  </div>
                )}
                {(costsIncurred.scrapReceived > 0 || costsIncurred.case1Yield > 0 || costsIncurred.case2Yield > 0) && (
                  <div className="border-t border-zinc-800/50 pt-2 mt-auto flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Est. Yield</span>
                    <span className="flex items-center gap-1 font-mono font-bold text-emerald-400 ml-4">
                      {costsIncurred.totalReturnsValue.toFixed(2)}
                      <img src={COIN_ICON} className="h-3.5 w-3.5" alt="coin" />
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Remaining Health Section */}
            <div className="flex flex-col gap-3 mt-2 pt-5 border-t border-zinc-800/50">
              {/* <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Remaining Equipment Health</span> */}
              <div className="flex justify-center items-center flex-wrap gap-3">
                {costsIncurred.itemsSummary.map(item => (
                  <div key={item.code + "-health"} className="flex flex-col gap-1.5 items-center justify-center py-2 px-3 bg-zinc-950 rounded-xl border border-zinc-800 shadow-inner">
                    <GameItemIcon itemCode={item.code} className="h-7 w-7 rounded-md opacity-90 shadow-md" />
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-mono font-bold text-zinc-300 leading-none">{item.remainingHealth}%</span>
                      <div className="w-12 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${item.remainingHealth}%`,
                            background: item.remainingHealth > 50
                              ? "#22c55e"
                              : item.remainingHealth > 25
                                ? "#eab308"
                                : "#ef4444"
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Empty state */}
        {!simulationResult && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-40">
            <Zap className="h-10 w-10 text-zinc-600" />
            <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">
              Configure your loadout and hit Simulate
            </p>
          </div>
        )}
      </div>
    </div >
  );
}
