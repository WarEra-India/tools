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
} from "recharts"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { useLivePrices } from "@/lib/useLivePrices"
import {
  HQ_LEVELS,
  ORDER_PRIORITIES,
  calculateOrderCost,
  calculateHQAnalysis,
  calculateDormAnalysis,
  calculateTotalCost,
} from "./calculator"

export default function MUCostBenefitCalculator() {
  const { data: livePricesData } = useLivePrices()
  const prices = livePricesData?.prices ?? {}
  const steelPrice = prices["steel"] ?? 0
  const oilPrice = prices["oil"] ?? 0

  const [hqLevel, setHqLevel] = useState(2)
  const [dormLevel, setDormLevel] = useState(1)
  const [memberCount, setMemberCount] = useState(10)
  const [avgDmg, setAvgDmg] = useState(500)
  const [profitPerDmg, setProfitPerDmg] = useState(0.1)

  const hqAnalysis = useMemo(
    () => calculateHQAnalysis(steelPrice, oilPrice, memberCount, avgDmg, profitPerDmg),
    [steelPrice, oilPrice, memberCount, avgDmg, profitPerDmg],
  )

  const dormAnalysis = useMemo(
    () => calculateDormAnalysis(steelPrice),
    [steelPrice],
  )

  const totalCost = useMemo(
    () => calculateTotalCost(hqLevel, dormLevel, steelPrice, oilPrice),
    [hqLevel, dormLevel, steelPrice, oilPrice],
  )

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 })

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
          <h1 className="text-3xl font-bold tracking-tight">MU Cost/Benefit</h1>
          <p className="mt-1 text-zinc-400">
            Analyze Military Unit upgrade costs - HQ, Dormitory, orders, and maintenance.
          </p>
        </div>

        {/* Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Steel: {fmt(steelPrice)} cc | Oil: {fmt(oilPrice)} cc (live prices)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">HQ Level</label>
                <Input
                  type="number"
                  value={hqLevel}
                  min={1}
                  max={4}
                  onChange={(e) => setHqLevel(Math.max(1, Math.min(4, Number(e.target.value))))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Dorm Level</label>
                <Input
                  type="number"
                  value={dormLevel}
                  min={0}
                  max={4}
                  onChange={(e) => setDormLevel(Math.max(0, Math.min(4, Number(e.target.value))))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Members</label>
                <Input
                  type="number"
                  value={memberCount}
                  min={1}
                  max={25}
                  onChange={(e) => setMemberCount(Math.max(1, Math.min(25, Number(e.target.value))))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Avg Dmg / Member</label>
                <Input
                  type="number"
                  value={avgDmg}
                  min={0}
                  onChange={(e) => setAvgDmg(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Profit / Dmg point</label>
                <Input
                  type="number"
                  value={profitPerDmg}
                  min={0}
                  step={0.01}
                  onChange={(e) => setProfitPerDmg(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Steel Cost</p>
              <p className="text-2xl font-bold text-amber-400">
                {totalCost.totalSteelCost.toLocaleString()} steel
              </p>
              <p className="text-xs text-zinc-500">= {fmt(totalCost.totalCoinCost)} cc</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Damage Bonus</p>
              <p className="text-2xl font-bold text-red-400">
                +{totalCost.damageBonus}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Max Members</p>
              <p className="text-2xl font-bold text-cyan-400">{totalCost.maxMembers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Daily Oil Cost</p>
              <p className="text-2xl font-bold text-orange-400">
                {fmt(totalCost.dailyOilCost)} cc
              </p>
              <p className="text-xs text-zinc-500">
                {HQ_LEVELS[hqLevel - 1].oilPerHour} oil/h
              </p>
            </CardContent>
          </Card>
        </div>

        {/* HQ Upgrades */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>HQ Upgrade Analysis</CardTitle>
              <CardDescription>Damage bonus vs cost &amp; maintenance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={hqAnalysis.map((h) => ({
                      level: `Lv.${h.level}`,
                      cost: h.upgradeCostCoins,
                      dailyOil: h.oilCostPerDay,
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
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
                      formatter={(v) => [fmt(Number(v)) + " cc"]}
                    />
                    <Bar dataKey="cost" name="Upgrade Cost" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="dailyOil" name="Daily Oil Cost" fill="#fb923c" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dormitory Upgrade Analysis</CardTitle>
              <CardDescription>Member slots vs cost</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dormAnalysis.map((d) => ({
                      level: d.level === 0 ? "Base" : `Lv.${d.level}`,
                      members: d.maxMembers,
                      cost: d.upgradeCostCoins,
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
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
                      formatter={(v, name) => [
                        name === "members" ? v : fmt(Number(v)) + " cc",
                      ]}
                    />
                    <Bar dataKey="members" name="Max Members" fill="#22d3ee" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="cost" name="Upgrade Cost" fill="#a78bfa" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>HQ Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Steel</TableHead>
                    <TableHead className="text-right">Cost (cc)</TableHead>
                    <TableHead className="text-right">Dmg Bonus</TableHead>
                    <TableHead className="text-right">Oil/h</TableHead>
                    <TableHead className="text-right">Oil/day (cc)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hqAnalysis.map((h) => (
                    <TableRow
                      key={h.level}
                      className={h.level === hqLevel ? "bg-amber-900/20" : ""}
                    >
                      <TableCell className="font-medium">
                        {h.level}
                        {h.level === hqLevel && (
                          <Badge variant="outline" className="ml-2 text-xs">Current</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{h.steelCost}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(h.upgradeCostCoins)}</TableCell>
                      <TableCell className="text-right tabular-nums text-red-400">+{h.damageBonus}%</TableCell>
                      <TableCell className="text-right tabular-nums">{h.oilPerHour}</TableCell>
                      <TableCell className="text-right tabular-nums text-orange-400">{fmt(h.oilCostPerDay)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dormitory Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Steel</TableHead>
                    <TableHead className="text-right">Cost (cc)</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Extra Slots</TableHead>
                    <TableHead className="text-right">Cost/Slot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dormAnalysis.map((d) => (
                    <TableRow
                      key={d.level}
                      className={d.level === dormLevel ? "bg-cyan-900/20" : ""}
                    >
                      <TableCell className="font-medium">
                        {d.level === 0 ? "Base" : d.level}
                        {d.level === dormLevel && (
                          <Badge variant="outline" className="ml-2 text-xs">Current</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.steelCost}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(d.upgradeCostCoins)}</TableCell>
                      <TableCell className="text-right tabular-nums text-cyan-400">{d.maxMembers}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.extraSlots}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-400">
                        {d.level === 0 ? "—" : fmt(d.costPerSlot)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Battle Orders */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Battle Order Costs</CardTitle>
              <CardDescription>
                Cost to issue a battle order based on member count and priority
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    {[5, 10, 15, 20, 25].map((m) => (
                      <TableHead key={m} className="text-right">{m} members</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ORDER_PRIORITIES.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">
                        <Badge
                          variant={p.name === "High" ? "outline" : p.name === "Medium" ? "default" : "secondary"}
                        >
                          {p.name}
                        </Badge>
                      </TableCell>
                      {[5, 10, 15, 20, 25].map((m) => (
                        <TableCell key={m} className="text-right tabular-nums">
                          {calculateOrderCost(m, p).toFixed(1)} gold
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
