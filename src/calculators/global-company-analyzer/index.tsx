import { useEffect, useState, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CountryFlag } from "@/components/CountryFlag"
import { Loader2, ArrowLeft, Filter, Search, Info, Users, Wallet, Eye, EyeOff, Map as MapIcon, ChevronRight, Calculator, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"
import * as topojson from "topojson-client"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { API_BASE } from "@/lib/wareraApi"

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

const MAP_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

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
  const ownerCountryToCompanyIds = useRef<Record<string, string[]>>({})

  // UI State
  const [showDisabled, setShowDisabled] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null)
  const [hoveredRegion, setHoveredRegion] = useState<any>(null)
  const hoveredRegionRef = useRef<any>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // MapLibre Refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const geojsonRegionsRef = useRef<any>(null)
  const geojsonBordersRef = useRef<any>(null)


  async function startInitialization() {
    try {
      setLoading(true)

      // 1. Fetch Metadata first
      setProgress(p => ({ ...p, stage: "Regional Metadata", current: 0, total: 3 }))
      const [mapRes, countriesRes, regionsRes] = await Promise.all([
        fetch(`${API_BASE}/map.getMapData`).then(r => r.json()),
        fetch(`${API_BASE}/country.getAllCountries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        }).then(r => r.json()),
        fetch(`${API_BASE}/region.getRegionsObject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        }).then(r => r.json())
      ])

      const topoData = mapRes.result.data.map
      const countryList: CountryInfo[] = countriesRes.result.data
      const regionsObj: Record<string, RegionInfo> = regionsRes.result.data

      const countryMap: Record<string, CountryInfo> = {}
      const initialAgg: Record<string, AggregatedCountry> = {}

      countryList.forEach(c => {
        countryMap[c._id] = c
        initialAgg[c._id] = {
          countryId: c._id,
          name: c.name,
          code: c.code,
          regions: [],
          totalCompanies: 0,
          activeCompanies: 0,
          disabledCompanies: 0,
          totalWorkers: 0,
          totalInternalWorkers: 0,
          totalInternationalWorkers: 0,
          totalValue: 0,
          incomeTax: c.taxes.income,
          companyBreakdown: {}
        }
      })

      Object.entries(regionsObj).forEach(([regionId, regionData]) => {
        const countryId = regionData.country
        if (initialAgg[countryId]) {
          initialAgg[countryId].regions.push({
            regionId,
            name: regionData.name,
            countryId,
            companies: [],
            totalWorkers: 0,
            totalValue: 0,
            activeCount: 0,
            disabledCount: 0,
            totalInternalWorkers: 0,
            totalInternationalWorkers: 0
          })
        }
      })

      setMapData(topoData)
      setCountries(countryMap)
      setRegions(regionsObj)
      setAggregated(initialAgg)

      // Convert to GeoJSON for MapLibre
      const regionsFeature = topojson.feature(topoData, topoData.objects.regions) as any
      // MapLibre setFeatureState requires numeric IDs
      regionsFeature.features.forEach((f: any, i: number) => {
        f.id = i
      })

      const nationsMesh = topojson.mesh(topoData, topoData.objects.regions, (a: any, b: any) => {
        const cA = regionsObj[a.properties.regionId]?.country
        const cB = regionsObj[b.properties.regionId]?.country
        return a === b || cA !== cB
      })

      setGeojsonRegions(regionsFeature)
      setGeojsonBorders(nationsMesh)
      geojsonRegionsRef.current = regionsFeature
      geojsonBordersRef.current = nationsMesh

      // Rapid Indexing via WarVault
      setProgress(p => ({ ...p, stage: "Rapid Indexing", current: 1, total: 2 }))
      const vaultRes = await fetch("https://warvault.shadoooow.workers.dev/api/companies").then(r => r.json())

      const mapping: Record<string, string> = {}
      const ownerMap: Record<string, string[]> = {}
      const ids: string[] = []

      vaultRes.forEach((owner: any) => {
        mapping[owner.owner_id] = owner.owner_country_id
        ownerMap[owner.owner_country_id] = [...(ownerMap[owner.owner_country_id] || []), ...owner.companies_id]
        owner.companies_id.forEach((cid: string) => {
          companyOwnerMap.current[cid] = owner.owner_country_id
          ids.push(cid)
        })

        // Initial sidebar counts
        if (initialAgg[owner.owner_country_id]) {
          initialAgg[owner.owner_country_id].totalCompanies += owner.companies_id.length
          initialAgg[owner.owner_country_id].activeCompanies += owner.companies_id.length // Assume active until scanned
        }
      })

      ownerCountryToCompanyIds.current = ownerMap
      setAllCompanyIds(ids)
      setAggregated({ ...initialAgg })

      setLoading(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to initialize regional map")
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
              'line-width': 0.8
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
    if (!mapRef.current || Object.keys(aggregated).length === 0) return
    const map = mapRef.current

    // Wait until map is truly ready
    if (!map.isStyleLoaded()) return

    const matchExpression: any[] = ['match', ['get', 'regionId']]
    let hasData = false

    Object.values(aggregated).forEach(country => {
      country.regions.forEach(r => {
        const compCount = showDisabled ? r.activeCount + r.disabledCount : r.activeCount
        if (compCount > 0) {
          hasData = true
          let color = '#18181b'
          if (compCount >= 50) color = '#f4f4f5'
          else if (compCount >= 20) color = '#a1a1aa'
          else if (compCount >= 5) color = '#71717a'
          else if (compCount > 0) color = '#3f3f46'
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
  }, [aggregated, showDisabled, mapLoaded])

  async function fetchBatchedDetails(idsToFetch: string[]) {
    if (idsToFetch.length === 0) return

    const BATCH_SIZE = 100
    setDataLoading(true)
    const startTime = Date.now()
    setProgress({ stage: "Analyzing Units", current: 0, total: idsToFetch.length, startTime })

    const headers: any = { "Content-Type": "application/json" }
    if (token) headers["X-API-Key"] = token

    for (let i = 0; i < idsToFetch.length; i += BATCH_SIZE) {
      const batchIds = idsToFetch.slice(i, i + BATCH_SIZE).filter(id => !fetchedCompanyCache.current[id])
      if (batchIds.length === 0) {
        setProgress(p => ({ ...p, current: i + Math.min(BATCH_SIZE, idsToFetch.length - i) }))
        continue
      }

      const batchUrl = API_BASE + "/" + batchIds.map(() => "company.getById").join(",") + "?batch=1"
      const batchBody: any = {}
      batchIds.forEach((id, idx) => { batchBody[idx] = { companyId: id } })

      try {
        const response = await fetch(batchUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(batchBody)
        })

        if (response.status === 429) {
          setProgress(p => ({ ...p, stage: "Rate Limited" }))
          await sleep(5000)
          i -= BATCH_SIZE
          continue
        }

        const res = await response.json()
        const batchData: CompanyInfo[] = (res as any[]).map(r => r.result.data)

        setAggregated(prev => {
          const next = { ...prev }
          batchData.forEach(comp => {
            fetchedCompanyCache.current[comp._id] = comp
            const regData = regions[comp.region]
            if (!regData) return

            const countryAgg = next[regData.country]
            if (!countryAgg) return

            const regionAgg = countryAgg.regions.find(r => r.regionId === comp.region)
            if (!regionAgg) return

            // Prevent duplicates
            if (regionAgg.companies.some(c => c._id === comp._id)) return

            regionAgg.companies.push(comp)
            regionAgg.totalWorkers += comp.workerCount || 0
            regionAgg.totalValue += comp.estimatedValue || 0
            if (comp.disabledAt) regionAgg.disabledCount++
            else regionAgg.activeCount++

            // International vs Internal Logic
            const ownerCountryId = companyOwnerMap.current[comp._id]
            const isInternational = ownerCountryId && ownerCountryId !== regData.country

            if (isInternational) {
              regionAgg.totalInternationalWorkers += comp.workerCount || 0
              countryAgg.totalInternationalWorkers += comp.workerCount || 0
            } else {
              regionAgg.totalInternalWorkers += comp.workerCount || 0
              countryAgg.totalInternalWorkers += comp.workerCount || 0
            }

            countryAgg.totalWorkers += comp.workerCount || 0
            countryAgg.totalValue += comp.estimatedValue || 0

            const itemCode = comp.itemCode
            countryAgg.companyBreakdown[itemCode] = (countryAgg.companyBreakdown[itemCode] || 0) + 1
          })
          return next
        })

        setProgress(p => ({ ...p, stage: "Analyzing Units", current: i + batchData.length }))
        if (!token) await sleep(400)
      } catch (err) {
        console.error("Batch fetch failed:", err)
      }
    }

    setDataLoading(false)
  }

  const startGlobalScan = () => {
    const unfetched = allCompanyIds.filter(id => !fetchedCompanyCache.current[id])
    fetchBatchedDetails(unfetched)
  }

  const selectCountry = (id: string) => {
    setSelectedCountryId(id)
    const ownerCompanies = ownerCountryToCompanyIds.current[id] || []
    const unfetched = ownerCompanies.filter(cid => !fetchedCompanyCache.current[cid])
    if (unfetched.length > 0) {
      fetchBatchedDetails(unfetched)
    }
  }

  // Sync ref with state for MapLibre listeners
  useEffect(() => {
    hoveredRegionRef.current = hoveredRegion
  }, [hoveredRegion])

  const getETA = () => {
    if (!dataLoading || progress.current === 0 || progress.total <= 0) return null
    const elapsed = Date.now() - progress.startTime
    const remaining = progress.total - progress.current
    const msPerItem = elapsed / progress.current
    const etaMs = remaining * msPerItem

    if (etaMs < 1000) return "Few seconds"
    const seconds = Math.floor((etaMs / 1000) % 60)
    const minutes = Math.floor(etaMs / 60000)
    return `${minutes}m ${seconds}s`
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

  const getRegionStyle = (geo: any) => {
    const regionId = geo.properties.regionId
    const regionData = regions[regionId]
    if (!regionData) return { fill: "#18181b", stroke: "#27272a" }

    let compCount = 0
    const country = aggregated[regionData.country]
    if (country) {
      const r = country.regions.find(reg => reg.regionId === regionId)
      if (r) compCount = showDisabled ? r.activeCount + r.disabledCount : r.activeCount
    }

    if (compCount === 0) return { fill: "#18181b", stroke: "#27272a", outline: "none" }
    if (compCount < 5) return { fill: "#3f3f46", stroke: "#52525b", outline: "none" }
    if (compCount < 20) return { fill: "#71717a", stroke: "#a1a1aa", outline: "none" }
    if (compCount < 50) return { fill: "#a1a1aa", stroke: "#d4d4d8", outline: "none" }
    return { fill: "#f4f4f5", stroke: "#fafafa", outline: "none" }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-6" />
        <h2 className="text-xl font-medium mb-2">{progress.stage}...</h2>
        <div className="w-64 bg-zinc-900 h-2 rounded-full overflow-hidden mb-2">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: "10%" }}
          />
        </div>
        <p className="mt-8 text-zinc-600 text-xs text-center max-w-sm">
          Initializing tactical map data.
        </p>
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
              {dataLoading && (
                <div className="flex items-center gap-3 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800 animate-in fade-in duration-500">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" />
                    <span className="text-[10px] text-zinc-300 font-mono font-bold">
                      {Math.round((progress.current / progress.total) * 100)}%
                    </span>
                  </div>
                  <div className="h-3 w-px bg-zinc-800" />
                  <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-tighter">
                    ETA: {getETA() || "Calculating..."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={startGlobalScan}
            disabled={dataLoading}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all border ${dataLoading
              ? "bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 border-blue-400/30 text-white shadow-[0_0_15px_-5px_rgba(37,99,235,0.4)]"
              }`}
          >
            <TrendingUp className="w-3 h-3" />
            Scan All {allCompanyIds.length.toLocaleString()}
          </button>
          <button
            onClick={() => setShowDisabled(!showDisabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showDisabled
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
          <div className="p-4 border-b border-zinc-900">
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
                      {formatNumber(c.totalCompanies)} Assets Indexed
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
                      <span className="text-emerald-400 font-mono">${rAgg ? formatNumber(rAgg.totalValue) : "0"}</span>
                    </div>

                    {bonus > 0 && (
                      <div className="pt-2 border-t border-zinc-900 mt-2">
                        <p className="text-[8px] text-zinc-600 uppercase font-black mb-1">Local Bonus</p>
                        <div className="flex items-center gap-1.5">
                          <Calculator className="w-3 h-3 text-white/50" />
                          <span className="text-xs font-bold text-white">+{bonus}% {regionData?.deposit?.type || "None"}</span>
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
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Strategic National Summary</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCountryId(null)} className="text-zinc-600 hover:text-zinc-400">×</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-900/50">
                  <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Income Tax</p>
                  <p className="text-xl font-black text-white">{selectedCountry.incomeTax}%</p>
                </div>
                <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-900/50">
                  <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Valuation</p>
                  <p className="text-xl font-black text-white">${formatNumber(selectedCountry.totalValue)}</p>
                </div>
                <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-900/50">
                  <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Domestic Workers</p>
                  <p className="text-xl font-black text-white font-mono">{formatNumber(selectedCountry.totalInternalWorkers)}</p>
                </div>
                <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-900/50">
                  <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Intl Assets</p>
                  <p className="text-xl font-black text-white font-mono">{formatNumber(selectedCountry.totalInternationalWorkers)}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  Sector Distribution
                </h3>
                <div className="space-y-2">
                  {Object.entries(selectedCountry.companyBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([item, count]) => (
                      <div key={item} className="flex items-center gap-3 bg-zinc-900/30 p-2 rounded-lg border border-zinc-900/80">
                        <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center border border-zinc-800 text-[10px] font-black uppercase">
                          {item.slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-zinc-300 capitalize">{item}</span>
                            <span className="text-xs font-mono text-zinc-500">{count} Units</span>
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
                          <span className="text-[10px] font-mono text-emerald-500">${formatNumber(r.totalValue)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-zinc-500" />
                            <span className="text-[10px] font-mono text-zinc-400">{formatNumber(r.totalWorkers)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapIcon className="w-3 h-3 text-zinc-500" />
                            <span className="text-[10px] font-mono text-zinc-400">{r.activeCount} Act</span>
                          </div>
                          {showDisabled && r.disabledCount > 0 && (
                            <div className="flex items-center gap-1">
                              <EyeOff className="w-3 h-3 text-zinc-600" />
                              <span className="text-[10px] font-mono text-zinc-600">{r.disabledCount} Dis</span>
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
