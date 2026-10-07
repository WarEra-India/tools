import { useMemo } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useGameConfig } from "@/lib/hooks/useGameConfig"
import { useLivePrices } from "@/lib/hooks/useLivePrices"
import { useEquipmentPrices } from "@/lib/hooks/useEquipmentPrices"
import { useLocalConfig } from "@/lib/hooks/useLocalConfig"
import { GameItemIcon, RARITY_COLORS } from "@/components/GameItemIcon"
import { RARITY_COSTS } from "../war-room/constants"
import { itemImageUrl } from "@/lib/images"

interface AnalysisData {
  summary: {
    total_cases_opened: number
    cases_by_itemCode: Record<string, number>
  }
  item_type_distribution: Record<string, number>
  item_code_distribution: Record<string, number>
  average_skills_per_code: Record<string, Record<string, number>>
  case_drop_rates: Record<string, Record<string, number>>
}

const PUBLIC_IMAGES_BASE_URL = `${import.meta.env.BASE_URL}images/`
const COIN_ICON = `${PUBLIC_IMAGES_BASE_URL}game_coin.svg`
const CRAFT_ICON = `${PUBLIC_IMAGES_BASE_URL}craftItem.svg`
const SCRAPS_ICON = itemImageUrl("scraps")
const STEEL_ICON = itemImageUrl("steel")

// Rarity costs imported from constants

export interface ResourceCaseDrop {
  itemCode: string;
  minQty: number;
  maxQty: number;
  avgQty: number;
}

export const WOODEN_CASE_CONFIG = {
  code: "woodenCase",
  name: "Wooden Case",
  rarityChance: {
    common: 65,
    uncommon: 20,
    rare: 13,
    epic: 2,
  } as Record<string, number>,
  pool: {
    epic: [
      { itemCode: "cookedFish", minQty: 1, maxQty: 2, avgQty: 1.5 },
      { itemCode: "heavyAmmo", minQty: 1, maxQty: 5, avgQty: 3 },
      { itemCode: "cocain", minQty: 1, maxQty: 1, avgQty: 1 },
    ],
    rare: [
      { itemCode: "ammo", minQty: 5, maxQty: 20, avgQty: 12.5 },
      { itemCode: "steak", minQty: 1, maxQty: 4, avgQty: 2.5 },
    ],
    uncommon: [
      { itemCode: "concrete", minQty: 2, maxQty: 8, avgQty: 5 },
      { itemCode: "steel", minQty: 2, maxQty: 8, avgQty: 5 },
      { itemCode: "bread", minQty: 2, maxQty: 8, avgQty: 5 },
      { itemCode: "oil", minQty: 20, maxQty: 80, avgQty: 50 },
      { itemCode: "paper", minQty: 20, maxQty: 80, avgQty: 50 },
      { itemCode: "lightAmmo", minQty: 20, maxQty: 80, avgQty: 50 },
    ],
    common: [
      { itemCode: "grain", minQty: 20, maxQty: 80, avgQty: 50 },
      { itemCode: "iron", minQty: 20, maxQty: 80, avgQty: 50 },
      { itemCode: "wood", minQty: 20, maxQty: 80, avgQty: 50 },
      { itemCode: "lead", minQty: 20, maxQty: 80, avgQty: 50 },
      { itemCode: "limestone", minQty: 20, maxQty: 80, avgQty: 50 },
      { itemCode: "coca", minQty: 20, maxQty: 80, avgQty: 50 },
      { itemCode: "petroleum", minQty: 20, maxQty: 80, avgQty: 50 },
      { itemCode: "livestock", minQty: 1, maxQty: 4, avgQty: 2.5 },
      { itemCode: "fish", minQty: 1, maxQty: 2, avgQty: 1.5 },
    ],
  } as Record<string, ResourceCaseDrop[]>,
};

const CASE_CHANCES: Record<string, { name: string; types: Record<string, number>; rarity: Record<string, number> }> = {
  case1: {
    name: "Standard Case",
    types: {
      weapon: 30,
      equipment: 70,
    },
    rarity: {
      common: 62,
      uncommon: 30,
      rare: 7.1,
      epic: 0.85,
      legendary: 0.04,
      mythic: 0.01,
    }
  },
  case2: {
    name: "Elite Case",
    types: {
      weapon: 30,
      equipment: 70,
    },
    rarity: {
      common: 0,
      uncommon: 50,
      rare: 32,
      epic: 15,
      legendary: 2.5,
      mythic: 0.5,
    }
  }
}
const BULK_TEST_VALUE = 10000;

export const RARITY_OTHER_NAMES: Record<string, string> = {
  common: "Basic",
  uncommon: "Reinforced",
  rare: "Advanced",
  epic: "Elite",
  legendary: "Legendary",
  mythic: "Mythic",
}

export default function CraftTheory() {
  const { data: gameConfig, loading: configLoading } = useGameConfig()
  const { data: livePrices, loading: pricesLoading } = useLivePrices()
  const { data: analysis, loading: analysisLoading } = useLocalConfig<AnalysisData>("transactions_analysis")

  const equipmentCodes = useMemo(() => {
    return gameConfig?.equipments.map(e => e.code) ?? []
  }, [gameConfig])

  const { data: equipPrices, loading: equipPricesLoading } = useEquipmentPrices(equipmentCodes)

  const isLoading = configLoading || pricesLoading || equipPricesLoading || analysisLoading

  const rows = useMemo(() => {
    if (!gameConfig || !livePrices || !equipPrices) return []

    const scrapPrice = livePrices.prices["scraps"] ?? 0
    const steelPrice = livePrices.prices["steel"] ?? 0

    const equipRows = gameConfig.equipments.map(eq => {
      const costs = RARITY_COSTS[eq.rarity] || { scraps: 0, steel: 0 }
      const totalCost = costs.scraps * scrapPrice + costs.steel * steelPrice
      const avgSellPrice = equipPrices[eq.code] ?? 0
      const profit = avgSellPrice - totalCost

      return {
        ...eq,
        isRandom: false,
        scrapQty: costs.scraps,
        steelQty: costs.steel,
        scrapPrice,
        steelPrice,
        totalCost,
        avgSellPrice,
        profit,
        profitPct: totalCost > 0 ? (profit / totalCost) * 100 : 0
      }
    })

    // Random Crafting Logic: Half steel, same scraps. Avg price is mean of all in rarity.
    const rarities = Object.keys(RARITY_COSTS)
    const randomRows = rarities.map(rarity => {
      const perTypeItems = {
        weapon: gameConfig.equipments.filter(e => e.rarity === rarity && e.type === "weapon"),
        equipment: gameConfig.equipments.filter(e => e.rarity === rarity && e.type === "equipment")
      }
      const equipmentsInRarity = [...perTypeItems.weapon, ...perTypeItems.equipment]
      if (equipmentsInRarity.length === 0) return null

      const avgRarityPrice = equipmentsInRarity.reduce((acc, eq) => acc + (equipPrices[eq.code] ?? 0), 0) / equipmentsInRarity.length
      const costs = RARITY_COSTS[rarity]
      const randomSteelQty = costs.steel / 2
      const totalCost = costs.scraps * scrapPrice + randomSteelQty * steelPrice
      const profit = avgRarityPrice - totalCost

      return {
        code: `random-${rarity}`,
        rarity,
        isRandom: true,
        scrapQty: costs.scraps,
        steelQty: randomSteelQty,
        scrapPrice,
        steelPrice,
        totalCost,
        avgSellPrice: avgRarityPrice,
        profit,
        profitPct: totalCost > 0 ? (profit / totalCost) * 100 : 0,
        iconImg: ""
      }
    }).filter(Boolean) as any[]

    return [...equipRows, ...randomRows].sort((a, b) => b.profit - a.profit)
  }, [gameConfig, livePrices, equipPrices])

  const caseAnalysis = useMemo(() => {
    if (!gameConfig || !equipPrices || !livePrices) return []

    // 1. Equipment cases (case1, case2)
    const equipCases = Object.entries(CASE_CHANCES).map(([caseCode, config]) => {
      const casePrice = livePrices.prices[caseCode] ?? 0
      let expectedValue = 0

      // Calculate EV: Sum over rarities (P(rarity) * Sum over types (P(type) * AvgPrice[rarity, type]))
      Object.entries(config.rarity).forEach(([rarity, pRarity]) => {
        if (pRarity === 0) return

        let rarityValue = 0
        Object.entries(config.types).forEach(([type, pType]) => {
          const items = gameConfig.equipments.filter(e => e.rarity === rarity && e.type === type)
          if (items.length === 0) return
          const avgPrice = items.reduce((acc, eq) => acc + (equipPrices[eq.code] ?? 0), 0) / items.length
          rarityValue += (pType / 100) * avgPrice
        })

        expectedValue += (pRarity / 100) * rarityValue
      })

      const profit = expectedValue - casePrice
      const recommendation = profit > 0 ? "OPEN" : "SELL"

      return {
        code: caseCode,
        name: config.name,
        category: "equipment" as const,
        price: casePrice,
        ev: expectedValue,
        profit,
        recommendation,
        rarityChances: config.rarity,
        typeChances: config.types,
      }
    })

    // 2. Resource case (woodenCase)
    const woodenPrice = livePrices.prices["woodenCase"] ?? 0
    let woodenEV = 0
    const woodenRarityDetails: Record<string, { avgValue: number; items: (ResourceCaseDrop & { price: number; ev: number })[] }> = {}

    Object.entries(WOODEN_CASE_CONFIG.rarityChance).forEach(([rarity, prob]) => {
      const drops = WOODEN_CASE_CONFIG.pool[rarity] || []
      if (drops.length === 0) return

      const itemsWithPrices = drops.map(d => {
        const p = livePrices.prices[d.itemCode] ?? 0
        return {
          ...d,
          price: p,
          ev: d.avgQty * p,
        }
      })

      const avgRarityValue = itemsWithPrices.reduce((sum, item) => sum + item.ev, 0) / itemsWithPrices.length
      woodenEV += (prob / 100) * avgRarityValue

      woodenRarityDetails[rarity] = {
        avgValue: avgRarityValue,
        items: itemsWithPrices,
      }
    })

    const woodenProfit = woodenEV - woodenPrice
    const woodenRecommendation = woodenProfit > 0 ? "OPEN" : "SELL"

    const woodenCaseEntry = {
      code: "woodenCase",
      name: "Wooden Case",
      category: "resource" as const,
      price: woodenPrice,
      ev: woodenEV,
      profit: woodenProfit,
      recommendation: woodenRecommendation,
      rarityChances: WOODEN_CASE_CONFIG.rarityChance,
      typeChances: { resource: 100 },
      poolDetails: woodenRarityDetails,
    }

    return [...equipCases, woodenCaseEntry]
  }, [gameConfig, equipPrices, livePrices])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-500" />
          <p className="text-zinc-400 animate-pulse">Analyzing market data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calculators
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <img src={CRAFT_ICON} alt="craft" className="h-8 w-8" />
            Craft Theory
          </h1>
          <p className="mt-1 text-zinc-400">
            Compare material costs with average market prices and analyze expected returns from opening cases.
          </p>
        </div>

        <div className="my-6 flex flex-wrap gap-4 justify-center">
          <div className="rounded-md bg-zinc-900 px-3 py-2 border border-zinc-800 backdrop-blur-sm">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Equipment Case EV Formula</span>
            <code className="text-xs font-mono">
              EV = Σ [ P(rarity) × Σ ( P(type) × AvgPrice(rarity, type) ) ]
            </code>
          </div>
          <div className="rounded-md bg-zinc-900 px-3 py-2 border border-zinc-800 backdrop-blur-sm">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Wooden Case EV Formula</span>
            <code className="text-xs font-mono">
              EV = Σ [ P(rarity) × (1/N) Σ ( AvgUnits × UnitPrice ) ]
            </code>
          </div>
        </div>

        <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {caseAnalysis.map((ca) => (
            <Card key={ca.code} className="relative flex flex-col justify-between overflow-hidden border-zinc-800 bg-zinc-900/40">
              <div className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold tracking-wider ${ca.recommendation === "OPEN" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {ca.recommendation}
              </div>
              <div>
                <CardHeader className="pb-3 px-6 pt-6">
                  <div className="flex items-center gap-4">
                    <GameItemIcon
                      itemCode={ca.code}
                      rarity={ca.code === "case2" ? "mythic" : "legendary"}
                      className="h-14 w-14 rounded-lg shadow-2xl"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{ca.name}</CardTitle>
                      </div>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        Market Price:
                        <span className="flex items-center gap-1 font-semibold text-zinc-100">
                          {ca.price.toFixed(2)}
                          <img src={COIN_ICON} alt="coins" className="h-4 w-4" />
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="rounded-lg border border-zinc-800 bg-black/20 p-3">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Expected Value</span>
                      <div className="flex items-center gap-1 text-xl font-bold text-emerald-400 mt-1">
                        {ca.ev.toFixed(2)}
                        <img src={COIN_ICON} alt="coins" className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-black/20 p-3">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Estimated {ca.profit > 0 ? "Profit" : "Loss"}</span>
                      <div className={`flex items-center gap-1 text-xl font-bold mt-1 ${ca.profit > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {ca.profit.toFixed(2)}
                        <img src={COIN_ICON} alt="coins" className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        {ca.category === "resource" ? "Resource Rarity Rolls" : "Rarity Probabilities"}
                      </span>
                      <div className="flex gap-3 text-[10px] text-zinc-500 uppercase tracking-tighter font-bold">
                        {Object.entries(ca.typeChances).map(([type, prob]) => (
                          <span key={type}>{prob}% {type}</span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(ca.rarityChances)
                        .reverse()
                        .map(([rarity, prob]) => (
                          <div key={rarity} className="flex items-center gap-3">
                            <div className={`w-20 text-[10px] font-bold uppercase tracking-tight truncate ${prob === 0 ? "text-zinc-700" : "text-zinc-500"}`}>
                              {rarity}
                            </div>
                            <div className="relative h-1.5 flex-1 rounded-full bg-zinc-800 overflow-hidden">
                              {prob > 0 && (
                                <div
                                  className="absolute h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(100, prob)}%`,
                                    background: RARITY_COLORS[rarity]?.color
                                  }}
                                />
                              )}
                            </div>
                            <div className={`w-10 text-right text-[10px] font-mono ${prob === 0 ? "text-zinc-700 font-normal" : "text-zinc-400"}`}>
                              {prob}%
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {ca.category === "resource" && (
                    <div className="mt-5 rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2 flex items-center justify-between">
                        <span>Work Budget: 20–80 pts</span>
                        <span className="text-zinc-500 font-normal">Amount = Budget / Cost</span>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center text-zinc-300 flex-col">
                            <span className="text-purple-400 font-semibold">Epic (2%)</span>
                          <span className="font-mono text-zinc-400 text-[10px]">Cooked Fish (1-2), Heavy Ammo (1-5), Pill (1)</span>
                        </div>
                        <div className="flex justify-between items-center text-zinc-300 flex-col">
                          <span className="text-blue-400 font-semibold">Rare (13%)</span>
                          <span className="font-mono text-zinc-400 text-[10px]">Ammo (5-20), Steak (1-4)</span>
                        </div>
                        <div className="flex justify-between items-center text-zinc-300 flex-col">
                          <span className="text-emerald-400 font-semibold">Uncommon (20%)</span>
                          <span className="font-mono text-zinc-400 text-[10px]">Conc/Steel/Bread (2-8), Oil/Paper/Light (20-80)</span>
                        </div>
                        <div className="flex justify-between items-center text-zinc-300 flex-col">
                          <span className="text-zinc-400 font-semibold">Common (65%)</span>
                          <span className="font-mono text-zinc-400 text-[10px]">Raw (20-80), Livestock (1-4), Fish (1-2)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 rounded-lg border border-zinc-800/50 bg-black/40 p-4 relative overflow-hidden group">
                    <div className="absolute right-[-20px] bottom-[-20px] text-zinc-800/10 text-8xl font-black italic pointer-events-none transition-transform group-hover:scale-110">{BULK_TEST_VALUE}X</div>
                    <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-black mb-4 flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${ca.profit > 0 ? "bg-emerald-500" : "bg-red-500"} animate-pulse mb-1`} />
                      Bulk Analysis ({BULK_TEST_VALUE.toLocaleString()} Crates)
                    </h4>

                    <div className="space-y-3 relative z-10">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Revenue from Selling</span>
                        <span className="flex items-center gap-1 font-mono font-semibold">
                          {Math.round(ca.price * BULK_TEST_VALUE).toLocaleString()}
                          <img src={COIN_ICON} alt="coins" className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Revenue from Opening</span>
                        <span className="flex items-center gap-1 font-mono font-semibold text-emerald-400">
                          {Math.round(ca.ev * BULK_TEST_VALUE).toLocaleString()}
                          <img src={COIN_ICON} alt="coins" className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="pt-2 border-t border-zinc-800/50 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-tight text-zinc-400">Net {ca.profit > 0 ? "Profit" : "Loss"}</span>
                        <div className={`flex items-center gap-1 text-lg font-black ${ca.profit > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {Math.round(ca.profit * BULK_TEST_VALUE).toLocaleString()}
                          <img src={COIN_ICON} alt="coins" className="h-5 w-5" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {Object.entries(ca.rarityChances)
                        .reverse()
                        .slice(0, 3)
                        .map(([rarity, prob]) => (
                          <div key={rarity} className={`flex flex-col items-center p-2 rounded border ${prob === 0 ? "bg-transparent border-zinc-900 opacity-30" : "bg-white/5 border-white/5"}`}>
                            <span className="text-[8px] uppercase text-zinc-500 font-bold">{rarity}</span>
                            <span className="text-xs font-bold text-zinc-200">~{Math.round(prob * 100).toLocaleString()} drops</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>

        {analysis && (
          <Card className="mb-6 border-zinc-800/60 bg-zinc-900/10 backdrop-blur-sm overflow-hidden" style={{ display: "none" }}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Community Data Insights
                  </CardTitle>
                  <CardDescription>
                    Empirical analysis of {analysis.summary.total_cases_opened.toLocaleString()} verified case openings.
                  </CardDescription>
                </div>
                <div className="flex gap-4 text-right">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Standard</span>
                    <span className="text-sm font-mono font-bold text-zinc-300">{analysis.summary.cases_by_itemCode.case1.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Elite</span>
                    <span className="text-sm font-mono font-bold text-zinc-300">{analysis.summary.cases_by_itemCode.case2.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Top Level Stats */}
              <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Item Type Ratio</h5>
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-zinc-400">EQUIPMENT</span>
                      <span className="text-zinc-200">{((analysis.item_type_distribution.equipment / analysis.summary.total_cases_opened) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${(analysis.item_type_distribution.equipment / analysis.summary.total_cases_opened) * 100}%` }}
                      />
                      <div
                        className="h-full bg-amber-500 opacity-50"
                        style={{ width: `${(analysis.item_type_distribution.weapon / analysis.summary.total_cases_opened) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold pt-1">
                      <span className="text-zinc-400">WEAPONS</span>
                      <span className="text-zinc-200">{((analysis.item_type_distribution.weapon / analysis.summary.total_cases_opened) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>


              {/* Rarity Grouped Drop Analysis */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h4 className="text-xs font-black text-zinc-300 uppercase tracking-widest">Empirical Rarity Distribution</h4>
                  <span className="text-[10px] font-bold text-zinc-500 italic">Comparing actual drops with official case rates</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {["case1", "case2"].map(caseCode => {
                    const rates = analysis.case_drop_rates[caseCode] || {};
                    // Group by rarity using gameConfig
                    const rarityTotals: Record<string, number> = {};
                    Object.entries(rates).forEach(([code, rate]) => {
                      const item = gameConfig?.equipments.find(e => e.code === code);
                      if (item) {
                        rarityTotals[item.rarity] = (rarityTotals[item.rarity] || 0) + rate;
                      }
                    });

                    return (
                      <div key={caseCode} className="space-y-4 p-4 rounded-xl bg-zinc-950/30 border border-zinc-800/40">
                        <div className="flex items-center gap-3">
                          <GameItemIcon itemCode={caseCode} className="h-8 w-8" />
                          <h5 className="text-sm font-bold text-zinc-200">{caseCode === "case1" ? "Standard Case" : "Elite Case"}</h5>
                        </div>
                        <div className="space-y-3">
                          {Object.keys(RARITY_COSTS).reverse().map(rarity => {
                            const actual = (rarityTotals[rarity] || 0) * 100;
                            const theoretical = CASE_CHANCES[caseCode].rarity[rarity] || 0;
                            const diff = actual - theoretical;

                            return (
                              <div key={rarity} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold items-center">
                                  <span className="w-16 uppercase tracking-tight" style={{ color: RARITY_COLORS[rarity].color }}>{rarity}</span>
                                  <div className="flex gap-3 font-mono">
                                    {/* <span className="text-zinc-500">TH: {theoretical.toFixed(2)}%</span> */}
                                    <span className="text-zinc-300">{actual.toFixed(2)}%</span>
                                    {/* {theoretical > 0 && (
                                      <span className={diff >= 0 ? "text-emerald-500" : "text-red-500"}>
                                        {diff >= 0 ? "+" : ""}{diff.toFixed(2)}%
                                      </span>
                                    )} */}
                                  </div>
                                </div>
                                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden flex">
                                  <div
                                    className="h-full transition-all duration-1000"
                                    style={{
                                      width: `${actual}%`,
                                      backgroundColor: RARITY_COLORS[rarity].color
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Full Item Drop Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h4 className="text-xs font-black text-zinc-300 uppercase tracking-widest">Full Empirical Drop Inventory</h4>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase flex gap-4">
                    <span className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />Standard Case Rate</span>
                    <span className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Elite Case Rate</span>
                  </div>
                </div>

                {/* <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"> */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(analysis.item_code_distribution)
                    .sort((a, b) => {
                      const itemA = gameConfig?.equipments.find(e => e.code === a[0]);
                      const itemB = gameConfig?.equipments.find(e => e.code === b[0]);
                      // Sort by rarity first, then by code
                      const rarities = Object.keys(RARITY_COSTS);
                      const rDiff = rarities.indexOf(itemB?.rarity || "") - rarities.indexOf(itemA?.rarity || "");
                      return rDiff !== 0 ? rDiff : a[0].localeCompare(b[0]);
                    })
                    .map(([code, totalCount]) => {
                      const item = gameConfig?.equipments.find(e => e.code === code);
                      const c1Rate = (analysis.case_drop_rates.case1?.[code] || 0) * 100;
                      const c2Rate = (analysis.case_drop_rates.case2?.[code] || 0) * 100;
                      const avgStats = analysis.average_skills_per_code[code] || {};

                      return (
                        <div key={code} className="group relative p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/40 hover:border-zinc-700/60 transition-all">
                          <div className="flex gap-3 items-start">
                            <GameItemIcon itemCode={code} rarity={item?.rarity} className="h-10 w-10 rounded-md" />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <span className="text-[11px] font-black text-zinc-100 truncate uppercase leading-tight">
                                  {item?.type === "weapon" ? "" : RARITY_OTHER_NAMES[item?.rarity || ""]} {code.replace(/[0-9]/g, '')}
                                </span>
                                <span className="text-[9px] font-mono text-zinc-500">{(totalCount / analysis.summary.total_cases_opened * 100).toFixed(2)}%</span>
                              </div>

                              <div className="mt-2 flex gap-1.5 items-center flex-wrap">
                                {Object.entries(avgStats).map(([s, v]) => (
                                  <div key={s} className="flex items-center gap-0.5 px-1 rounded bg-black/40 border border-zinc-800/50">
                                    <img src={`${PUBLIC_IMAGES_BASE_URL}${s}.svg`} className="h-3 w-3" alt={s} />
                                    <span className="text-[8px] font-mono text-zinc-300">{v.toFixed(1)}</span>
                                  </div>
                                ))}
                                <div className="flex items-centre gap-2 text-[10px] font-mono font-bold leading-none">
                                  <span className="text-zinc-500">{c1Rate.toFixed(1)}%</span>
                                  <span className="text-emerald-500">{c2Rate.toFixed(1)}%</span>
                                </div>
                              </div>

                              {/* <div className="mt-3 flex gap-2 items-center">
                                <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden flex">
                                  <div className="h-full bg-zinc-600" style={{ width: `${c1Rate * 5}%` }} />
                                  <div className="h-full bg-emerald-500" style={{ width: `${c2Rate * 5}%` }} />
                                </div>
                                <div className="flex gap-2 text-[9px] font-mono font-bold leading-none">
                                  <span className="text-zinc-500">C1:{c1Rate.toFixed(1)}%</span>
                                  <span className="text-emerald-500">C2:{c2Rate.toFixed(1)}%</span>
                                </div>
                              </div> */}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                {/* </div> */}
              </div>

              {/* <div className="mt-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex gap-4 items-start">
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-emerald-400">!</span>
                </div>
                <div className="text-[10px] text-zinc-500 leading-relaxed">
                  <strong>Analysis Methodology:</strong> This data utilizes all 239 recorded item codes and their associated metadata.
                  Drop rates are calculated independently for each case type by aggregating individual transaction logs.
                  The variance indicator (AC vs TH) helps identify items that are potentially dropping more or less frequently
                  than official rates suggest, providing a significant edge for bulk crate investors.
                </div>
              </div> */}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 border-zinc-800 bg-zinc-900/20">
          <CardContent className="py-4 px-6 flex flex-wrap gap-8 items-center">
            <div className="flex items-center gap-3">
              <GameItemIcon itemCode="scraps" className="h-8 w-8 rounded-md" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold leading-tight">Scraps Price</span>
                <span className="flex items-center gap-1 font-semibold text-zinc-100">
                  {(livePrices?.prices["scraps"] ?? 0).toFixed(4)}
                  <img src={COIN_ICON} alt="coins" className="h-4 w-4" />
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 border-l border-zinc-800 pl-8">
              <GameItemIcon itemCode="steel" className="h-8 w-8 rounded-md" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold leading-tight">Steel Price</span>
                <span className="flex items-center gap-1 font-semibold text-zinc-100">
                  {(livePrices?.prices["steel"] ?? 0).toFixed(4)}
                  <img src={COIN_ICON} alt="coins" className="h-4 w-4" />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profitability Rankings</CardTitle>
            <CardDescription>
              Ranked by total profit per craft. Average prices are fetched from recent market data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Rarity</TableHead>
                  <TableHead className="text-right">Material Cost</TableHead>
                  <TableHead className="text-right">Avg Market Price</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">ROI (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <GameItemIcon
                          itemCode={r.isRandom ? undefined : r.code}
                          rarity={r.rarity}
                          className="h-10 w-10 rounded-md text-2xl font-[Saira] font-[600]"
                        >
                          {r.isRandom && "?"}
                        </GameItemIcon>
                        <div className="flex flex-col">
                          <span className="capitalize">
                            {r.isRandom ? `Random ${r.rarity}` : `${r.type == "weapon" ? "" : RARITY_OTHER_NAMES[r.rarity]} ${r.code.replace(/[0-9]/g, '')}`}
                          </span>
                          {!r.isRandom && (
                            <div className="flex gap-2 items-center">
                              {Object.entries(r.dynamicStats).map(([key, value]: [string, any]) => (
                                <div className="flex items-center gap-1">
                                  <img
                                    key={key}
                                    src={`${PUBLIC_IMAGES_BASE_URL}${key}.svg`}
                                    alt={key}
                                    className="h-4 w-4 object-contain"
                                  />
                                  <span className="text-xs text-zinc-500">{value.join('-')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="default"
                        style={{ background: RARITY_COLORS[r.rarity].bg, color: RARITY_COLORS[r.rarity].color, outlineColor: RARITY_COLORS[r.rarity].color }}
                      >
                        {r.rarity.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="flex flex-col items-end">
                        <span className="flex items-center gap-1">
                          {r.totalCost.toFixed(2)}
                          <img src={COIN_ICON} alt="coins" className="h-3 w-3" />
                        </span>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <span>{r.scrapQty}</span>
                          <img src={SCRAPS_ICON} alt="scraps" className="h-3 w-3" />
                          X
                          <span className="text-emerald-400">{r.scrapPrice.toFixed(2)}</span>
                          +
                          <span>{r.steelQty}</span>
                          <img src={STEEL_ICON} alt="steel" className="h-3 w-3" />
                          X
                          <span className="text-emerald-400">{r.steelPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="flex flex-col items-end">
                        <span className="flex items-center justify-end gap-1">
                          {r.avgSellPrice.toFixed(2)}
                          <img src={COIN_ICON} alt="coins" className="h-3 w-3" />
                        </span>
                        {r.isRandom && (
                          <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <span>avg of {r.rarity} items</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-bold tabular-nums ${r.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      <span className="flex items-center justify-end gap-1">
                        {r.profit.toFixed(2)}
                        <img src={COIN_ICON} alt="coins" className="h-3 w-3" />
                      </span>
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${r.profitPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {r.profitPct.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
