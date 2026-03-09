import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Target, Coins, BarChart3, Globe, DollarSign, ArrowLeft } from "lucide-react";
import { CountryFlag } from "@/components/CountryFlag";
import { useProfile } from "@/lib/ProfileContext";

const API_BASE = "https://warvault.shadoooow.workers.dev/api";
const LIMIT = 40;

function formatNumber(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function getISOWeekRange(weekStr: string) {
  if (!weekStr) return "";
  const [year, week] = weekStr.split("-W").map(Number);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay();
  const ISOweekStart = new Date(simple);
  if (dayOfWeek <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setUTCDate(ISOweekEnd.getUTCDate() + 6);

  const s = ISOweekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const e = ISOweekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${s} - ${e}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-900 border border-zinc-700 p-3 xl:p-4 rounded-lg shadow-xl min-w-[200px]">
        <div className="flex items-center gap-3 mb-3 border-b border-zinc-800 pb-3">
          {data.avatar_url ? (
            <img src={data.avatar_url} alt="avatar" className="w-10 h-10 rounded bg-zinc-800 object-cover" />
          ) : (
            <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center">
              <span className="text-zinc-500 font-bold text-xs">{data.username?.substring(0, 2).toUpperCase()}</span>
            </div>
          )}
          <div>
            <p className="text-zinc-100 font-bold">{data.username}</p>
            <p className="text-zinc-500 text-xs">Level {data.level || '?'}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400 flex items-center gap-1"><Target className="w-3 h-3" /> Damage</span>
            <span className="text-red-400 font-mono font-bold tracking-tight">
              {new Intl.NumberFormat('en-US').format(data.weekly_damage || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400 flex items-center gap-1"><Coins className="w-3 h-3" /> Wealth</span>
            <span className="text-yellow-400 font-mono font-bold tracking-tight">
              {new Intl.NumberFormat('en-US').format(Math.floor(data.wealth || 0))}
            </span>
          </div>
          {data.tier && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400 inline-block mt-1">Tier</span>
              <span className="text-blue-400 capitalize">{data.tier}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function NationalRecords() {
  const { profile } = useProfile();

  // State
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");

  const [metric, setMetric] = useState<"weekly_damage" | "total_damage">("weekly_damage");

  // Data
  const [countryStats, setCountryStats] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial Load: Countries & Weeks
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [weeksRes, countriesRes] = await Promise.all([
          fetch(`${API_BASE}/weeks`),
          fetch(`${API_BASE}/countries`)
        ]);

        if (!weeksRes.ok || !countriesRes.ok) throw new Error("Failed to load metadata");

        const wData = await weeksRes.json();
        const cData = await countriesRes.json();

        setWeeks(wData);
        if (wData.length > 0) setSelectedWeek(wData[0].week);

        setCountries(cData);

        // Default country 
        if (profile?.user?.country) {
          setSelectedCountry(profile.user.country);
        } else if (cData.length > 0) {
          setSelectedCountry(cData[0].country_id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [profile]);

  // 2. Load Stats when selection changes
  useEffect(() => {
    if (!selectedCountry) return;

    async function loadStats() {
      try {
        setLoading(true);
        setError(null);

        // If "Total Damage", we fetch total aggregated damage/wealth
        const isTotal = metric === "total_damage";
        const weekParam = !isTotal && selectedWeek ? `&week=${selectedWeek}` : "";
        const endpoint = isTotal ? "/total-user-damage" : "/user-damage";
        const countryStatsEndpoint = isTotal ? "/total-country-stats" : "/country-stats";

        const [statsRes, usersRes] = await Promise.all([
          fetch(`${API_BASE}${countryStatsEndpoint}?country=${selectedCountry}`),
          fetch(`${API_BASE}${endpoint}?country=${selectedCountry}&limit=${LIMIT}${weekParam}`)
        ]);

        if (statsRes.ok) {
          const stats = await statsRes.json();
          // The API returns an object or an array depending on endpoint
          const myStats = Array.isArray(stats)
            ? stats.find((s: any) => s.country_id === selectedCountry)
            : stats;
          setCountryStats(myStats || null);
        }

        if (usersRes.ok) {
          const users = await usersRes.json();
          setTopUsers(users);
        }
      } catch (err: any) {
        setError("Failed to fetch country records. The data may still be collecting.");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [selectedCountry, selectedWeek, metric]);

  const selectedCountryData = useMemo(() => {
    return countries.find(c => c.country_id === selectedCountry);
  }, [countries, selectedCountry]);

  const renderCustomAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const user = topUsers.find(u => u.username === payload.value);
    const avatar = user?.avatar_url;

    return (
      <g transform={`translate(${x},${y})`}>
        {avatar ? (
          <g>
            <defs>
              <clipPath id={`clip-${payload.value.replace(/[^a-zA-Z0-9]/g, '')}`}>
                <circle cx="0" cy="15" r="12" />
              </clipPath>
            </defs>
            <circle cx="0" cy="15" r="13" fill="#3f3f46" />
            <image
              x="-12"
              y="3"
              width="24"
              height="24"
              href={avatar}
              clipPath={`url(#clip-${payload.value.replace(/[^a-zA-Z0-9]/g, '')})`}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        ) : (
          <g>
            <circle cx="0" cy="15" r="12" fill="#27272a" />
            <text x="0" y="19" textAnchor="middle" fill="#71717a" fontSize="10" fontWeight="bold">
              {payload.value.substring(0, 2).toUpperCase()}
            </text>
          </g>
        )}
      </g>
    );
  };

  if (error) {
    const errorFallback = (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <h1 className="text-xl font-bold text-white">Records Error</h1>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors">Retry</button>
        </div>
      </div>
    );
    return errorFallback;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <Link to="/" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-zinc-400" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-500" />
            National Records
          </h1>
        </div>
        <p className="text-zinc-400">
          Historical data, weekly damages, and top citizens leaderboards for every country.
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="col-span-1 md:col-span-5 bg-zinc-900 border border-zinc-800 rounded-lg shadow-sm">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full h-10 bg-transparent text-zinc-200 px-3 outline-none appearance-none"
          >
            <option value="" disabled className="bg-zinc-900 text-zinc-500">Select country...</option>
            {countries.map(c => (
              <option key={c.country_id} value={c.country_id} className="bg-zinc-900">{c.name}</option>
            ))}
          </select>
        </div>

        <div className="col-span-1 md:col-span-4 bg-zinc-900 border border-zinc-800 rounded-lg shadow-sm">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as any)}
            className="w-full h-10 bg-transparent text-zinc-200 px-3 outline-none appearance-none"
          >
            <option value="weekly_damage" className="bg-zinc-900">Weekly Damage Trend</option>
            {/* <option value="total_damage" className="bg-zinc-900">All-Time Total / Overall</option> */}
          </select>
        </div>

        {metric === "weekly_damage" && (
          <div className="col-span-1 md:col-span-3 bg-zinc-900 border border-zinc-800 rounded-lg shadow-sm">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              disabled={weeks.length === 0}
              className="w-full h-10 bg-transparent text-zinc-200 px-3 outline-none appearance-none disabled:opacity-50"
            >
              <option value="" disabled className="bg-zinc-900 text-zinc-500">Select week...</option>
              {weeks.map(w => (
                <option key={w.week} value={w.week} className="bg-zinc-900">
                  {getISOWeekRange(w.week)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && !topUsers.length ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-4" />
          <p className="text-zinc-400">Loading historical data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Globe className="w-16 h-16" />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  {selectedCountryData?.code && <CountryFlag countryCode={selectedCountryData.code} className="w-8 h-6 shadow-sm" />}
                  <h3 className="font-bold text-lg">{selectedCountryData?.name || "Unknown"}</h3>
                </div>
                <p className="text-zinc-400 text-sm">Selected Country</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Target className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium uppercase tracking-wider">
                    {metric === "weekly_damage" ? "Weekly Damage" : "Total Damage"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-white">
                    {countryStats?.weekly_damage ? formatNumber(countryStats.weekly_damage) : "0"}
                  </span>
                </div>
                {countryStats?.rank_damage && (
                  <p className="text-sm text-zinc-500 mt-1">Global Rank: <span className="text-blue-400 font-medium">#{countryStats.rank_damage}</span></p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium uppercase tracking-wider">Total Wealth</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-white">
                    {countryStats?.wealth ? formatNumber(countryStats.wealth) : "0"}
                  </span>
                </div>
                {countryStats?.rank_wealth && (
                  <p className="text-sm text-zinc-500 mt-1">Global Rank: <span className="text-blue-400 font-medium">#{countryStats.rank_wealth}</span></p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium uppercase tracking-wider">Treasury Balance</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-white">
                    {countryStats?.money ? formatNumber(countryStats.money) : "0"}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 mt-1">Available Funds</p>
              </CardContent>
            </Card>
          </div>

          {/* Graph Section */}
          <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50 mt-6 pt-6">
            <CardHeader className="pb-0">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-400" />
                    Top {LIMIT} Citizens
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {metric === "weekly_damage"
                      ? `Highest damage contributors for ${selectedCountryData?.name || ''} in ${selectedWeek}`
                      : `Overall highest contributors for ${selectedCountryData?.name || ''}`}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2 text-xs text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Damage
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {topUsers.length === 0 ? (
                <div className="h-[400px] flex items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl mt-6">
                  No data available for this selection
                </div>
              ) : (
                <div className="h-[450px] w-full mt-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topUsers} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                      <XAxis
                        dataKey="username"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={renderCustomAxisTick}
                        interval={0}
                        height={40}
                      />
                      <YAxis
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#71717a' }}
                        tickFormatter={(val) => {
                          if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
                          if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
                          if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
                          return val;
                        }}
                      />
                      <Tooltip
                        cursor={{ fill: '#27272a', opacity: 0.4 }}
                        content={<CustomTooltip />}
                      />
                      <Bar
                        dataKey="weekly_damage"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                        animationDuration={1500}
                      >
                        {topUsers.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index < 3 ? '#ef4444' : index < 10 ? '#f87171' : '#fca5a5'}
                            fillOpacity={0.8}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
