import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Coins, Globe, ArrowLeft, Users, Zap, CheckSquare } from "lucide-react";
import { useProfile } from "@/lib/ProfileContext";

const API_BASE = "https://warvault.shadoooow.workers.dev/api";
const BATTLE_ICON = `${import.meta.env.BASE_URL}images/battle.svg`;

function formatNumber(n: number) {
  if (n === null || n === undefined) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toLocaleString();
}

interface SummaryData {
  total_wealth: number;
  avg_wealth: number;
  active_fighters: number;
  total_weekly_damage: number;
  total_total_damage: number;
  daily_damage_estimate: number;
  rank_damage: number;
  rank_wealth: number;
}

interface Fighter {
  user_id: string;
  username: string;
  avatar_url: string;
  level: number;
  tier: string;
  weekly_damage: number;
  total_damage: number;
  wealth: number;
  rank_damage: number;
  rank_wealth: number;
}

interface TierData {
  tier: string;
  count: number;
  total_weekly_damage: number;
  total_wealth: number;
}

interface HistoryData {
  date: string;
  weekly_damage: number;
  total_damage: number;
  wealth: number;
  money: number;
}

interface NationPowerData {
  country: any;
  summary: SummaryData;
  fighters: Fighter[];
  tier_breakdown: TierData[];
  history: HistoryData[];
}

interface Props {
  /** Hide back button, page title, country picker — Nation Hub provides those. */
  embedded?: boolean;
  /** Override selectedCountry with this id; ignored when not embedded. */
  forcedCountryId?: string;
}

export default function NationPower({ embedded = false, forcedCountryId }: Props = {}) {
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>(forcedCountryId ?? "");
  const [data, setData] = useState<NationPowerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" } | null>({ key: "weekly_damage", direction: "desc" });
  const [customCount, setCustomCount] = useState<string>("5");

  // Eco Rotation State
  const [ecoUserIds, setEcoUserIds] = useState<Set<string>>(new Set());

  // Keep selection in sync with forcedCountryId when used embedded.
  useEffect(() => {
    if (forcedCountryId && forcedCountryId !== selectedCountry) {
      setSelectedCountry(forcedCountryId);
    }
  }, [forcedCountryId]);

  useEffect(() => {
    // Skip the country directory fetch when embedded — parent already picked the country.
    if (embedded) return;
    async function fetchCountries() {
      try {
        const res = await fetch(`${API_BASE}/countries`);
        if (!res.ok) throw new Error("Failed to load countries");
        const list = await res.json();
        setCountries(list);
        if (profile?.user?.country) {
          setSelectedCountry(profile.user.country);
        } else if (list.length > 0) {
          setSelectedCountry(list[0].country_id);
        }
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchCountries();
  }, [profile, embedded]);

  useEffect(() => {
    if (!selectedCountry) return;
    async function fetchNationPower() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/nation-power?country=${selectedCountry}`);
        if (!res.ok) throw new Error("Failed to load nation power data");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchNationPower();
  }, [selectedCountry]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const sortedFighters = useMemo(() => {
    if (!data?.fighters) return [];
    let sortable = [...data.fighters];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let aVal = (a as any)[sortConfig.key] || 0;
        let bVal = (b as any)[sortConfig.key] || 0;
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [data?.fighters, sortConfig]);

  const ecoStats = useMemo(() => {
    if (!data) return { activeDmg: 0, fullDmg: 0, lossPercent: 0 };
    const fullDailyDmg = data.summary.daily_damage_estimate;
    let activeDmg = 0;
    data.fighters.forEach(f => {
      if (!ecoUserIds.has(f.user_id)) {
        activeDmg += (f.weekly_damage || 0) / 7;
      }
    });
    const loss = fullDailyDmg > 0 ? ((fullDailyDmg - activeDmg) / fullDailyDmg) * 100 : 0;
    return { activeDmg, fullDmg: fullDailyDmg, lossPercent: loss };
  }, [data, ecoUserIds]);

  const toggleEco = (userId: string) => {
    const next = new Set(ecoUserIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setEcoUserIds(next);
  };

  const applyPreset = (type: "top10" | "bottom25" | "clear" | "topX" | "bottomX") => {
    if (!data) return;
    const next = new Set<string>();
    const countX = parseInt(customCount) || 0;

    if (type === "top10") {
      const top = [...data.fighters].sort((a, b) => b.weekly_damage - a.weekly_damage).slice(0, 10);
      top.forEach(f => next.add(f.user_id));
    } else if (type === "bottom25") {
      const sorted = [...data.fighters].sort((a, b) => a.weekly_damage - b.weekly_damage);
      const count = Math.ceil(sorted.length * 0.25);
      sorted.slice(0, count).forEach(f => next.add(f.user_id));
    } else if (type === "topX") {
      const top = [...data.fighters].sort((a, b) => b.weekly_damage - a.weekly_damage).slice(0, countX);
      top.forEach(f => next.add(f.user_id));
    } else if (type === "bottomX") {
      const bottom = [...data.fighters].sort((a, b) => a.weekly_damage - b.weekly_damage).slice(0, countX);
      bottom.forEach(f => next.add(f.user_id));
    }
    setEcoUserIds(next);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "space-y-6 max-w-[1400px] mx-auto p-4 md:p-6"}>
      {/* Header — hidden when embedded; Nation Hub provides its own chrome */}
      {!embedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-zinc-400" />
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <img src={BATTLE_ICON} alt="craft" className="h-8 w-8" />
              Nation Strategic Control
            </h1>
          </div>
          <div className="flex gap-4">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="h-10 bg-zinc-900 border border-zinc-800 text-zinc-200 px-3 rounded-lg outline-none"
            >
              {countries.map(c => (
                <option key={c.country_id} value={c.country_id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-4" />
          <p className="text-zinc-400">Loading nation intelligence...</p>
        </div>
      ) : data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Command Center (Sticky) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            <Card className="bg-zinc-950/50 border-zinc-800 shadow-2xl backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Live Mission Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg"><Coins className="w-4 h-4 text-blue-400" /></div>
                    <span className="text-xs font-bold text-zinc-400">Total Wealth</span>
                  </div>
                  <span className="text-sm font-black text-white font-mono">{formatNumber(data.summary.total_wealth)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg"><Globe className="w-4 h-4 text-green-400" /></div>
                    <span className="text-xs font-bold text-zinc-400">Treasury</span>
                  </div>
                  <span className="text-sm font-black text-green-400 font-mono">{formatNumber(data.country.money || 0)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-500/10 rounded-lg"><Users className="w-4 h-4 text-zinc-400" /></div>
                    <span className="text-xs font-bold text-zinc-400">Active Frontline</span>
                  </div>
                  <span className="text-sm font-black text-white font-mono">{data.summary.active_fighters}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-zinc-950 to-zinc-900 border-zinc-800 shadow-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Strategic Simulator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-4">
                  <p className="text-[10px] text-zinc-500 uppercase font-black mb-1 tracking-widest">Simulated Firepower</p>
                  <p className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]">{formatNumber(ecoStats.activeDmg)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-center">
                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Force Loss</p>
                    <p className={`text-xl font-black ${ecoStats.lossPercent > 20 ? 'text-red-500' : 'text-zinc-400'}`}>
                      {ecoStats.lossPercent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-center">
                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">In Reserve</p>
                    <p className="text-xl font-black text-zinc-100">
                      {ecoUserIds.size} <span className="text-[10px] text-zinc-600">Ftrs</span>
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 space-y-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Tactical Presets</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => applyPreset("top10")} className="py-2 bg-zinc-900/50 hover:bg-red-500/10 border border-zinc-800 rounded-lg text-[9px] font-black uppercase text-zinc-500 hover:text-red-400 transition-colors">Top 10</button>
                    <button onClick={() => applyPreset("bottom25")} className="py-2 bg-zinc-900/50 hover:bg-blue-500/10 border border-zinc-800 rounded-lg text-[9px] font-black uppercase text-zinc-500 hover:text-blue-400 transition-colors">Bottom 25%</button>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <input
                      type="number"
                      value={customCount}
                      onChange={(e) => setCustomCount(e.target.value)}
                      className="w-12 h-9 bg-zinc-900 border border-zinc-800 rounded-lg text-center text-xs font-bold text-white outline-none"
                    />
                    <button onClick={() => applyPreset("topX")} className="flex-1 h-9 bg-zinc-900/80 hover:bg-red-500/10 border border-zinc-800 rounded-lg text-[9px] font-black uppercase text-zinc-500 hover:text-red-400 transition-colors">Pull Top X</button>
                    <button onClick={() => applyPreset("bottomX")} className="flex-1 h-9 bg-zinc-900/80 hover:bg-blue-500/10 border border-zinc-800 rounded-lg text-[9px] font-black uppercase text-zinc-500 hover:text-blue-400 transition-colors">Pull Bottom X</button>
                  </div>

                  <button onClick={() => applyPreset("clear")} className="w-full py-2 text-[9px] font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors">
                    Reset Mission Deck
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Personnel Roster */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Personnel Roster</h3>
                <p className="text-[10px] text-zinc-500 font-medium">Sorted by highest firepower combat data (last completed week)</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => requestSort("weekly_damage")}
                  className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all ${sortConfig?.key === 'weekly_damage' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-transparent border-zinc-800 text-zinc-500'}`}
                >
                  Damage
                </button>
                <button
                  onClick={() => requestSort("wealth")}
                  className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all ${sortConfig?.key === 'wealth' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-transparent border-zinc-800 text-zinc-500'}`}
                >
                  Wealth
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {sortedFighters.map(f => (
                <div
                  key={f.user_id}
                  onClick={() => toggleEco(f.user_id)}
                  className={`relative cursor-pointer rounded-xl border transition-all duration-300 p-3 ${ecoUserIds.has(f.user_id)
                    ? 'bg-zinc-900/20 border-zinc-800/50 grayscale opacity-60'
                    : 'bg-zinc-950/40 border-zinc-800/80 hover:border-blue-500/40 hover:bg-zinc-900 shadow-lg'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={f.avatar_url}
                        className={`w-12 h-12 rounded-lg border ${ecoUserIds.has(f.user_id) ? 'border-zinc-800' : 'border-zinc-700'}`}
                        alt=""
                      />
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-950 flex items-center justify-center ${ecoUserIds.has(f.user_id) ? 'bg-blue-500' : 'bg-transparent border-zinc-800'}`}>
                        {ecoUserIds.has(f.user_id) && <CheckSquare className="w-2 h-2 text-white" />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-black truncate leading-none ${ecoUserIds.has(f.user_id) ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                          {f.username}
                        </p>
                        <span className={`text-[7px] font-black uppercase px-1 py-0.5 rounded border ${f.tier?.toLowerCase() === 'diamond' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' :
                          'bg-zinc-900 border-zinc-800 text-zinc-500'
                          }`}>
                          {f.tier || 'Std'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-800/40">
                        <div>
                          <p className="text-[7px] text-zinc-600 uppercase font-black">Firepower</p>
                          <p className={`font-mono text-[10px] font-bold ${ecoUserIds.has(f.user_id) ? 'text-zinc-700' : 'text-red-500'}`}>
                            {formatNumber(f.weekly_damage / 7)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[7px] text-zinc-600 uppercase font-black">Assets</p>
                          <p className={`font-mono text-[10px] font-bold ${ecoUserIds.has(f.user_id) ? 'text-zinc-800' : 'text-zinc-400'}`}>
                            {formatNumber(f.wealth)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
