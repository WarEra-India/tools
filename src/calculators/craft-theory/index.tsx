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
import { useGameConfig } from "@/lib/useGameConfig"
import { useLivePrices } from "@/lib/useLivePrices"
import { useEquipmentPrices } from "@/lib/useEquipmentPrices"

const PUBLIC_IMAGES_BASE_URL = `${import.meta.env.BASE_URL}images/`
const COIN_ICON = `${PUBLIC_IMAGES_BASE_URL}game_coin.svg`
const CRAFT_ICON = `${PUBLIC_IMAGES_BASE_URL}craft.svg`
const BASE_IMAGES_URL = "https://app.warera.io/images/items/"
const SCRAPS_ICON = `${BASE_IMAGES_URL}scraps.png`
const STEEL_ICON = `${BASE_IMAGES_URL}steel.png`
const CASE1_ICON = `${BASE_IMAGES_URL}case1.png`
const CASE2_ICON = `${BASE_IMAGES_URL}case2.png`

// Rarity costs from sketch.md
const RARITY_COSTS: Record<string, { scraps: number; steel: number }> = {
  common: { scraps: 6, steel: 2 },
  uncommon: { scraps: 18, steel: 4 },
  rare: { scraps: 54, steel: 8 },
  epic: { scraps: 162, steel: 16 },
  legendary: { scraps: 486, steel: 32 },
  mythic: { scraps: 1460, steel: 64 },
}

const RARITY_COLORS: Record<string, any> = {
  common: {
    color: "#546A78",
    bg: "linear-gradient(45deg,#252E35,#101417)",
  },
  uncommon: {
    color: "#82D8A2",
    bg: "linear-gradient(45deg,#143320,#09160E)",
  },
  rare: {
    color: "#2B50A1",
    bg: "linear-gradient(45deg,#132347,#080F1E)",
  },
  epic: {
    color: "#634294",
    bg: "linear-gradient(45deg,#2B1D41,#130C1C)",
  },
  legendary: {
    color: "#E1C997",
    bg: "linear-gradient(45deg, #3C3016, #1A150A)",
  },
  mythic: {
    color: "#E68989",
    bg: "linear-gradient(45deg,#3E1212,#1B0808)",
  }
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
      const equipmentsInRarity = gameConfig.equipments.filter(e => e.rarity === rarity)
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

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Market Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <img
                    src={SCRAPS_ICON}
                    className="h-8 w-8 object-contain"
                  />
                  <span className="text-zinc-500">Scraps Price:</span>
                  <span className="text-emerald-400">{(livePrices?.prices["scraps"] ?? 0).toFixed(4)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={STEEL_ICON}
                    className="h-8 w-8 object-contain"
                  />
                  <span className="text-zinc-500">Steel Price:</span>
                  <span className="text-emerald-400">{(livePrices?.prices["steel"] ?? 0).toFixed(4)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Case Prices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <img
                    src={CASE1_ICON}
                    style={{ background: RARITY_COLORS["legendary"].bg }}
                    className="h-8 w-8 object-contain rounded-md"
                  />
                  <span className="text-zinc-500">Case:</span>
                  <span className="text-emerald-400">{(livePrices?.prices["case1"] ?? 0).toFixed(4)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={CASE2_ICON}
                    style={{ background: RARITY_COLORS["mythic"].bg }}
                    className="h-8 w-8 object-contain rounded-md"
                  />
                  <span className="text-zinc-500">Elite Case:</span>
                  <span className="text-emerald-400">{(livePrices?.prices["case2"] ?? 0).toFixed(4)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                        {r.isRandom ? (
                          <div
                            style={{ background: RARITY_COLORS[r.rarity].bg, color: RARITY_COLORS[r.rarity].color }}
                            className="h-10 w-10 rounded-md flex items-center justify-center text-2xl font-[Saira] font-[600]"
                          >
                            ?
                          </div>
                        ) : (
                          <img
                            src={`${BASE_IMAGES_URL}${r.iconImg ?? (r.code + ".png")}`}
                            style={{ background: RARITY_COLORS[r.rarity].bg }}
                            alt={r.code}
                            className="h-10 w-10 rounded-md object-contain"
                          />
                        )}
                        <div className="flex flex-col">
                          <span className="capitalize">{r.isRandom ? `Random ${r.rarity}` : `${r.rarity} ${r.code.replace(/[0-9]/g, '')}`}</span>
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
