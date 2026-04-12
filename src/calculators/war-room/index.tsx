import React, { useEffect, useState, useMemo } from "react"
import { Loader2, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"
import { Link } from "react-router-dom"
import { useProfile } from "@/lib/ProfileContext"
import { useGameConfig } from "@/lib/hooks/useGameConfig"
import { useLivePrices } from "@/lib/hooks/useLivePrices"
import MilitaryRankIcon from "@/components/MilitaryRankIcon"
import ProfileWidget from "@/components/ProfileWidget"
import { GameItemIcon } from "@/components/GameItemIcon"
import {
  EquipmentSlot,
  BuffSlot,
  SkillSlot,
  StatBreakdown,
  BriefStat,
  PUBLIC_IMAGES_BASE_URL,
} from "./components"
import { getAttackTotalAndBreakDown, getEffectiveStats } from "./utils"
import { SKILL_GROUPS } from "../archetype-analysis"

const BATTLE_ICON = `${PUBLIC_IMAGES_BASE_URL}battle.svg`;


export default function WarRoom() {
  const { data: gameConfig, loading: configLoading } = useGameConfig()
  const { data: livePrices, loading: pricesLoading } = useLivePrices()
  const { profile, loading: profileLoading } = useProfile();
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false);

  const loading = configLoading || pricesLoading || profileLoading

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
          <p className="text-zinc-400">All about War</p>
        </div>


        {/* Profile */}
        {profile ? (
          <div className="relative flex flex-col gap-4 outline-1 outline-zinc-800 bg-zinc-900/20 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 shadow-2xl transition-all duration-300">
            {/* Toggle Button */}
            <button
              onClick={() => setIsProfileCollapsed(!isProfileCollapsed)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-800/50 transition-colors text-zinc-500 hover:text-zinc-200"
            >
              {isProfileCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </button>

            <div className="flex items-center justify-center w-full flex-col gap-4 lg:flex-row lg:gap-12">

              {/* User */}
              <div className="flex items-center gap-2">
                <img
                  src={profile.user.avatarUrl}
                  className={`${isProfileCollapsed ? "h-8 w-8" : "h-12 w-12"} rounded-full border border-zinc-700 object-cover`}
                />
                <div className="flex flex-col">
                  <span className="font-semibold truncate">
                    {profile.user.username}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Lv.{profile.user.leveling.level}
                  </span>
                </div>
              </div>


              {!isProfileCollapsed ? (
                <div className="flex items-center gap-4 flex-wrap justify-center">
                  {SKILL_GROUPS.WAR.map((skillName) => {
                    const skill = profile.user.skills[skillName];
                    if (!skill) return null;
                    return (
                      <SkillSlot
                        key={skillName}
                        name={skillName}
                        level={skill.level}
                        value={skill.value}
                      />
                    );
                  })}
                </div>
              ) : (
                // Breif Total Effective Stats
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {(() => {
                    const attackData = getAttackTotalAndBreakDown(profile);
                    const effectiveStats = getEffectiveStats(profile);
                    return (
                      <>
                        <BriefStat icon="attack" value={attackData.total} label="Attack" isPercentage={false} />
                        <BriefStat icon="precision" value={effectiveStats.precision.total} label="Precision" />
                        <BriefStat icon="criticalChance" value={effectiveStats.criticalChance.total} label="Crit Chance" />
                        <BriefStat icon="criticalDamages" value={effectiveStats.criticalDamages.total} label="Crit Damage" />
                        <BriefStat icon="armor" value={effectiveStats.armor.effective} label="Armor" />
                        <BriefStat icon="dodge" value={effectiveStats.dodge.effective} label="Dodge" />
                      </>
                    );
                  })()}
                </div>
              )}

            </div>

            {!isProfileCollapsed && (
              <>
                {/* Divider */}
                <div className="w-full bg-zinc-700" style={{ height: "1px" }} />

                <div className="flex items-center justify-center w-full flex-col gap-4 lg:flex-row lg:gap-12">

                  {/* Weapons and Equipments */}
                  {profile.equipment && (
                    <div className="flex gap-4 items-start flex-wrap justify-center flex-1">
                      {profile.equipment.weapon && (
                        <EquipmentSlot item={profile.equipment.weapon} />
                      )}
                      {profile.equipment.ammo && (
                        <div className="flex flex-col items-center gap-1">
                          <GameItemIcon itemCode={profile.equipment.ammo} className="h-12 w-12 rounded-md" />
                          <div className="flex items-center gap-0.5">
                            <img
                              src={`${PUBLIC_IMAGES_BASE_URL}attack.svg`}
                              alt="attack"
                              className="h-3 w-3 object-contain"
                              title="Attack Multiplier"
                            />
                            <span className="text-[10px] text-zinc-400 font-mono font-bold">
                              {profile.equipment.ammo === "lightAmmo" ? "10%" :
                                profile.equipment.ammo === "ammo" ? "20%" :
                                  profile.equipment.ammo === "heavyAmmo" ? "30%" : ""}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="w-1" />
                      {profile.equipment.helmet && <EquipmentSlot item={profile.equipment.helmet} />}
                      {profile.equipment.chest && <EquipmentSlot item={profile.equipment.chest} />}
                      {profile.equipment.gloves && <EquipmentSlot item={profile.equipment.gloves} />}
                      {profile.equipment.pants && <EquipmentSlot item={profile.equipment.pants} />}
                      {profile.equipment.boots && <EquipmentSlot item={profile.equipment.boots} />}
                    </div>
                  )}

                  <div className="flex items-center justify-center w-full flex-col gap-4 lg:flex-row lg:gap-12 flex-1">

                    {/* Buffs */}
                    <BuffSlot
                      type="buff"
                      value={profile.user.skills.attack?.buffsPercent ?? 0}
                      endAt={profile.user.buffs?.buffEndAt}
                    />
                    <BuffSlot
                      type="debuff"
                      value={profile.user.skills.attack?.debuffsPercent ?? 0}
                      endAt={profile.user.buffs?.debuffEndAt}
                    />

                    {/* Military Rank */}
                    <MilitaryRankIcon rank={profile.user.militaryRank} imgClassName="h-10 w-10" />
                  </div>

                </div>

                {/* Divider */}
                <div className="w-full bg-zinc-700" style={{ height: "1px" }} />

                {/* Total Effective Stats */}
                <div className="flex flex-wrap gap-4 justify-center w-full">
                  {(() => {
                    const attackData = getAttackTotalAndBreakDown(profile);
                    const effectiveStats = getEffectiveStats(profile);

                    return (
                      <>
                        <StatBreakdown
                          label="Attack"
                          icon="attack"
                          total={attackData.total}
                          breakdown={{
                            skill: attackData.breakdown.skill,
                            weapon: attackData.breakdown.weapon,
                            ammo: attackData.breakdown.ammo,
                            military: attackData.breakdown.military,
                            buff: attackData.breakdown.buff,
                            debuff: attackData.breakdown.debuff * -1,
                          }}
                          isPercentage={false}
                        />

                        <StatBreakdown
                          label="Precision"
                          icon="precision"
                          total={effectiveStats.precision.total}
                          breakdown={{
                            skill: effectiveStats.precision.skill,
                            gloves: effectiveStats.precision.equipment,
                          }}
                        />

                        <StatBreakdown
                          label="Crit Chance"
                          icon="criticalChance"
                          total={effectiveStats.criticalChance.total}
                          breakdown={{
                            skill: effectiveStats.criticalChance.skill,
                            weapon: effectiveStats.criticalChance.equipment,
                          }}
                        />

                        <StatBreakdown
                          label="Crit Damage"
                          icon="criticalDamages"
                          total={effectiveStats.criticalDamages.total}
                          breakdown={{
                            skill: effectiveStats.criticalDamages.skill,
                            helmet: effectiveStats.criticalDamages.equipment,
                          }}
                        />

                        <StatBreakdown
                          label="Armor"
                          icon="armor"
                          total={`${effectiveStats.armor.effective}% (${effectiveStats.armor.raw})`}
                          breakdown={{
                            skill: effectiveStats.armor.skill,
                            chest: effectiveStats.armor.chest,
                            pants: effectiveStats.armor.pants,
                          }}
                          isPercentage={false}
                        />

                        <StatBreakdown
                          label="Dodge"
                          icon="dodge"
                          total={`${effectiveStats.dodge.effective}% (${effectiveStats.dodge.raw})`}
                          breakdown={{
                            skill: effectiveStats.dodge.skill,
                            boots: effectiveStats.dodge.boots,
                          }}
                          isPercentage={false}
                        />
                      </>
                    );
                  })()}
                </div>
              </>
            )}


          </div>
        ) : (
          <ProfileWidget />
        )}

        {/*  TODO: Simulator */}

      </div>
    </div>
  )
}
