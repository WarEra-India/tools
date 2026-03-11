import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getCountryRanking, getAllCountries } from "@/lib/api/warera"
import type { CountryRanking, Country } from "@/lib/api/warera"
import { Loader2 } from "lucide-react"
import { CountryFlag } from "@/components/CountryFlag"

const CustomTooltip = ({ active, payload, label, color }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-900 border border-zinc-700 p-2 xl:p-3 rounded-lg shadow-xl flex items-center gap-3">
        {data.code && <CountryFlag countryCode={data.code} className="w-8 h-6" />}
        <div>
          <p className="text-zinc-300 text-sm font-semibold">{label}</p>
          <p className="text-sm font-mono" style={{ color: color }}>
            {new Intl.NumberFormat('en-US').format(payload[0].value)}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function BattleAnalyzer() {
  const [loading, setLoading] = useState(true)
  const [countries, setCountries] = useState<Record<string, Country>>({})
  const [activityData, setActivityData] = useState<CountryRanking[]>([])
  const [damageData, setDamageData] = useState<CountryRanking[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [countriesMap, activity, damage] = await Promise.all([
          getAllCountries(),
          getCountryRanking("countryActivePopulation"),
          getCountryRanking("weeklyCountryDamages")
        ])
        
        setCountries(countriesMap)
        
        // Map over data to inject the country name directly
        const mappedActivity = activity.map((r: any) => ({
          ...r,
          name: countriesMap[r.country || r.entityId]?.name || "Unknown",
          code: countriesMap[r.country || r.entityId]?.code,
        }))
        const mappedDamage = damage.map((r: any) => ({
          ...r,
          name: countriesMap[r.country || r.entityId]?.name || "Unknown",
          code: countriesMap[r.country || r.entityId]?.code,
        }))

        // Sort and take top 15
        setActivityData(mappedActivity.sort((a, b) => b.value - a.value).slice(0, 15))
        setDamageData(mappedDamage.sort((a, b) => b.value - a.value).slice(0, 15))
      } catch (err: any) {
        setError(err.message || "Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-4" />
        <p className="text-zinc-400">Loading live battle intelligence...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Battle Intelligence</h1>
        <p className="text-zinc-400">Live country strength and activity analysis based on the last 7 days.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
          <CardHeader>
            <CardTitle>Country Active Population</CardTitle>
            <CardDescription>Top 15 most active countries right now (live activity score)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#71717a' }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#a1a1aa' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    content={<CustomTooltip color="#60a5fa" />}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {activityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(210, 100%, ${60 - (index * 2)}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Damage Chart */}
        <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
          <CardHeader>
            <CardTitle>Weekly Damage Output</CardTitle>
            <CardDescription>Top 15 strongest countries by damage in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={damageData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    type="number" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#71717a' }}
                    tickFormatter={(val) => {
                      if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
                      if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
                      return val;
                    }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#a1a1aa' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    content={<CustomTooltip color="#f87171" />}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {damageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(350, 80%, ${60 - (index * 2)}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
