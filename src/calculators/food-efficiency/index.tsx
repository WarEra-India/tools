import { useState, useMemo, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { calculateFoodEfficiency } from "./calculator"
import { useLivePrices } from "@/lib/useLivePrices"
import { itemImageUrl } from "@/lib/images"

const COIN_ICON = `${import.meta.env.BASE_URL}images/game_coin.svg`

const CHART_COLORS = ["#60a5fa", "#f59e0b", "#34d399", "#e879f9"]

export default function FoodEfficiencyCalculator() {
  const { data: livePrices, loading } = useLivePrices()
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [attack, setAttack] = useState(200)
  const [armor, setArmor] = useState(20)

  useEffect(() => {
    if (livePrices?.prices) {
      setPrices((prev) => ({ ...prev, ...livePrices.prices }))
    }
  }, [livePrices])

  const healthLossPerHit = Math.max(1, 10 - (armor / 100) * 10)

  const rows = useMemo(
    () => calculateFoodEfficiency(prices, attack, healthLossPerHit),
    [prices, attack, healthLossPerHit],
  )

  const pillPrice = prices["cocain"] ?? 0

  const bestHealthPerCoin = useMemo(() => {
    const best = rows.reduce((a, b) => (b.healthPerCoin > a.healthPerCoin ? b : a), rows[0])
    return best
  }, [rows])

  const bestDmgPerCoin = useMemo(() => {
    const best = rows.reduce((a, b) => (b.damagePerCoin > a.damagePerCoin ? b : a), rows[0])
    return best
  }, [rows])

  const chartData = rows.map((r) => ({
    name: r.name,
    healthPerCoin: r.healthPerCoin,
    damagePerCoin: r.damagePerCoin,
  }))

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calculators
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Food Efficiency</h1>
          <p className="mt-1 text-zinc-400">
            Compare food items by health restored per coin and battle damage per coin spent.
          </p>
          {livePrices && (
            <p className="mt-1 text-xs text-zinc-500">
              Prices updated: {new Date(livePrices.timestamp).toLocaleTimeString()}
            </p>
          )}
          {loading && !livePrices && (
            <p className="mt-1 text-xs text-zinc-500 animate-pulse">Loading live prices…</p>
          )}
        </div>

        {/* Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Adjust your stats to compare food efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Average Damage / Hit</label>
                <Input
                  type="number"
                  value={attack}
                  min={50}
                  max={1000}
                  onChange={(e) => setAttack(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Armor %</label>
                <Input
                  type="number"
                  value={armor}
                  min={0}
                  max={90}
                  onChange={(e) => setArmor(Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Health loss per hit: {healthLossPerHit.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Best HP / Coin</p>
              {bestHealthPerCoin && (
                <>
                  <p className="text-xl font-bold text-emerald-400">
                    {bestHealthPerCoin.healthPerCoin.toFixed(2)} HP
                  </p>
                  <p className="text-sm text-zinc-400">{bestHealthPerCoin.name}</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Best Damage / Coin</p>
              {bestDmgPerCoin && (
                <>
                  <p className="text-xl font-bold text-cyan-400">
                    {bestDmgPerCoin.damagePerCoin.toFixed(2)}
                  </p>
                  <p className="text-sm text-zinc-400">{bestDmgPerCoin.name}</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Pill Price</p>
              <p className="text-xl font-bold text-purple-400">
                {pillPrice > 0 ? pillPrice.toFixed(4) : "—"}
              </p>
              <p className="text-sm text-zinc-400">+80% damage buff</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2">
                Health per Coin
                <img src={COIN_ICON} alt="coin" className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        color: "#18181b",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                      }}
                      formatter={(v) => [typeof v === "number" ? v.toFixed(2) : v, "HP / Coin"]}
                    />
                    <Bar dataKey="healthPerCoin" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2">
                Damage per Coin
                <img src={COIN_ICON} alt="coin" className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        color: "#18181b",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                      }}
                      formatter={(v) => [typeof v === "number" ? v.toFixed(2) : v, "Dmg / Coin"]}
                    />
                    <Bar dataKey="damagePerCoin" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail table */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Comparison Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Food</TableHead>
                    <TableHead className="text-right">HP Restored</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">HP / Coin</TableHead>
                    <TableHead className="text-right">Hits / Unit</TableHead>
                    <TableHead className="text-right">Damage / Unit</TableHead>
                    <TableHead className="text-right">Damage / Coin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.code}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <img
                            src={itemImageUrl(r.code)}
                            alt={r.name}
                            className="h-5 w-5 object-contain"
                            onError={(e) => { e.currentTarget.style.display = "none" }}
                          />
                          {r.name}
                          {bestDmgPerCoin?.code === r.code && (
                            <Badge variant="default" className="text-[10px]">Best</Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.healthRestored}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.price > 0 ? r.price.toFixed(4) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-400">
                        {r.healthPerCoin > 0 ? r.healthPerCoin.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.hitsPerUnit.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.damagePerUnit.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-cyan-400">
                        {r.damagePerCoin > 0 ? r.damagePerCoin.toFixed(2) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Pill section */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <img
                  src={itemImageUrl("cocain")}
                  alt="Pill"
                  className="h-5 w-5"
                  onError={(e) => { e.currentTarget.style.display = "none" }}
                />
                Pill Analysis
              </CardTitle>
              <CardDescription>
                Pills give +80% damage buff. Worth it if the extra damage value exceeds pill cost.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pillPrice > 0 ? (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-zinc-400">Pill price:</span>{" "}
                    <span className="font-semibold">{pillPrice.toFixed(4)} coins</span>
                  </p>
                  <p>
                    <span className="text-zinc-400">Damage increase per hit:</span>{" "}
                    <span className="text-emerald-400 font-semibold">
                      +{(attack * 0.8).toFixed(1)} (80% of {attack})
                    </span>
                  </p>
                  <p className="text-zinc-500">
                    The pill is worthwhile when you can deal enough extra hits during the buff period to exceed its market price in value.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Pill price unavailable — waiting for live data.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
