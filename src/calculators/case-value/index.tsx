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
  PieChart,
  Pie,
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
import {
  DEFAULT_RARITIES,
  calculateCaseEV,
  LOOT_CHANCE_BY_LEVEL,
  type RarityTier,
} from "./calculator"

const COIN_ICON = `${import.meta.env.BASE_URL}images/game_coin.svg`

export default function CaseValueCalculator() {
  const [rarities, setRarities] = useState<RarityTier[]>(DEFAULT_RARITIES)
  const [casePrice, setCasePrice] = useState(1)
  const [lootChance, setLootChance] = useState(30)
  const [hitsPerBattle, setHitsPerBattle] = useState(15)

  const setRarityValue = (idx: number, value: number) => {
    setRarities((prev) => prev.map((r, i) => (i === idx ? { ...r, estimatedValue: value } : r)))
  }

  const result = useMemo(
    () => calculateCaseEV(rarities, casePrice, lootChance, hitsPerBattle),
    [rarities, casePrice, lootChance, hitsPerBattle],
  )

  // EV by loot chance level
  const evByLevel = LOOT_CHANCE_BY_LEVEL.map((lc, lvl) => {
    const r = calculateCaseEV(rarities, casePrice, lc, hitsPerBattle)
    return { level: lvl, lootChance: lc, casesPerBattle: r.expectedCasesPerBattle, evPerBattle: r.evPerBattle }
  })

  const pieData = result.rarityBreakdown.map((r) => ({
    name: r.name,
    value: r.chance,
    fill: r.color,
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
          <h1 className="text-3xl font-bold tracking-tight">Case Expected Value</h1>
          <p className="mt-1 text-zinc-400">
            Should you open or sell your cases? Calculate the expected value of opening.
          </p>
        </div>

        {/* Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Set case market price, your loot chance, and estimated equipment values</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3 mb-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Case Market Price</label>
                <Input
                  type="number"
                  value={casePrice}
                  step={0.1}
                  min={0}
                  onChange={(e) => setCasePrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Loot Chance %</label>
                <Input
                  type="number"
                  value={lootChance}
                  min={5}
                  max={200}
                  onChange={(e) => setLootChance(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Hits per Battle</label>
                <Input
                  type="number"
                  value={hitsPerBattle}
                  min={1}
                  max={200}
                  onChange={(e) => setHitsPerBattle(Number(e.target.value))}
                />
              </div>
            </div>
            <p className="mb-2 text-xs text-zinc-500 uppercase tracking-wider">
              Estimated Equipment Value by Rarity
            </p>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {rarities.map((r, i) => (
                <div key={r.name}>
                  <label className="mb-1 block text-sm" style={{ color: r.color }}>
                    {r.name} ({r.chance}%)
                  </label>
                  <Input
                    type="number"
                    value={r.estimatedValue}
                    step={0.1}
                    min={0}
                    onChange={(e) => setRarityValue(i, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Expected Value</p>
              <p className="text-2xl font-bold text-emerald-400">
                {result.expectedValue.toFixed(2)}
                <img src={COIN_ICON} alt="" className="ml-1 inline h-4 w-4" />
              </p>
              <p className="text-xs text-zinc-500">per case opened</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Open vs Sell</p>
              <p className={`text-2xl font-bold ${result.profitPerCase >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {result.profitPerCase >= 0 ? "+" : ""}{result.profitPerCase.toFixed(2)}
                <img src={COIN_ICON} alt="" className="ml-1 inline h-4 w-4" />
              </p>
              <Badge variant={result.profitPerCase >= 0 ? "default" : "secondary"} className="mt-1">
                {result.profitPerCase >= 0 ? "Open is better" : "Sell is better"}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Cases / Battle</p>
              <p className="text-2xl font-bold text-cyan-400">
                {result.expectedCasesPerBattle.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500">{lootChance}% × {hitsPerBattle} hits</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">EV / Battle</p>
              <p className="text-2xl font-bold text-purple-400">
                {result.evPerBattle.toFixed(2)}
                <img src={COIN_ICON} alt="" className="ml-1 inline h-4 w-4" />
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Rarity pie */}
          <Card>
            <CardHeader>
              <CardTitle>Rarity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                      label={(entry) => `${entry.name}`}
                      labelLine={{ stroke: "#71717a" }}
                    >
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        color: "#18181b",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                      }}
                      formatter={(v) => [`${v}%`, "Chance"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* EV by loot chance level */}
          <Card>
            <CardHeader>
              <CardTitle>EV per Battle by Loot Chance Skill</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evByLevel} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="level"
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
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
                      labelFormatter={(l) => `Loot Chance Lv.${l} (${LOOT_CHANCE_BY_LEVEL[Number(l)]}%)`}
                      formatter={(v, name) => [
                        typeof v === "number" ? v.toFixed(2) : v,
                        name === "evPerBattle" ? "EV / Battle" : "Cases / Battle",
                      ]}
                    />
                    <Bar dataKey="evPerBattle" fill="#c084fc" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown table */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>EV Breakdown by Rarity</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rarity</TableHead>
                    <TableHead className="text-right">Drop Chance</TableHead>
                    <TableHead className="text-right">Est. Value</TableHead>
                    <TableHead className="text-right">Contribution to EV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rarityBreakdown.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell>
                        <span className="font-medium" style={{ color: r.color }}>
                          {r.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.chance}%</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {rarities.find((x) => x.name === r.name)?.estimatedValue.toFixed(2) ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-emerald-400">
                        {r.ev.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-zinc-700">
                    <TableCell className="font-bold">Total EV</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right tabular-nums font-bold text-emerald-400">
                      {result.expectedValue.toFixed(4)}
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
