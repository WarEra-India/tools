import { useState } from "react"
import { Link } from "react-router-dom"
import { Swords, Target, Radio, TrendingUp, ArrowLeft } from "lucide-react"

// Lazy load the actual sub-components
import BattleAnalyzer from "@/calculators/battle-analyzer/index"
import AttackAnalyzer from "@/calculators/attack-analyzer/index"
import LiveBattle from "@/calculators/live-battle/index"
import MarketTracker from "@/calculators/market-tracker/index"

const tabs = [
  { id: "intelligence", label: "Intelligence", icon: Swords, component: BattleAnalyzer },
  { id: "attack", label: "Attack Analyzer", icon: Target, component: AttackAnalyzer },
  { id: "live", label: "Live Battles", icon: Radio, component: LiveBattle },
  { id: "market", label: "Market", icon: TrendingUp, component: MarketTracker },
] as const

export default function BattlePlan() {
  const [activeTab, setActiveTab] = useState("intelligence")

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || BattleAnalyzer

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Calculators
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Battle Plan</h1>
        <p className="text-zinc-500 text-sm">Intelligence, combat analysis, live battles, and market tracking.</p>
      </div>

      {/* Tab Bar */}
      <div className="max-w-7xl mx-auto px-4 mb-4">
        <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                  isActive
                    ? "bg-zinc-800 text-white shadow-lg shadow-zinc-900/50 border border-zinc-700/50"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-12">
        <ActiveComponent />
      </div>
    </div>
  )
}
