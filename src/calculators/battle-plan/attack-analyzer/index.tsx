import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getAllCountries, getAllRegions, getBunkerLevel, getCountryRanking } from "@/lib/api/warera"
import type { Country, Region } from "@/lib/api/warera"
import { Loader2, Search } from "lucide-react"
import { CountryFlag } from "@/components/CountryFlag"

function SearchSelect({ 
  label, 
  items, 
  value, 
  onChange, 
  renderItem,
  placeholder = "Search..."
}: {
  label: string
  items: { id: string; name: string; extra?: React.ReactNode }[]
  value: string
  onChange: (id: string) => void
  renderItem?: (item: { id: string; name: string; extra?: React.ReactNode }) => React.ReactNode
  placeholder?: string
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  
  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(i => i.name.toLowerCase().includes(q))
  }, [items, search])

  const selected = items.find(i => i.id === value)

  return (
    <div className="relative">
      <label className="text-sm font-medium text-zinc-300 mb-1.5 block">{label}</label>
      {!open ? (
        <button
          onClick={() => { setOpen(true); setSearch("") }}
          className="w-full flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-white p-2.5 rounded-lg text-left hover:border-zinc-600 transition-colors"
        >
          {selected ? (
            renderItem ? renderItem(selected) : <span>{selected.name}</span>
          ) : (
            <span className="text-zinc-500">-- Select --</span>
          )}
        </button>
      ) : (
        <div className="w-full">
          <div className="flex items-center bg-zinc-900 border border-zinc-600 rounded-lg overflow-hidden">
            <Search className="h-4 w-4 text-zinc-500 ml-3" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onBlur={() => setTimeout(() => setOpen(false), 200)}
              placeholder={placeholder}
              className="flex-1 bg-transparent border-none text-white p-2.5 text-sm outline-none"
            />
          </div>
          <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
            {filtered.length === 0 && <p className="p-3 text-sm text-zinc-500">No results</p>}
            {filtered.slice(0, 50).map(item => (
              <button
                key={item.id}
                onMouseDown={(e) => { e.preventDefault(); onChange(item.id); setOpen(false) }}
                className={`w-full flex items-center gap-2 p-2.5 text-sm text-left hover:bg-zinc-800 transition-colors ${value === item.id ? 'bg-zinc-800/50 text-white' : 'text-zinc-300'}`}
              >
                {renderItem ? renderItem(item) : <span>{item.name}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AttackAnalyzer() {
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [countries, setCountries] = useState<Country[]>([])
  const [countriesMap, setCountriesMap] = useState<Record<string, Country>>({})
  const [regions, setRegions] = useState<Region[]>([])
  const [activityScores, setActivityScores] = useState<Record<string, number>>({})
  const [damageScores, setDamageScores] = useState<Record<string, number>>({})

  const [attackerId, setAttackerId] = useState<string>("")
  const [defenderId, setDefenderId] = useState<string>("")
  const [regionId, setRegionId] = useState<string>("")
  
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    async function loadBaseSelects() {
      try {
        const [cmap, regionsMap, activityRank, damageRank] = await Promise.all([
          getAllCountries(),
          getAllRegions(),
          getCountryRanking("countryActivePopulation"),
          getCountryRanking("weeklyCountryDamages")
        ])

        setCountriesMap(cmap)
        setCountries(Object.values(cmap).sort((a, b) => a.name.localeCompare(b.name)))
        setRegions(Object.values(regionsMap).sort((a, b) => a.name.localeCompare(b.name)))

        const aScores: Record<string, number> = {}
        activityRank.forEach(r => { aScores[(r as any).country || r.entityId] = r.value })
        setActivityScores(aScores)

        const dScores: Record<string, number> = {}
        damageRank.forEach(r => { dScores[(r as any).country || r.entityId] = r.value })
        setDamageScores(dScores)

      } catch (err) {
        console.error(err)
      } finally {
        setLoadingInitial(false)
      }
    }
    loadBaseSelects()
  }, [])

  // Filter regions by defender's country
  const defenderRegions = useMemo(() => {
    if (!defenderId) return regions
    return regions.filter(r => r.countryId === defenderId)
  }, [defenderId, regions])

  // Auto-clear region if no longer valid for selected defender
  useEffect(() => {
    if (defenderId && regionId) {
      const valid = defenderRegions.find(r => r._id === regionId)
      if (!valid) setRegionId("")
    }
  }, [defenderId, defenderRegions, regionId])

  const handleAnalyze = async () => {
    if (!attackerId || !defenderId || !regionId) return
    setAnalyzing(true)
    try {
      const region = regions.find(r => r._id === regionId)
      const bunkerLevel = await getBunkerLevel(regionId)
      
      // Defense Bonus from region is usually a raw percentage like 20 for 20%
      // So if it's not present we assume 0
      const rawDefenseBonus = region?.defenseBonus || 0
      const defenseBonus = 1 + (rawDefenseBonus / 100)

      const attackPower = (damageScores[attackerId] || 1) * Math.max(1, (activityScores[attackerId] || 1))
      
      const bunkerMultiplier = 1 + (bunkerLevel * 0.10)
      const defPower = (damageScores[defenderId] || 1) * Math.max(1, (activityScores[defenderId] || 1)) * defenseBonus * bunkerMultiplier
      
      const winChance = (attackPower / (attackPower + defPower)) * 100

      setResult({
        attackPower,
        defPower,
        bunkerLevel,
        defenseBonus,
        winChance
      })
    } catch (err) {
      console.error(err)
    } finally {
        setAnalyzing(false)
    }
  }

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-4" />
        <p className="text-zinc-400">Loading map data...</p>
      </div>
    )
  }

  const attacker = countriesMap[attackerId]
  const defender = countriesMap[defenderId]

  const countryItems = countries.map(c => ({ id: c._id, name: c.name, extra: <CountryFlag countryCode={c.code} className="w-5 h-3.5" /> }))
  const regionItems = defenderRegions.map(r => ({ id: r._id, name: r.name }))

  const renderCountryItem = (item: { id: string; name: string; extra?: React.ReactNode }) => (
    <span className="flex items-center gap-2">
      {item.extra}
      <span className="truncate">{item.name}</span>
    </span>
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Attack Analyzer</h1>
        <p className="text-zinc-400">Estimate win probability based on live country strengths and regional defenses.</p>
      </div>

      <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
        <CardHeader>
          <CardTitle>Combat Scenario</CardTitle>
          <CardDescription>Select the combatants and target region to calculate odds.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SearchSelect
              label="Attacking Country"
              items={countryItems}
              value={attackerId}
              onChange={setAttackerId}
              renderItem={renderCountryItem}
              placeholder="Search country..."
            />
            <SearchSelect
              label="Defending Country"
              items={countryItems}
              value={defenderId}
              onChange={(id) => { setDefenderId(id); setRegionId("") }}
              renderItem={renderCountryItem}
              placeholder="Search country..."
            />
            <SearchSelect
              label={defenderId ? `Target Region (${defender?.name || ""})` : "Target Region"}
              items={regionItems}
              value={regionId}
              onChange={setRegionId}
              placeholder="Search region..."
            />
          </div>
          
          <button 
            disabled={!attackerId || !defenderId || !regionId || analyzing}
            onClick={handleAnalyze}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {analyzing ? "Analyzing..." : "Calculate Win Probability"}
          </button>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50 overflow-hidden relative">
          <div 
            className="absolute top-0 left-0 h-1 bg-gradient-to-r transition-all duration-1000"
            style={{ 
              width: `${result.winChance}%`,
              background: result.winChance > 60 ? 'linear-gradient(90deg, #10b981, #059669)' : 
                         result.winChance > 40 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 
                         'linear-gradient(90deg, #ef4444, #dc2626)'
            }}
          />
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-4">
              <span className="flex items-center gap-2 text-blue-400">
                <CountryFlag countryCode={attacker?.code} className="w-6 h-4" />
                {attacker?.name}
              </span>
              <span className="text-zinc-600 text-sm">VS</span>
              <span className="flex items-center gap-2 text-red-400">
                {defender?.name}
                <CountryFlag countryCode={defender?.code} className="w-6 h-4" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-4 text-center">
                <div className="text-6xl font-black tracking-tighter mb-2" style={{
                    color: result.winChance > 60 ? '#10b981' : result.winChance > 40 ? '#f59e0b' : '#ef4444'
                }}>
                    {result.winChance.toFixed(1)}%
                </div>
                <p className="text-zinc-400 font-medium">Estimated Attacker Win Probability</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t border-zinc-800/50 pt-6">
                <div className="text-center">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Base Defense</p>
                    <p className="text-lg font-semibold text-zinc-200">+{((result.defenseBonus - 1) * 100).toFixed(0)}%</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Bunker Lvl</p>
                    <p className="text-lg font-semibold text-zinc-200">{result.bunkerLevel}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Attacker Score</p>
                    <p className="text-sm font-semibold text-zinc-400" title={result.attackPower.toString()}>{Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(result.attackPower)}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Defender Score</p>
                    <p className="text-sm font-semibold text-zinc-400" title={result.defPower.toString()}>{Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(result.defPower)}</p>
                </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
