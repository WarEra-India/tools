import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, TrendingUp, Plus, X, BarChart3, Calendar, ShieldCheck } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { getAllCountries, type Country } from "@/lib/api/warera";
import {
  COUNTRY_COLORS,
  type CountryResults,
  fetchAndEnrichCountry,
  applyDisplayFilters,
  buildChartData,
  countInRange,
} from "./logic";

interface Props {
  /** Hide page chrome (back button, title) and the country search/chip sidebar.
   *  Auto-fetches on mount so embedded users don't have to click "Get Data". */
  embedded?: boolean;
  /** When set with embedded, lock the lens to these countries (1 = detail, 2+ = compare). */
  forcedCountries?: Country[];
}

export default function BabyBoom({ embedded = false, forcedCountries }: Props = {}) {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<Country[]>(
    forcedCountries ?? [],
  );
  const [countrySearch, setCountrySearch] = useState("");
  const [allResults, setAllResults] = useState<CountryResults>({});
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<number>(90);
  const [hasData, setHasData] = useState(false);

  // Display-only filters — change without re-fetching
  const [minLevel, setMinLevel] = useState<number>(5);
  const [activeOnly, setActiveOnly] = useState<boolean>(true);

  // Stable key from forcedCountries IDs — lets effects depend on the actual
  // set without paying for shallow-changed array references.
  const forcedKey = (forcedCountries ?? []).map((c) => c._id).sort().join(",");

  useEffect(() => {
    // Skip directory fetch when embedded — countries come from props.
    if (embedded) return;
    getAllCountries()
      .then((map) => setCountries(Object.values(map)))
      .catch((err) => setError(err.message));
  }, [embedded]);

  // Keep selectedCountries in sync with forcedCountries when embedded.
  useEffect(() => {
    if (!embedded || !forcedCountries) return;
    setSelectedCountries(forcedCountries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, forcedKey]);

  const availableCountries = useMemo(() =>
    countries
      .filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) &&
        !selectedCountries.find(sc => sc._id === c._id)
      )
      .slice(0, 10),
    [countries, countrySearch, selectedCountries]
  );

  const addCountry = (country: Country) => {
    setSelectedCountries(prev => [...prev, country]);
    setCountrySearch("");
  };

  const removeCountry = (id: string) => {
    setSelectedCountries(prev => prev.filter(c => c._id !== id));
    setAllResults(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  /**
   * Fetch every available user for the selected countries. No cutoff —
   * timeRange is a pure frontend filter, so we get the full history once
   * and let the chart slice it however the user wants.
   */
  const fetchData = async () => {
    if (selectedCountries.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const entries = await Promise.all(
        selectedCountries.map(async (c) => [c._id, await fetchAndEnrichCountry(c._id)] as const)
      );
      setAllResults(Object.fromEntries(entries));
      setHasData(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when embedded — only when the country set changes. timeRange
  // is a pure frontend filter from here on so it's deliberately not in deps.
  useEffect(() => {
    if (!embedded || !forcedCountries || forcedCountries.length === 0) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, forcedKey]);

  const filteredResults = useMemo(
    () => applyDisplayFilters(allResults, minLevel, activeOnly),
    [allResults, minLevel, activeOnly]
  );

  const chartData = useMemo(
    () => buildChartData(filteredResults, selectedCountries, timeRange),
    [filteredResults, selectedCountries, timeRange]
  );

  return (
    <div className={embedded ? "space-y-6" : "space-y-6 max-w-[1400px] mx-auto p-4 md:p-6"}>
      {!embedded && (
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-zinc-400" />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            Baby Boom Analysis
          </h1>
        </div>
      )}

      <div className={`grid grid-cols-1 gap-8 items-start ${embedded ? "" : "lg:grid-cols-12"}`}>
        {/* Sidebar — hidden when embedded; Nation Hub owns country selection */}
        {!embedded && (
        <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-[var(--nh-bar-h,1.5rem)]">
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Countries</p>
            <div className="relative">
              <input
                type="text"
                placeholder="Search country..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="w-full h-9 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-white focus:border-blue-500/50 outline-none"
              />
              {countrySearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden">
                  {availableCountries.length > 0 ? availableCountries.map(c => (
                    <button
                      key={c._id}
                      onClick={() => addCountry(c)}
                      className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} className="w-5 h-3.5 object-cover rounded-sm opacity-80" alt="" />
                        {c.name}
                      </div>
                      <Plus className="w-3.5 h-3.5 text-zinc-600" />
                    </button>
                  )) : <div className="p-3 text-center text-xs text-zinc-500">No nations found</div>}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedCountries.map(c => (
                <div key={c._id} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 pl-1.5 pr-2 py-1 rounded-full">
                  <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} className="w-4 h-3 object-cover rounded-sm" alt="" />
                  <span className="text-[10px] font-bold text-zinc-300">{c.name}</span>
                  <button onClick={() => removeCountry(c._id)} className="hover:text-red-400 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {selectedCountries.length === 0 && (
                <p className="text-[10px] text-zinc-600 italic">No countries selected</p>
              )}
            </div>
          </div>

          <button
            onClick={() => fetchData()}
            disabled={loading || selectedCountries.length === 0}
            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${loading || selectedCountries.length === 0 ? "bg-zinc-900 text-zinc-700" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"}`}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
            {loading ? "Fetching..." : "Get Data"}
          </button>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        )}

        {/* Main content */}
        <div className={embedded ? "space-y-6" : "lg:col-span-9 space-y-6"}>
          <Card className="bg-zinc-950/50 border-zinc-800 overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-zinc-900/50">
              <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg font-bold">New Player Join Trends</CardTitle>
                  <CardDescription className="text-zinc-500">Account creation over the last {timeRange} days.</CardDescription>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 h-9">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Lvl ≥</span>
                    <input
                      type="number"
                      value={minLevel}
                      onChange={(e) => setMinLevel(parseInt(e.target.value) || 0)}
                      className="w-10 bg-transparent text-sm text-white font-mono outline-none text-center"
                    />
                  </div>
                  <button
                    onClick={() => setActiveOnly(!activeOnly)}
                    className={`h-9 px-3 border rounded-lg flex items-center gap-1.5 transition-all text-xs font-bold ${activeOnly ? "bg-blue-500/10 border-blue-500/50 text-blue-400" : "bg-zinc-900 border-zinc-800 text-zinc-600"}`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Active
                  </button>
                  <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                    {[30, 60, 90, 180, 365].map(r => (
                      <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${timeRange === r ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        {r}D
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[380px] w-full mt-4">
                {loading ? (
                  <div className="h-full w-full animate-pulse space-y-3 pt-2">
                    <div className="flex items-end gap-1 h-[320px]">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="flex-1 bg-zinc-800 rounded-t-sm" style={{ height: `${20 + (i * 17 + 30) % 60}%` }} />
                      ))}
                    </div>
                    <div className="h-3 bg-zinc-800 rounded w-full" />
                  </div>
                ) : hasData && selectedCountries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        {selectedCountries.map((c, i) => (
                          <linearGradient key={c._id} id={`grad_${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COUNTRY_COLORS[i % COUNTRY_COLORS.length]} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COUNTRY_COLORS[i % COUNTRY_COLORS.length]} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#71717a"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      />
                      <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "10px" }}
                        itemStyle={{ fontWeight: "bold" }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", fontWeight: "bold", paddingTop: "20px" }} />
                      {selectedCountries.map((c, i) => (
                        <Area
                          key={c._id}
                          type="monotone"
                          dataKey={c.name}
                          stroke={COUNTRY_COLORS[i % COUNTRY_COLORS.length]}
                          strokeWidth={3}
                          fillOpacity={1}
                          fill={`url(#grad_${i})`}
                          connectNulls={false}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                    <Calendar className="w-10 h-10 mb-3 opacity-10" />
                    <p className="text-sm font-medium">Select countries and fetch data to see join trends</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stat cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedCountries.map(c => (
                <div key={c._id} className="bg-zinc-950/20 border border-zinc-800 rounded-xl p-4 animate-pulse space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-3.5 bg-zinc-800 rounded-sm" />
                    <div className="h-3 bg-zinc-800 rounded w-24" />
                  </div>
                  <div className="h-8 bg-zinc-800 rounded w-16" />
                  <div className="h-px bg-zinc-900" />
                  <div className="h-3 bg-zinc-800 rounded w-20" />
                </div>
              ))}
            </div>
          ) : hasData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedCountries.map((c, i) => {
                const filtered = filteredResults[c._id] || [];
                const inRange = countInRange(filtered, timeRange);
                const rawInRange = countInRange(allResults[c._id] || [], timeRange);
                return (
                  <Card key={c._id} className="bg-zinc-950/20 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COUNTRY_COLORS[i % COUNTRY_COLORS.length] }} />
                        <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} className="w-5 h-3.5 object-cover rounded-sm" alt="" />
                        <span className="text-xs font-black uppercase text-white tracking-widest leading-none">{c.name}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{inRange}</span>
                        <span className="text-[10px] font-bold text-green-500">JOINED</span>
                        <span className="text-[10px] text-zinc-600 ml-auto">{timeRange}D</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-zinc-900/50 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[8px] text-zinc-600 uppercase font-black">Raw in Range</p>
                          <p className="text-xs font-black text-zinc-400 font-mono">{rawInRange}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-zinc-600 uppercase font-black">Filtered Out</p>
                          <p className="text-xs font-black text-zinc-400 font-mono">{rawInRange - inRange}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
