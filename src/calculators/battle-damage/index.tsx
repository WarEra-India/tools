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
  type BattleStats,
  type BattleBonuses,
  AMMO_TYPES,
  calculateBattle,
} from "./calculator"
import { useLivePrices } from "@/lib/useLivePrices"
import { itemName } from "@/lib/items"

const COIN_ICON = `${import.meta.env.BASE_URL}images/game_coin.svg`

function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = "",
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-32 shrink-0 text-sm text-zinc-400">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-cyan-500"
      />
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
        className="w-20 text-right"
      />
      {suffix && <span className="text-xs text-zinc-500">{suffix}</span>}
    </div>
  )
}

function CheckboxField({
  label,
  checked,
  onChange,
  bonus,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  bonus: string
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-cyan-500"
      />
      {label}
      <Badge variant="outline" className="ml-auto text-xs">
        {bonus}
      </Badge>
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-32 shrink-0 text-sm text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

const DEFAULT_STATS: BattleStats = {
  attack: 200,
  precision: 75,
  critChance: 25,
  critDamage: 50,
  armor: 20,
  dodge: 10,
  lootChance: 30,
}

const DEFAULT_BONUSES: BattleBonuses = {
  alliance: false,
  swornEnemy: false,
  coreRegion: false,
  resistanceBonus: 0,
  militaryBase: 0,
  bunker: 0,
  countryOrder: "none",
  muOrder: "none",
  muHQ: 0,
  militaryRank: 0,
  pillActive: false,
}

export default function BattleDamageCalculator() {
  const [stats, setStats] = useState<BattleStats>(DEFAULT_STATS)
  const [bonuses, setBonuses] = useState<BattleBonuses>(DEFAULT_BONUSES)
  const [ammoIdx, setAmmoIdx] = useState(2)
  const [maxHealth, setMaxHealth] = useState(100)

  const { data: livePrices } = useLivePrices()
  const prices = livePrices?.prices ?? {}

  const ammo = AMMO_TYPES[ammoIdx]
  const result = useMemo(() => calculateBattle(stats, bonuses, ammo), [stats, bonuses, ammo])

  const hitsPerBar = result.avgHealthLossPerHit > 0
    ? Math.floor(maxHealth / result.avgHealthLossPerHit)
    : Infinity
  const totalDmgPerBar = hitsPerBar * result.avgDamagePerHit
  const expectedCases = hitsPerBar * result.lootChancePerHit

  const foodData = Object.entries(result.damagePerFood).map(([food, dmg]) => ({
    food,
    damage: dmg,
    price: prices[food] ?? 0,
    damagePerCoin: (prices[food] ?? 0) > 0 ? dmg / (prices[food] ?? 1) : 0,
  }))

  const barData = [
    { name: "Normal Hit", value: result.normalHitDamage, color: "#60a5fa" },
    { name: "Critical Hit", value: result.critHitDamage, color: "#f59e0b" },
    { name: "Miss", value: result.missHitDamage, color: "#94a3b8" },
    { name: "Avg / Hit", value: result.avgDamagePerHit, color: "#34d399" },
  ]

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
          <h1 className="text-3xl font-bold tracking-tight">Battle Damage Calculator</h1>
          <p className="mt-1 text-zinc-400">
            Calculate your expected damage output based on combat stats, equipment, and bonuses.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Input: Combat Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Combat Stats</CardTitle>
              <CardDescription>Your character's base combat stats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SliderField
                label="Attack"
                value={stats.attack}
                onChange={(v) => setStats((s) => ({ ...s, attack: v }))}
                min={100}
                max={300}
                step={20}
              />
              <SliderField
                label="Precision"
                value={stats.precision}
                onChange={(v) => setStats((s) => ({ ...s, precision: v }))}
                min={50}
                max={100}
                step={5}
                suffix="%"
              />
              <SliderField
                label="Crit Chance"
                value={stats.critChance}
                onChange={(v) => setStats((s) => ({ ...s, critChance: v }))}
                suffix="%"
              />
              <SliderField
                label="Crit Damage"
                value={stats.critDamage}
                onChange={(v) => setStats((s) => ({ ...s, critDamage: v }))}
                suffix="%"
              />
              <SliderField
                label="Armor"
                value={stats.armor}
                onChange={(v) => setStats((s) => ({ ...s, armor: v }))}
                max={90}
                suffix="%"
              />
              <SliderField
                label="Dodge"
                value={stats.dodge}
                onChange={(v) => setStats((s) => ({ ...s, dodge: v }))}
                suffix="%"
              />
              <SliderField
                label="Loot Chance"
                value={stats.lootChance}
                onChange={(v) => setStats((s) => ({ ...s, lootChance: v }))}
                suffix="%"
              />
              <SliderField
                label="Max Health"
                value={maxHealth}
                onChange={setMaxHealth}
                min={50}
                max={150}
                step={10}
              />
              <SelectField
                label="Ammo Type"
                value={String(ammoIdx)}
                onChange={(v) => setAmmoIdx(Number(v))}
                options={AMMO_TYPES.map((a, i) => ({
                  value: String(i),
                  label: `${a.name}${a.attackBonus ? ` (+${a.attackBonus})` : ""}`,
                }))}
              />
            </CardContent>
          </Card>

          {/* Input: Bonuses */}
          <Card>
            <CardHeader>
              <CardTitle>Battle Bonuses</CardTitle>
              <CardDescription>Damage modifiers from diplomacy, orders, buildings, etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <CheckboxField
                label="Alliance"
                checked={bonuses.alliance}
                onChange={(v) => setBonuses((b) => ({ ...b, alliance: v }))}
                bonus="+10%"
              />
              <CheckboxField
                label="Sworn Enemy"
                checked={bonuses.swornEnemy}
                onChange={(v) => setBonuses((b) => ({ ...b, swornEnemy: v }))}
                bonus="+10%"
              />
              <CheckboxField
                label="Core Region Defense"
                checked={bonuses.coreRegion}
                onChange={(v) => setBonuses((b) => ({ ...b, coreRegion: v }))}
                bonus="+15%"
              />
              <CheckboxField
                label="Pill Active"
                checked={bonuses.pillActive}
                onChange={(v) => setBonuses((b) => ({ ...b, pillActive: v }))}
                bonus="+80%"
              />
              <SliderField
                label="Resistance"
                value={bonuses.resistanceBonus}
                onChange={(v) => setBonuses((b) => ({ ...b, resistanceBonus: v }))}
                max={40}
                suffix="%"
              />
              <SliderField
                label="Military Base"
                value={bonuses.militaryBase}
                onChange={(v) => setBonuses((b) => ({ ...b, militaryBase: v }))}
                max={25}
                step={5}
                suffix="%"
              />
              <SliderField
                label="Bunker"
                value={bonuses.bunker}
                onChange={(v) => setBonuses((b) => ({ ...b, bunker: v }))}
                max={25}
                step={5}
                suffix="%"
              />
              <SliderField
                label="MU HQ Bonus"
                value={bonuses.muHQ}
                onChange={(v) => setBonuses((b) => ({ ...b, muHQ: v }))}
                max={20}
                step={5}
                suffix="%"
              />
              <SliderField
                label="Military Rank"
                value={bonuses.militaryRank}
                onChange={(v) => setBonuses((b) => ({ ...b, militaryRank: v }))}
                max={100}
                step={0.25}
                suffix="%"
              />
              <SelectField
                label="Country Order"
                value={bonuses.countryOrder}
                onChange={(v) => setBonuses((b) => ({ ...b, countryOrder: v as BattleBonuses["countryOrder"] }))}
                options={[
                  { value: "none", label: "None" },
                  { value: "low", label: "Low (+5%)" },
                  { value: "medium", label: "Medium (+10%)" },
                  { value: "high", label: "High (+15%)" },
                ]}
              />
              <SelectField
                label="MU Order"
                value={bonuses.muOrder}
                onChange={(v) => setBonuses((b) => ({ ...b, muOrder: v as BattleBonuses["muOrder"] }))}
                options={[
                  { value: "none", label: "None" },
                  { value: "low", label: "Low (+5%)" },
                  { value: "medium", label: "Medium (+10%)" },
                  { value: "high", label: "High (+15%)" },
                ]}
              />
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Avg Damage / Hit</p>
              <p className="text-2xl font-bold text-emerald-400">{result.avgDamagePerHit.toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Damage / Health Bar</p>
              <p className="text-2xl font-bold text-cyan-400">
                {isFinite(totalDmgPerBar) ? totalDmgPerBar.toFixed(0) : "∞"}
              </p>
              <p className="text-xs text-zinc-500">{isFinite(hitsPerBar) ? hitsPerBar : "∞"} hits</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Bonus</p>
              <p className="text-2xl font-bold text-amber-400">+{result.totalDamageBonus.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Expected Cases</p>
              <p className="text-2xl font-bold text-purple-400">
                {isFinite(expectedCases) ? expectedCases.toFixed(2) : "∞"}
              </p>
              <p className="text-xs text-zinc-500">{stats.lootChance}% per hit</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Tables */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Damage breakdown chart */}
          <Card>
            <CardHeader>
              <CardTitle>Damage Breakdown</CardTitle>
              <CardDescription>Damage values per hit type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                      formatter={(value) => [typeof value === "number" ? value.toFixed(1) : value, "Damage"]}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {barData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Food efficiency */}
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2">
                Damage per Food Item
                <img src={COIN_ICON} alt="coin" className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                Extra damage gained per food, and efficiency vs market price
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Food</TableHead>
                    <TableHead className="text-right">HP Restored</TableHead>
                    <TableHead className="text-right">Extra Damage</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Dmg / Coin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {foodData.map((f) => (
                    <TableRow key={f.food}>
                      <TableCell className="font-medium">{itemName(f.food)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {{ bread: 10, steak: 20, cookedFish: 30 }[f.food]}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-400">
                        {f.damage.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {f.price > 0 ? f.price.toFixed(4) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-cyan-400">
                        {f.damagePerCoin > 0 ? f.damagePerCoin.toFixed(1) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Detailed stats table */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-zinc-400">Effective Attack</TableCell>
                    <TableCell className="text-right tabular-nums">{result.effectiveAttack}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400">Normal Hit Damage</TableCell>
                    <TableCell className="text-right tabular-nums">{result.normalHitDamage.toFixed(1)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400">Critical Hit Damage</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-400">{result.critHitDamage.toFixed(1)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400">Miss Damage (50%)</TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-500">{result.missHitDamage.toFixed(1)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400">Health Loss per Hit</TableCell>
                    <TableCell className="text-right tabular-nums">{result.healthLossPerHit.toFixed(1)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400">Avg Health Loss (with dodge)</TableCell>
                    <TableCell className="text-right tabular-nums">{result.avgHealthLossPerHit.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-zinc-400">Damage Efficiency (dmg per 1 HP lost)</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-emerald-400">
                      {result.totalDamagePerHealthBar.toFixed(2)}
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
