import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getDefaultData } from "@/lib/data"
import { calculate } from "@/lib/calculator"
import { itemImageUrl } from "@/lib/images"

const PP_ICON = `${import.meta.env.BASE_URL}images/production_point.svg`

const CHART_COLORS = [
  "#22d3ee", "#a78bfa", "#f472b6", "#34d399", "#fbbf24",
  "#fb923c", "#60a5fa", "#e879f9", "#4ade80", "#f87171",
  "#38bdf8", "#c084fc", "#fb7185", "#2dd4bf", "#facc15",
  "#f97316", "#818cf8", "#d946ef",
]

export default function CompanyProductionProfit() {
  const [data, setData] = useState(getDefaultData)

  const rows = useMemo(() => calculate(data), [data])

  function updatePrice(item: string, value: string) {
    const val = parseFloat(value)
    if (isNaN(val)) return
    setData((prev) => ({
      ...prev,
      prices: { ...prev.prices, [item]: val },
    }))
  }

  const rawItems = Object.keys(data.rawPP)
  const processedItems = Object.keys(data.recipes)

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
            Company Production Profit
          </h1>
          <p className="mt-1 text-zinc-400">
            Edit market prices to see which items are most profitable to produce.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Price Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Market Prices</CardTitle>
              <CardDescription>
                Adjust prices to recalculate profits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Raw Materials
                  </h3>
                  <div className="space-y-2">
                    {rawItems.map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <img
                          src={itemImageUrl(item)}
                          alt={item}
                          className="h-6 w-6 object-contain"
                          onError={(e) => { e.currentTarget.style.display = "none" }}
                        />
                        <span className="w-32 truncate text-sm" title={item}>
                          {item}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          value={data.prices[item]}
                          onChange={(e) => updatePrice(item, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Processed Items
                  </h3>
                  <div className="space-y-2">
                    {processedItems.map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <img
                          src={itemImageUrl(item)}
                          alt={item}
                          className="h-6 w-6 object-contain"
                          onError={(e) => { e.currentTarget.style.display = "none" }}
                        />
                        <span className="w-32 truncate text-sm" title={item}>
                          {item}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          value={data.prices[item]}
                          onChange={(e) => updatePrice(item, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Profit per PP</CardTitle>
                <CardDescription>
                  Items ranked by profit efficiency (profit per production point)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={rows}
                      margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis
                        dataKey="item"
                        tick={{ fill: "#a1a1aa", fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18181b",
                          border: "1px solid #3f3f46",
                          borderRadius: "8px",
                          color: "#fafafa",
                        }}
                        formatter={(value) => [
                          typeof value === "number" ? value.toFixed(4) : value,
                          "Profit/PP",
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

            {/* Profit Table */}
            <Card>
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
                      <TableHead className="text-right">Sell</TableHead>
                      <TableHead className="text-right">Profit/Unit</TableHead>
                      <TableHead className="text-right">Total PP</TableHead>
                      <TableHead className="text-right">Profit/PP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.item}>
                        <TableCell>
                          <Badge
                            variant={
                              r.type === "Raw" ? "secondary" : "outline"
                            }
                          >
                            {r.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-2">
                            <img
                              src={itemImageUrl(r.item)}
                              alt={r.item}
                              className="h-5 w-5 object-contain"
                              onError={(e) => { e.currentTarget.style.display = "none" }}
                            />
                            {r.item}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ${r.sell.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${r.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          ${r.profit.toFixed(2)}
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
                            <img src={PP_ICON} alt="PP" className="h-4 w-4" />
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
    </div>
  )
}
