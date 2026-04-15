import { useState, useEffect, useRef, useCallback } from "react";
import { Play, RotateCcw, Zap, FastForward } from "lucide-react";
import { PUBLIC_IMAGES_BASE_URL } from "./components";
import {
  runFullSimulation,
  type SimulationParams,
  type SimulationResult,
  type HitResult,
  type HitType,
} from "./utils";
import { GameItemIcon } from "@/components/GameItemIcon";

const BATTLE_ICON = `${PUBLIC_IMAGES_BASE_URL}battle.svg`;

const HIT_TYPE_CONFIG: Record<HitType, { label: string; color: string; bg: string; border: string; glow: string }> = {
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
}: BattleSimulationProps) {
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [displayedHits, setDisplayedHits] = useState<HitResult[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [speed, setSpeed] = useState<"normal" | "fast">("normal");
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
            className="sim-hit-log flex flex-col gap-1.5 max-h-80 overflow-y-auto overflow-x-visible p-1 justify-center items-center"
          >
            {displayedHits.map((hit, i) => {
              const config = HIT_TYPE_CONFIG[hit.type];
              const isLatest = i === displayedHits.length - 1;
              return (
                <div
                  key={hit.hitNumber}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-300 w-max min-w-[300px] ${isLatest && isAnimating
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
                  <img src={`${PUBLIC_IMAGES_BASE_URL}${HIT_ICONS[hit.type]}.svg`} className="h-3 w-3 opacity-60" alt="hit" />

                  {/* Damage */}
                  <div className="flex items-center gap-1 min-w-[70px]">
                    <img src={`${PUBLIC_IMAGES_BASE_URL}damage.svg`} className="h-3 w-3 opacity-60" alt="dmg" />
                    <span className={`text-[11px] font-mono font-bold text-[${TYPE_COLORS[hit.type]}]`}>
                      {hit.damageDealt}
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
                  {hit.casesEarned > 0 && (
                    <div className={`flex items-center`}>
                      <GameItemIcon itemCode={hit.casesEarned === 2 ? 'case2' : 'case1'} className="h-5 w-5" />
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

            {/* Hit Breakdown Bar */}
            {/* <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Hit Breakdown</span>
              <div className="flex w-full h-6 rounded-lg overflow-hidden border border-zinc-800">
                {(["normal", "critical", "miss", "dodged"] as HitType[]).map(type => {
                  const count = simulationResult.hitBreakdown[type];
                  if (count === 0) return null;
                  const percent = (count / simulationResult.totalHits) * 100;
                  const colors: Record<HitType, string> = {
                    normal: "bg-zinc-600",
                    critical: "bg-red-500",
                    miss: "bg-amber-500",
                    dodged: "bg-emerald-500",
                  };
                  return (
                    <div
                      key={type}
                      className={`${colors[type]} flex items-center justify-center transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                      title={`${HIT_TYPE_CONFIG[type].label}: ${count} (${percent.toFixed(1)}%)`}
                    >
                      {percent > 8 && (
                        <span className="text-[9px] font-black text-white/90 uppercase tracking-wider">
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {(["normal", "critical", "miss", "dodged"] as HitType[]).map(type => {
                  const count = simulationResult.hitBreakdown[type];
                  if (count === 0) return null;
                  const percent = ((count / simulationResult.totalHits) * 100).toFixed(1);
                  return (
                    <div key={type} className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${type === "normal" ? "bg-zinc-500" :
                        type === "critical" ? "bg-red-500" :
                          type === "miss" ? "bg-amber-500" :
                            "bg-emerald-500"
                        }`} />
                      <span className={`text-[10px] font-bold ${HIT_TYPE_CONFIG[type].color}`}>
                        {HIT_TYPE_CONFIG[type].label}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {count} ({percent}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div> */}

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
