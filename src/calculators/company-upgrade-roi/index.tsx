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
  LineChart,
  Line,
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
import {
  calculateEngineROI,
  calculateStorageROI,
  NEW_COMPANY_COST_CONCRETE,
} from "./calculator"
import { useLivePrices } from "@/lib/useLivePrices"

const COIN_ICON = `${import.meta.env.BASE_URL}images/game_coin.svg`
const PP_ICON = `${import.meta.env.BASE_URL}images/production_point.svg`

export default function CompanyUpgradeROICalculator() {
  const { data: livePrices, loading } = useLivePrices()
  const [steelPrice, setSteelPrice] = useState(0)
  const [concretePrice, setConcretePrice] = useState(0)
  const [profitPerPP, setProfitPerPP] = useState(0.05)
  const [productionBonus, setProductionBonus] = useState(0)
  const [engineLevel, setEngineLevel] = useState(4)

  useEffect(() => {
    if (livePrices?.prices) {
      if (livePrices.prices.steel) setSteelPrice(livePrices.prices.steel)
      if (livePrices.prices.concrete) setConcretePrice(livePrices.prices.concrete)
    }
  }, [livePrices])

  const engineRows = useMemo(
    () => calculateEngineROI(steelPrice, profitPerPP, productionBonus),
    [steelPrice, profitPerPP, productionBonus],
  )
  const storageRows = useMemo(
    () => calculateStorageROI(steelPrice, engineLevel, productionBonus),
    [steelPrice, engineLevel, productionBonus],
  )

  const newCompanyCost = NEW_COMPANY_COST_CONCRETE * concretePrice

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
          <h1 className="text-3xl font-bold tracking-tight">Company Upgrade ROI</h1>
          <p className="mt-1 text-zinc-400">
            Calculate payback time for Automated Engine and Storage upgrades.
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
            <CardDescription>Adjust market prices and your profit per PP</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Steel Price</label>
                <Input
                  type="number"
                  value={steelPrice}
                  step={0.001}
                  min={0}
                  onChange={(e) => setSteelPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Concrete Price</label>
                <Input
                  type="number"
                  value={concretePrice}
                  step={0.001}
                  min={0}
                  onChange={(e) => setConcretePrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400 flex gap-1">
                  Profit / PP <img src={COIN_ICON} alt="" className="h-4 w-4" />
                </label>
                <Input
                  type="number"
                  value={profitPerPP}
                  step={0.001}
                  min={0}
                  onChange={(e) => setProfitPerPP(Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-zinc-500">From your production calculator</p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Production Bonus %</label>
                <Input
                  type="number"
                  value={productionBonus}
                  step={1}
                  min={0}
                  max={100}
                  onChange={(e) => setProductionBonus(Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-zinc-500">Country + deposit (up to 30%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Max Engine Cost</p>
              <p className="text-xl font-bold text-amber-400">
                {(1270 * steelPrice).toFixed(2)}
                <img src={COIN_ICON} alt="" className="ml-1 inline h-4 w-4" />
              </p>
              <p className="text-xs text-zinc-500">1,270 steel total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">New Company Cost</p>
              <p className="text-xl font-bold text-cyan-400">
                {newCompanyCost.toFixed(2)}
                <img src={COIN_ICON} alt="" className="ml-1 inline h-4 w-4" />
              </p>
              <p className="text-xs text-zinc-500">100 concrete</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Downgrade Refund</p>
              <p className="text-xl font-bold text-emerald-400">80%</p>
              <p className="text-xs text-zinc-500">of invested materials</p>
            </CardContent>
          </Card>
        </div>

        {/* Engine ROI */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex gap-2">
              Automated Engine
              <img src={PP_ICON} alt="" className="h-4 w-4" />
            </CardTitle>
            <CardDescription>Payback hours for each engine upgrade level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engineRows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="level"
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    label={{ value: "Level", position: "insideBottom", fill: "#71717a", fontSize: 12, offset: 0 }}
                  />
                  <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      color: "#18181b",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                    }}
                    formatter={(v, name) => [
                      typeof v === "number" ? (isFinite(v) ? v.toFixed(1) : "∞") : v,
                      name === "paybackHours" ? "Payback (hours)" : String(name),
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="paybackHours"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#f59e0b" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Steel Cost</TableHead>
                  <TableHead className="text-right">Upgrade Cost</TableHead>
                  <TableHead className="text-right">PP/h</TableHead>
                  <TableHead className="text-right">Revenue/h</TableHead>
                  <TableHead className="text-right">Marginal Rev/h</TableHead>
                  <TableHead className="text-right">Payback (hours)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {engineRows.map((r) => (
                  <TableRow key={r.level}>
                    <TableCell className="font-medium">Lv.{r.level}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.steelCost}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.upgradeCostCoins.toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.ppPerHour.toFixed(1)}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-400">{r.revenuePerHour.toFixed(4)}</TableCell>
                    <TableCell className="text-right tabular-nums text-cyan-400">{r.marginalRevenuePerHour.toFixed(4)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-amber-400">
                      {isFinite(r.paybackHours) ? r.paybackHours.toFixed(0) : "∞"}h
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Storage ROI */}
        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
            <CardDescription>
              How long until each storage level fills at current engine level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm text-zinc-400">Engine Level for fill time:</label>
              <Input
                type="number"
                value={engineLevel}
                min={1}
                max={7}
                onChange={(e) => setEngineLevel(Math.min(7, Math.max(1, Number(e.target.value))))}
                className="w-20"
              />
            </div>
            <div className="mb-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storageRows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="level" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      color: "#18181b",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                    }}
                    formatter={(v) => [typeof v === "number" ? (isFinite(v) ? v.toFixed(1) + "h" : "∞") : v, "Time to fill"]}
                  />
                  <Bar dataKey="hoursToFill" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Steel Cost</TableHead>
                  <TableHead className="text-right">Upgrade Cost</TableHead>
                  <TableHead className="text-right">Max PP</TableHead>
                  <TableHead className="text-right">Hours to Fill</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storageRows.map((r) => (
                  <TableRow key={r.level}>
                    <TableCell className="font-medium">Lv.{r.level}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.steelCost}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.upgradeCostCoins.toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.maxPP}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-cyan-400">
                      {isFinite(r.hoursToFill) ? r.hoursToFill.toFixed(1) : "∞"}h
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
