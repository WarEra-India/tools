import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CountryFlag } from "@/components/CountryFlag"
import { Loader2, ArrowLeft, ChevronUp, ChevronDown, Minus } from "lucide-react"
import { Link } from "react-router-dom"
import * as topojson from "topojson-client"

const API_BASE = "https://api5.warera.io/trpc"
const EARTH_RADIUS_KM = 6371
const EARTH_AREA_KM2 = 4 * Math.PI * EARTH_RADIUS_KM * EARTH_RADIUS_KM  // ~510M km²
const LAND_ICON = `${import.meta.env.BASE_URL}images/ground.svg`;

// Compute spherical area of a GeoJSON polygon ring in steradians
function ringArea(coords: number[][]): number {
  let area = 0
  const n = coords.length
  for (let i = 0; i < n - 1; i++) {
    const [lng1, lat1] = coords[i]
    const [lng2, lat2] = coords[i + 1]
    area += (lng2 - lng1) * Math.PI / 180 * (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180))
  }
  return Math.abs(area * EARTH_RADIUS_KM * EARTH_RADIUS_KM / 2)
}

// Compute area for a GeoJSON geometry in km²
function geometryArea(geom: any): number {
  if (!geom) return 0
  if (geom.type === "Polygon") {
    const outer = ringArea(geom.coordinates[0])
    let holes = 0
    for (let i = 1; i < geom.coordinates.length; i++) {
      holes += ringArea(geom.coordinates[i])
    }
    return outer - holes
  }
  if (geom.type === "MultiPolygon") {
    let total = 0
    for (const poly of geom.coordinates) {
      const outer = ringArea(poly[0])
      let holes = 0
      for (let i = 1; i < poly.length; i++) {
        holes += ringArea(poly[i])
      }
      total += outer - holes
    }
    return total
  }
  return 0
}

interface CountryInfo {
  _id: string
  name: string
  code: string
}

interface CountryLandData {
  countryId: string
  name: string
  code: string
  controlledArea: number  // km² of regions currently controlled
  originalArea: number    // km² of original regions
  gainedArea: number      // area gained from occupying other regions
  lostArea: number        // area lost to occupiers
  regionCount: number     // number of controlled regions
  originalRegions: number
}

function formatArea(km2: number): string {
  if (km2 >= 1e6) return (km2 / 1e6).toFixed(2) + "M"
  if (km2 >= 1e3) return (km2 / 1e3).toFixed(1) + "K"
  return km2.toFixed(0)
}

type SortKey = "controlledArea" | "originalArea" | "gainedArea" | "lostArea" | "regionCount"

export default function LandArea() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [countryData, setCountryData] = useState<CountryLandData[]>([])
  const [sortKey, setSortKey] = useState<SortKey>("controlledArea")
  const [sortAsc, setSortAsc] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        // Fetch map data, countries, and regions in parallel
        const [mapRes, countriesRes, regionsRes] = await Promise.all([
          fetch(`${API_BASE}/map.getMapData`, {
            headers: { "Content-Type": "application/json", Accept: "*/*" }
          }).then(r => r.json()),
          fetch(`${API_BASE}/country.getAllCountries`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "*/*" },
            body: "{}"
          }).then(r => r.json()),
          fetch(`${API_BASE}/region.getRegionsObject`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "*/*" },
            body: "{}"
          }).then(r => r.json()),
        ])

        const topoData = mapRes.result.data.map
        const countriesList: CountryInfo[] = countriesRes.result.data
        const regionsObj = regionsRes.result.data

        // Build country lookup
        const countryMap: Record<string, CountryInfo> = {}
        for (const c of countriesList) {
          countryMap[c._id] = c
        }

        // Convert regions topology to GeoJSON features
        const regionFeatures = topojson.feature(topoData, topoData.objects.regions) as any
        const features: any[] = regionFeatures.features || []

        // Build region info: who controls it, who originally owned it, and area from polygon
        // Cross-reference with region data (which has up-to-date country/initialCountry)
        const regionAreas: { regionId: string, currentCountry: string, originalCountry: string, area: number }[] = []

        for (const f of features) {
          const props = f.properties || {}
          const regionId = props.regionId
          const regionData = regionsObj[regionId]

          // Use region data for current occupier (most up-to-date), fall back to map props
          const currentCountry = regionData?.country || props.countryId
          const originalCountry = regionData?.initialCountry || props.initialCountryId

          const area = geometryArea(f.geometry)

          if (currentCountry) {
            regionAreas.push({
              regionId,
              currentCountry,
              originalCountry: originalCountry || currentCountry,
              area
            })
          }
        }

        // Aggregate by country
        const countryAgg: Record<string, {
          controlledArea: number
          originalArea: number
          gainedArea: number
          lostArea: number
          regionCount: number
          originalRegions: number
        }> = {}

        // Initialize all countries
        for (const c of countriesList) {
          countryAgg[c._id] = {
            controlledArea: 0,
            originalArea: 0,
            gainedArea: 0,
            lostArea: 0,
            regionCount: 0,
            originalRegions: 0
          }
        }

        // First pass: compute original area (sum of regions where initialCountry = country)
        for (const r of regionAreas) {
          if (countryAgg[r.originalCountry]) {
            countryAgg[r.originalCountry].originalArea += r.area
            countryAgg[r.originalCountry].originalRegions += 1
          }
        }

        // Second pass: compute controlled area and gained area
        for (const r of regionAreas) {
          if (countryAgg[r.currentCountry]) {
            countryAgg[r.currentCountry].controlledArea += r.area
            countryAgg[r.currentCountry].regionCount += 1

            // If occupying someone else's region
            if (r.currentCountry !== r.originalCountry) {
              countryAgg[r.currentCountry].gainedArea += r.area
            }
          }

          // Lost area: original owner lost this region
          if (r.currentCountry !== r.originalCountry && countryAgg[r.originalCountry]) {
            countryAgg[r.originalCountry].lostArea += r.area
          }
        }

        // Build final data
        const result: CountryLandData[] = countriesList.map(c => ({
          countryId: c._id,
          name: c.name,
          code: c.code,
          ...countryAgg[c._id]
        }))

        setCountryData(result)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const sorted = useMemo(() => {
    let filtered = countryData
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(c => c.name.toLowerCase().includes(q))
    }
    return [...filtered].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey]
      return sortAsc ? diff : -diff
    })
  }, [countryData, sortKey, sortAsc, search])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <Minus className="h-3 w-3 text-zinc-600" />
    return sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  // Maximum for bar widths
  const maxArea = sorted.length > 0 ? sorted[0].controlledArea : 1

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-4" />
        <p className="text-zinc-400">Computing land areas from map data...</p>
        <p className="text-zinc-600 text-xs mt-1">This may take a moment (processing 726 regions)</p>
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>
  }

  // Stats
  const totalRegions = countryData.reduce((s, c) => s + c.regionCount, 0)
  const occupiedRegions = countryData.reduce((s, c) => s + (c.regionCount > 0 && c.controlledArea !== c.originalArea ? 1 : 0), 0)
  const countriesWithLand = countryData.filter(c => c.controlledArea > 0).length
  const countriesWithOccupied = countryData.filter(c => c.gainedArea > 0).length

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-12 space-y-6">
        <div>
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calculators
          </Link>
          <img src={LAND_ICON} alt="craft" className="h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Land Area</h1>
          <p className="text-zinc-400">All countries ranked by total controlled land area, including occupied territories.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
            <CardContent className="pt-5 text-center">
              <p className="text-2xl font-bold text-white">{countriesWithLand}</p>
              <p className="text-xs text-zinc-500 mt-1">Countries With Land</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
            <CardContent className="pt-5 text-center">
              <p className="text-2xl font-bold text-white">{totalRegions}</p>
              <p className="text-xs text-zinc-500 mt-1">Total Regions</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
            <CardContent className="pt-5 text-center">
              <p className="text-2xl font-bold text-emerald-400">{countriesWithOccupied}</p>
              <p className="text-xs text-zinc-500 mt-1">Occupying Others</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50">
            <CardContent className="pt-5 text-center">
              <p className="text-2xl font-bold text-red-400">{countryData.filter(c => c.lostArea > 0).length}</p>
              <p className="text-xs text-zinc-500 mt-1">Lost Territory</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <Card className="bg-zinc-950/50 backdrop-blur-xl border-zinc-800/50 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Country Rankings</CardTitle>
              <CardDescription>All {countryData.length} countries sorted by controlled area</CardDescription>
            </div>
            <div className="relative">
              <input
                placeholder="Search country..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white text-sm px-3 py-2 rounded-lg w-48 outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left w-12">#</th>
                    <th className="px-4 py-3 text-left">Country</th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => handleSort("controlledArea")}>
                      <span className="inline-flex items-center gap-1">Controlled Area (km²) <SortIcon col="controlledArea" /></span>
                    </th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:text-zinc-300 transition-colors hidden md:table-cell" onClick={() => handleSort("regionCount")}>
                      <span className="inline-flex items-center gap-1">Regions <SortIcon col="regionCount" /></span>
                    </th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:text-zinc-300 transition-colors hidden lg:table-cell" onClick={() => handleSort("originalArea")}>
                      <span className="inline-flex items-center gap-1">Original <SortIcon col="originalArea" /></span>
                    </th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:text-zinc-300 transition-colors hidden lg:table-cell" onClick={() => handleSort("gainedArea")}>
                      <span className="inline-flex items-center gap-1">Gained <SortIcon col="gainedArea" /></span>
                    </th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:text-zinc-300 transition-colors hidden lg:table-cell" onClick={() => handleSort("lostArea")}>
                      <span className="inline-flex items-center gap-1">Lost <SortIcon col="lostArea" /></span>
                    </th>
                    <th className="px-4 py-3 text-left w-[200px] hidden xl:table-cell">Area Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c, i) => {
                    const netChange = c.controlledArea - c.originalArea
                    const netPercent = c.originalArea > 0 ? (netChange / c.originalArea) * 100 : 0
                    return (
                      <tr
                        key={c.countryId}
                        className={`border-b border-zinc-800/50 transition-colors hover:bg-zinc-900/50 ${i % 2 === 0 ? "" : "bg-zinc-900/20"
                          }`}
                      >
                        <td className="px-4 py-3 text-zinc-500 font-mono">{i + 1}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            <CountryFlag countryCode={c.code} className="w-5 h-3.5 flex-shrink-0" />
                            <span className="text-zinc-200 font-medium truncate">{c.name}</span>
                            {netPercent > 10 && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                                +{netPercent.toFixed(0)}%
                              </span>
                            )}
                            {netPercent < -10 && (
                              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                                {netPercent.toFixed(0)}%
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-200">
                          {formatArea(c.controlledArea)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-400 hidden md:table-cell">
                          {c.regionCount}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-500 hidden lg:table-cell">
                          {formatArea(c.originalArea)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">
                          {c.gainedArea > 0 ? (
                            <span className="text-emerald-400">+{formatArea(c.gainedArea)}</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">
                          {c.lostArea > 0 ? (
                            <span className="text-red-400">-{formatArea(c.lostArea)}</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <div className="flex items-center gap-1 h-4">
                            {/* Original area bar */}
                            <div
                              className="h-full bg-zinc-700 rounded-sm transition-all"
                              style={{ width: `${Math.max(1, ((c.originalArea - c.lostArea) / maxArea) * 180)}px` }}
                              title={`Homeland: ${formatArea(c.originalArea - c.lostArea)} km²`}
                            />
                            {/* Gained area bar */}
                            {c.gainedArea > 0 && (
                              <div
                                className="h-full bg-emerald-600/80 rounded-sm transition-all"
                                style={{ width: `${Math.max(1, (c.gainedArea / maxArea) * 180)}px` }}
                                title={`Occupied: ${formatArea(c.gainedArea)} km²`}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
