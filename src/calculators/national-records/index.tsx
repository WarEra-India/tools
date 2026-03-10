import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Target, Coins, Globe, DollarSign, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { CountryFlag } from "@/components/CountryFlag";
import { useProfile } from "@/lib/ProfileContext";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from "recharts";

const API_BASE = "https://warvault.shadoooow.workers.dev/api";
const LIMIT = 250;

function formatNumber(n: number) {
  if (n === null || n === undefined) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toLocaleString();
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

export default function NationalRecords() {
  const { profile } = useProfile();

  // State
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"citizens" | "countries">("citizens");

  // Data
  const [countryStats, setCountryStats] = useState<any>(null); // Stats for the single selected country
  const [allCountriesStats, setAllCountriesStats] = useState<any[]>([]); // Stats for the "Countries" table
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" } | null>(null);

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

  // 2. Load Stats when selection/tab changes
  useEffect(() => {
    if (!selectedCountry || !selectedWeek) return;

    async function loadStats() {
      try {
        setLoading(true);
        setError(null);

        const currentWeekEnd = weeks.find(w => w.week === selectedWeek)?.end_date || "";

        if (activeTab === "citizens") {
          // Default to sorting by weekly_damage if user hasn't clicked a column header
          if (!sortConfig) {
            setSortConfig({ key: "weekly_damage", direction: "desc" });
          }

          const [statsRes, usersRes] = await Promise.all([
            fetch(`${API_BASE}/country-stats?country=${selectedCountry}`), // get general stats
            fetch(`${API_BASE}/user-damage?country=${selectedCountry}&limit=${LIMIT}&week=${selectedWeek}`)
          ]);

          if (statsRes.ok) {
            const stats = await statsRes.json();
            const myStats = Array.isArray(stats) ? stats.find((s: any) => s.country_id === selectedCountry) : stats;
            setCountryStats(myStats || null);
          }
          if (usersRes.ok) {
            const users = await usersRes.json();
            setTopUsers(users);
          }

          // Fetch all countries to calculate the Global Total Damage Rank manually
          const dateParam = currentWeekEnd ? `?date=${currentWeekEnd}` : "";
          const [allCountriesRes] = await Promise.all([
            fetch(`${API_BASE}/country-stats${dateParam}`)
          ]);

          if (allCountriesRes.ok) {
            const allStats = await allCountriesRes.json();
            setAllCountriesStats(allStats);
          }

        } else if (activeTab === "countries") {
          // Reset sort correctly for countries if needed
          if (!sortConfig) {
            setSortConfig({ key: "weekly_damage", direction: "desc" });
          }

          const dateParam = currentWeekEnd ? `?date=${currentWeekEnd}` : "";
          const [allCountriesRes] = await Promise.all([
            fetch(`${API_BASE}/country-stats${dateParam}`)
          ]);

          if (allCountriesRes.ok) {
            const allStats = await allCountriesRes.json();
            setAllCountriesStats(allStats);
          }
        }
      } catch (err: any) {
        setError("Failed to fetch records. The data may still be collecting.");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [selectedCountry, selectedWeek, activeTab]);

  const selectedCountryData = useMemo(() => {
    return countries.find(c => c.country_id === selectedCountry);
  }, [countries, selectedCountry]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = useMemo(() => {
    let sortable = [...topUsers];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let aVal = a[sortConfig.key] || 0;
        let bVal = b[sortConfig.key] || 0;
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [topUsers, sortConfig]);

  // Derived global rank for total damage of the selected country
  const rankTotalDamage = useMemo(() => {
    if (!selectedCountry || allCountriesStats.length === 0) return null;

    // Create a sorted list based on total_damage descending
    const sortedByTotalDamage = [...allCountriesStats].sort((a, b) => {
      const aVal = a.total_damage || 0;
      const bVal = b.total_damage || 0;
      return bVal - aVal;
    });

    const index = sortedByTotalDamage.findIndex(c => c.country_id === selectedCountry);
    return index !== -1 ? index + 1 : null;
  }, [allCountriesStats, selectedCountry]);

  const sortedCountries = useMemo(() => {
    let sortable = [...allCountriesStats];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let aVal = a[sortConfig.key] || 0;
        let bVal = b[sortConfig.key] || 0;
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [allCountriesStats, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-zinc-600 ml-1 inline" />;
    return sortConfig.direction === "asc"
      ? <ArrowUp className="w-3 h-3 text-blue-400 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 text-blue-400 ml-1 inline" />;
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'diamond': return 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';
      case 'platinum': return 'text-indigo-400 border-indigo-400/30 bg-indigo-400/10';
      case 'gold': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'silver': return 'text-zinc-300 border-zinc-300/30 bg-zinc-300/10';
      case 'bronze': return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
      default: return 'text-zinc-400 border-zinc-700 bg-zinc-800/50';
    }
  };

  const CitizenDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;

    // Scale level to a reasonable radius (e.g. Lvl 1->4px, Lvl 200->16px)
    const userLevel = payload.level || 1;
    const r = Math.max(4, Math.min(16, 4 + (userLevel / 16)));

    if (payload.avatar_url) {
      const size = r * 2;
      return (
        <svg x={cx - r} y={cy - r} width={size} height={size}>
          <clipPath id={`clip-${payload.user_id}`}>
            <circle cx={r} cy={r} r={r} />
          </clipPath>
          <image href={payload.avatar_url} width={size} height={size} clipPath={`url(#clip-${payload.user_id})`} preserveAspectRatio="xMidYMid slice" />
        </svg>
      );
    }
    return <circle cx={cx} cy={cy} r={r} fill="#3b82f6" opacity={0.6} />;
  };

  const CitizenTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
          <p className="font-bold text-white mb-1">{data.username}</p>
          <p className="text-sm text-zinc-400">Lvl {data.level} • {data.tier}</p>
          <div className="mt-2 text-sm">
            <p><span className="text-red-400">Weekly Dmg:</span> {formatNumber(data.weekly_damage)}</p>
            <p><span className="text-yellow-400">Wealth:</span> {formatNumber(data.wealth)}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CountryDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;

    const flagUrl = payload.code ? `https://hatscripts.github.io/circle-flags/flags/${payload.code.toLowerCase()}.svg` : null;

    if (flagUrl) {
      return <image x={cx - 8} y={cy - 8} href={flagUrl} width="16" height="16" opacity={0.85} />;
    }
    return <circle cx={cx} cy={cy} r={6} fill="#10b981" opacity={0.6} />;
  };

  const CountryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
          <p className="font-bold text-white mb-1">{data.name}</p>
          <div className="mt-2 text-sm flex gap-4">
            <div>
              <p className="text-zinc-500 text-xs">Weekly Damage</p>
              <p className="font-mono text-red-400">{formatNumber(data.weekly_damage)}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Wealth</p>
              <p className="font-mono text-green-400">{formatNumber(data.money)}</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
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
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8">
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

      {/* Primary Tab Switcher */}
      <div className="flex border-b border-zinc-800 mb-6">
        <button
          onClick={() => setActiveTab("citizens")}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "citizens" ? "border-blue-500 text-blue-400" : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"}`}
        >
          Top Citizens
        </button>
        <button
          onClick={() => setActiveTab("countries")}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "countries" ? "border-blue-500 text-blue-400" : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"}`}
        >
          Countries Ranking
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        {activeTab === "citizens" && (
          <div className="flex-1 max-w-xs bg-zinc-900 border border-zinc-800 rounded-lg shadow-sm">
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
        )}

        <div className="max-w-xs bg-zinc-900 border border-zinc-800 rounded-lg shadow-sm">
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
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-4" />
          <p className="text-zinc-400">Loading historical data...</p>
        </div>
      ) : activeTab === "citizens" ? (
        <>
          {/* Summary Cards for Selected Country */}
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
                    Weekly Damage
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-white">
                    {countryStats?.weekly_damage ? formatNumber(countryStats.weekly_damage) : "0"}
                  </span>
                </div>
                {countryStats?.rank_damage && (
                  <p className="text-sm text-zinc-500 mt-1">Global Wkl Dmg Rank: <span className="text-blue-400 font-medium">#{countryStats.rank_damage}</span></p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Target className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium uppercase tracking-wider">
                    Total Damage
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-white">
                    {countryStats?.total_damage ? formatNumber(countryStats.total_damage) : "0"}
                  </span>
                </div>
                {rankTotalDamage && (
                  <p className="text-sm text-zinc-500 mt-1">Global Total Dmg Rank: <span className="text-blue-400 font-medium">#{rankTotalDamage}</span></p>
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
          </div>

          {/* Whale vs Plankton Scatter Plot */}
          {topUsers.length > 0 && (
            <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50 mt-6 pt-2">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg flex items-center gap-2">Whale vs. Plankton Analysis</CardTitle>
                <CardDescription>Correlation between Weekly Damage and Wealth (Bubbles sized by Level)</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[350px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis type="number" scale="log" dataKey="weekly_damage" name="Weekly Damage" tickFormatter={(val) => formatNumber(val === 1 ? 0 : val)} stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12 }} domain={['auto', 'auto']} label={{ value: 'Weekly Damage (Log)', position: 'insideBottom', offset: -10, fill: '#71717a', fontSize: 12 }} />
                      <YAxis type="number" scale="log" dataKey="wealth" name="Wealth" tickFormatter={(val) => formatNumber(val === 1 ? 0 : val)} stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12 }} domain={['auto', 'auto']} label={{ value: 'Wealth (Log)', angle: -90, position: 'insideLeft', offset: 10, fill: '#71717a', fontSize: 12 }} />
                      <ZAxis type="number" dataKey="level" range={[10, 200]} name="Level" />
                      <Tooltip content={<CitizenTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#3f3f46' }} />
                      {/* Log scales crash on 0 values, so we bind Math.max(1, value) inline */}
                      <Scatter data={topUsers.map(u => ({ ...u, weekly_damage: Math.max(1, u.weekly_damage || 1), wealth: Math.max(1, u.wealth || 1) }))} shape={<CitizenDot />} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table Section */}
          <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50 mt-6 pt-2">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    Top {LIMIT} Citizens
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Showing top citizens in {selectedCountryData?.name || ''}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto w-full">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-xs text-zinc-400 uppercase bg-zinc-900 border-y border-zinc-800 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 font-medium">#</th>
                      <th className="px-6 py-4 font-medium cursor-pointer hover:text-zinc-200" onClick={() => requestSort("username")}>
                        Citizen <SortIcon columnKey="username" />
                      </th>
                      <th className="px-6 py-4 font-medium cursor-pointer hover:text-zinc-200" onClick={() => requestSort("tier")}>
                        Military Rank <SortIcon columnKey="tier" />
                      </th>
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:text-zinc-200 ${sortConfig?.key === 'weekly_damage' ? 'text-red-400 font-bold bg-zinc-800/20' : ''}`} onClick={() => requestSort("weekly_damage")}>
                        Weekly Damage <SortIcon columnKey="weekly_damage" />
                      </th>
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:text-zinc-200 ${sortConfig?.key === 'total_damage' ? 'text-red-400 font-bold bg-zinc-800/20' : ''}`} onClick={() => requestSort("total_damage")}>
                        Total Damage <SortIcon columnKey="total_damage" />
                      </th>
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:text-zinc-200 ${sortConfig?.key === 'wealth' ? 'text-yellow-400 font-bold bg-zinc-800/20' : ''}`} onClick={() => requestSort("wealth")}>
                        Current Wealth <SortIcon columnKey="wealth" />
                      </th>
                      <th className="px-6 py-4 font-medium cursor-pointer hover:text-zinc-200" onClick={() => requestSort("rank_damage")}>
                        Global Wkl Dmg Rank <SortIcon columnKey="rank_damage" />
                      </th>
                      <th className="px-6 py-4 font-medium cursor-pointer hover:text-zinc-200" onClick={() => requestSort("rank_wealth")}>
                        Global Wlt Rank <SortIcon columnKey="rank_wealth" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {sortedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-zinc-500">
                          No data available for this selection
                        </td>
                      </tr>
                    ) : (
                      sortedUsers.map((user, index) => (
                        <tr key={user.user_id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4 font-mono text-zinc-500">{index + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="avatar" className="w-8 h-8 rounded-full bg-zinc-800 object-cover border border-zinc-700" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                  <span className="text-zinc-500 font-bold text-xs">{user.username?.substring(0, 2).toUpperCase()}</span>
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-zinc-200">{user.username}</div>
                                <div className="text-xs text-zinc-500">Level {user.level || '?'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {user.tier ? (
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border transform uppercase ${getTierColor(user.tier)}`}>
                                {user.tier}
                              </span>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </td>
                          <td className={`px-6 py-4 font-mono ${sortConfig?.key === 'weekly_damage' ? 'text-red-400 font-bold bg-zinc-800/10' : 'text-zinc-300'}`}>
                            {user.weekly_damage ? user.weekly_damage.toLocaleString() : "0"}
                          </td>
                          <td className={`px-6 py-4 font-mono ${sortConfig?.key === 'total_damage' ? 'text-red-400 font-bold bg-zinc-800/10' : 'text-zinc-300'}`}>
                            {user.total_damage ? user.total_damage.toLocaleString() : "0"}
                          </td>
                          <td className={`px-6 py-4 font-mono ${sortConfig?.key === 'wealth' ? 'text-yellow-400 font-bold bg-zinc-800/10' : 'text-zinc-300'}`}>
                            {user.wealth ? Math.floor(user.wealth).toLocaleString() : "0"}
                          </td>
                          <td className="px-6 py-4 font-mono text-zinc-400">
                            {user.rank_damage ? `#${user.rank_damage}` : "-"}
                          </td>
                          <td className="px-6 py-4 font-mono text-zinc-400">
                            {user.rank_wealth ? `#${user.rank_wealth}` : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Countries Scatter Plot */}
          {allCountriesStats.length > 0 && (
            <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50 mt-6 pt-2">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg flex items-center gap-2">Global Powers Overview</CardTitle>
                <CardDescription>Comparing Weekly Damage vs Wealth across all nations</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[350px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis type="number" scale="log" dataKey="weekly_damage" name="Weekly Damage" tickFormatter={(val) => formatNumber(val === 1 ? 0 : val)} stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12 }} domain={['auto', 'auto']} label={{ value: 'Weekly Damage (Log)', position: 'insideBottom', offset: -10, fill: '#71717a', fontSize: 12 }} />
                      <YAxis type="number" scale="log" dataKey="money" name="Wealth" tickFormatter={(val) => formatNumber(val === 1 ? 0 : val)} stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12 }} domain={['auto', 'auto']} label={{ value: 'Wealth (Log)', angle: -90, position: 'insideLeft', offset: 10, fill: '#71717a', fontSize: 12 }} />
                      <Tooltip content={<CountryTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#3f3f46' }} />
                      {/* Log scales crash on 0 values, so we bind Math.max(1, value) inline */}
                      <Scatter data={allCountriesStats.map(c => ({ ...c, weekly_damage: Math.max(1, c.weekly_damage || 1), money: Math.max(1, c.money || 1) }))} shape={<CountryDot />} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Countries View Table Section */}
          <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50 mt-6 pt-2">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    Global Country Rankings
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Showing statistics for all countries globally
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto w-full">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-xs text-zinc-400 uppercase bg-zinc-900 border-y border-zinc-800 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 font-medium">#</th>
                      <th className="px-6 py-4 font-medium cursor-pointer hover:text-zinc-200" onClick={() => requestSort("name")}>
                        Country <SortIcon columnKey="name" />
                      </th>
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:text-zinc-200 ${sortConfig?.key === 'weekly_damage' ? 'text-red-400 font-bold bg-zinc-800/20' : ''}`} onClick={() => requestSort("weekly_damage")}>
                        Weekly Damage <SortIcon columnKey="weekly_damage" />
                      </th>
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:text-zinc-200 ${sortConfig?.key === 'total_damage' ? 'text-red-400 font-bold bg-zinc-800/20' : ''}`} onClick={() => requestSort("total_damage")}>
                        Total Damage <SortIcon columnKey="total_damage" />
                      </th>
                      <th className={`px-6 py-4 font-medium cursor-pointer hover:text-zinc-200 ${sortConfig?.key === 'wealth' ? 'text-yellow-400 font-bold bg-zinc-800/20' : ''}`} onClick={() => requestSort("wealth")}>
                        Current Wealth <SortIcon columnKey="wealth" />
                      </th>


                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {sortedCountries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                          No data available
                        </td>
                      </tr>
                    ) : (
                      sortedCountries.map((country, index) => (
                        <tr key={country.country_id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4 font-mono text-zinc-500">{index + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <CountryFlag countryCode={country.code} className="w-8 h-6 shadow-sm rounded-sm" />
                              <span className="font-bold text-zinc-200">{country.name}</span>
                            </div>
                          </td>
                          <td className={`px-6 py-4 font-mono ${sortConfig?.key === 'weekly_damage' ? 'text-red-400 font-bold bg-zinc-800/10' : 'text-zinc-300'}`}>
                            {country.weekly_damage ? formatNumber(country.weekly_damage) : "0"}
                          </td>
                          <td className={`px-6 py-4 font-mono ${sortConfig?.key === 'total_damage' ? 'text-red-400 font-bold bg-zinc-800/10' : 'text-zinc-300'}`}>
                            {country.total_damage ? formatNumber(country.total_damage) : "0"}
                          </td>
                          <td className={`px-6 py-4 font-mono ${sortConfig?.key === 'wealth' ? 'text-yellow-400 font-bold bg-zinc-800/10' : 'text-zinc-300'}`}>
                            {country.wealth ? formatNumber(country.wealth) : "0"}
                          </td>


                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
