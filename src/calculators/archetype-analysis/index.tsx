import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Radar, Shield, Swords, Coins, PieChart as PieChartIcon, Target, Info } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Legend, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as ReRadar } from "recharts";
import { useProfile } from "@/lib/ProfileContext";

const API_BASE = "https://warvault.shadoooow.workers.dev/api";
const SKILLS_BASE_IMAGE_URL = `${import.meta.env.BASE_URL}images/`;

type Archetype = "Vanguard" | "Industrialist" | "Sentinel";

interface SkillInfo {
  l: number; // level
  t: number; // total value
}

interface UserSkills {
  energy: SkillInfo;
  health: SkillInfo;
  hunger: SkillInfo;
  attack: SkillInfo;
  companies: SkillInfo;
  entrepreneurship: SkillInfo;
  production: SkillInfo;
  criticalChance: SkillInfo;
  criticalDamages: SkillInfo;
  armor: SkillInfo;
  precision: SkillInfo;
  dodge: SkillInfo;
  lootChance: SkillInfo;
  management: SkillInfo;
}

interface UserRecord {
  user_id: string;
  username: string;
  avatar_url: string;
  level: number;
  weekly_damage: number;
  wealth: number;

  current: {
    date: string;
    warFocus: number;
    archetype: Archetype;
    skills: UserSkills;
  };

  history: {
    date: string;
    warFocus: number;
    archetype: Archetype;
    skills: UserSkills;
  }[];
}

interface AnalyzedUser extends UserRecord {
  parsedSkills: UserSkills;
  warScore: number;
  ecoScore: number;
  warFocus: number;
  archetype: Archetype;
}

export const SKILL_GROUPS: { WAR: (keyof UserSkills)[]; ECO: (keyof UserSkills)[] } = {
  ECO: ["companies", "entrepreneurship", "production", "management", "lootChance", "energy"],
  WAR: ["attack", "criticalChance", "criticalDamages", "armor", "precision", "dodge", "health", "hunger"],
};

const MODE_TYPES = Object.keys(SKILL_GROUPS) as Array<keyof typeof SKILL_GROUPS>;

const COLORS = {
  Vanguard: "#ef4444", // Red
  Industrialist: "#10b981", // Green
  Sentinel: "#a855f7",   // Purple
};


const DECIDER_PERCENTAGES = {
  VANGUARD: 0.65,
  INDUSTRIALIST: 0.35,
}

const ARCHETYPE_DEFS = {
  Vanguard: {
    title: "Vanguard (Combat Focus)",
    desc: `Tactical frontliners with >${DECIDER_PERCENTAGES.VANGUARD * 100}% investment in military skills (Attack, Crit, Armor, etc.). Built for maximum damage output.`,
    icon: <Swords className="w-4 h-4 text-red-500" />
  },
  Industrialist: {
    title: "Industrialist (Economy Focus)",
    desc: `Treasury builders with >${DECIDER_PERCENTAGES.VANGUARD * 100}% investment in production and management. Optimized for wealth generation.`,
    icon: <Coins className="w-4 h-4 text-green-500" />
  },
  Sentinel: {
    title: "Sentinel (Hybrid Support)",
    desc: "Balanced operators maintaining 35%-65% ratio between War and Eco. Capable of switching between frontlines and production.",
    icon: <Shield className="w-4 h-4 text-purple-500" />
  }
};

/** Pure function to determine archetype based on war focus ratio */
const getArchetype = (skills: UserSkills): { archetype: Archetype; warSum: number; ecoSum: number; warFocus: number } => {
  let warSum = 0;
  let ecoSum = 0;

  SKILL_GROUPS.WAR.forEach(s => warSum += (skills[s as keyof UserSkills]?.l || 0));
  SKILL_GROUPS.ECO.forEach(s => ecoSum += (skills[s as keyof UserSkills]?.l || 0));

  const total = warSum + ecoSum;
  const warFocus = total > 0 ? warSum / total : 0.5;
  let archetype: Archetype;
  if (warFocus > DECIDER_PERCENTAGES.VANGUARD) {
    archetype = "Vanguard";
  } else if (warFocus < DECIDER_PERCENTAGES.INDUSTRIALIST) {
    archetype = "Industrialist";
  } else {
    archetype = "Sentinel";
  }
  return { archetype, warSum, ecoSum, warFocus };
};

function getModeSegments(history: {
  date: string;
  warFocus: number;
  archetype: Archetype;
  skills: UserSkills;
}[]) {
  if (!history.length) return [];

  const segments = [];
  let current = {
    archetype: history[0].archetype,
    start: history[0].date,
    end: history[0].date,
    count: 1
  };

  for (let i = 1; i < history.length; i++) {
    const h = history[i];

    if (h.archetype === current.archetype) {
      current.end = h.date;
      current.count++;
    } else {
      segments.push(current);
      current = {
        archetype: h.archetype,
        start: h.date,
        end: h.date,
        count: 1
      };
    }
  }

  segments.push(current);
  return segments;
}

export default function ArchetypeAnalysis() {
  const { profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [data, setData] = useState<AnalyzedUser[]>([]);
  const [filter, setFilter] = useState<Archetype | "All">("All");

  useEffect(() => {
    async function fetchCountries() {
      const res = await fetch(`${API_BASE}/countries`);
      const list = await res.json();
      setCountries(list);

      // Default to profile's country if user is logged in
      if (profile?.user?.country) {
        setSelectedCountry(profile.user.country);
      } else if (list.length > 0) {
        setSelectedCountry(list[0].country_id);
      }
    }
    fetchCountries();
  }, [profile]);

  const fetchAnalysis = async () => {
    if (!selectedCountry) return;
    setLoading(true);
  
    try {
      const res = await fetch(`${API_BASE}/user-skills-history?country=${selectedCountry}&days=365`);
      const rawData: UserRecord[] = await res.json();
  
      const analyzed: AnalyzedUser[] = rawData.map(u => {
        const parsed = u.current.skills;
  
        const { archetype, warSum, ecoSum, warFocus } = getArchetype(parsed);
  
        return {
          ...u,
          parsedSkills: parsed,
          warScore: warSum,
          ecoScore: ecoSum,
          warFocus,
          archetype
        };
      });
  
      setData(analyzed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [selectedCountry]);

  const stats = useMemo(() => {
    const counts = { Vanguard: 0, Industrialist: 0, Sentinel: 0 };
    const sums = { Vanguard: 0, Industrialist: 0, Sentinel: 0 };

    data.forEach(u => {
      counts[u.archetype]++;
      sums[u.archetype] += u.level;
    });

    const distribution = Object.entries(counts).map(([name, value]) => ({ name, value }));

    // Average skill levels for radar
    const averageSkills: Record<string, number> = {};
    const allSkillKeys = [...SKILL_GROUPS.WAR, ...SKILL_GROUPS.ECO];

    allSkillKeys.forEach(key => {
      const totalLevel = data.reduce((acc, u) => acc + (u.parsedSkills[key as keyof UserSkills]?.l || 0), 0);
      averageSkills[key] = data.length > 0 ? totalLevel / data.length : 0;
    });

    const radarData = allSkillKeys.map(key => ({
      subject: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      A: averageSkills[key],
      fullMark: 10,
    }));

    return { distribution, radarData, counts };
  }, [data]);

  const filteredData = useMemo(() => {
    return filter === "All" ? data : data.filter(u => u.archetype === filter);
  }, [data, filter]);

  const countryTimeline = useMemo(() => {
    const map: Record<string, { date: string, Vanguard: number, Industrialist: number, Sentinel: number }> = {};
  
    data.forEach(user => {
      user.history.forEach(day => {
        if (!map[day.date]) {
          map[day.date] = {
            date: day.date,
            Vanguard: 0,
            Industrialist: 0,
            Sentinel: 0,
          };
        }
  
        map[day.date][day.archetype]++;
      });
    });
  
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Radar className="w-8 h-8 text-purple-500 animate-pulse" />
              Strategic Archetype Analysis
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Personnel skill profiling and tactical mode categorization.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
          <label className="text-[10px] font-black uppercase text-zinc-500 px-3 tracking-widest">Select Nation</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm font-bold text-white outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
          >
            {countries.map(c => <option key={c.country_id} value={c.country_id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Archetype Intelligence Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(ARCHETYPE_DEFS).map(([key, def]) => (
          <Card key={key} className="bg-zinc-950/40 border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS[key as Archetype]}15` }}>
                  {def.icon}
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">{def.title}</h3>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                {def.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
          <p className="text-zinc-500 font-medium font-mono text-sm tracking-widest uppercase">Analyzing Personnel Archetypes...</p>
        </div>
      ) : data.length > 0 ? (
        <>
           <Card className="bg-zinc-950/50 border-zinc-800 shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-zinc-900 pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                Evolution Timeline
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={countryTimeline}>
                    <XAxis dataKey="date" hide />
                    <YAxis />
                    <Tooltip />
                    {/* <Legend /> */}

                    <Line dataKey="Vanguard" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line dataKey="Industrialist" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line dataKey="Sentinel" stroke="#a855f7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT: Charts & Aggregates */}
            <div className="lg:col-span-12 xl:col-span-5 space-y-6 lg:sticky lg:top-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-zinc-950/40 border-zinc-800 border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Vanguard</p>
                    <p className="text-2xl font-black text-white">{stats.counts.Vanguard}</p>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-950/40 border-zinc-800 border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Industrialist</p>
                    <p className="text-2xl font-black text-white">{stats.counts.Industrialist}</p>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-950/40 border-zinc-800 border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Sentinel</p>
                    <p className="text-2xl font-black text-white">{stats.counts.Sentinel}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-zinc-950/50 border-zinc-800 shadow-2xl overflow-hidden">
                <CardHeader className="border-b border-zinc-900 pb-4">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-purple-400" />
                    Roster Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as Archetype]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                        />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-950/50 border-zinc-800 shadow-2xl overflow-hidden">
                <CardHeader className="border-b border-zinc-900 pb-4">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-400" />
                    National Skill Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
                        <PolarGrid stroke="#27272a" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 8 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                        <ReRadar
                          name="Average Level"
                          dataKey="A"
                          stroke="#a855f7"
                          fill="#a855f7"
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/50">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 text-zinc-500 mt-0.5" />
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        Radar identifies the nation's core competencies. Spikes in war-related skills indicate military readiness, while economic spikes suggest a focus on treasury growth.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: Personnel List */}
            <div className="lg:col-span-12 xl:col-span-7 space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Personnel Dossier</h3>
                  <div className="h-4 w-px bg-zinc-800" />
                  <div className="flex gap-2">
                    {["All", "Vanguard", "Industrialist", "Sentinel"].map(a => (
                      <button
                        key={a}
                        onClick={() => setFilter(a as any)}
                        className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all ${filter === a ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredData.map(u => {
                  const segments = getModeSegments(u.history);
                  const totalDays = u.history.length;

                  return (
                    <div
                      key={u.user_id}
                      className="bg-zinc-950/40 border p-4 rounded-2xl transition-all group overflow-hidden relative"
                      style={{ backgroundColor: `${COLORS[u.archetype]}10`, borderColor: `${COLORS[u.archetype]}30` }}
                    >
                      {/* Subtle Background Icon */}
                      <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        {u.archetype === 'Vanguard' ? <Swords className="w-24 h-24" /> : u.archetype === 'Industrialist' ? <Coins className="w-24 h-24" /> : <Shield className="w-24 h-24" />}
                      </div>

                      <div className="flex items-center gap-4 relative z-10">
                        <div className="relative">
                          <img src={u.avatar_url} className="w-14 h-14 rounded-xl border border-zinc-800 shadow-xl" alt="" />
                          {/* <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-950`} style={{ backgroundColor: COLORS[u.archetype] }} /> */}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-black text-white truncate">{u.username}</p>
                            <span className="text-[10px] font-bold text-blue-500 uppercase font-mono">Lvl {u.level}</span>
                            
                            <div className="flex items-center gap-2 ml-auto">
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-red-500 font-mono leading-none">
                                  {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(u.weekly_damage)}
                                </span>
                                <span className="text-[7px] font-bold text-red-900 uppercase tracking-tighter">DMG/W</span>
                              </div>
                              <div className="h-6 w-px bg-zinc-800/50 mx-1" />
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-green-500 font-mono leading-none">
                                  {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(u.wealth)}
                                </span>
                                <span className="text-[7px] font-bold text-green-900 uppercase tracking-tighter">WEALTH</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-centre gap-4 w-full">
                            {MODE_TYPES.map((key) => {
                              const focus = key == "WAR" ? u.warFocus : (1 - u.warFocus);
                              if (focus === 0) {
                                return null;
                              }

                              return (
                                <div className="flex flex-col gap-2 flex-1" key={key}>
                                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter text-center">{key} {(focus * 100).toFixed(0)}%</span>
                                  <div className="flex flex-wrap gap-1">
                                    {SKILL_GROUPS[key].map(s =>
                                      Array.from({ length: u.parsedSkills[s].l }).map((_, i) => (
                                        <img src={`${SKILLS_BASE_IMAGE_URL}${s}.svg`} alt={s} className="w-2 h-2" key={s + i} />
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-3 pt-3 border-t border-zinc-900/50">
                            <div className="flex h-5 w-full overflow-hidden rounded-lg bg-zinc-900 text-[8px] font-bold">
                              {segments.map((seg, i) => {
                                const width = (seg.count / totalDays) * 100;
                                return (
                                  <div
                                    key={i}
                                    title={`${seg.archetype} • ${seg.count} days (${seg.start} → ${seg.end})`}
                                    className="flex items-center justify-center text-black"
                                    style={{
                                      width: `${width}%`,
                                      backgroundColor: COLORS[seg.archetype]
                                    }}
                                  >
                                    {seg.count >= 3 && (
                                      <span className="truncate px-1">
                                        {seg.count}d
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex justify-between mt-1 text-[8px] text-zinc-600 font-mono">
                              <span>{u.history[0]?.date}</span>
                              <span>{u.history[u.history.length - 1]?.date}</span>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  );
                })}
           
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-zinc-800 rounded-3xl">
          <PieChartIcon className="w-12 h-12 text-zinc-800 mb-4" />
          <p className="text-zinc-600 font-bold uppercase text-xs tracking-widest">No Tactical Data Found</p>
        </div>
      )}
    </div>
  );
}
