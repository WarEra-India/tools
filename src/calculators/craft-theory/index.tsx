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
import { useLivePrices } from "@/lib/useLivePrices"
import { useEquipmentPrices } from "@/lib/useEquipmentPrices"
import { GameItemIcon, RARITY_COLORS } from "@/components/GameItemIcon"

const PUBLIC_IMAGES_BASE_URL = `${import.meta.env.BASE_URL}images/`
const COIN_ICON = `${PUBLIC_IMAGES_BASE_URL}game_coin.svg`
const CRAFT_ICON = `${PUBLIC_IMAGES_BASE_URL}craftItem.svg`
const BASE_IMAGES_URL = "https://app.warera.io/images/items/"
const SCRAPS_ICON = `${BASE_IMAGES_URL}scraps.png`
const STEEL_ICON = `${BASE_IMAGES_URL}steel.png`

// Rarity costs from sketch.md
const RARITY_COSTS: Record<string, { scraps: number; steel: number }> = {
  common: { scraps: 6, steel: 2 },
  uncommon: { scraps: 18, steel: 4 },
  rare: { scraps: 54, steel: 8 },
  epic: { scraps: 162, steel: 16 },
  legendary: { scraps: 486, steel: 32 },
  mythic: { scraps: 1460, steel: 64 },
}

const CASE_CHANCES: Record<string, { types: Record<string, number>, rarity: Record<string, number> }> = {
  case1: {
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

const RARITY_OTHER_NAMES: Record<string, string> = {
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

  const equipmentCodes = useMemo(() => {
    return gameConfig?.equipments.map(e => e.code) ?? []
  }, [gameConfig])

  const { data: equipPrices, loading: equipPricesLoading } = useEquipmentPrices(equipmentCodes)

  const isLoading = configLoading || pricesLoading || equipPricesLoading

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

    return Object.entries(CASE_CHANCES).map(([caseCode, config]) => {
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
        price: casePrice,
        ev: expectedValue,
        profit,
        recommendation,
        rarityChances: config.rarity,
        typeChances: config.types
      }
    })
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
      <div className="container mx-auto max-w-6xl px-4 py-8">
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
            Compare material costs with average equipment market prices to find the most profitable items to craft.
          </p>
        </div>

        <div className="my-6 flex flex-wrap gap-4 justify-center">
          <div className="rounded-md bg-zinc-900 px-3 py-2 border border-zinc-800 backdrop-blur-sm">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Expected Value Formula</span>
            <code className="text-xs font-mono">
              EV = Σ [ P(rarity) × Σ ( P(type) × AvgPrice(rarity, type) ) ]
            </code>
          </div>
          {/* <div className="rounded-md bg-zinc-900 px-3 py-2 border border-zinc-800 backdrop-blur-sm">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Profit Formula</span>
              <code className="text-xs font-mono text-emerald-400">
                Profit = EV - CaseMarketPrice
              </code>
            </div> */}
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {caseAnalysis.map((ca) => (
            <Card key={ca.code} className="relative overflow-hidden border-zinc-800 bg-zinc-900/40">
              <div className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold tracking-wider ${ca.recommendation === "OPEN" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {ca.recommendation}
              </div>
              <CardHeader className="pb-3 px-6 pt-6">
                <div className="flex items-center gap-4">
                  <GameItemIcon
                    itemCode={ca.code}
                    rarity={ca.code === "case1" ? "legendary" : "mythic"}
                    className="h-14 w-14 rounded-lg shadow-2xl"
                  />
                  <div>
                    <CardTitle className="text-xl">{ca.code === "case1" ? "Standard Case" : "Elite Case"}</CardTitle>
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
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Rarity Probabilities</span>
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

                <div className="mt-8 rounded-lg border border-zinc-800/50 bg-black/40 p-4 relative overflow-hidden group">
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
            </Card>
          ))}
        </div>

        <Card className="mb-6 border-zinc-800 bg-zinc-900/20">
          <CardContent className="py-4 px-6 flex flex-wrap gap-8 items-center">
            <div className="flex items-center gap-3">
              <img src={SCRAPS_ICON} className="h-8 w-8 object-contain" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold leading-tight">Scraps Price</span>
                <span className="flex items-center gap-1 font-semibold text-zinc-100">
                  {(livePrices?.prices["scraps"] ?? 0).toFixed(4)}
                  <img src={COIN_ICON} alt="coins" className="h-4 w-4" />
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 border-l border-zinc-800 pl-8">
              <img src={STEEL_ICON} className="h-8 w-8 object-contain" />
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
