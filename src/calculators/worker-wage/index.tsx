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
  Legend,
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
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { calculateWorkerProfitability, PRODUCTION_SKILL_PP } from "./calculator"

const COIN_ICON = `${import.meta.env.BASE_URL}images/game_coin.svg`
const PP_ICON = `${import.meta.env.BASE_URL}images/production_point.svg`

export default function WorkerWageCalculator() {
  const [productionLevel, setProductionLevel] = useState(5)
  const [wagePerPP, setWagePerPP] = useState(0.01)
  const [incomeTax, setIncomeTax] = useState(10)
  const [itemProfitPerPP, setItemProfitPerPP] = useState(0.05)
  const [selfWorkPP, setSelfWorkPP] = useState(20)
  const [productionBonus, setProductionBonus] = useState(0)

  const ppPerSession = PRODUCTION_SKILL_PP[productionLevel] ?? 12

  const result = useMemo(
    () =>
      calculateWorkerProfitability({
        productionSkillPP: ppPerSession,
        wagePerPP,
        incomeTax,
        itemProfitPerPP,
        selfWorkPP,
        productionBonus,
      }),
    [ppPerSession, wagePerPP, incomeTax, itemProfitPerPP, selfWorkPP, productionBonus],
  )

  // Wage sweep: how owner profit and worker income change with wage
  const wageSweep = useMemo(() => {
    const points: { wage: number; ownerProfit: number; workerNet: number }[] = []
    for (let w = 0; w <= itemProfitPerPP * 2; w += Math.max(0.001, itemProfitPerPP / 20)) {
      const r = calculateWorkerProfitability({
        productionSkillPP: ppPerSession,
        wagePerPP: w,
        incomeTax,
        itemProfitPerPP,
        selfWorkPP,
        productionBonus,
      })
      points.push({
        wage: Number(w.toFixed(4)),
        ownerProfit: Number(r.ownerProfitPerSession.toFixed(4)),
        workerNet: Number(r.netWage.toFixed(4)),
      })
    }
    return points
  }, [ppPerSession, incomeTax, itemProfitPerPP, selfWorkPP, productionBonus])

  // Production level comparison
  const levelComparison = PRODUCTION_SKILL_PP.map((pp, lvl) => {
    const r = calculateWorkerProfitability({
      productionSkillPP: pp,
      wagePerPP,
      incomeTax,
      itemProfitPerPP,
      selfWorkPP: pp,
      productionBonus,
    })
    return {
      level: lvl,
      pp,
      workerNet: Number(r.netWage.toFixed(4)),
      ownerProfit: Number(r.ownerProfitPerSession.toFixed(4)),
    }
  })

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
          <h1 className="text-3xl font-bold tracking-tight">Worker Wage Profitability</h1>
          <p className="mt-1 text-zinc-400">
            Calculate whether it's profitable to hire workers, and find the maximum wage you can offer.
          </p>
        </div>

        {/* Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Production Skill Level (0-10)</label>
                <Input
                  type="number"
                  value={productionLevel}
                  min={0}
                  max={10}
                  onChange={(e) => setProductionLevel(Math.min(10, Math.max(0, Number(e.target.value))))}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  {ppPerSession} PP per session (10 energy)
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400 flex gap-1">
                  Wage / PP <img src={COIN_ICON} alt="" className="h-4 w-4" />
                </label>
                <Input
                  type="number"
                  value={wagePerPP}
                  step={0.001}
                  min={0}
                  onChange={(e) => setWagePerPP(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Income Tax %</label>
                <Input
                  type="number"
                  value={incomeTax}
                  min={0}
                  max={100}
                  onChange={(e) => setIncomeTax(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400 flex gap-1">
                  Item Profit / PP <img src={COIN_ICON} alt="" className="h-4 w-4" />
                </label>
                <Input
                  type="number"
                  value={itemProfitPerPP}
                  step={0.001}
                  min={0}
                  onChange={(e) => setItemProfitPerPP(Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-zinc-500">From your production profit calc</p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400 flex gap-1">
                  Self-Work PP <img src={PP_ICON} alt="" className="h-4 w-4" />
                </label>
                <Input
                  type="number"
                  value={selfWorkPP}
                  min={1}
                  max={50}
                  onChange={(e) => setSelfWorkPP(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Production Bonus %</label>
                <Input
                  type="number"
                  value={productionBonus}
                  min={0}
                  max={100}
                  onChange={(e) => setProductionBonus(Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Worker Net Wage</p>
              <p className="text-xl font-bold text-emerald-400">
                {result.netWage.toFixed(4)}
                <img src={COIN_ICON} alt="" className="ml-1 inline h-4 w-4" />
              </p>
              <p className="text-xs text-zinc-500">per session (10 energy)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Owner Profit</p>
              <p className={`text-xl font-bold ${result.ownerProfitPerSession >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {result.ownerProfitPerSession.toFixed(4)}
                <img src={COIN_ICON} alt="" className="ml-1 inline h-4 w-4" />
              </p>
              <p className="text-xs text-zinc-500">per session</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Max Profitable Wage</p>
              <p className="text-xl font-bold text-cyan-400">
                {result.maxProfitableWage.toFixed(4)}
                <img src={COIN_ICON} alt="" className="ml-1 inline h-4 w-4" />
              </p>
              <p className="text-xs text-zinc-500">per PP (breakeven)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Self-Work Revenue</p>
              <p className="text-xl font-bold text-purple-400">
                {result.selfWorkRevenuePerSession.toFixed(4)}
                <img src={COIN_ICON} alt="" className="ml-1 inline h-4 w-4" />
              </p>
              <p className="text-xs text-zinc-500">per entrep. session</p>
            </CardContent>
          </Card>
        </div>

        {/* Wage sweep chart */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Wage Impact</CardTitle>
              <CardDescription>
                Owner profit vs worker income as wage changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={wageSweep} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="wage" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        color: "#18181b",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }} />
                    <Line type="monotone" dataKey="ownerProfit" stroke="#34d399" strokeWidth={2} dot={false} name="Owner Profit" />
                    <Line type="monotone" dataKey="workerNet" stroke="#60a5fa" strokeWidth={2} dot={false} name="Worker Net" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Per production level */}
          <Card>
            <CardHeader>
              <CardTitle>By Production Level</CardTitle>
              <CardDescription>
                Income at each Production skill level with current wage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={levelComparison} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                      labelFormatter={(l) => `Production Lv.${l} (${PRODUCTION_SKILL_PP[Number(l)]} PP)`}
                    />
                    <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }} />
                    <Bar dataKey="workerNet" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Worker Net" />
                    <Bar dataKey="ownerProfit" fill="#34d399" radius={[4, 4, 0, 0]} name="Owner Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed breakdown */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-zinc-400">PP per Session</TableCell>
                    <TableCell className="text-right tabular-nums">{result.ppPerSession}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400">Effective PP (with bonus)</TableCell>
                    <TableCell className="text-right tabular-nums">{result.effectivePPPerSession.toFixed(1)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400">Gross Wage</TableCell>
                    <TableCell className="text-right tabular-nums">{result.grossWage.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400">Tax ({incomeTax}%)</TableCell>
                    <TableCell className="text-right tabular-nums text-red-400">−{result.taxAmount.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400 font-medium">Net Wage</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-emerald-400">{result.netWage.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400">Net Wage / Energy</TableCell>
                    <TableCell className="text-right tabular-nums">{result.netWagePerEnergy.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400">Owner Revenue</TableCell>
                    <TableCell className="text-right tabular-nums">{result.ownerRevenuePerSession.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400">Owner Cost (wage)</TableCell>
                    <TableCell className="text-right tabular-nums text-red-400">−{result.ownerCostPerSession.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400 font-medium">Owner Profit</TableCell>
                    <TableCell className={`text-right tabular-nums font-semibold ${result.ownerProfitPerSession >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {result.ownerProfitPerSession.toFixed(4)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
