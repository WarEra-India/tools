import { useState, useCallback, useRef, useMemo } from "react";
import { Hammer, Loader2, Target, Zap, Download, ScatterChart as ScatterIcon } from "lucide-react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, ZAxis,
} from "recharts";
import MilitaryRankIcon from "@/components/MilitaryRankIcon";
import { GameItemIcon } from "@/components/GameItemIcon";
import {
  PUBLIC_IMAGES_BASE_URL,
  COIN_ICON,
  ResourceInput,
} from "./components";
import {
  totalSkillPointsForLevel,
  companiesSkillPointsCost,
} from "./utils";
import type { OptimizeConfig, OptimizerResult, LandscapePoint } from "./optimizer-core";
import { INITIAL_SIM_STATE, type SimEquipmentState } from "./Simulator";
import type { FullProfile } from "@/lib/wareraApi";
import type { WorkerMessage } from "./optimizer-worker";

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
  targetMiss?: boolean;
}

interface BuilderProgress {
  current: number;
  total: number;
  phase: string;
}

const WEAPON_COLORS: Record<string, string> = {
  knife: "#a1a1aa",
  gun: "#60a5fa",
  rifle: "#fbbf24",
  sniper: "#22d3ee",
  tank: "#f97316",
  jet: "#ec4899",
};

const PICK_COLORS: Record<string, string> = {
  BD: "#ef4444",
  BC: "#22c55e",
  BO: "#a855f7",
  BT: "#f59e0b",
};

const MAX_CHART_POINTS = 1000;

function sampleArray<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  const result: T[] = [];
  for (let i = 0; i < n; i++) result.push(arr[Math.floor(i * step)]);
  return result;
}

// ─── Intl Formatter ─────────────────────────────────────────────────────

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

// ─── Target Types ───────────────────────────────────────────────────────

type TargetMode = "damage" | "budget" | "costPer1k";

const TARGET_MODES: { value: TargetMode; label: string; placeholder: string; icon: string }[] = [
  { value: "damage", label: "Damage", placeholder: "Damage", icon: "damage" },
  { value: "budget", label: "Budget", placeholder: "Budget", icon: "game_coin" },
  { value: "costPer1k", label: "Cost / 1k", placeholder: "Cost per 1K", icon: "game_coin" },
];

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
  const [buildStats, setBuildStats] = useState<{ uniqueSkills: number; viableBuilds: number; mcVerified: number } | null>(null);
  const [landscape, setLandscape] = useState<{ all: LandscapePoint[]; pareto: LandscapePoint[] } | null>(null);
  const [showLandscape, setShowLandscape] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [progress, setProgress] = useState<BuilderProgress>({ current: 0, total: 0, phase: "" });
  const cancelRef = useRef(false);

  const totalPoints = totalSkillPointsForLevel(playerLevel);
  const ecoPointsUsed = companiesSkillPointsCost(companiesCount);
  const warBudget = Math.max(0, totalPoints - ecoPointsUsed);

  const workerRef = useRef<Worker | null>(null);

  const runOptimizer = useCallback(async () => {
    if (!gameConfig || !livePrices || !equipPrices) return;
    workerRef.current?.terminate();
    setIsBuilding(true);
    setResults(null);
    setLandscape(null);
    setShowLandscape(true);

    const parsedTarget = targetValue ? parseFloat(targetValue.replace(/,/g, "")) : null;

    const optimizeConfig: OptimizeConfig = {
      budget: warBudget,
      militaryRank,
      orders: 0,
      targetMode: parsedTarget && parsedTarget > 0 ? targetMode : null,
      targetValue: parsedTarget && parsedTarget > 0 ? parsedTarget : null,
      gameConfig,
      livePrices,
      equipPrices,
    };

    const worker = new Worker(
      new URL("./optimizer-worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      if (e.data.type === "progress") {
        setProgress({ current: e.data.current, total: e.data.total, phase: e.data.phase });
      } else if (e.data.type === "result") {
        worker.terminate();
        workerRef.current = null;
        const { builds, stats, landscape: lscape, pareto } = e.data.result;
        setBuildStats(stats);

        const mkState = (b: typeof builds[0]): SimEquipmentState => ({
          ...structuredClone(INITIAL_SIM_STATE),
          weapon: b.weapon, ammo: b.ammo,
          helmet: `helmet${b.armorTier[0]}`,
          chest: `chest${b.armorTier[1]}`,
          gloves: `gloves${b.armorTier[2]}`,
          pants: `pants${b.armorTier[3]}`,
          boots: `boots${b.armorTier[4]}`,
          food: b.food, modifier: b.pill as any,
          militaryRank, orders: 0, playerLevel,
          ecoSkillsPoints: ecoPointsUsed, equipmentStatsOverride: {},
          skills: { ...b.skills, lootChance: 0 },
        });

        setResults(builds.map(b => ({
          label: b.label,
          shortCode: b.shortCode,
          simState: mkState(b),
          avgDamage: b.avgDamage,
          avgCostPer1k: b.avgCostPer1k,
          avgNetCost: b.avgNetCost,
          avgHits: b.avgHits,
          description: b.description,
          targetMiss: b.targetMiss,
        })));
        setLandscape({ all: lscape, pareto });
        setIsBuilding(false);
        setProgress({ current: 1, total: 1, phase: "Done!" });
      }
    };

    worker.onerror = () => {
      worker.terminate();
      workerRef.current = null;
      setIsBuilding(false);
    };

    worker.postMessage({ type: "optimize", config: optimizeConfig });
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

          {/* Target */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Optional Targets</span>
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
                  <input type="text" placeholder={`${activeTargetMode.placeholder}`} value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value.replace(/[^0-9,.]/g, ""))}
                    className="bg-transparent border-none text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none w-32" />
                </div>
                {targetValue && parseFloat(targetValue.replace(/,/g, "")) > 0 && (
                  <span className="text-[9px] font-mono font-bold text-amber-500/60 pl-7">
                    {fmtCompact(parseFloat(targetValue.replace(/,/g, ""))).toLowerCase()}
                    {targetMode === "damage" ? " dmg" : targetMode === "budget" ? " coins" : " coins / 1k dmg"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Build */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <button onClick={runOptimizer} disabled={isBuilding}
          className="flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white rounded-xl text-md font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:shadow-none disabled:scale-100">
          {isBuilding ? <Loader2 className="h-6 w-6 animate-spin" /> : <Hammer className="h-6 w-6" />}
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-black text-white uppercase tracking-widest">Recommended Builds</span>
            </div>
            {buildStats && (
              <span className="text-[9px] font-mono font-bold text-zinc-600">
                {buildStats.uniqueSkills} skill sets · {buildStats.viableBuilds.toLocaleString()} viable · {buildStats.mcVerified} verified
              </span>
            )}
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

      {landscape && landscape.all.length > 0 && (
        showLandscape ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-zinc-500">
                Showing up to {Math.min(landscape.all.length, MAX_CHART_POINTS).toLocaleString()} of {landscape.all.length.toLocaleString()} points
              </span>
              <button onClick={() => setShowLandscape(false)}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-all">
                Hide landscape
              </button>
            </div>
            <BuildLandscape landscape={landscape} />
          </div>
        ) : (
          <button onClick={() => setShowLandscape(true)}
            className="flex flex-col items-center justify-center gap-2 py-6 px-4 bg-zinc-950/40 hover:bg-zinc-900/60 border border-dashed border-zinc-800 hover:border-cyan-500/40 rounded-2xl transition-all group">
            <div className="flex items-center gap-2">
              <ScatterIcon className="h-4 w-4 text-cyan-400/70 group-hover:text-cyan-400" />
              <span className="text-xs font-black text-zinc-300 group-hover:text-white uppercase tracking-widest">
                Show Build Landscape
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {landscape.all.length.toLocaleString()} viable combinations explored
            </span>
            {landscape.all.length > MAX_CHART_POINTS && (
              <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-wider mt-1">
                ⚠ Heavy plot — downsampled to {MAX_CHART_POINTS.toLocaleString()} for performance
              </span>
            )}
          </button>
        )
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

  const miss = build.targetMiss;
  const border = miss ? "border-dashed border-amber-500/30" : isBD ? "border-red-500/30 hover:border-red-500/50" : isBC ? "border-green-500/30 hover:border-green-500/50" : isBO ? "border-purple-500/30 hover:border-purple-500/50" : "border-amber-500/30 hover:border-amber-500/50";
  const accent = isBD ? "text-red-400" : isBC ? "text-green-400" : isBO ? "text-purple-400" : "text-amber-400";
  const bg = miss ? "bg-amber-500/3" : isBD ? "bg-red-500/5" : isBC ? "bg-green-500/5" : isBO ? "bg-purple-500/5" : "bg-amber-500/5";

  const equipCodes = [build.simState.weapon, build.simState.ammo, build.simState.helmet, build.simState.chest, build.simState.gloves, build.simState.pants, build.simState.boots].filter(Boolean);

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-2xl border-[2px] transition-all ${border} ${bg} bg-zinc-950/30`}>
      <div className="flex flex-col gap-0.5">
        <span className={`text-[10px] font-black uppercase tracking-widest ${accent}`}>{build.label}</span>
        <span className="text-[9px] font-bold text-zinc-600">{build.description}</span>
        {miss && <span className="text-[9px] font-bold text-amber-500/80 mt-0.5">Closest match found</span>}
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

// ─── Build Landscape (scatter plot of all combinations) ─────────────────

function LandscapeTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p: LandscapePoint = payload[0].payload;
  return (
    <div className="bg-zinc-950/95 border border-zinc-700 rounded-lg p-2.5 shadow-xl text-[10px] font-mono">
      {p.pickCode && (
        <div className="mb-1 pb-1 border-b border-zinc-800">
          <span className="font-black uppercase tracking-widest" style={{ color: PICK_COLORS[p.pickCode] }}>
            {p.pickCode === "BD" ? "Best Damage" : p.pickCode === "BC" ? "Best Cost/1k" : p.pickCode === "BO" ? "Best Overall" : "Target Pick"}
          </span>
        </div>
      )}
      <div className="flex justify-between gap-3"><span className="text-zinc-500">Damage</span><span className="text-amber-400 font-bold">{fmtCompact(p.damage)}</span></div>
      <div className="flex justify-between gap-3"><span className="text-zinc-500">Cost / 1k</span><span className="text-green-400 font-bold">{p.costPer1k.toFixed(2)}</span></div>
      <div className="flex justify-between gap-3"><span className="text-zinc-500">Net cost</span><span className="text-zinc-300 font-bold">{fmtCompact(Math.abs(p.netCost))}</span></div>
      <div className="flex justify-between gap-3"><span className="text-zinc-500">Hits</span><span className="text-zinc-300 font-bold">{Math.round(p.hits)}</span></div>
      <div className="mt-1 pt-1 border-t border-zinc-800 flex flex-wrap gap-1">
        <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300" style={{ color: WEAPON_COLORS[p.weapon] }}>{p.weapon}</span>
        <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">T{p.tier}</span>
        {p.ammo && <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">{p.ammo.replace("Ammo", "")}</span>}
        {p.food && <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">{p.food}</span>}
        {p.pill === "buff" && <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300">buff</span>}
      </div>
    </div>
  );
}

const PickMarker = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const code = payload?.pickCode as string | undefined;
  if (!code) return null;
  const color = PICK_COLORS[code] || "#fff";
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill={color} stroke="#09090b" strokeWidth={2.5} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={900} fill="#09090b">
        {code}
      </text>
    </g>
  );
};

function BuildLandscape({ landscape }: { landscape: { all: LandscapePoint[]; pareto: LandscapePoint[] } }) {
  const { all, pareto } = landscape;

  const byWeapon = useMemo(() => {
    const groups: Record<string, LandscapePoint[]> = {};
    for (const p of all) {
      if (p.pickCode) continue;
      (groups[p.weapon] ||= []).push(p);
    }
    // Downsample per-weapon proportionally so the cloud shape is preserved
    const nonPickTotal = Object.values(groups).reduce((a, g) => a + g.length, 0);
    if (nonPickTotal > MAX_CHART_POINTS) {
      const ratio = MAX_CHART_POINTS / nonPickTotal;
      for (const w of Object.keys(groups)) {
        const target = Math.max(1, Math.round(groups[w].length * ratio));
        groups[w] = sampleArray(groups[w], target);
      }
    }
    return groups;
  }, [all]);

  const picks = useMemo(() => all.filter(p => p.pickCode), [all]);
  const weaponsPresent = Object.keys(byWeapon);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ScatterIcon className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-black text-white uppercase tracking-widest">Build Landscape</span>
          <span className="text-[10px] font-mono font-bold text-zinc-500">
            {all.length.toLocaleString()} viable combinations · {pareto.length} on Pareto frontier
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {weaponsPresent.map(w => (
            <div key={w} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: WEAPON_COLORS[w] }} />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{w}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 pl-3 border-l border-zinc-800">
            <span className="h-0.5 w-4 bg-amber-400" />
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Pareto</span>
          </div>
        </div>
      </div>

      <div className="h-[420px] w-full bg-zinc-950/40 rounded-2xl border border-zinc-800/40 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              type="number" dataKey="costPer1k" name="Cost / 1k dmg"
              stroke="#52525b" tick={{ fill: "#a1a1aa", fontSize: 10 }}
              tickFormatter={(v) => v.toFixed(1)}
              label={{ value: "Cost per 1k damage (coins)", position: "insideBottom", offset: -15, fill: "#71717a", fontSize: 11 }}
            />
            <YAxis
              type="number" dataKey="damage" name="Damage"
              stroke="#52525b" tick={{ fill: "#a1a1aa", fontSize: 10 }}
              tickFormatter={(v) => fmtCompact(v)}
              label={{ value: "Avg damage", angle: -90, position: "insideLeft", offset: 5, fill: "#71717a", fontSize: 11 }}
            />
            <ZAxis range={[18, 18]} />
            <RTooltip content={<LandscapeTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "#3f3f46" }} />

            {weaponsPresent.map(w => (
              <Scatter key={w} name={w} data={byWeapon[w]} fill={WEAPON_COLORS[w]} fillOpacity={0.35} />
            ))}

            <Scatter
              name="Pareto"
              data={pareto}
              fill="#fbbf24"
              fillOpacity={0.9}
              line={{ stroke: "#fbbf24", strokeWidth: 1.5, strokeOpacity: 0.6 }}
              lineJointType="monotoneX"
              shape="circle"
            />

            <Scatter name="Picks" data={picks} shape={<PickMarker />} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-zinc-600 text-center font-mono">
        Top-left is ideal: high damage, low cost. The amber line traces the Pareto frontier — builds where no other dominates on both axes.
      </p>
    </div>
  );
}
