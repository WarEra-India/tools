import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { useProfile } from "@/lib/ProfileContext";
import MilitaryRankIcon from "@/components/MilitaryRankIcon";
import ProfileWidget from "@/components/ProfileWidget";
import { GameItemIcon } from "@/components/GameItemIcon";
import {
  EquipmentSlot,
  BuffSlot,
  SkillSlot,
  BriefStat,
  PUBLIC_IMAGES_BASE_URL,
} from "./components";
import { getAttackTotalAndBreakDown, getEffectiveStats } from "./utils";
import { SKILL_GROUPS } from "../archetype-analysis";
import StatsDashboard from "./StatsDashboard";

export default function ProfileDetails() {
  const { profile } = useProfile();
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false);

  const attackData = useMemo(() => profile ? getAttackTotalAndBreakDown(profile) : null, [profile]);
  const effectiveStats = useMemo(() => profile ? getEffectiveStats(profile) : null, [profile]);

  if (!profile) {
    return (
      <div className="flex flex-col outline outline-zinc-800/30 pt-4 px-4 rounded-lg">
        <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Lightbulb className="h-3.5 w-3.5" />
          Add your profile for personalised stats
        </div>
        <ProfileWidget />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-4 outline-1 outline-zinc-800 bg-zinc-900/20 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 shadow-2xl transition-all duration-300">
      {/* Toggle Button */}
      <button
        onClick={() => setIsProfileCollapsed(!isProfileCollapsed)}
        className="absolute top-1 right-1 p-2 rounded-full hover:bg-zinc-800/50 transition-colors text-zinc-500 hover:text-zinc-200"
      >
        {isProfileCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
      </button>

      {/* Row 1: Player Info & Skills */}
      <div className="flex flex-col items-center gap-4 w-full bg-zinc-900/40 rounded-3xl p-6 border border-zinc-800/40 relative">
        <span className="absolute -top-2.5 left-8 px-2 bg-zinc-950 text-[10px] font-black text-zinc-600 uppercase tracking-widest rounded shadow">Player</span>

        <div className="flex items-center justify-center w-full flex-col gap-4 lg:flex-row lg:gap-12">
          {/* User */}
          <div className="flex items-center gap-3">
            <img
              src={profile.user.avatarUrl}
              className={`${isProfileCollapsed ? "h-10 w-10" : "h-14 w-14"} rounded-full border-2 border-zinc-700 object-cover`}
            />
            <div className="flex flex-col">
              <span className="font-semibold text-lg text-zinc-100 tracking-tight">
                {profile.user.username}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Lv.{profile.user.leveling.level}
              </span>
            </div>
          </div>

          {!isProfileCollapsed ? (
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {[...SKILL_GROUPS.WAR, 'lootChance'].map((skillName) => {
                const skill = profile.user.skills[skillName as keyof typeof profile.user.skills];
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
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {attackData && effectiveStats && (
                <>
                  <BriefStat icon="attack" value={attackData.total} label="Attack" isPercentage={false} />
                  <BriefStat icon="precision" value={effectiveStats.precision.total} label="Precision" />
                  <BriefStat icon="criticalChance" value={effectiveStats.criticalChance.total} label="Crit Chance" />
                  <BriefStat icon="criticalDamages" value={effectiveStats.criticalDamages.total} label="Crit Damage" />
                  <BriefStat icon="armor" value={effectiveStats.armor.effective} label="Armor" />
                  <BriefStat icon="dodge" value={effectiveStats.dodge.effective} label="Dodge" />
                  <BriefStat icon="health" value={effectiveStats.health.skill} label="Health" isPercentage={false} />
                  <BriefStat icon="hunger" value={effectiveStats.hunger.skill} label="Hunger" isPercentage={false} />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {!isProfileCollapsed && (
        <>
          {/* Row 2: Loadout */}
          <div className="flex flex-col items-center gap-4 w-full bg-zinc-900/40 rounded-3xl p-6 border border-zinc-800/40 relative mt-2">
            <span className="absolute -top-2.5 left-8 px-2 bg-zinc-950 text-[10px] font-black text-zinc-600 uppercase tracking-widest rounded shadow">Loadout</span>

            <div className="flex items-center justify-center w-full flex-col gap-4 lg:flex-row lg:gap-12">

              {/* Weapons and Equipments */}

              <div className="flex gap-4 items-start flex-wrap justify-center flex-2">
                {profile.equipment && (
                  <>
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
                            {profile.equipment.ammo === "lightAmmo" ? "+10%" :
                              profile.equipment.ammo === "ammo" ? "+20%" :
                                profile.equipment.ammo === "heavyAmmo" ? "+30%" : ""}
                          </span>
                        </div>
                      </div>
                    )}
                    {profile.equipment.helmet && <EquipmentSlot item={profile.equipment.helmet} />}
                    {profile.equipment.chest && <EquipmentSlot item={profile.equipment.chest} />}
                    {profile.equipment.gloves && <EquipmentSlot item={profile.equipment.gloves} />}
                    {profile.equipment.pants && <EquipmentSlot item={profile.equipment.pants} />}
                    {profile.equipment.boots && <EquipmentSlot item={profile.equipment.boots} />}
                  </>
                )}

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
                <MilitaryRankIcon rank={profile.user.militaryRank} imgClassName="h-8 w-8 lg:h-10 lg:w-10" />

              </div>

            </div>
          </div>

          {/* Row 3: Final Stats */}
          <div className="w-full mt-4 bg-black/30 rounded-3xl p-8 border border-zinc-500/10 shadow-[inset_0_0_80px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col gap-6 w-full">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-inner">
                  <img src={`${PUBLIC_IMAGES_BASE_URL}attack.svg`} className="h-5 w-5 opacity-80" alt="results" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Active Stats</h2>
                  <p className="text-[11px] text-zinc-500 font-medium">Your current in-game effective combat metrics.</p>
                </div>
              </div>

              {/* Total Effective Stats */}
              <div className="flex flex-wrap justify-center gap-4 w-full">
                {attackData && effectiveStats && (
                  <StatsDashboard attackData={attackData} effectiveStats={effectiveStats} showHealthAndHunger={true} />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
