import { useState, useMemo, useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Coins } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  Label,
  Legend,
} from "recharts"
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
import { Drawer } from "@/components/ui/drawer"
import { getDefaultData } from "./data"
import { calculate } from "./calculator"
import { itemImageUrl } from "@/lib/images"
import { itemName } from "@/lib/items"
import { useLivePrices } from "@/lib/useLivePrices"

const PP_ICON = `${import.meta.env.BASE_URL}images/production_point.svg`
const COIN_ICON = `${import.meta.env.BASE_URL}images/game_coin.svg`

function ChartIconTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const item = payload?.value ?? ""
  const url = itemImageUrl(item)
  const size = 24
  return (
    <g transform={`translate(${(x ?? 0) - size / 2},${(y ?? 0) + 4})`}>
      <image href={url} width={size} height={size} />
    </g>
  )
}

const CHART_COLORS = [
  "#22d3ee", "#a78bfa", "#f472b6", "#34d399", "#fbbf24",
  "#fb923c", "#60a5fa", "#e879f9", "#4ade80", "#f87171",
  "#38bdf8", "#c084fc", "#fb7185", "#2dd4bf", "#facc15",
  "#f97316", "#818cf8", "#d946ef",
]

export default function CompanyProductionProfit() {
  const [data, setData] = useState(getDefaultData)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { data: livePrices, loading: _pricesLoading } = useLivePrices()

  // Auto-update prices whenever live data arrives
  useEffect(() => {
    if (!livePrices?.prices) return
    setData((prev) => ({
      ...prev,
      prices: { ...prev.prices, ...livePrices.prices },
    }))
  }, [livePrices])

  const rows = useMemo(() => calculate(data), [data])

  const rawItems = Object.keys(data.rawPP)
  const processedItems = Object.keys(data.recipes)

  const processedRows = useMemo(() => rows.filter((r) => r.type === "Processed"), [rows])

  const rawRowMap = useMemo(
    () => Object.fromEntries(rows.filter((r) => r.type === "Raw").map((r) => [r.item, r])),
    [rows]
  )

  const groupedData = useMemo(
    () =>
      processedRows.map((r) => {
        const primaryInput = Object.keys(r.inputs ?? {})[0] ?? ""
        return {
          item: r.item,
          rawInput: primaryInput,
          rawProfitPP: rawRowMap[primaryInput]?.profitPP ?? 0,
          processedProfitPP: r.profitPP,
        }
      }),
    [processedRows, rawRowMap]
  )

  const priceList = (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Raw Materials
        </h3>
        <div className="space-y-1.5">
          {rawItems.map((item, index) => (
            <div key={item} className={`flex items-center gap-3 ${index % 2 === 0 ? "" : "bg-zinc-800"} pt-1 px-2 rounded`}>
              <img
                src={itemImageUrl(item)}
                alt={itemName(item)}
                className="h-6 w-6 object-contain"
                onError={(e) => { e.currentTarget.style.display = "none" }}
              />
              <span className="flex-1 truncate text-sm" title={itemName(item)}>
                {itemName(item)}
              </span>
              <span className="tabular-nums text-sm text-zinc-300">
                {(data.prices[item] ?? 0).toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Processed Items
        </h3>
        <div className="space-y-1.5">
          {processedItems.map((item, index) => (
            <div key={item} className={`flex items-center gap-3 ${index % 2 === 0 ? "" : "bg-zinc-800"} pt-1 px-2 rounded`}>
              <img
                src={itemImageUrl(item)}
                alt={itemName(item)}
                className="h-6 w-6 object-contain"
                onError={(e) => { e.currentTarget.style.display = "none" }}
              />
              <span className="flex-1 truncate text-sm" title={itemName(item)}>
                {itemName(item)}
              </span>
              <span className="tabular-nums text-sm text-zinc-300">
                {(data.prices[item] ?? 0).toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calculators
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            Company Production
          </h1>
          <p className="mt-1 text-zinc-400">
            Live market prices to see which items are most profitable to produce.
          </p>
          {/* {livePrices && (
            <p className="mt-1 text-xs text-zinc-500">
              Last updated: {new Date(livePrices.timestamp).toLocaleTimeString()}
            </p>
          )}
          {pricesLoading && !livePrices && (
            <p className="mt-1 text-xs text-zinc-500 animate-pulse">Loading live prices…</p>
          )} */}
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Live Prices — sidebar on desktop */}
          <div className="hidden lg:block">
            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2">
                  Live Prices
                  <img src={COIN_ICON} alt="coins" className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Updates automatically every 30s</CardDescription>
              </CardHeader>
              <CardContent>{priceList}</CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="flex flex-col gap-6">
            {/* Chart */}
            <Card className="order-1">
              <CardHeader>
                <CardTitle className="flex gap-2">
                  Profit
                  <img src={COIN_ICON} alt="coins" className="h-4 w-4" />
                  /
                  <img src={PP_ICON} alt="PP" className="h-4 w-4" />
                  PP
                </CardTitle>
                <CardDescription>
                  Items ranked by profit efficiency (profit per production point)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={rows}
                      margin={{ top: 5, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis
                        dataKey="item"
                        tick={<ChartIconTick />}
                        interval={0}
                        height={52}
                      >
                        <Label
                          value="Items"
                          position="insideBottom"
                          offset={0}
                          fill="#71717a"
                          fontSize={12}
                        />
                      </XAxis>
                      <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} width={60}>
                        <Label
                          value="Profit / PP"
                          angle={-90}
                          position="insideLeft"
                          offset={10}
                          fill="#71717a"
                          fontSize={12}
                          style={{ textAnchor: "middle" }}
                        />
                      </YAxis>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          color: "#18181b",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                        }}
                        labelStyle={{ color: "#3f3f46", fontWeight: 600, marginBottom: 2 }}
                        labelFormatter={(label) => itemName(String(label))}
                        itemStyle={{ color: "#18181b" }}
                        formatter={(value) => [
                          typeof value === "number" ? value.toFixed(4) : value,
                          "Profit / PP",
                        ]}
                      />
                      <Bar dataKey="profitPP" radius={[4, 4, 0, 0]}>
                        {rows.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Stacked: Sell = Cost + Profit (processed only) */}
            <Card className="order-3">
              <CardHeader>
                <CardTitle>Sell Price = Cost + Profit</CardTitle>
                <CardDescription>
                  Each bar shows how much of the sell price is input cost vs pure profit — sorted by sell price
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...processedRows].sort((a, b) => b.sell - a.sell)}
                      margin={{ top: 5, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis
                        dataKey="item"
                        tick={<ChartIconTick />}
                        interval={0}
                        height={52}
                      >
                        <Label
                          value="Items"
                          position="insideBottom"
                          offset={0}
                          fill="#71717a"
                          fontSize={12}
                        />
                      </XAxis>
                      <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} width={60}>
                        <Label
                          value="Price (coins)"
                          angle={-90}
                          position="insideLeft"
                          offset={10}
                          fill="#71717a"
                          fontSize={12}
                          style={{ textAnchor: "middle" }}
                        />
                      </YAxis>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          color: "#18181b",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                        }}
                        labelStyle={{ color: "#3f3f46", fontWeight: 600, marginBottom: 2 }}
                        labelFormatter={(label) => itemName(String(label))}
                        itemStyle={{ color: "#18181b" }}
                        formatter={(value, name) => [
                          typeof value === "number" ? value.toFixed(4) : value,
                          name === "cost" ? "Input Cost" : "Profit",
                        ]}
                      />
                      <Legend
                        formatter={(value) => value === "cost" ? "Input Cost" : "Profit"}
                        wrapperStyle={{ color: "#a1a1aa", fontSize: 12, paddingTop: 4 }}
                      />
                      <Bar dataKey="cost" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="profit" stackId="a" fill="#34d399" radius={[4, 4, 0, 0]}>
                        {[...processedRows]
                          .sort((a, b) => b.sell - a.sell)
                          .map((r, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={r.profit >= 0 ? "#34d399" : "#f87171"}
                            />
                          ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Grouped: Raw vs Processed Profit/PP */}
            <Card className="order-4">
              <CardHeader>
                <CardTitle className="flex gap-2">
                  Raw vs Processed -
                  Profit
                  <img src={COIN_ICON} alt="coins" className="h-4 w-4" />
                  /
                  <img src={PP_ICON} alt="PP" className="h-4 w-4" />
                  PP
                </CardTitle>
                <CardDescription>
                  Is it worth processing? Compare the raw material's Profit/PP against its processed product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={groupedData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis
                        dataKey="item"
                        tick={<ChartIconTick />}
                        interval={0}
                        height={52}
                      >
                        <Label
                          value="Processed Items"
                          position="insideBottom"
                          offset={0}
                          fill="#71717a"
                          fontSize={12}
                        />
                      </XAxis>
                      <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} width={60}>
                        <Label
                          value="Profit / PP"
                          angle={-90}
                          position="insideLeft"
                          offset={10}
                          fill="#71717a"
                          fontSize={12}
                          style={{ textAnchor: "middle" }}
                        />
                      </YAxis>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          color: "#18181b",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                        }}
                        labelStyle={{ color: "#3f3f46", fontWeight: 600, marginBottom: 2 }}
                        labelFormatter={(label) => itemName(String(label))}
                        itemStyle={{ color: "#18181b" }}
                        formatter={(value, name, props) => [
                          typeof value === "number" ? value.toFixed(4) : value,
                          name === "rawProfitPP"
                            ? `Raw (${itemName((props.payload as { rawInput: string }).rawInput)})`
                            : "Processed",
                        ]}
                      />
                      <Legend
                        formatter={(value) =>
                          value === "rawProfitPP" ? "Raw Material" : "Processed Product"
                        }
                        wrapperStyle={{ color: "#a1a1aa", fontSize: 12, paddingTop: 4 }}
                      />
                      <Bar dataKey="rawProfitPP" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="processedProfitPP" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Profit Table */}
            <Card className="order-2">
              <CardHeader>
                <CardTitle>Profit Breakdown</CardTitle>
                <CardDescription>
                  All items sorted by profit per production point (descending)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Sell Price</TableHead>
                      <TableHead className="text-right">Profit/Unit</TableHead>
                      <TableHead className="text-right">PP Required</TableHead>
                      <TableHead className="text-right">Profit/PP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.item}>
                        <TableCell>
                          <Badge variant="secondary">
                            {r.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-2">
                            <img
                              src={itemImageUrl(r.item)}
                              alt={itemName(r.item)}
                              className="h-5 w-5 object-contain"
                              onError={(e) => { e.currentTarget.style.display = "none" }}
                            />
                            <span>
                              {itemName(r.item)}
                              {r.inputs && (
                                <span className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                                  {Object.entries(r.inputs).map(([mat, qty]) => (
                                    <span key={mat} className="inline-flex items-center gap-1 text-xs text-zinc-400">
                                      <img
                                        src={itemImageUrl(mat)}
                                        alt={itemName(mat)}
                                        className="h-3.5 w-3.5 object-contain"
                                        onError={(e) => { e.currentTarget.style.display = "none" }}
                                      />
                                      {qty}× {itemName(mat)}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.sell.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${r.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {r.profit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className="inline-flex items-center justify-end gap-1">
                            {r.pp}
                            <img src={PP_ICON} alt="PP" className="h-4 w-4" />
                          </span>
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold tabular-nums ${r.profitPP >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          <span className="inline-flex items-center justify-end gap-1">
                            {r.profitPP.toFixed(4)}
                            <img src={COIN_ICON} alt="PP" className="h-4 w-4" />
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <span className="flex items-center gap-2">
            Live Prices
            <img src={COIN_ICON} alt="coins" className="h-4 w-4" />
          </span>
        }
      >
        {priceList}
      </Drawer>

      {/* Mobile FAB */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition-transform active:scale-95 lg:hidden"
        aria-label="View live prices"
      >
        <Coins className="h-4 w-4" />
        Prices
      </button>
    </div>
  )
}
