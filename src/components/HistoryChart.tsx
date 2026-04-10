import { useState, useEffect } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const API_BASE = "https://warvault.shadoooow.workers.dev/api";

interface HistoryData {
  date: string;
  wealth: number;
  total_damage: number;
}

interface HistoryChartProps {
  userId?: string;
  countryId?: string;
  title?: string;
  subtitle?: string;
}

export function HistoryChart({ userId, countryId, title = "Performance Index", subtitle = "Growth Metrics" }: HistoryChartProps) {
  const [data, setData] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = userId || countryId;
    if (!id) return;

    setLoading(true);
    const endpoint = userId 
      ? `${API_BASE}/user-wealth-history?user=${userId}`
      : `${API_BASE}/country-wealth-history?country=${countryId}`;

    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("History fetch error:", err);
        setLoading(false);
      });
  }, [userId, countryId]);

  const hasData = data && data.length > 0;

  return (
    <div 
      className={`h-[350px] w-full rounded-[32px] border transition-all duration-700 overflow-hidden relative ${
        loading ? "bg-zinc-900/5 border-zinc-800/5 text-zinc-500" : "bg-zinc-900/20 border-zinc-800/30 backdrop-blur-md shadow-2xl shadow-black/20 text-zinc-50"
      }`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/10 via-zinc-500/10 to-rose-500/10 opacity-20" />
      
      {loading ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 animate-in fade-in duration-500">
           <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/30 animate-pulse" />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/30 animate-pulse [animation-delay:0.2s]" />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/30 animate-pulse [animation-delay:0.4s]" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-800">Processing Data Stream</span>
        </div>
      ) : hasData ? (
        <div className="p-6 h-full w-full animate-in fade-in duration-1000">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-1">{title}</span>
              <h3 className="text-lg font-black font-mono tracking-tight text-inherit uppercase italic">{subtitle}</h3>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Wealth</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Damage</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorWealthComp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDamageComp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#52525b', fontSize: 9, fontWeight: 700 }}
                dy={10}
                tickFormatter={(str) => {
                  const d = new Date(str);
                  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }}
              />
              <YAxis 
                yAxisId="left"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#10b981', fontSize: 9, fontWeight: 800, fontFamily: 'monospace' }}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                  return `${(val / 1000).toFixed(1)}k`;
                }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#f43f5e', fontSize: 9, fontWeight: 800, fontFamily: 'monospace' }}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                  return `${(val / 1000).toFixed(0)}k`;
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#09090b', 
                  border: '1px solid #27272a',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 800,
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                itemStyle={{ padding: '2px 0' }}
                labelStyle={{ color: '#71717a', marginBottom: '8px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                formatter={(value: any, name: any) => [
                  <span className="font-mono text-zinc-200">{value?.toLocaleString() || '0'}</span>,
                  <span className={name === "wealth" ? "text-emerald-500" : "text-rose-500"}>{name?.toUpperCase() || ''}</span>
                ]}
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="wealth" 
                name="wealth"
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorWealthComp)" 
                animationDuration={2000}
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="total_damage" 
                name="damage"
                stroke="#f43f5e" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorDamageComp)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-700 text-[10px] font-black uppercase tracking-[0.2em]">
          No performance records available
        </div>
      )}
    </div>
  );
}
