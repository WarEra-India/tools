import { useEffect, useState, useMemo, useRef } from "react"
import { CountryFlag } from "@/components/CountryFlag"
import { ArrowLeft, Search, Users, Eye, EyeOff, Map as MapIcon, ChevronRight, Calculator, TrendingUp, X } from "lucide-react"
import { Link } from "react-router-dom"
import * as topojson from "topojson-client"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { API_BASE } from "@/lib/wareraApi"
import { GameItemIcon } from "@/components/GameItemIcon"

// --- Types ---

interface CountryInfo {
  _id: string
  name: string
  code: string
  taxes: {
    income: number
    market: number
    selfWork: number
  }
  rulingParty?: string | null
  strategicResources?: {
    bonuses?: {
      productionPercent?: number
    }
  }
  specializedItem?: string | null
}

interface RegionInfo {
  _id: string
  name: string
  country: string
  deposit?: {
    type: string
    bonusPercent: number
  } | null
}

interface CompanyInfo {
  _id: string
  itemCode: string
  region: string
  workerCount: number
  estimatedValue: number
  disabledAt?: string | null
}

interface AggregatedRegion {
  regionId: string
  name: string
  countryId: string
  companies: CompanyInfo[]
  totalWorkers: number
  totalValue: number
  activeCount: number
  disabledCount: number
  totalInternalWorkers: number
  totalInternationalWorkers: number
}

interface AggregatedCountry {
  countryId: string
  name: string
  code: string
  regions: AggregatedRegion[]
  totalCompanies: number
  activeCompanies: number
  disabledCompanies: number
  totalWorkers: number
  totalInternalWorkers: number
  totalInternationalWorkers: number
  totalValue: number
  incomeTax: number
  companyBreakdown: Record<string, number>
}

// --- Constants ---

const PUBLIC_IMAGES_BASE_URL = `${import.meta.env.BASE_URL}images/`

// --- Helper Functions ---

function formatNumber(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B"
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M"
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"
  return n.toLocaleString()
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function GlobalCompanyAnalyzer() {
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [progress, setProgress] = useState({ stage: "Map", current: 0, total: 0, startTime: 0 })
  const [error, setError] = useState<string | null>(null)
  const [token, _] = useState<string>(localStorage.getItem("warera-api-token") || "");
  const initialized = useRef(false)

  // Data
  const [mapData, setMapData] = useState<any>(null)
  const [countries, setCountries] = useState<Record<string, CountryInfo>>({})
  const [regions, setRegions] = useState<Record<string, RegionInfo>>({})
  const fetchedCompanyCache = useRef<Record<string, CompanyInfo>>({})
  const [aggregated, setAggregated] = useState<Record<string, AggregatedCountry>>({})
  const [geojsonRegions, setGeojsonRegions] = useState<any>(null)
  const [geojsonBorders, setGeojsonBorders] = useState<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Indexing
  const [allCompanyIds, setAllCompanyIds] = useState<string[]>([])
  const companyOwnerMap = useRef<Record<string, string>>({})

  // UI State
  const [showDisabled, setShowDisabled] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null)
  const [hoveredRegion, setHoveredRegion] = useState<any>(null)
  const hoveredRegionRef = useRef<any>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Multi-Mode State
  const [viewMode, setViewMode] = useState<'density' | 'valuation' | 'tax' | 'sector'>('density')
  const [selectedSector, setSelectedSector] = useState<string | null>(null)

  // MapLibre Refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const geojsonRegionsRef = useRef<any>(null)
  const geojsonBordersRef = useRef<any>(null)

  async function startInitialization() {
    try {
      setLoading(true)
      setProgress(p => ({ ...p, stage: "Mapping Industrial Grid", current: 0, total: 2 }))

      // 1. Fetch Map TopoJSON and Aggregated Industrial Data
      const [mapRes, aggRes] = await Promise.all([
        fetch(`${API_BASE}/map.getMapData`).then(r => {
          setProgress(p => ({ ...p, current: p.current + 1 }))
          return r.json()
        }),
        fetch("https://warvault.shadoooow.workers.dev/api/companies/aggregated").then(r => {
          setProgress(p => ({ ...p, current: p.current + 1 }))
          return r.json()
        })
      ])

      const topoData = mapRes.result.data.map
      const aggregatedData = aggRes.data

      const countryMap: Record<string, CountryInfo> = {}
      const regionsMap: Record<string, RegionInfo> = {}
      const ids: string[] = []

      // 2. Process Aggregated Data
      Object.values(aggregatedData).forEach((c: any) => {
        countryMap[c.countryId] = {
          _id: c.countryId,
          name: c.name,
          code: c.code,
          taxes: { income: c.incomeTax, market: 0, selfWork: 0 }
        }

        c.regions.forEach((r: any) => {
          regionsMap[r.regionId] = {
            _id: r.regionId,
            name: r.name,
            country: r.countryId
          }
          r.companies.forEach((comp: any) => {
            ids.push(comp._id)
            fetchedCompanyCache.current[comp._id] = comp
            companyOwnerMap.current[comp._id] = c.countryId
          })
        })
      })

      setMapData(topoData)
      setCountries(countryMap)
      setRegions(regionsMap)
      setAggregated(aggregatedData)
      setAllCompanyIds(ids)

      // 3. Convert to GeoJSON for MapLibre
      const regionsFeature = topojson.feature(topoData, topoData.objects.regions) as any
      regionsFeature.features.forEach((f: any, i: number) => {
        f.id = i
      })

      const nationsMesh = topojson.mesh(topoData, topoData.objects.regions, (a: any, b: any) => {
        const cA = regionsMap[a.properties.regionId]?.country
        const cB = regionsMap[b.properties.regionId]?.country
        return a === b || cA !== cB
      })

      setGeojsonRegions(regionsFeature)
      setGeojsonBorders(nationsMesh)
      geojsonRegionsRef.current = regionsFeature
      geojsonBordersRef.current = nationsMesh

      setLoading(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to initialize tactical map")
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    startInitialization()
  }, [])

  // --- MapLibre Instance Effect ---
  useEffect(() => {
    if (!mapContainerRef.current || !geojsonRegions || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'regions': { type: 'geojson', data: geojsonRegions },
          'borders': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [{ type: 'Feature', geometry: geojsonBorders, properties: {} }]
            }
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#000000' }
          },
          {
            id: 'regions-fill',
            type: 'fill',
            source: 'regions',
            paint: {
              'fill-color': '#18181b',
              'fill-opacity': 1
            }
          },
          {
            id: 'regions-outline',
            type: 'line',
            source: 'regions',
            paint: {
              'line-color': '#09090b',
              'line-width': 0.5
            }
          },
          {
            id: 'nations-outline',
            type: 'line',
            source: 'borders',
            paint: {
              'line-color': '#3f3f46',
              'line-width': 0.5
            }
          },
          {
            id: 'regions-highlight',
            type: 'fill',
            source: 'regions',
            paint: {
              'fill-color': '#3b82f6',
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                0.8,
                0
              ]
            }
          }
        ]
      },
      center: [0, 20],
      zoom: 1,
      attributionControl: false
    })

    map.on('load', () => {
      mapRef.current = map
      setMapLoaded(true)
    })

    map.on('mousemove', 'regions-fill', (e) => {
      if (e.features && e.features.length > 0) {
        map.getCanvas().style.cursor = 'pointer'
        const feature = e.features[0]
        const regionId = feature.properties.regionId

        const prevHover = hoveredRegionRef.current
        if (prevHover?.properties?.regionId !== regionId) {
          // Robustly clear all states for this source to prevent "sticky blue"
          map.removeFeatureState({ source: 'regions' })
          map.setFeatureState({ source: 'regions', id: feature.id }, { hover: true })

          hoveredRegionRef.current = feature // Atomic update
          setHoveredRegion(feature)
        }
        setMousePos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY })
      }
    })

    map.on('mouseleave', 'regions-fill', () => {
      map.getCanvas().style.cursor = ''
      // Clear all hover states when leaving the layer
      map.removeFeatureState({ source: 'regions' })
      hoveredRegionRef.current = null // Atomic update
      setHoveredRegion(null)
    })

    map.on('click', 'regions-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const regionId = e.features[0].properties.regionId
        const regionData = regions[regionId]
        if (regionData) {
          selectCountry(regionData.country)
        }
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [geojsonRegions, loading])

  // --- Data Driven Styling Effect ---
  useEffect(() => {
    if (!mapRef.current || Object.keys(aggregated).length === 0 || !mapLoaded) return
    const map = mapRef.current

    if (!map.isStyleLoaded()) return

    const matchExpression: any[] = ['match', ['get', 'regionId']]
    let hasData = false

    Object.values(aggregated).forEach(country => {
      country.regions.forEach(r => {
        let val = 0
        let color = '#18181b'

        if (viewMode === 'density') {
          val = showDisabled ? r.activeCount + r.disabledCount : r.activeCount
          if (val >= 50) color = '#f4f4f5'
          else if (val >= 20) color = '#a1a1aa'
          else if (val >= 5) color = '#71717a'
          else if (val > 0) color = '#3f3f46'
        } else if (viewMode === 'valuation') {
          val = r.totalValue
          if (val >= 1000000) color = '#86efac' // 1M+ (Greenish)
          else if (val >= 100000) color = '#4ade80'
          else if (val >= 10000) color = '#22c55e'
          else if (val > 0) color = '#166534'
        } else if (viewMode === 'tax') {
          // Tax is usually per country
          const tax = country.incomeTax
          if (tax >= 20) color = '#ef4444' // High Tax (Red)
          else if (tax >= 15) color = '#f97316'
          else if (tax >= 10) color = '#facc15'
          else if (tax > 0) color = '#84cc16'
          else color = '#10b981' // 0% Tax (Emerald)
          val = 1 // Flag to show it's "filled"
        } else if (viewMode === 'sector' && selectedSector) {
          val = r.companies.filter(c => c.itemCode === selectedSector && (!c.disabledAt || showDisabled)).length
          if (val >= 10) color = '#f4f4f5'
          else if (val >= 5) color = '#a1a1aa'
          else if (val >= 1) color = '#71717a'
          else if (val > 0) color = '#3f3f46'
        }

        if (val > 0 || viewMode === 'tax') {
          hasData = true
          matchExpression.push(r.regionId, color)
        }
      })
    })

    matchExpression.push('#18181b') // fallback

    try {
      if (map.getLayer('regions-fill')) {
        map.setPaintProperty('regions-fill', 'fill-color', hasData ? matchExpression : '#18181b')
      }
    } catch (e) {
      console.warn("Failed to update map paint properties", e)
    }
  }, [aggregated, showDisabled, mapLoaded, viewMode, selectedSector])

  const selectCountry = (id: string) => {
    setSelectedCountryId(id)
  }

  const sortedCountries = useMemo(() => {
    let list = Object.values(aggregated)
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q))
    }
    return list.sort((a, b) => {
      const aVal = showDisabled ? a.totalCompanies : a.activeCompanies
      const bVal = showDisabled ? b.totalCompanies : b.activeCompanies
      return bVal - aVal
    })
  }, [aggregated, searchTerm, showDisabled])

  const handleMouseMove = (event: any) => {
    setMousePos({ x: event.clientX, y: event.clientY })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-6">
        {/* <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-6" /> */}
        <h2 className="text-xl font-medium mb-2">{progress.stage}...</h2>
        <div className="w-64 bg-zinc-900 h-2 rounded-full overflow-hidden mb-2">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
        {/* <p className="mt-8 text-zinc-600 text-xs text-center max-w-sm">
          Initializing tactical map data.
        </p> */}
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
        <div className="text-red-500 mb-4 font-bold">CRITICAL SYSTEM ERROR</div>
        <p className="text-zinc-400 mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm hover:bg-zinc-800 transition-colors">
          Re-initialize Tactical Scan
        </button>
      </div>
    )
  }

  const selectedCountry = selectedCountryId ? aggregated[selectedCountryId] : null

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden text-zinc-100" onMouseMove={handleMouseMove}>
      <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-500" />
          </Link>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-blue-500" />
              Global Company Analyzer
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Industrial Intelligence Network</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50 gap-1 backdrop-blur-sm">
            {(['density', 'valuation', 'tax', 'sector'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${viewMode === m
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_-5px_rgba(59,130,246,0.5)]'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
              >
                {m === 'density' ? 'Units' :
                  m === 'valuation' ? 'Value' :
                    m === 'tax' ? 'Tax %' : 'Sector'}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          <div className="flex flex-col items-end justify-center">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white">
                {Object.values(aggregated).reduce((acc, c) => acc + (showDisabled ? c.totalCompanies : c.activeCompanies), 0).toLocaleString()}
              </span>
              <img src={PUBLIC_IMAGES_BASE_URL + "companies.svg"} className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Companies</span>
          </div>

          <button
            onClick={() => setShowDisabled(!showDisabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border w-38 ${showDisabled
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
          >
            {showDisabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {showDisabled ? "Showing Disabled" : "Active Only"}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-zinc-900 flex flex-col bg-zinc-950 overflow-hidden shrink-0">
          <div className="p-4 border-b border-zinc-900 space-y-3">
            {/* <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Citizen Portfolios</h2>
              <div className="group relative">
                <Calculator className="w-3 h-3 text-zinc-700 cursor-help" />
                <div className="absolute left-full ml-3 top-0 w-48 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[9px] text-zinc-400 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl">
                  Sidebar lists countries by their citizens' ownership. The map shows where those assets are physically located.
                </div>
              </div>
            </div> */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
              <input
                placeholder="Search nations..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500/50 transition-colors"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {viewMode === 'sector' && (
            <div className="p-4 border-b border-zinc-900 bg-zinc-900/20">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2 block">Sector Analysis Filter</label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                {Array.from(new Set(Object.values(aggregated).flatMap(c => Object.keys(c.companyBreakdown))))
                  .sort()
                  .map(item => (
                    <button
                      key={item}
                      onClick={() => setSelectedSector(selectedSector === item ? null : item)}
                      className={`flex items-center gap-1.5 p-1 px-2 rounded-lg border transition-all ${selectedSector === item
                        ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                      <GameItemIcon itemCode={item} className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold capitalize">{item}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {sortedCountries.map(c => (
              <button
                key={c.countryId}
                onClick={() => selectCountry(c.countryId)}
                className={`w-full p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors group border-l-2 ${selectedCountryId === c.countryId ? "bg-zinc-900/40 border-blue-500" : "border-transparent"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <CountryFlag countryCode={c.code} className="w-4 h-3 rounded-sm opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                  <div className="text-left">
                    <p className={`text-sm font-bold ${selectedCountryId === c.countryId ? "text-blue-400" : "text-zinc-400 group-hover:text-zinc-100"}`}>
                      {c.name}
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono">
                      {formatNumber(c.totalCompanies)} Companies
                    </p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-zinc-700 transition-transform ${selectedCountryId === c.countryId ? "rotate-90 text-blue-500" : ""}`} />
              </button>
            ))}
          </div>
        </aside>

        <section className="flex-1 relative bg-black overflow-hidden" ref={mapContainerRef}>
          <div className="absolute right-6 bottom-6 flex flex-col gap-2 z-10">
            <button
              onClick={() => mapRef.current?.zoomIn()}
              className="w-10 h-10 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-all"
            >+</button>
            <button
              onClick={() => mapRef.current?.zoomOut()}
              className="w-10 h-10 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-all"
            >−</button>
          </div>

          {hoveredRegion && (
            <div
              className="fixed pointer-events-none z-50 bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 p-4 rounded-xl shadow-2xl min-w-[200px]"
              style={{ left: mousePos.x + 20, top: mousePos.y + 20 }}
            >
              <div className="flex items-center justify-between mb-3 gap-4">
                <div className="flex items-center gap-2 overflow-hidden">
                  <CountryFlag
                    countryCode={countries[regions[hoveredRegion.properties.regionId]?.country]?.code || ""}
                    className="w-4 h-3 rounded-sm shrink-0 shadow-sm"
                  />
                  <p className="text-sm font-black text-white truncate">
                    {regions[hoveredRegion.properties.regionId]?.name || hoveredRegion.properties.name}
                  </p>
                </div>
                {/* <div className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[9px] font-bold rounded uppercase shrink-0 border border-zinc-800">
                  {countries[regions[hoveredRegion.properties.regionId]?.country]?.name || "Unoccupied"}
                </div> */}
              </div>

              {(() => {
                const rAgg = Object.values(aggregated).flatMap(c => c.regions).find(r => r.regionId === hoveredRegion.properties.regionId)
                const regionData = regions[hoveredRegion.properties.regionId]
                const bonus = regionData?.deposit?.bonusPercent || 0

                return (
                  <div className="space-y-2">
                    {viewMode === 'tax' ? (
                      <div className="flex justify-between text-[10px] items-center">
                        <span className="text-zinc-500 font-bold uppercase">Income Tax</span>
                        <div className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-black text-white">
                          {countries[regionData?.country]?.taxes.income || 0}%
                        </div>
                      </div>
                    ) : viewMode === 'sector' && selectedSector ? (
                      <>
                        <div className="flex justify-between text-[10px] items-center">
                          <span className="text-zinc-500 font-bold uppercase flex items-center gap-1">
                            <GameItemIcon itemCode={selectedSector} className="h-3 w-3" />
                            {selectedSector} Units
                          </span>
                          <span className="text-white font-mono">
                            {rAgg ? rAgg.companies.filter(c => c.itemCode === selectedSector && (!c.disabledAt || showDisabled)).length : "0"}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] pt-1">
                          <span className="text-zinc-500 font-bold uppercase">Global Share</span>
                          <span className="text-blue-400 font-mono">
                            {rAgg ? ((rAgg.companies.filter(c => c.itemCode === selectedSector).length / Math.max(1, allCompanyIds.length)) * 100).toFixed(2) : "0"}%
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-500 font-bold uppercase">Workers</span>
                          <span className="text-white font-mono">{rAgg ? formatNumber(rAgg.totalWorkers) : "0"}</span>
                        </div>
                        {rAgg && rAgg.totalInternationalWorkers > 0 && (
                          <div className="flex justify-between text-[10px] pl-2 border-l border-amber-500/30">
                            <span className="text-amber-500/70 text-[8px] uppercase">International</span>
                            <span className="text-amber-400 text-[8px] font-mono">{formatNumber(rAgg.totalInternationalWorkers)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[10px] pt-1">
                          <span className="text-zinc-500 font-bold uppercase">Valuation</span>
                          <div className="flex items-center gap-1">
                            <img src={`${PUBLIC_IMAGES_BASE_URL}game_coin.svg`} alt="tax" className="h-3 w-3" />
                            <span className="text-emerald-400 font-mono">{rAgg ? formatNumber(rAgg.totalValue) : "0"}</span>
                          </div>
                        </div>
                      </>
                    )}

                    {bonus > 0 && (
                      <div className="pt-2 border-t border-zinc-900 mt-2">
                        <p className="text-[8px] text-zinc-600 uppercase font-black mb-1">Deposit Bonus</p>
                        <div className="flex items-center gap-1.5">
                          <Calculator className="w-3 h-3 text-white/50" />
                          <span className="text-xs font-bold text-white">+{bonus}%</span>
                          <GameItemIcon itemCode={regionData?.deposit?.type} className="w-4 h-4 rounded-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </section>

        {selectedCountry && (
          <aside className="w-96 border-l border-zinc-900 bg-zinc-950 flex flex-col overflow-hidden shrink-0 animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-zinc-900">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <CountryFlag countryCode={selectedCountry.code} className="w-10 h-7 rounded shadow-lg" />
                  <div>
                    <h2 className="text-xl font-black text-white leading-tight">{selectedCountry.name}</h2>
                    {/* <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Strategic National Summary</p> */}
                  </div>
                </div>
                <button onClick={() => setSelectedCountryId(null)}><X className="w-5 h-5 text-zinc-600 hover:text-zinc-400" /></button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-900/50">
                  <img src={`${PUBLIC_IMAGES_BASE_URL}tax.svg`} alt="tax" className="h-5 w-5" />
                  <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Income Tax</p>
                  <p className="text-xl font-black text-white">{selectedCountry.incomeTax}%</p>
                </div>
                <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-900/50">
                  <img src={`${PUBLIC_IMAGES_BASE_URL}tax.svg`} alt="tax" className="h-5 w-5" />
                  <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Companies</p>
                  <p className="text-xl font-black text-white">{selectedCountry.totalCompanies.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-900/50">
                  <img src={`${PUBLIC_IMAGES_BASE_URL}game_coin.svg`} alt="tax" className="h-5 w-5" />
                  <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Valuation</p>
                  <p className="text-xl font-black text-white">{formatNumber(selectedCountry.totalValue)}</p>
                </div>
                <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-900/50">
                  <img src={`${PUBLIC_IMAGES_BASE_URL}worker.svg`} alt="tax" className="h-5 w-5" />
                  <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Workers</p>
                  <p className="text-xl font-black text-white font-mono">{selectedCountry.totalWorkers.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  Asset Breakdown
                </h3>
                <div className="space-y-2">
                  {Object.entries(selectedCountry.companyBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([item, count]) => (
                      <div key={item} className="flex items-center gap-3 bg-zinc-900/30 p-2 rounded-lg border border-zinc-900/80">
                        <GameItemIcon itemCode={item} className="h-8 w-8 shrink-0 border border-zinc-800 rounded overflow-hidden" />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-zinc-300 capitalize">{item}</span>
                            <span className="text-xs font-mono text-zinc-500">{count}</span>
                          </div>
                          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-500 h-full"
                              style={{ width: `${(count / Math.max(1, selectedCountry.totalCompanies)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <MapIcon className="w-3 h-3" />
                  Regional Centers
                </h3>
                <div className="space-y-2">
                  {selectedCountry.regions
                    .sort((a, b) => b.totalWorkers - a.totalWorkers)
                    .map(r => (
                      <div key={r.regionId} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl hover:border-zinc-800 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-bold text-white">{r.name}</p>
                          {/* <span className="text-[10px] font-mono text-emerald-500">{formatNumber(r.totalValue)}</span> */}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <img src={PUBLIC_IMAGES_BASE_URL + "worker.svg"} className="w-3 h-3" />
                            <span className="text-[10px] font-mono text-zinc-400">{formatNumber(r.totalWorkers)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <img src={PUBLIC_IMAGES_BASE_URL + "companies.svg"} className="w-3 h-3" />
                            <span className="text-[10px] font-mono text-zinc-400">{r.activeCount}</span>
                          </div>
                          {showDisabled && r.disabledCount > 0 && (
                            <div className="flex items-center gap-1">
                              <img src={PUBLIC_IMAGES_BASE_URL + "companies.svg"} className="w-3 h-3" />
                              <span className="text-[10px] font-mono text-zinc-600">{r.disabledCount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </aside>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  )
}
