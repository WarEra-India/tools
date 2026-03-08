import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getActiveBattles, getLiveBattleData, getLastHits, getBattleRanking, getAllCountries, getAllRegions, type Battle, type Country, type Region } from "@/lib/api/warera"
import { Loader2 } from "lucide-react"
import { CountryFlag } from "@/components/CountryFlag"

// Adaptive damage formatting
function formatDmg(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

export default function LiveBattle() {
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [activeBattles, setActiveBattles] = useState<Battle[]>([])
  const [countries, setCountries] = useState<Record<string, Country>>({})
  const [regions, setRegions] = useState<Record<string, Region>>({})

  const [selectedBattleId, setSelectedBattleId] = useState<string>("")
  const [liveData, setLiveData] = useState<any>(null)
  const [hits, setHits] = useState<any[]>([])
  const [attackerRanking, setAttackerRanking] = useState<any[]>([])
  const [defenderRanking, setDefenderRanking] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const defaultInterval = 10000;
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function loadInitial() {
      try {
        const [battles, cmap, rmap] = await Promise.all([
          getActiveBattles(),
          getAllCountries(),
          getAllRegions()
        ])
        setActiveBattles(battles)
        setCountries(cmap)
        setRegions(rmap)
        if (battles.length > 0) {
            setSelectedBattleId(battles[0]._id)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoadingInitial(false)
      }
    }
    loadInitial()
  }, [])

  const pollBattle = async () => {
    if (!selectedBattleId) return
    try {
        const data = await getLiveBattleData(selectedBattleId)
        setLiveData(data)

        // API returns {battle, round} where round has roundId
        const roundId = data?.round?.roundId
        
        if (roundId) {
            // getLastHits returns {attacker: [...], defender: [...]}
            const [hitsData, aRank, dRank] = await Promise.all([
                getLastHits(roundId),
                getBattleRanking(selectedBattleId, "attacker"),
                getBattleRanking(selectedBattleId, "defender"),
            ])
            // Merge attacker & defender hits, mark side, sort by time
            const attackerHits = (hitsData?.attacker || []).map((h: any) => ({...h, side: 'attacker'}))
            const defenderHits = (hitsData?.defender || []).map((h: any) => ({...h, side: 'defender'}))
            const allHits = [...attackerHits, ...defenderHits]
              .sort((a, b) => new Date(b.hitAt).getTime() - new Date(a.hitAt).getTime())
            setHits(allHits.slice(0, 15))
            setAttackerRanking(aRank.slice(0, 5))
            setDefenderRanking(dRank.slice(0, 5))
        }

    } catch (err) {
        console.error("Poll error", err)
    }
  }

  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (!selectedBattleId) return
    
    // Initial fetch immediately
    pollBattle()
    
    // Then poll every X seconds
    pollIntervalRef.current = setInterval(pollBattle, defaultInterval)

    return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [selectedBattleId])

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-4" />
        <p className="text-zinc-400">Loading active battles...</p>
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>
  }

  const selectedBattle = activeBattles.find(b => b._id === selectedBattleId)
  const aCountry = selectedBattle ? countries[selectedBattle.attackerCountryId] : null
  const dCountry = selectedBattle ? countries[selectedBattle.defenderCountryId] : null
  const region = selectedBattle ? regions[selectedBattle.regionId] : null

  // API returns {battle, round} where round has flat attackerDamages/defenderDamages
  const attackerDamage = liveData?.round?.attackerDamages || 0
  const defenderDamage = liveData?.round?.defenderDamages || 0
  const totalDamage = attackerDamage + defenderDamage
  const attackerPercent = totalDamage === 0 ? 50 : (attackerDamage / totalDamage) * 100
  const roundNumber = liveData?.round?.roundNumber || liveData?.battle?.currentRound || 1

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Live Battle Monitor</h1>
        <p className="text-zinc-400">Real-time hit feeds and damage bars for active battles.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <select 
            className="flex-1 bg-zinc-900 border border-zinc-800 text-white p-3 rounded-md"
            value={selectedBattleId}
            onChange={e => setSelectedBattleId(e.target.value)}
        >
            {activeBattles.map(b => (
                <option key={b._id} value={b._id}>
                    {countries[b.attackerCountryId]?.name || "Unknown"} vs {countries[b.defenderCountryId]?.name || "Unknown"} @ {regions[b.regionId]?.name || "Unknown"}
                </option>
            ))}
            {activeBattles.length === 0 && <option value="">No Active Battles Found</option>}
        </select>
        <button 
            onClick={pollBattle}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-md transition-colors"
        >
            Refresh Now
        </button>
      </div>

      {selectedBattleId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl flex justify-center items-center gap-4">
                            <span className="text-blue-500 flex items-center gap-2">
                                <CountryFlag countryCode={aCountry?.code} className="w-6 h-4" />
                                {aCountry?.name}
                            </span>
                            <span className="text-zinc-600 text-sm">VS</span>
                            <span className="text-red-500 flex items-center gap-2">
                                {dCountry?.name}
                                <CountryFlag countryCode={dCountry?.code} className="w-6 h-4" />
                            </span>
                        </CardTitle>
                        <CardDescription>Target: {region?.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mt-8 mb-4 relative">
                            <div className="flex justify-between text-sm font-medium mb-2">
                                <span className="text-blue-400">{formatDmg(attackerDamage)}</span>
                                <span className="text-red-400">{formatDmg(defenderDamage)}</span>
                            </div>
                            <div className="w-full h-8 bg-zinc-900 rounded-full overflow-hidden flex">
                                <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${attackerPercent}%` }} />
                                <div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${100 - attackerPercent}%` }} />
                            </div>
                            {/* Center Marker */}
                            <div className="absolute top-6 bottom-0 left-1/2 w-0.5 bg-white/20 -translate-x-1/2" />
                        </div>
                        <div className="text-center text-sm text-zinc-500 mt-6">
                            Round {roundNumber} • Auto-updating every 10s
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-zinc-950/50 border-zinc-800/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-blue-400">Top Attackers</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {attackerRanking.map((r, i) => (
                                    <div key={i} className="flex justify-between items-center bg-zinc-900/50 p-2 rounded">
                                        <span className="text-sm font-medium text-zinc-300 truncate pr-4 flex items-center gap-2">
                                            <CountryFlag countryCode={aCountry?.code} className="w-4 h-3" />
                                            Citizen {r.user.slice(-4)}
                                        </span>
                                        <span className="text-sm font-mono text-zinc-400">{formatDmg(r.value)}</span>
                                    </div>
                                ))}
                                {attackerRanking.length === 0 && <p className="text-xs text-zinc-600">No damage yet.</p>}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-950/50 border-zinc-800/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-red-400">Top Defenders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {defenderRanking.map((r, i) => (
                                    <div key={i} className="flex justify-between items-center bg-zinc-900/50 p-2 rounded">
                                        <span className="text-sm font-medium text-zinc-300 truncate pr-4 flex items-center gap-2">
                                            <CountryFlag countryCode={dCountry?.code} className="w-4 h-3" />
                                            Citizen {r.user.slice(-4)}
                                        </span>
                                        <span className="text-sm font-mono text-zinc-400">{formatDmg(r.value)}</span>
                                    </div>
                                ))}
                                {defenderRanking.length === 0 && <p className="text-xs text-zinc-600">No damage yet.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

              </div>

              <div>
                  <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50 h-full">
                      <CardHeader>
                          <CardTitle className="text-lg">Live Hit Feed</CardTitle>
                      </CardHeader>
                      <CardContent>
                            <div className="space-y-2 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {hits.length === 0 && <p className="text-sm text-zinc-500">Waiting for hits...</p>}
                                {hits.map((hit, i) => {
                                    const isAttacker = hit.side === 'attacker';
                                    return (
                                        <div key={i} className={`p-2 rounded text-sm ${isAttacker ? 'bg-blue-900/20 border border-blue-900/50' : 'bg-red-900/20 border border-red-900/50'}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`font-medium flex items-center gap-2 ${isAttacker ? 'text-blue-400' : 'text-red-400'}`}>
                                                    <CountryFlag countryCode={isAttacker ? aCountry?.code : dCountry?.code} className="w-4 h-3" />
                                                    Citizen
                                                </span>
                                                <span className="text-xs text-zinc-500">{new Date(hit.hitAt || hit.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="font-mono text-zinc-300 text-lg">
                                                {formatDmg(hit.damages || hit.damage || 0)} dmg
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                      </CardContent>
                  </Card>
              </div>
          </div>
      )}

    </div>
  )
}
