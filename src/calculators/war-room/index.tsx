import { useMemo } from "react"
import { Loader2, ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { useProfile } from "@/lib/ProfileContext"
import { useGameConfig } from "@/lib/hooks/useGameConfig"
import { useEquipmentPrices } from "@/lib/hooks/useEquipmentPrices"
import { useLivePrices } from "@/lib/hooks/useLivePrices"
import { PUBLIC_IMAGES_BASE_URL } from "./components"
import ProfileDetails from "./ProfileDetails"
import Simulator from "./Simulator"

const BATTLE_ICON = `${PUBLIC_IMAGES_BASE_URL}battle.svg`;

export default function WarRoom() {
  const { data: gameConfig, loading: configLoading } = useGameConfig()
  const { data: livePrices, loading: pricesLoading } = useLivePrices()

  const equipmentCodes = useMemo(() => {
    return gameConfig?.equipments.map((e: any) => e.code) ?? []
  }, [gameConfig])

  const { data: equipPrices, loading: equipPricesLoading } = useEquipmentPrices(equipmentCodes)
  const { profile, loading: profileLoading } = useProfile();

  const loading = configLoading || equipPricesLoading || profileLoading || pricesLoading

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
        <p className="text-zinc-500 font-medium font-mono text-sm tracking-widest uppercase">Planing an Attack</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-12 space-y-6">

        {/* Header */}
        <div>
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calculators
          </Link>
          <img src={BATTLE_ICON} alt="craft" className="h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">War Room</h1>
          <p className="text-zinc-400">Optimize your combat loadout, simulate stats, and prepare for battle in the War Room.</p>
        </div>

        {/* Profile */}
        <ProfileDetails />

        {/* Simulator */}
        <Simulator
          profile={profile}
          gameConfig={gameConfig}
          livePrices={livePrices}
          equipPrices={equipPrices}
        />

      </div>
    </div>
  )
}
