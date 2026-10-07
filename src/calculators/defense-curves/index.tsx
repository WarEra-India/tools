import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Shield, Wind, X } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/lib/ProfileContext";
import ProfileSearchBar from "@/components/ProfileSearchBar";
import { GameItemIcon } from "@/components/GameItemIcon";
import { effectivePercentageValue, getEffectiveStatThresholds, rawPointsForEffectiveValue } from "@/calculators/war-room/utils";

const MAX_STAT = 200;
const MAX_TARGET_EFF = 83;
const PUBLIC_IMAGES_BASE_URL = `${import.meta.env.BASE_URL}images/`;
const ARMOR_ICON = `${PUBLIC_IMAGES_BASE_URL}armor.svg`;
const DODGE_ICON = `${PUBLIC_IMAGES_BASE_URL}dodge.svg`;

const getStatAvg = (val: any): number => {
  if (!val) return 0;
  if (Array.isArray(val)) return Math.ceil((val[0] + val[1]) / 2);
  return typeof val === "number" ? val : 0;
};

export default function DefenseCurves() {
  const { profile, clearProfile } = useProfile();

  // Forward curve data: Raw -> Effective %
  const forwardChartData = useMemo(() => {
    const data = [];
    for (let r = 0; r <= MAX_STAT; r += 2) {
      data.push({
        raw: r,
        effective: effectivePercentageValue(r),
      });
    }
    return data;
  }, []);

  // Reverse curve data: Target Effective % -> Required Raw Stat
  const reverseChartData = useMemo(() => {
    const data = [];
    for (let e = 0; e <= MAX_TARGET_EFF; e += 1) {
      data.push({
        effective: e,
        requiredRaw: rawPointsForEffectiveValue(e),
      });
    }
    return data;
  }, []);

  // Profile Armor & Dodge calculations + breakpoint thresholds
  const profileStats = useMemo(() => {
    if (!profile) return null;

    const armorSkillLvl = profile.user.skills?.armor?.level ?? 0;
    const armorSkillVal = profile.user.skills?.armor?.value ?? 0;
    const chestItem = profile.equipment?.chest;
    const pantsItem = profile.equipment?.pants;
    const chestArmor = getStatAvg(chestItem?.skills?.armor);
    const pantsArmor = getStatAvg(pantsItem?.skills?.armor);
    const totalRawArmor = armorSkillVal + chestArmor + pantsArmor;
    const armorThresholds = getEffectiveStatThresholds(totalRawArmor);

    const dodgeSkillLvl = profile.user.skills?.dodge?.level ?? 0;
    const dodgeSkillVal = profile.user.skills?.dodge?.value ?? 0;
    const bootsItem = profile.equipment?.boots;
    const bootsDodge = getStatAvg(bootsItem?.skills?.dodge);
    const totalRawDodge = dodgeSkillVal + bootsDodge;
    const dodgeThresholds = getEffectiveStatThresholds(totalRawDodge);

    return {
      armor: {
        skillLevel: armorSkillLvl,
        skillVal: armorSkillVal,
        chestItem,
        chestArmor,
        pantsItem,
        pantsArmor,
        totalRaw: totalRawArmor,
        thresholds: armorThresholds,
      },
      dodge: {
        skillLevel: dodgeSkillLvl,
        skillVal: dodgeSkillVal,
        bootsItem,
        bootsDodge,
        totalRaw: totalRawDodge,
        thresholds: dodgeThresholds,
      },
    };
  }, [profile]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calculators
          </Link>
        </div>

        {/* Graph 1: Forward Curve */}
        <div className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white">Effective Stat Curve (Raw → Effective %)</h1>
            <p className="text-xs text-zinc-400">
              Formula: <code className="text-cyan-400 font-mono">Effective % = round(Raw / (Raw + 40) × 100)</code>
            </p>
          </div>

          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-6">
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forwardChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="raw"
                      stroke="#71717a"
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      domain={[0, MAX_STAT]}
                      type="number"
                      label={{
                        value: "Raw Stat",
                        position: "insideBottom",
                        offset: -10,
                        fill: "#71717a",
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      stroke="#71717a"
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      unit="%"
                      domain={[0, 100]}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const raw = Number(label);
                        const eff = effectivePercentageValue(raw);
                        return (
                          <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-2 shadow-xl text-xs space-y-0.5">
                            <div className="text-zinc-400 font-mono">
                              Raw: <span className="font-bold text-white">{raw} pts</span>
                            </div>
                            <div className="text-cyan-400 font-mono font-bold">
                              Effective: {eff}%
                            </div>
                          </div>
                        );
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="effective"
                      name="Effective %"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5, fill: "#06b6d4" }}
                    />

                    <ReferenceLine
                      x={40}
                      stroke="#71717a"
                      strokeDasharray="3 3"
                      label={{
                        value: "40 = 50%",
                        fill: "#a1a1aa",
                        fontSize: 11,
                        position: "insideTopRight",
                      }}
                    />

                    {/* Highlight active profile Armor & Dodge dots on curve if loaded */}
                    {profileStats && profileStats.armor.totalRaw <= MAX_STAT && (
                      <ReferenceDot
                        x={profileStats.armor.totalRaw}
                        y={profileStats.armor.thresholds.currentEff}
                        r={6}
                        fill="#06b6d4"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    )}
                    {profileStats && profileStats.dodge.totalRaw <= MAX_STAT && (
                      <ReferenceDot
                        x={profileStats.dodge.totalRaw}
                        y={profileStats.dodge.thresholds.currentEff}
                        r={6}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graph 2: Reverse Curve */}
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Required Raw Stat Curve (Effective % → Required Raw)</h2>
            <p className="text-xs text-zinc-400">
              Shows how many raw stat points are needed to reach a desired effective percentage.
            </p>
          </div>

          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-6">
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reverseChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="effective"
                      stroke="#71717a"
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      unit="%"
                      domain={[0, MAX_TARGET_EFF]}
                      type="number"
                      label={{
                        value: "Target Effective %",
                        position: "insideBottom",
                        offset: -10,
                        fill: "#71717a",
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      stroke="#71717a"
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      unit=" pts"
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const eff = Number(label);
                        const needed = rawPointsForEffectiveValue(eff);
                        return (
                          <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-2 shadow-xl text-xs space-y-0.5">
                            <div className="text-zinc-400 font-mono">
                              Target Effective: <span className="font-bold text-white">{eff}%</span>
                            </div>
                            <div className="text-purple-400 font-mono font-bold">
                              Required Raw: {needed} pts
                            </div>
                          </div>
                        );
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="requiredRaw"
                      name="Required Raw Stat"
                      stroke="#a855f7"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5, fill: "#a855f7" }}
                    />

                    <ReferenceLine
                      x={50}
                      stroke="#71717a"
                      strokeDasharray="3 3"
                      label={{
                        value: "50% = 40 pts",
                        fill: "#a1a1aa",
                        fontSize: 11,
                        position: "insideTopLeft",
                      }}
                    />

                    {/* Highlight active profile Armor & Dodge dots on reverse curve */}
                    {profileStats && profileStats.armor.thresholds.currentEff <= MAX_TARGET_EFF && (
                      <ReferenceDot
                        x={profileStats.armor.thresholds.currentEff}
                        y={profileStats.armor.thresholds.minRawToPreserve}
                        r={6}
                        fill="#06b6d4"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    )}
                    {profileStats && profileStats.dodge.thresholds.currentEff <= MAX_TARGET_EFF && (
                      <ReferenceDot
                        x={profileStats.dodge.thresholds.currentEff}
                        y={profileStats.dodge.thresholds.minRawToPreserve}
                        r={6}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Defense Section */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-400" />
              Profile Defense Stats &amp; Gear Optimization
            </CardTitle>
            {profile && (
              <button
                onClick={clearProfile}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                title="Clear loaded profile"
              >
                <X className="h-3.5 w-3.5" />
                Change User
              </button>
            )}
          </CardHeader>

          <CardContent className="pt-4">
            {!profile ? (
              <div className="space-y-3 py-2">
                <p className="text-xs text-zinc-400">
                  Search a player username to load their active Armor and Dodge skills &amp; equipped gear:
                </p>
                <ProfileSearchBar />
              </div>
            ) : profileStats && (
              <div className="space-y-4">
                {/* User Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-zinc-800/60">
                  <img
                    src={profile.user.avatarUrl}
                    alt={profile.user.username}
                    className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
                  />
                  <div>
                    <div className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                      <span>{profile.user.username}</span>
                      <Badge variant="outline" className="text-[10px] font-mono py-0 text-zinc-400 border-zinc-700">
                        Lv.{profile.user.leveling.level}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Equipped Defense Loadout &amp; Threshold Analysis
                    </p>
                  </div>
                </div>

                {/* 2-Column Stats Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Armor Column */}
                  <div className="bg-zinc-950/60 rounded-xl p-4 border border-cyan-950/40 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={ARMOR_ICON} alt="Armor" className="h-5 w-5" />
                          <span className="font-bold text-sm text-cyan-300">Armor</span>
                        </div>
                        <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold">
                          {profileStats.armor.thresholds.currentEff}% Effective
                        </Badge>
                      </div>

                      <div className="space-y-2 text-xs">
                        {/* Skill */}
                        <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                          <span className="text-zinc-400">Skill (Lvl {profileStats.armor.skillLevel}):</span>
                          <span className="font-mono font-semibold text-zinc-200">+{profileStats.armor.skillVal} pts</span>
                        </div>

                        {/* Chest Equipment */}
                        <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                          <div className="flex items-center gap-2">
                            {profileStats.armor.chestItem ? (
                              <GameItemIcon itemCode={profileStats.armor.chestItem.code} className="h-6 w-6 rounded" />
                            ) : (
                              <div className="h-6 w-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600">
                                –
                              </div>
                            )}
                            <span className="text-zinc-400">Chest Gear:</span>
                          </div>
                          <span className="font-mono font-semibold text-zinc-200">
                            {profileStats.armor.chestArmor > 0 ? `+${profileStats.armor.chestArmor} pts` : "None"}
                          </span>
                        </div>

                        {/* Pants Equipment */}
                        <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                          <div className="flex items-center gap-2">
                            {profileStats.armor.pantsItem ? (
                              <GameItemIcon itemCode={profileStats.armor.pantsItem.code} className="h-6 w-6 rounded" />
                            ) : (
                              <div className="h-6 w-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600">
                                –
                              </div>
                            )}
                            <span className="text-zinc-400">Pants Gear:</span>
                          </div>
                          <span className="font-mono font-semibold text-zinc-200">
                            {profileStats.armor.pantsArmor > 0 ? `+${profileStats.armor.pantsArmor} pts` : "None"}
                          </span>
                        </div>

                        {/* Total Raw */}
                        <div className="flex items-center justify-between pt-1 font-bold text-cyan-200">
                          <span>Total Raw Armor:</span>
                          <span className="font-mono text-sm">{profileStats.armor.totalRaw} pts</span>
                        </div>
                      </div>
                    </div>

                    {/* Armor Optimization Box */}
                    <div className="pt-2 border-t border-zinc-800/80 space-y-2 text-xs">
                      {profileStats.armor.thresholds.excessPoints > 0 ? (
                        <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-zinc-300 space-y-1">
                          <div className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1">
                            <span>💡 Gear Optimization</span>
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            You have <strong className="text-cyan-300">{profileStats.armor.thresholds.excessPoints} excess pts</strong>. You can safely lower gear by <strong className="text-white">{profileStats.armor.thresholds.excessPoints} pts</strong> (down to <strong className="text-white">{profileStats.armor.thresholds.minRawToPreserve} pts</strong>) and still maintain <strong className="text-cyan-300">{profileStats.armor.thresholds.currentEff}%</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px]">
                          🎯 <strong className="text-zinc-200">Optimal Breakpoint:</strong> Exactly at the minimum ({profileStats.armor.thresholds.minRawToPreserve} pts) for {profileStats.armor.thresholds.currentEff}%.
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[11px] text-zinc-400 px-1">
                        <span>Next Tier ({profileStats.armor.thresholds.nextEff}%):</span>
                        <span className="font-mono font-bold text-cyan-400">
                          +{profileStats.armor.thresholds.pointsNeededForNext} pts ({profileStats.armor.thresholds.nextRawToUpgrade} pts needed)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dodge Column */}
                  <div className="bg-zinc-950/60 rounded-xl p-4 border border-emerald-950/40 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={DODGE_ICON} alt="Dodge" className="h-5 w-5" />
                          <span className="font-bold text-sm text-emerald-300">Dodge</span>
                        </div>
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold">
                          {profileStats.dodge.thresholds.currentEff}% Effective
                        </Badge>
                      </div>

                      <div className="space-y-2 text-xs">
                        {/* Skill */}
                        <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                          <span className="text-zinc-400">Skill (Lvl {profileStats.dodge.skillLevel}):</span>
                          <span className="font-mono font-semibold text-zinc-200">+{profileStats.dodge.skillVal} pts</span>
                        </div>

                        {/* Boots Equipment */}
                        <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                          <div className="flex items-center gap-2">
                            {profileStats.dodge.bootsItem ? (
                              <GameItemIcon itemCode={profileStats.dodge.bootsItem.code} className="h-6 w-6 rounded" />
                            ) : (
                              <div className="h-6 w-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600">
                                –
                              </div>
                            )}
                            <span className="text-zinc-400">Boots Gear:</span>
                          </div>
                          <span className="font-mono font-semibold text-zinc-200">
                            {profileStats.dodge.bootsDodge > 0 ? `+${profileStats.dodge.bootsDodge} pts` : "None"}
                          </span>
                        </div>

                        {/* Spacer to align with Armor rows */}
                        <div className="py-1 invisible border-b border-transparent">
                          <span>–</span>
                        </div>

                        {/* Total Raw */}
                        <div className="flex items-center justify-between pt-1 font-bold text-emerald-200">
                          <span>Total Raw Dodge:</span>
                          <span className="font-mono text-sm">{profileStats.dodge.totalRaw} pts</span>
                        </div>
                      </div>
                    </div>

                    {/* Dodge Optimization Box */}
                    <div className="pt-2 border-t border-zinc-800/80 space-y-2 text-xs">
                      {profileStats.dodge.thresholds.excessPoints > 0 ? (
                        <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-zinc-300 space-y-1">
                          <div className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                            <span>💡 Gear Optimization</span>
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            You have <strong className="text-emerald-300">{profileStats.dodge.thresholds.excessPoints} excess pts</strong>. You can safely lower gear by <strong className="text-white">{profileStats.dodge.thresholds.excessPoints} pts</strong> (down to <strong className="text-white">{profileStats.dodge.thresholds.minRawToPreserve} pts</strong>) and still maintain <strong className="text-emerald-300">{profileStats.dodge.thresholds.currentEff}%</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px]">
                          🎯 <strong className="text-zinc-200">Optimal Breakpoint:</strong> Exactly at the minimum ({profileStats.dodge.thresholds.minRawToPreserve} pts) for {profileStats.dodge.thresholds.currentEff}%.
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[11px] text-zinc-400 px-1">
                        <span>Next Tier ({profileStats.dodge.thresholds.nextEff}%):</span>
                        <span className="font-mono font-bold text-emerald-400">
                          +{profileStats.dodge.thresholds.pointsNeededForNext} pts ({profileStats.dodge.thresholds.nextRawToUpgrade} pts needed)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
