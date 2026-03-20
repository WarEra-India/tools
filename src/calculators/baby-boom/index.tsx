import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, TrendingUp, Users, Plus, X, BarChart3, Calendar, ShieldCheck, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";

const API_BASE = "https://warvault.shadoooow.workers.dev/api";

interface UserProfile {
  user_id: string;
  username: string;
  country_id: string;
  avatar_url: string;
  level: number;
  is_active: number;
  account_created_at: string;
  updated_at: string;
}

interface Country {
  country_id: string;
  name: string;
  code: string;
}

export default function BabyBoom() {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<Country[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [results, setResults] = useState<Record<string, UserProfile[]>>({});
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [minLevel, setMinLevel] = useState<number>(5);
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<number>(90); // days

  useEffect(() => {
    async function fetchCountries() {
      try {
        const res = await fetch(`${API_BASE}/countries`);
        if (!res.ok) throw new Error("Failed to load countries");
        const list = await res.json();
        setCountries(list);
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchCountries();
  }, []);

  const availableCountries = useMemo(() => {
    return countries.filter(c =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) &&
      !selectedCountries.find(sc => sc.country_id === c.country_id)
    ).slice(0, 10);
  }, [countries, countrySearch, selectedCountries]);

  const addCountry = (country: Country) => {
    setSelectedCountries([...selectedCountries, country]);
    setCountrySearch("");
  };

  const removeCountry = (id: string) => {
    setSelectedCountries(selectedCountries.filter(c => c.country_id !== id));
    const nextResults = { ...results };
    delete nextResults[id];
    setResults(nextResults);
  };

  const runAnalysis = async () => {
    if (selectedCountries.length === 0) return;
    setLoading(true);
    setError(null);
    const newResults: Record<string, UserProfile[]> = {};

    try {
      await Promise.all(selectedCountries.map(async (c) => {
        const params = new URLSearchParams({
          country: c.country_id,
          minLevel: minLevel.toString()
        });
        if (activeOnly) params.append("isActive", "true");

        const res = await fetch(`${API_BASE}/users?${params.toString()}`);
        if (!res.ok) throw new Error(`Failed to fetch for ${c.name}`);
        const data = await res.json();
        newResults[c.country_id] = data;
      }));
      setResults(newResults);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    const dates: Record<string, Record<string, number>> = {};
    const now = new Date();
    
    // Initialize ALL days in the range with 0 for each selected country to ensure continuous lines
    for (let i = 0; i < timeRange; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0];
      dates[dateKey] = {};
      selectedCountries.forEach(c => {
        dates[dateKey][c.name] = 0;
      });
    }

    selectedCountries.forEach(c => {
      const users = results[c.country_id] || [];
      users.forEach(u => {
        if (!u.account_created_at) return;
        const d = new Date(u.account_created_at);
        const dateKey = d.toISOString().split('T')[0];
        if (dates[dateKey]) {
          dates[dateKey][c.name] = (dates[dateKey][c.name] || 0) + 1;
        }
      });
    });

    return Object.entries(dates)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [results, selectedCountries, timeRange]);

  const countryColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-zinc-400" />
        </Link>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-blue-500" />
          Baby Boom Analysis
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar: Controls */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          <Card className="bg-zinc-950/50 border-zinc-800 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Mission Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Compare Countries</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search country..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-white focus:border-blue-500/50 outline-none"
                  />
                  {countrySearch && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden">
                      {availableCountries.length > 0 ? availableCountries.map(c => (
                        <button
                          key={c.country_id}
                          onClick={() => addCountry(c)}
                          className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <img 
                              src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} 
                              className="w-5 h-3.5 object-cover rounded-sm opacity-80" 
                              alt="" 
                            />
                            {c.name}
                          </div>
                          <Plus className="w-4 h-4 text-zinc-600" />
                        </button>
                      )) : <div className="p-4 text-center text-xs text-zinc-500">No nations found</div>}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedCountries.map(c => (
                    <div key={c.country_id} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 pl-2 pr-3 py-1.5 rounded-full">
                      <img 
                        src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} 
                        className="w-4 h-3 object-cover rounded-sm" 
                        alt="" 
                      />
                      <span className="text-[10px] font-bold text-zinc-300 leading-none">{c.name}</span>
                      <button onClick={() => removeCountry(c.country_id)} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {selectedCountries.length === 0 && (
                    <div className="text-[10px] text-zinc-600 italic px-1">No countries added for comparison</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-900">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Min Level</label>
                  <input
                    type="number"
                    value={minLevel}
                    onChange={(e) => setMinLevel(parseInt(e.target.value) || 0)}
                    className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-white font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Only</label>
                  <div
                    onClick={() => setActiveOnly(!activeOnly)}
                    className={`h-10 border rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all ${activeOnly ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-bold">{activeOnly ? 'ENABLED' : 'OFF'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={runAnalysis}
                disabled={loading || selectedCountries.length === 0}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${loading || selectedCountries.length === 0 ? 'bg-zinc-900 text-zinc-700' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                Run Tactical Analysis
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Trends */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-zinc-950/50 border-zinc-800 overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-zinc-900/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">New Player Join Trends</CardTitle>
                <CardDescription className="text-zinc-500">Account creation rate tracking over the last {timeRange} days.</CardDescription>
              </div>
              <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                {[30, 60, 90, 180, 365].map(r => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${timeRange === r ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {r}D
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[400px] w-full mt-4">
                {selectedCountries.length > 0 && chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        {selectedCountries.map((c, i) => (
                          <linearGradient key={c.country_id} id={`grad_${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={countryColors[i % countryColors.length]} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={countryColors[i % countryColors.length]} stopOpacity={0} />
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
                        tickFormatter={(v) => {
                          const date = new Date(v);
                          return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        }}
                      />
                      <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                      {selectedCountries.map((c, i) => (
                        <Area
                          key={c.country_id}
                          type="monotone"
                          dataKey={c.name}
                          stroke={countryColors[i % countryColors.length]}
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
                    <Calendar className="w-12 h-12 mb-4 opacity-10" />
                    <p className="text-sm font-medium">Select countries and run analysis to see join trends</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedCountries.map((c, i) => {
              const users = results[c.country_id] || [];
              const rangeJoins = users.filter(u => {
                const d = new Date(u.account_created_at);
                const rangeLimit = new Date();
                rangeLimit.setDate(rangeLimit.getDate() - timeRange);
                return d > rangeLimit;
              }).length;

              return (
                <Card key={c.country_id} className="bg-zinc-950/20 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} 
                          className="w-5 h-3.5 object-cover rounded-sm" 
                          alt="" 
                        />
                        <span className="text-xs font-black uppercase text-white tracking-widest leading-none">{c.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">{timeRange}D GROSS</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{rangeJoins}</span>
                      <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                        JOINED
                      </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-zinc-900/50 flex items-center justify-between">
                      <div>
                        <p className="text-[8px] text-zinc-600 uppercase font-black">Total Dataset</p>
                        <p className="text-xs font-black text-zinc-400 font-mono">{users.length} <span className="text-[8px] opacity-40">U</span></p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-800" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
