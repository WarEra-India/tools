import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Import,
  Loader2,
  X,
} from "lucide-react";
import { useProfile } from "@/lib/ProfileContext";
import { useGameConfig } from "@/lib/hooks/useGameConfig";
import { useEquipmentPrices } from "@/lib/hooks/useEquipmentPrices";
import { useLivePrices } from "@/lib/hooks/useLivePrices";
import {
  getAllCountries,
  getAllRegions,
  getBattleLootSummary,
  getBattles,
  getUserBattleRanking,
  type BattleListItem,
  type BattleLootSummary,
  type BattleRankingEntry,
  type Country,
  type Region,
} from "@/lib/api/warera";
import { GameItemIcon } from "@/components/GameItemIcon";
import ProfileWidget from "@/components/ProfileWidget";
import { CountryFlag } from "@/components/CountryFlag";
import {
  EquipmentSelectorPopover,
  ModifierToggle,
  PUBLIC_IMAGES_BASE_URL,
  COIN_ICON,
} from "../war-room/components";
import type { SimEquipmentState } from "../war-room/Simulator";
import {
  estimateBattlePnL,
  loadoutFromProfile,
  LOADOUT_EQUIP_SLOTS,
  type BattlePnLResult,
  type LoadoutEquipSlot,
  WEAR_SIM_RUNS,
} from "./pnl";

const BATTLE_ICON = `${PUBLIC_IMAGES_BASE_URL}battle.svg`;
const PAGE_LIMIT = 100;
const DEFAULT_MIN_HITS = 100;

interface FoughtBattle {
  battle: BattleListItem;
  loot: BattleLootSummary;
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function countryName(map: Record<string, Country>, id?: string): string {
  if (!id) return "?";
  return map[id]?.name ?? id.slice(0, 6);
}

function regionName(map: Record<string, Region>, id?: string): string | null {
  if (!id) return null;
  return map[id]?.name ?? null;
}

function battleRegionId(battle: BattleListItem): string | undefined {
  return battle.defender?.region || battle.attacker?.region;
}

export default function BattleAnalysis() {
  const { profile, loading: profileLoading, clearProfile } = useProfile();
  const { data: gameConfig, loading: configLoading } = useGameConfig();
  const { data: livePrices, loading: pricesLoading } = useLivePrices();

  const equipmentCodes = useMemo(
    () => gameConfig?.equipments.map((e) => e.code) ?? [],
    [gameConfig],
  );
  const { data: equipPrices, loading: equipPricesLoading } = useEquipmentPrices(equipmentCodes);

  const [loadout, setLoadout] = useState<SimEquipmentState | null>(null);
  const [activeSelector, setActiveSelector] = useState<LoadoutEquipSlot | null>(null);

  const [countries, setCountries] = useState<Record<string, Country>>({});
  const [regions, setRegions] = useState<Record<string, Region>>({});
  const [fought, setFought] = useState<FoughtBattle[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listNetPreview, setListNetPreview] = useState<Record<string, number>>({});
  const [minHits, setMinHits] = useState(DEFAULT_MIN_HITS);
  const [minHitsInput, setMinHitsInput] = useState(String(DEFAULT_MIN_HITS));
  const [liveRank, setLiveRank] = useState<BattleRankingEntry | null>(null);
  const [liveRankLoading, setLiveRankLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setLoadout(loadoutFromProfile(profile));
    } else {
      setLoadout(null);
    }
  }, [profile]);

  useEffect(() => {
    Promise.all([getAllCountries(), getAllRegions()])
      .then(([c, r]) => {
        setCountries(c);
        setRegions(r);
      })
      .catch(() => {
        setCountries({});
        setRegions({});
      });
  }, []);

  useEffect(() => {
    setFought([]);
    setCursor(null);
    setHasMore(true);
    setSelectedId(null);
    setListNetPreview({});
    setListError(null);
    setLiveRank(null);
  }, [profile?.user._id, minHits]);

  const loadMore = useCallback(async () => {
    if (!profile || listLoading || !hasMore) return;
    setListLoading(true);
    setListError(null);
    try {
      const userId = profile.user._id;
      let next: string | null = cursor;
      let found: FoughtBattle[] = [];
      let pagesTried = 0;
      const maxPages = 5;

      while (found.length === 0 && pagesTried < maxPages) {
        const page = await getBattles({
          cursor: next,
          limit: PAGE_LIMIT,
        });
        pagesTried++;

        const summaries = await Promise.all(
          page.items.map(async (battle) => {
            const loot = await getBattleLootSummary(battle._id, userId);
            return { battle, loot };
          }),
        );

        found = summaries
          .filter((s): s is FoughtBattle => !!s.loot && s.loot.hits >= minHits)
          .map((s) => ({ battle: s.battle, loot: s.loot! }));

        next = page.nextCursor ?? null;
        setCursor(next);
        if (!next) {
          setHasMore(false);
          break;
        }
        if (found.length > 0) break;
      }

      if (found.length > 0) {
        setFought((prev) => {
          const seen = new Set(prev.map((f) => f.battle._id));
          const merged = [...prev];
          for (const f of found) {
            if (!seen.has(f.battle._id)) merged.push(f);
          }
          return merged;
        });
        setSelectedId((prev) => prev ?? found[0]?.battle._id ?? null);
      }
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load battles");
    } finally {
      setListLoading(false);
    }
  }, [profile, listLoading, hasMore, cursor, minHits]);

  useEffect(() => {
    if (profile && fought.length === 0 && hasMore && !listLoading) {
      void loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user._id, minHits]);

  const selected = useMemo(
    () => fought.find((f) => f.battle._id === selectedId) ?? null,
    [fought, selectedId],
  );

  const pnl = useMemo(() => {
    if (!selected || !profile || !loadout) return null;
    return estimateBattlePnL({
      hitCount: selected.loot.hits,
      loot: selected.loot,
      profile,
      loadout,
      equipPrices,
      livePrices,
      gameConfig,
      runs: WEAR_SIM_RUNS,
    });
  }, [selected, profile, loadout, equipPrices, livePrices, gameConfig]);

  useEffect(() => {
    setListNetPreview({});
  }, [loadout]);

  useEffect(() => {
    if (!selected || !pnl) return;
    setListNetPreview((prev) => ({ ...prev, [selected.battle._id]: pnl.net }));
  }, [selected, pnl]);

  useEffect(() => {
    if (!selected || !profile || !selected.battle.isActive) {
      setLiveRank(null);
      return;
    }
    let cancelled = false;
    setLiveRankLoading(true);
    getUserBattleRanking(selected.battle._id, profile.user._id)
      .then((result) => {
        if (!cancelled) setLiveRank(result);
      })
      .catch(() => {
        if (!cancelled) setLiveRank(null);
      })
      .finally(() => {
        if (!cancelled) setLiveRankLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, profile]);

  const applyMinHits = () => {
    const parsed = Number.parseInt(minHitsInput, 10);
    const next = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MIN_HITS;
    setMinHitsInput(String(next));
    setMinHits(next);
  };

  const importLoadout = () => {
    if (profile) setLoadout(loadoutFromProfile(profile));
  };

  const userCountry = profile?.user?.country ? countries[profile.user.country] : null;
  const loading = configLoading || equipPricesLoading || pricesLoading || profileLoading;

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400 mb-4" />
        <p className="text-zinc-500 font-medium font-mono text-sm tracking-widest uppercase">
          Loading
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-12 space-y-6">
        <div>
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calculators
          </Link>
          <img src={BATTLE_ICON} alt="" className="h-8 w-8 mb-2" />
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Battle Analysis</h1>
          <p className="text-zinc-400">
            Estimate what you spent vs gained in battles you fought, using wear backtracking from
            your loadout and skills.
          </p>
        </div>

        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100/90">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-200">Estimates use your current loadout &amp; skills</p>
            <p className="text-amber-100/70 text-[13px] leading-relaxed">
              Equipment wear, remaining durability %, ammo/food/pill costs, and net PnL are{" "}
              <span className="font-semibold text-amber-200">estimated</span> from the configured
              loadout below and your profile skills (via {WEAR_SIM_RUNS} hit simulations). They can
              be wrong for older battles if your gear or skills have changed. Check and update your
              equipment in-game, then override the loadout here to refresh the analysis. Hits,
              damage, cases, pool loot, and money from the API are factual.
            </p>
          </div>
        </div>

        {!profile ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <p className="text-sm text-zinc-400 mb-4">
              Load a profile to analyze battles you participated in.
            </p>
            <ProfileWidget />
          </div>
        ) : (
          <>
            {loadout && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={profile.user.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full border border-zinc-700 object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">
                          Analysis loadout
                        </h2>
                        <button
                          type="button"
                          onClick={clearProfile}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                          aria-label="Remove profile"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-sm text-zinc-200 font-medium truncate flex items-center gap-1.5">
                        {profile.user.username}
                        {userCountry && (
                          <CountryFlag countryCode={userCountry.code} className="w-4 h-3" />
                        )}
                        <span className="text-xs text-zinc-500 font-normal">
                          Lv.{profile.user.leveling.level}
                        </span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Override gear for estimated wear &amp; consumable costs.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={importLoadout}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                  >
                    <Import className="h-3.5 w-3.5" />
                    Reset from profile
                  </button>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  {LOADOUT_EQUIP_SLOTS.map((slot) => (
                    <EquipmentSelectorPopover
                      key={slot}
                      slot={slot}
                      currentValue={loadout[slot]}
                      isOpen={activeSelector === slot}
                      onOpenChange={(open) => setActiveSelector(open ? slot : null)}
                      onSelect={(code) =>
                        setLoadout((prev) => (prev ? { ...prev, [slot]: code } : prev))
                      }
                      gameConfig={gameConfig}
                      livePrices={livePrices}
                      equipPrices={equipPrices}
                    />
                  ))}
                  <ModifierToggle
                    modifier={loadout.modifier}
                    onChange={(modifier) =>
                      setLoadout((prev) => (prev ? { ...prev, modifier } : prev))
                    }
                    livePrices={livePrices}
                  />
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">
                    Your battles
                    <span className="ml-2 text-zinc-600 font-mono normal-case tracking-normal">
                      (hits ≥ {minHits})
                    </span>
                  </h2>
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="uppercase tracking-wider font-semibold text-zinc-500">
                      Min hits
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={minHitsInput}
                      onChange={(e) => setMinHitsInput(e.target.value)}
                      onBlur={applyMinHits}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                      className="h-8 w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    />
                  </label>
                </div>

                {listError && <p className="text-sm text-red-400">{listError}</p>}

                <div className="space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
                  {fought.map(({ battle, loot }) => {
                    const active = battle._id === selectedId;
                    const previewNet = listNetPreview[battle._id];
                    const att = countries[battle.attacker?.country ?? ""];
                    const def = countries[battle.defender?.country ?? ""];
                    const region = regionName(regions, battleRegionId(battle));
                    return (
                      <button
                        key={battle._id}
                        type="button"
                        onClick={() => setSelectedId(battle._id)}
                        className={`w-full text-left rounded-xl border p-3 transition-colors ${
                          active
                            ? "border-zinc-500 bg-zinc-800/60"
                            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-sm text-zinc-100 font-medium flex-wrap">
                              <CountryFlag countryCode={att?.code} className="w-5 h-3.5 shrink-0" />
                              <span className="truncate">
                                {countryName(countries, battle.attacker?.country)}
                              </span>
                              <span className="text-zinc-500 text-xs">vs</span>
                              <CountryFlag countryCode={def?.code} className="w-5 h-3.5 shrink-0" />
                              <span className="truncate">
                                {countryName(countries, battle.defender?.country)}
                              </span>
                            </div>
                            {region && (
                              <p className="text-xs text-zinc-400 mt-1 truncate">{region}</p>
                            )}
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-1 flex-wrap">
                              {battle.isActive ? (
                                <span className="text-green-400 font-semibold">Live</span>
                              ) : (
                                <span>Ended</span>
                              )}
                              <span>·</span>
                              <span>{formatDate(battle.createdAt)}</span>
                              <span>·</span>
                              <span>{loot.hits} hits</span>
                              <span>·</span>
                              <span>{formatMoney(loot.totalDmg)} dmg</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {previewNet != null && (
                              <span
                                className={`text-xs font-mono font-bold ${
                                  previewNet >= 0 ? "text-green-400" : "text-red-400"
                                }`}
                                title="Estimated net"
                              >
                                {previewNet >= 0 ? "+" : ""}
                                {formatMoney(previewNet)}
                              </span>
                            )}
                            {active ? (
                              <ChevronDown className="h-4 w-4 text-zinc-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-zinc-600" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {!listLoading && fought.length === 0 && (
                    <p className="text-sm text-zinc-500 py-6 text-center">
                      No fought battles found yet. Try loading more.
                    </p>
                  )}
                </div>

                {hasMore && (
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={listLoading}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {listLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {listLoading ? "Scanning battles…" : "Load more"}
                  </button>
                )}
                {!hasMore && fought.length > 0 && (
                  <p className="text-center text-xs text-zinc-600">No more battles</p>
                )}
              </div>

              <div className="lg:col-span-3">
                {!selected || !pnl ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-10 text-center text-zinc-500 text-sm">
                    {listLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-zinc-400" />
                    ) : null}
                    Select a battle to see spend vs gain breakdown.
                  </div>
                ) : (
                  <BattleDetail
                    battle={selected.battle}
                    loot={selected.loot}
                    pnl={pnl}
                    countries={countries}
                    regions={regions}
                    loadout={loadout!}
                    liveRank={liveRank}
                    liveRankLoading={liveRankLoading}
                    equipPrices={equipPrices}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EstBadge() {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/20">
      Estimated
    </span>
  );
}

function BattleDetail({
  battle,
  loot,
  pnl,
  countries,
  regions,
  loadout,
  liveRank,
  liveRankLoading,
  equipPrices,
}: {
  battle: BattleListItem;
  loot: BattleLootSummary;
  pnl: BattlePnLResult;
  countries: Record<string, Country>;
  regions: Record<string, Region>;
  loadout: SimEquipmentState;
  liveRank: BattleRankingEntry | null;
  liveRankLoading: boolean;
  equipPrices: Record<string, number>;
}) {
  const att = countries[battle.attacker?.country ?? ""];
  const def = countries[battle.defender?.country ?? ""];
  const region = regionName(regions, battleRegionId(battle));
  const potentialLoot = liveRank?.lootItem;
  const potentialLootPrice = potentialLoot ? equipPrices[potentialLoot.code] ?? 0 : 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mb-1">
          {battle.isActive ? (
            <span className="text-green-400 font-semibold">Live</span>
          ) : (
            <span>Ended</span>
          )}
          <span>·</span>
          <span>{formatDate(battle.createdAt)}</span>
          {region && (
            <>
              <span>·</span>
              <span>{region}</span>
            </>
          )}
        </div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2 flex-wrap">
          <CountryFlag countryCode={att?.code} className="w-7 h-5" />
          {countryName(countries, battle.attacker?.country)}
          <span className="text-zinc-500 text-base font-medium">vs</span>
          <CountryFlag countryCode={def?.code} className="w-7 h-5" />
          {countryName(countries, battle.defender?.country)}
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Hits" value={String(loot.hits)} />
        <StatCard label="Damage" value={formatMoney(loot.totalDmg)} />
        <StatCard label="Case 1" value={String(loot.case1Count)} icon="case1" />
        <StatCard label="Case 2" value={String(loot.case2Count)} icon="case2" />
      </div>

      {battle.isActive && (
        <section className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-sky-300/90">
              Live ranking loot
            </h4>
            <span className="text-[9px] font-black uppercase tracking-wider text-sky-400/70">
              If rank held
            </span>
          </div>
          {liveRankLoading ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading ranking…
            </div>
          ) : liveRank ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-zinc-300">
                Rank <span className="font-mono font-bold text-white">#{liveRank.rank}</span>
                <span className="text-zinc-500">
                  {" "}
                  · {formatMoney(liveRank.value)} dmg
                </span>
              </span>
              {potentialLoot ? (
                <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950/60 px-2.5 py-1.5">
                  <GameItemIcon itemCode={potentialLoot.code} className="h-9 w-9 rounded-md" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-200 font-mono">
                      {potentialLoot.code}
                    </p>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <img src={COIN_ICON} className="h-3 w-3" alt="" />
                      {formatMoney(potentialLootPrice)} avg
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No loot item attached to this rank slot.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Not found on the merged ranking (or ranking unavailable).
            </p>
          )}
        </section>
      )}

      <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Net result
            </span>
            <EstBadge />
          </div>
          <p
            className={`text-2xl font-mono font-bold ${
              pnl.net >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {pnl.net >= 0 ? "+" : ""}
            {formatMoney(pnl.net)}
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Spent</p>
            <p className="font-mono text-red-300 flex items-center gap-1">
              <img src={COIN_ICON} className="h-3.5 w-3.5" alt="" />
              {formatMoney(pnl.totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Gained</p>
            <p className="font-mono text-green-300 flex items-center gap-1">
              <img src={COIN_ICON} className="h-3.5 w-3.5" alt="" />
              {formatMoney(pnl.totalGained)}
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">
            Equipment wear
          </h4>
          <EstBadge />
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Averaged over {pnl.runs} simulations of {loot.hits} hits (avg dodge{" "}
          {pnl.avgDodged.toFixed(1)}). Cost charges proportional durability — leftover state % is
          only partially priced, not a full replacement.
        </p>
        <div className="overflow-x-auto rounded-xl border border-zinc-800 custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="text-left p-2.5 font-semibold">Slot</th>
                <th className="text-right p-2.5 font-semibold">Hits</th>
                <th className="text-right p-2.5 font-semibold">Broken</th>
                <th className="text-right p-2.5 font-semibold">Left %</th>
                <th className="text-right p-2.5 font-semibold">Cost</th>
              </tr>
            </thead>
            <tbody>
              {pnl.slots.map((slot) => (
                <tr key={slot.slot} className="border-b border-zinc-800/60 last:border-0">
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <GameItemIcon itemCode={slot.code} className="h-8 w-8 rounded-md" />
                      <div>
                        <p className="text-zinc-200 capitalize text-xs font-semibold">{slot.slot}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{slot.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-2.5 text-right font-mono text-zinc-300">
                    {Math.round(slot.avgHits)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-zinc-300">
                    {Math.round(slot.avgBroken)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-zinc-300">
                    {slot.avgRemainingStatePct.toFixed(1)}%
                  </td>
                  <td className="p-2.5 text-right font-mono text-zinc-200">
                    {formatMoney(slot.cost)}
                  </td>
                </tr>
              ))}
              {pnl.slots.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-zinc-500 text-xs">
                    No equipment in analysis loadout
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">
            Consumables
          </h4>
          <EstBadge />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <LineItem
            label="Ammo"
            detail={loadout.ammo ? `${loot.hits} × ${loadout.ammo}` : "None"}
            value={pnl.ammoCost}
            icon={loadout.ammo ?? undefined}
          />
          <LineItem
            label="Food"
            detail={loadout.food ?? "None"}
            value={pnl.foodCost}
            icon={loadout.food ?? undefined}
          />
          <LineItem
            label="Pill"
            detail={loadout.modifier === "buff" ? "Buff" : loadout.modifier}
            value={pnl.pillCost}
            icon={loadout.modifier === "buff" ? "cocain" : undefined}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Gains (from battle)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <LineItem label="Case 1" value={pnl.case1Value} icon="case1" positive />
          <LineItem label="Case 2" value={pnl.case2Value} icon="case2" positive />
          <LineItem label="Bounty" value={pnl.bountyMoney} positive />
          <LineItem label="Contract" value={pnl.contractMoney} positive />
          <LineItem
            label="Scrap from broken"
            value={pnl.scrapValue}
            detail={`${pnl.scrapReceived.toFixed(1)} scraps`}
            positive
            estimated
          />
          <LineItem label="Pool loot value" value={pnl.poolLootValue} positive />
        </div>
        {pnl.poolLootItems.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {pnl.poolLootItems.map((item, i) => (
              <div
                key={`${item.code}-${i}`}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-1"
              >
                <GameItemIcon itemCode={item.code} className="h-7 w-7 rounded" />
                <span className="text-[10px] font-mono text-zinc-400">{formatMoney(item.price)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {icon && <GameItemIcon itemCode={icon} className="h-6 w-6 rounded" />}
        <span className="font-mono font-bold text-zinc-100">{value}</span>
      </div>
    </div>
  );
}

function LineItem({
  label,
  value,
  detail,
  icon,
  positive,
  estimated,
}: {
  label: string;
  value: number;
  detail?: string;
  icon?: string;
  positive?: boolean;
  estimated?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <GameItemIcon itemCode={icon} className="h-6 w-6 rounded shrink-0" />}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-300 truncate">{label}</span>
            {estimated && <EstBadge />}
          </div>
          {detail && <p className="text-[10px] text-zinc-500 truncate">{detail}</p>}
        </div>
      </div>
      <span
        className={`font-mono text-xs font-bold shrink-0 ${
          positive ? "text-green-400" : "text-zinc-200"
        }`}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}
