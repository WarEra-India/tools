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
  SKILLS,
  totalCostForLevel,
  skillPointsAtLevel,
  totalPointsUsed,
  combatPreset,
  economicPreset,
  balancedPreset,
  type SkillAllocation,
} from "./calculator"

const CATEGORY_COLORS: Record<string, string> = {
  combat: "#f87171",
  economic: "#34d399",
  special: "#a78bfa",
}

export default function SkillPlannerCalculator() {
  const [playerLevel, setPlayerLevel] = useState(20)
  const [alloc, setAlloc] = useState<SkillAllocation>(() => {
    const a: SkillAllocation = {}
    for (const s of SKILLS) a[s.id] = 0
    return a
  })

  const totalAvailable = skillPointsAtLevel(playerLevel)
  const used = useMemo(() => totalPointsUsed(alloc), [alloc])
  const remaining = totalAvailable - used

  const setSkillLevel = (skillId: string, level: number) => {
    setAlloc((prev) => {
      const next = { ...prev, [skillId]: level }
      // don't allow going over budget
      if (totalPointsUsed(next) > totalAvailable) return prev
      return next
    })
  }

  const applyPreset = (preset: SkillAllocation) => {
    // Only apply levels that fit within budget
    const constrained: SkillAllocation = {}
    let budget = totalAvailable
    for (const s of SKILLS) {
      const desired = preset[s.id] ?? 0
      const cost = totalCostForLevel(desired)
      if (cost <= budget) {
        constrained[s.id] = desired
        budget -= cost
      } else {
        // find max affordable level
        let lvl = 0
        for (let l = desired; l >= 0; l--) {
          if (totalCostForLevel(l) <= budget) {
            lvl = l
            break
          }
        }
        constrained[s.id] = lvl
        budget -= totalCostForLevel(lvl)
      }
    }
    setAlloc(constrained)
  }

  const chartData = SKILLS.map((s) => ({
    name: s.name,
    level: alloc[s.id] ?? 0,
    category: s.category,
    value: s.values[alloc[s.id] ?? 0],
  }))

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
          <h1 className="text-3xl font-bold tracking-tight">Skill Point Planner</h1>
          <p className="mt-1 text-zinc-400">
            Plan your skill point allocation. 4 points per level, 715 to max everything.
          </p>
        </div>

        {/* Level & budget */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Player Level</label>
                <Input
                  type="number"
                  value={playerLevel}
                  min={1}
                  max={50}
                  onChange={(e) => setPlayerLevel(Math.min(50, Math.max(1, Number(e.target.value))))}
                  className="w-24"
                />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Total Points</p>
                <p className="text-xl font-bold">{totalAvailable}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Used</p>
                <p className="text-xl font-bold text-amber-400">{used}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Remaining</p>
                <p className={`text-xl font-bold ${remaining >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {remaining}
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => applyPreset(combatPreset())}
                  className="rounded-md bg-red-900/50 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/80"
                >
                  Combat
                </button>
                <button
                  onClick={() => applyPreset(economicPreset())}
                  className="rounded-md bg-emerald-900/50 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/80"
                >
                  Economic
                </button>
                <button
                  onClick={() => applyPreset(balancedPreset())}
                  className="rounded-md bg-blue-900/50 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-900/80"
                >
                  Balanced
                </button>
                <button
                  onClick={() => {
                    const a: SkillAllocation = {}
                    for (const s of SKILLS) a[s.id] = 0
                    setAlloc(a)
                  }}
                  className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Reset
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Allocation chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Skill Allocation</CardTitle>
            <CardDescription>Skill levels at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis domain={[0, 10]} tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      color: "#18181b",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                    }}
                    formatter={(value, _name, props) => {
                      const d = props.payload as { name: string; value: number }
                      return [`Level ${value} (${d.value})`, d.name]
                    }}
                  />
                  <Bar dataKey="level" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[d.category]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Skills table */}
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
            <CardDescription>Adjust each skill level. Cost increases with level (1, 2, 3…10).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead className="text-center">Level</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Points Used</TableHead>
                  <TableHead className="text-right">Unlocks At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SKILLS.map((s) => {
                  const lvl = alloc[s.id] ?? 0
                  const cost = totalCostForLevel(lvl)
                  const locked = playerLevel < s.unlockLevel
                  return (
                    <TableRow key={s.id} className={locked ? "opacity-40" : ""}>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            s.category === "combat"
                              ? "bg-red-900/40 text-red-300"
                              : s.category === "economic"
                                ? "bg-emerald-900/40 text-emerald-300"
                                : "bg-purple-900/40 text-purple-300"
                          }
                        >
                          {s.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {s.name}
                        {s.isBar && (
                          <span className="ml-1 text-xs text-zinc-500">(bar)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            disabled={locked || lvl <= 0}
                            onClick={() => setSkillLevel(s.id, lvl - 1)}
                            className="rounded bg-zinc-800 px-2 py-0.5 text-xs hover:bg-zinc-700 disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-6 text-center tabular-nums font-semibold">{lvl}</span>
                          <button
                            disabled={locked || lvl >= s.maxLevel}
                            onClick={() => setSkillLevel(s.id, lvl + 1)}
                            className="rounded bg-zinc-800 px-2 py-0.5 text-xs hover:bg-zinc-700 disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {s.values[lvl]}{s.unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-amber-400">{cost}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-500">
                        Lv.{s.unlockLevel}
                        {locked && <span className="ml-1 text-red-400">🔒</span>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
