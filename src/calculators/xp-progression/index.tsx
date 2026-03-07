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
  LineChart,
  Line,
  Cell,
  ReferenceLine,
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
  getLevelTable,
  calculateProgression,
  MAX_DAILY_XP,
  MAX_WEEKLY_XP,
} from "./calculator"

export default function XPProgressionCalculator() {
  const [currentLevel, setCurrentLevel] = useState(10)
  const [currentXP, setCurrentXP] = useState(0)
  const [targetLevel, setTargetLevel] = useState(25)
  const [dailyMissionXP, setDailyMissionXP] = useState(200)
  const [weeklyMissionXP, setWeeklyMissionXP] = useState(600)

  const dailyXP = dailyMissionXP + weeklyMissionXP / 7
  const levelTable = useMemo(() => getLevelTable(), [])

  const progression = useMemo(
    () => calculateProgression(currentLevel, currentXP, targetLevel, dailyXP),
    [currentLevel, currentXP, targetLevel, dailyXP],
  )

  const xpChartData = levelTable.map((l) => ({
    level: l.level,
    xpNeeded: l.xpNeeded,
    cumulative: l.cumulativeXP,
    skillPoints: l.totalSkillPoints,
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
          <h1 className="text-3xl font-bold tracking-tight">XP & Level Progression</h1>
          <p className="mt-1 text-zinc-400">
            Plan your leveling journey. See how long it takes to reach your target level.
          </p>
        </div>

        {/* Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Current Level</label>
                <Input
                  type="number"
                  value={currentLevel}
                  min={1}
                  max={49}
                  onChange={(e) => setCurrentLevel(Math.min(49, Math.max(1, Number(e.target.value))))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">XP towards next level</label>
                <Input
                  type="number"
                  value={currentXP}
                  min={0}
                  onChange={(e) => setCurrentXP(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Target Level</label>
                <Input
                  type="number"
                  value={targetLevel}
                  min={2}
                  max={50}
                  onChange={(e) => setTargetLevel(Math.min(50, Math.max(2, Number(e.target.value))))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Daily Mission XP</label>
                <Input
                  type="number"
                  value={dailyMissionXP}
                  min={0}
                  max={MAX_DAILY_XP}
                  onChange={(e) => setDailyMissionXP(Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-zinc-500">Max {MAX_DAILY_XP}/day</p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Weekly Mission XP</label>
                <Input
                  type="number"
                  value={weeklyMissionXP}
                  min={0}
                  max={MAX_WEEKLY_XP}
                  onChange={(e) => setWeeklyMissionXP(Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-zinc-500">Max {MAX_WEEKLY_XP}/week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">XP Remaining</p>
              <p className="text-2xl font-bold text-amber-400">
                {progression.xpRemaining.toLocaleString()} XP
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Avg Daily XP</p>
              <p className="text-2xl font-bold text-cyan-400">
                {dailyXP.toFixed(0)} XP/day
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Days to Target</p>
              <p className="text-2xl font-bold text-emerald-400">
                {isFinite(progression.daysToTarget)
                  ? `${Math.ceil(progression.daysToTarget)} days`
                  : "∞"}
              </p>
              <p className="text-xs text-zinc-500">
                {isFinite(progression.weeksToTarget)
                  ? `~${progression.weeksToTarget.toFixed(1)} weeks`
                  : ""}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Skill Points Gained</p>
              <p className="text-2xl font-bold text-purple-400">
                +{progression.skillPointsGained}
              </p>
              <p className="text-xs text-zinc-500">
                Total at Lv.{targetLevel}: {targetLevel * 4}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* XP per level */}
          <Card>
            <CardHeader>
              <CardTitle>XP per Level</CardTitle>
              <CardDescription>XP needed to reach each level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={xpChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="level" tick={{ fill: "#a1a1aa", fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        color: "#18181b",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                      }}
                      labelFormatter={(l) => `Level ${l}`}
                      formatter={(v, name) => [
                        typeof v === "number" ? v.toLocaleString() : v,
                        name === "xpNeeded" ? "XP Needed" : String(name),
                      ]}
                    />
                    <ReferenceLine x={currentLevel} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "You", fill: "#f59e0b", fontSize: 10 }} />
                    <ReferenceLine x={targetLevel} stroke="#34d399" strokeDasharray="3 3" label={{ value: "Target", fill: "#34d399", fontSize: 10 }} />
                    <Bar dataKey="xpNeeded" radius={[2, 2, 0, 0]}>
                      {xpChartData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={
                            d.level <= currentLevel
                              ? "#3f3f46"
                              : d.level <= targetLevel
                                ? "#60a5fa"
                                : "#27272a"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cumulative XP curve */}
          <Card>
            <CardHeader>
              <CardTitle>Cumulative XP</CardTitle>
              <CardDescription>Total XP required from level 1</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={xpChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="level" tick={{ fill: "#a1a1aa", fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        color: "#18181b",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                      }}
                      labelFormatter={(l) => `Level ${l}`}
                      formatter={(v, name) => [
                        typeof v === "number" ? v.toLocaleString() : v,
                        name === "cumulative" ? "Total XP" : "Skill Points",
                      ]}
                    />
                    <Line type="monotone" dataKey="cumulative" stroke="#60a5fa" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="skillPoints" stroke="#c084fc" strokeWidth={2} dot={false} yAxisId={0} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Level table */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Level Table</CardTitle>
              <CardDescription>Complete XP requirements and skill point progression</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead className="text-right">XP Needed</TableHead>
                      <TableHead className="text-right">Cumulative XP</TableHead>
                      <TableHead className="text-right">Skill Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {levelTable.map((l) => (
                      <TableRow
                        key={l.level}
                        className={
                          l.level === currentLevel
                            ? "bg-amber-900/20"
                            : l.level === targetLevel
                              ? "bg-emerald-900/20"
                              : ""
                        }
                      >
                        <TableCell className="font-medium">
                          {l.level}
                          {l.level === currentLevel && (
                            <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                          )}
                          {l.level === targetLevel && (
                            <Badge variant="default" className="ml-2 text-xs">Target</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {l.xpNeeded.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-zinc-400">
                          {l.cumulativeXP.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-purple-400">
                          {l.totalSkillPoints}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
