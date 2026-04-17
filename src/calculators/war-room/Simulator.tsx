import { useState, useMemo } from "react";
import { Import, Trash2, User } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import MilitaryRankIcon from "@/components/MilitaryRankIcon";
import {
  EquipmentSelectorPopover,
  ResourceInput,
  ModifierToggle,
  StatRangeInput,
  COIN_ICON,
  PUBLIC_IMAGES_BASE_URL,
} from "./components";
import { getAttackTotalAndBreakDown, getEffectiveStats, effectivePercentageValue } from "./utils";
import { AMMO_PERCENTAGES, EQUIPEMENTS, SKILL_PROGRESSION, FOOD_MULTIPLIERS } from "./constants";
import StatsDashboard from "./StatsDashboard";
import BattleSimulation from "./BattleSimulation";
import type { FullProfile } from "@/lib/wareraApi";
import PresetManager from "./PresetManager";

const BATTLE_ICON = `${PUBLIC_IMAGES_BASE_URL}battle.svg`;

export const INITIAL_SIM_STATE = {
  weapon: null as string | null,
  ammo: null as string | null,
  helmet: null as string | null,
  chest: null as string | null,
  gloves: null as string | null,
  pants: null as string | null,
  boots: null as string | null,
  food: null as string | null,
  modifier: 'no buff' as 'buff' | 'debuff' | 'no buff',
  militaryRank: 1,
  orders: 0,
  playerLevel: 1,
  ecoSkillsPoints: 0,
  equipmentStatsOverride: {} as Record<string, Record<string, number>>,
  skills: {
    health: 0,
    hunger: 0,
    attack: 0,
    precision: 0,
    criticalChance: 0,
    criticalDamages: 0,
    armor: 0,
    dodge: 0,
    lootChance: 0,
  },
};

export type SimEquipmentState = typeof INITIAL_SIM_STATE;

export default function Simulator({
  profile,
  gameConfig,
  livePrices,
  equipPrices,
}: {
  profile: FullProfile | null;
  gameConfig: any;
  livePrices: any;
  equipPrices: any;
}) {
  const [simEquipment, setSimEquipment] = useState(structuredClone(INITIAL_SIM_STATE));
  const [activeSelector, setActiveSelector] = useState<keyof typeof simEquipment | null>(null);

  const importFromProfile = () => {
    if (!profile || !profile.equipment) return;
    const equipment = profile.equipment;
    const user = profile.user;

    setSimEquipment(prev => {
      const importedWarSkillsPoints = [
        user.skills.health?.level ?? 0,
        user.skills.hunger?.level ?? 0,
        user.skills.attack?.level ?? 0,
        user.skills.precision?.level ?? 0,
        user.skills.criticalChance?.level ?? 0,
        user.skills.criticalDamages?.level ?? 0,
        user.skills.armor?.level ?? 0,
        user.skills.dodge?.level ?? 0,
        user.skills.lootChance?.level ?? 0,
      ].reduce((sum, level) => sum + (level * (level + 1)) / 2, 0);

      const ecoPoints = Math.max(0, (user.leveling?.spentSkillPoints ?? 0) - importedWarSkillsPoints);

      return {
        weapon: equipment.weapon?.code ?? null,
        ammo: equipment.ammo ?? null,
        helmet: equipment.helmet?.code ?? null,
        chest: equipment.chest?.code ?? null,
        gloves: equipment.gloves?.code ?? null,
        pants: equipment.pants?.code ?? null,
        boots: equipment.boots?.code ?? null,
        food: prev.food,
        modifier: (user.skills.attack?.buffsPercent ?? 0) > 0 ? 'buff' :
          (user.skills.attack?.debuffsPercent ?? 0) > 0 ? 'debuff' : 'no buff',
        militaryRank: user.militaryRank ?? 1,
        orders: prev.orders,
        playerLevel: user.leveling?.level ?? 1,
        ecoSkillsPoints: ecoPoints,
        equipmentStatsOverride: {
          weapon: equipment.weapon?.skills || {},
          helmet: equipment.helmet?.skills || {},
          chest: equipment.chest?.skills || {},
          gloves: equipment.gloves?.skills || {},
          pants: equipment.pants?.skills || {},
          boots: equipment.boots?.skills || {},
        },
        skills: {
          health: user.skills.health?.level ?? 0,
          hunger: user.skills.hunger?.level ?? 0,
          attack: user.skills.attack?.level ?? 0,
          precision: user.skills.precision?.level ?? 0,
          criticalChance: user.skills.criticalChance?.level ?? 0,
          criticalDamages: user.skills.criticalDamages?.level ?? 0,
          armor: user.skills.armor?.level ?? 0,
          dodge: user.skills.dodge?.level ?? 0,
          lootChance: user.skills.lootChance?.level ?? 0,
        }
      };
    });
  };

  const clearSim = () => setSimEquipment(structuredClone(INITIAL_SIM_STATE));

  const simOverride = useMemo(() => {
    if (!gameConfig) return null;

    const getStats = (slot: string, code: string | null) => {
      if (!code) return null;
      const rawStats = gameConfig.equipments.find((e: any) => e.code === code)?.dynamicStats;
      if (!rawStats) return null;

      const overriddenStats: any = {};
      for (const [k, v] of Object.entries(rawStats)) {
        if (simEquipment.equipmentStatsOverride?.[slot]?.[k] !== undefined) {
          overriddenStats[k] = simEquipment.equipmentStatsOverride[slot][k];
        } else if (Array.isArray(v)) {
          overriddenStats[k] = Math.ceil((v[0] + (v[1] as number)) / 2);
        } else {
          overriddenStats[k] = v;
        }
      }
      return overriddenStats;
    };

    return {
      weaponStats: getStats('weapon', simEquipment.weapon),
      helmetStats: getStats('helmet', simEquipment.helmet),
      chestStats: getStats('chest', simEquipment.chest),
      glovesStats: getStats('gloves', simEquipment.gloves),
      pantsStats: getStats('pants', simEquipment.pants),
      bootsStats: getStats('boots', simEquipment.boots),
      ammoPercent: simEquipment.ammo
        ? AMMO_PERCENTAGES[simEquipment.ammo as keyof typeof AMMO_PERCENTAGES] || 0
        : 0,
      modifier: simEquipment.modifier,
      militaryRank: simEquipment.militaryRank,
      orders: simEquipment.orders,
      skills: simEquipment.skills,
    };
  }, [simEquipment, gameConfig]);

  const workingProfile: any = useMemo(() => profile || { user: { skills: {} }, equipment: {} }, [profile]);
  const simAttackData = useMemo(() => getAttackTotalAndBreakDown(workingProfile, simOverride), [workingProfile, simOverride]);
  const simEffectiveStats = useMemo(() => getEffectiveStats(workingProfile, simOverride), [workingProfile, simOverride]);

  const totalHungerPoints = simEffectiveStats.hunger.skill || 0;
  const foodPrices: Record<string, number> = {
    bread: livePrices?.prices?.bread ?? 0,
    steak: livePrices?.prices?.steak ?? 0,
    cookedFish: livePrices?.prices?.cookedFish ?? 0,
  };

  const totalSimCost = useMemo(() => {
    let sum = 0;
    for (const slot of EQUIPEMENTS) {
      const code = simEquipment[slot as keyof typeof simEquipment];
      if (code && typeof code === 'string') {
        const price = slot === 'ammo'
          ? (livePrices?.prices[code] ?? 0) * 100
          : equipPrices?.[code] ?? 0;
        sum += price;
      }
    }
    // Added food cost based on hunger points
    if (simEquipment.food && typeof simEquipment.food === 'string') {
      sum += (foodPrices[simEquipment.food] ?? 0) * totalHungerPoints;
    }
    // Add Pill cost if buffed
    if (simEquipment.modifier === 'buff') {
      sum += livePrices?.prices?.cocain ?? 0;
    }
    return sum;
  }, [simEquipment, livePrices, equipPrices, totalHungerPoints]);

  const healthRestored = useMemo(() => {
    if (!simEquipment.food) return 0;
    const maxHealth = simEffectiveStats.health.skill || 0;
    const mult = FOOD_MULTIPLIERS[simEquipment.food] || 0;
    return Math.floor(maxHealth * mult * totalHungerPoints);
  }, [simEquipment.food, simEffectiveStats.health.skill, totalHungerPoints]);

  const allowedPoints = (simEquipment.playerLevel || 1) * 4;
  const ecoPoints = simEquipment.ecoSkillsPoints || 0;
  const warPoints = Object.values(simEquipment.skills).reduce((total, level) => {
    return total + (level * (level + 1)) / 2;
  }, 0);
  const usedPoints = warPoints + ecoPoints;

  const pieData = useMemo(() => {
    const data = [];
    if (ecoPoints > 0) data.push({ name: 'Eco', value: ecoPoints, color: '#22c55e' }); // green
    if (warPoints > 0) data.push({ name: 'War', value: warPoints, color: '#ef4444' }); // red
    const emptyPoints = Math.max(0, allowedPoints - usedPoints);
    if (emptyPoints > 0) {
      data.push({ name: 'Available', value: emptyPoints, color: '#CBBAE5' });
    }
    if (data.length === 0) {
      data.push({ name: 'Empty', value: 1, color: '#27272a' }); // zinc-800
    }
    return data;
  }, [ecoPoints, warPoints, allowedPoints, usedPoints]);

  return (
    <div className="flex flex-col gap-6 p-8 bg-zinc-900/10 rounded-3xl border border-zinc-800/30">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Simulator</h2>
          <p className="text-xs text-zinc-500">Plan your next attack by simulating different equipment combinations</p>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <button
              onClick={importFromProfile}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all border border-zinc-700/50"
            >
              <Import className="h-4 w-4" />
              Import Profile
            </button>
          )}
          <PresetManager currentSimState={simEquipment} onLoadPreset={setSimEquipment} />
          <button
            onClick={clearSim}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-all border border-red-500/20"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-6 w-full mt-4">

        {/* Row 0: Player Level & Skill Points */}
        <div className={`flex flex-col items-center gap-4 w-full rounded-3xl p-6 border relative transition-colors ${usedPoints > allowedPoints ? 'bg-red-950/20 border-red-900/50' : 'bg-zinc-900/40 border-zinc-800/40'}`}>
          <span className={`absolute -top-2.5 left-8 px-2 text-[10px] font-black uppercase tracking-widest rounded shadow ${usedPoints > allowedPoints ? 'bg-red-950 text-red-500' : 'bg-zinc-950 text-zinc-600'}`}>Player</span>
          <div className="flex items-center justify-center gap-12 flex-wrap w-full">
            {/* Player Level */}
            <div className="flex items-center gap-4">
              <ResourceInput
                icon="level"
                iconNode={<User className="h-5 w-5 opacity-80" />}
                label="Player Level"
                value={simEquipment.playerLevel}
                formatter={v => v}
                onDecrease={() => setSimEquipment(s => ({ ...s, playerLevel: Math.max(1, (s.playerLevel || 1) - 1) }))}
                onIncrease={() => setSimEquipment(s => ({ ...s, playerLevel: Math.min(200, (s.playerLevel || 1) + 1) }))}
              />
            </div>

            {/* Eco Points Customizer */}
            <div className="flex items-center gap-4">
              <ResourceInput
                icon="skills"
                iconNode={<div className="h-5 w-5 flex items-center justify-center"><img src={`${PUBLIC_IMAGES_BASE_URL}skills.svg`} className="h-4 w-4" alt="eco" /></div>}
                label="Eco Points"
                value={simEquipment.ecoSkillsPoints}
                formatter={v => v}
                onDecrease={() => setSimEquipment(s => ({ ...s, ecoSkillsPoints: Math.max(0, (s.ecoSkillsPoints || 0) - 1) }))}
                onIncrease={() => setSimEquipment(s => ({ ...s, ecoSkillsPoints: Math.min(1000, (s.ecoSkillsPoints || 0) + 1) }))}
              />
            </div>

            {/* Skill Points Summary */}
            <div className="flex items-center gap-6 ml-4">
              {/* Circular Progress Pie Chart */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Over limit Segment (red) */}
                {usedPoints > allowedPoints && (
                  <div className="absolute inset-[-4px] rounded-full border-2 border-dashed border-red-500/50 animate-spin-slow" />
                )}

                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={38}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <img src={`${PUBLIC_IMAGES_BASE_URL}skills.svg`} className="h-6 w-6 opacity-80" alt="skills" />
                </div>
              </div>

              {/* Legend & Details */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded bg-[#CBBAE5]"></div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Available</span>
                  </div>
                  <span className={`text-xl font-mono font-black ${usedPoints > allowedPoints ? 'text-red-400' : 'text-zinc-100'}`}>
                    {Math.max(0, allowedPoints - usedPoints)} <span className="text-xs text-zinc-600 font-medium tracking-normal">/ {allowedPoints}</span>
                  </span>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded bg-red-500"></div>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">War</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-zinc-300 ml-3.5 leading-none">{warPoints}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded bg-green-500"></div>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Eco</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-zinc-300 ml-3.5 leading-none">{simEquipment.ecoSkillsPoints}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 1: Weapons & Equipment */}
        <div className="flex flex-col items-center gap-4 w-full bg-zinc-900/40 rounded-3xl p-6 border border-zinc-800/40 relative">
          <span className="absolute -top-2.5 left-8 px-2 bg-zinc-950 text-[10px] font-black text-zinc-600 uppercase tracking-widest rounded shadow">Loadout</span>
          <div className="flex items-start gap-4 flex-wrap justify-center w-full">
            {EQUIPEMENTS.map((slot) => (
              <div key={slot} className="flex flex-col items-center gap-2">
                <EquipmentSelectorPopover
                  slot={slot}
                  currentValue={simEquipment[slot]}
                  isOpen={activeSelector === slot}
                  onOpenChange={(open) => setActiveSelector(open ? slot : null)}
                  onSelect={(code) => setSimEquipment((s) => ({
                    ...s,
                    [slot]: code,
                    equipmentStatsOverride: {
                      ...s.equipmentStatsOverride,
                      [slot]: {}
                    }
                  }))}
                  gameConfig={gameConfig}
                  livePrices={livePrices}
                  equipPrices={equipPrices}
                />

                {simEquipment[slot] ? (() => {
                  const code = simEquipment[slot];
                  const equip = gameConfig?.equipments.find((e: any) => e.code === code);
                  const stats = equip?.dynamicStats;

                  return (
                    <div className="flex flex-col items-center gap-1 min-w-0 w-[84px]">
                      {slot === 'ammo' && (
                        <div className="flex items-center gap-1">
                          <img src={`${PUBLIC_IMAGES_BASE_URL}attack.svg`} className="h-3 w-3" />
                          <span className="text-[10px] font-mono font-bold text-zinc-400">
                            +{code === 'lightAmmo' ? 10 : code === 'ammo' ? 20 : 30}%
                          </span>
                        </div>
                      )}
                      {stats && (
                        <div className="flex flex-col w-full gap-1.5 mt-1 px-0.5">
                          {Object.entries(stats).map(([key, value]: [string, any]) => {
                            if (Array.isArray(value)) {
                              const min = value[0];
                              const max = value[1];
                              const defaultAvg = Math.ceil((min + max) / 2);
                              const currentVal = simEquipment.equipmentStatsOverride?.[slot]?.[key] ?? defaultAvg;
                              return (
                                <StatRangeInput
                                  key={key}
                                  icon={key}
                                  min={min}
                                  max={max}
                                  value={currentVal}
                                  onChange={(newVal: number) => {
                                    setSimEquipment(s => ({
                                      ...s,
                                      equipmentStatsOverride: {
                                        ...s.equipmentStatsOverride,
                                        [slot]: {
                                          ...(s.equipmentStatsOverride?.[slot] || {}),
                                          [key]: newVal
                                        }
                                      }
                                    }));
                                  }}
                                />
                              );
                            } else {
                              return (
                                <div key={key} className="flex items-center justify-between w-full bg-zinc-900/40 px-1.5 py-1 rounded border border-zinc-800/50">
                                  <img
                                    src={`${PUBLIC_IMAGES_BASE_URL}${key}.svg`}
                                    alt={key}
                                    className="h-3 w-3 object-contain opacity-80"
                                  />
                                  <span className="text-[10px] font-mono font-bold text-zinc-300">
                                    {value}
                                  </span>
                                </div>
                              );
                            }
                          })}
                        </div>
                      )}
                    </div>
                  );
                })() : null}
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Skills */}
        <div className={`flex flex-col items-center gap-4 w-full rounded-3xl p-6 border relative transition-colors ${usedPoints > allowedPoints ? 'bg-red-950/10 border-red-900/50' : 'bg-zinc-900/40 border-zinc-800/40'}`}>
          <span className={`absolute -top-2.5 left-8 px-2 text-[10px] font-black uppercase tracking-widest rounded shadow ${usedPoints > allowedPoints ? 'bg-red-950 text-red-500' : 'bg-zinc-950 text-zinc-600'}`}>Skills</span>
          <div className="flex items-center gap-4 flex-wrap justify-center w-full">
            {(Object.keys(SKILL_PROGRESSION) as Array<keyof typeof SKILL_PROGRESSION>).map((skillName) => (
              <ResourceInput
                key={skillName}
                icon={skillName}
                label={skillName}
                value={simEquipment.skills[skillName]}
                formatter={(v) => {
                  const level = v ?? 0;
                  const prog = SKILL_PROGRESSION[skillName];
                  const calculated = prog.base + (level * prog.inc);

                  if (skillName === 'dodge' || skillName === 'armor') {
                    return (
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[11px] mb-0.5">{calculated} | {effectivePercentageValue(calculated)}%</span>
                        <span className="text-[8.5px] text-zinc-400 font-normal">L{level}</span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col items-center leading-tight mt-0.5">
                      <span className="text-[11px] mb-0.5">
                        {calculated}
                        {!['health', 'hunger', 'attack', 'armor', 'dodge'].includes(skillName) ? '%' : ''}</span>
                      <span className="text-[9px] text-zinc-400 font-normal">
                        L{level}
                      </span>
                    </div>
                  );
                }}
                onDecrease={() => setSimEquipment(s => ({ ...s, skills: { ...s.skills, [skillName]: Math.max(0, s.skills[skillName] - 1) } }))}
                onIncrease={() => setSimEquipment(s => ({ ...s, skills: { ...s.skills, [skillName]: Math.min(SKILL_PROGRESSION[skillName].maxLevel, s.skills[skillName] + 1) } }))}
              />
            ))}
          </div>
        </div>

        {/* Row 3: Modifiers */}
        <div className="flex flex-col items-center gap-4 w-full bg-zinc-900/40 rounded-3xl p-6 border border-zinc-800/40 relative">
          <span className="absolute -top-2.5 left-8 px-2 bg-zinc-950 text-[10px] font-black text-zinc-600 uppercase tracking-widest rounded shadow">Modifiers</span>
          <div className="flex items-center gap-8 flex-wrap justify-center w-full">
            {/* Military Rank */}
            <ResourceInput
              icon="battle"
              iconNode={<MilitaryRankIcon rank={simEquipment.militaryRank} imgClassName="h-6 w-6" />}
              label="Military Rank"
              value={simEquipment.militaryRank}
              formatter={v => null}
              onDecrease={() => setSimEquipment(s => ({ ...s, militaryRank: Math.max(1, s.militaryRank - 1) }))}
              onIncrease={() => setSimEquipment(s => ({ ...s, militaryRank: Math.min(120, s.militaryRank + 1) }))}
            />

            {/* Orders */}
            <ResourceInput
              icon="orders"
              label="Orders"
              value={simEquipment.orders}
              formatter={v => `${v ?? 0}%`}
              onDecrease={() => setSimEquipment(s => ({ ...s, orders: Math.max(-25, s.orders - 5) }))}
              onIncrease={() => setSimEquipment(s => ({ ...s, orders: Math.min(100, s.orders + 5) }))}
            />

            {/* Buff/Debuff Toggle */}
            <ModifierToggle
              modifier={simEquipment.modifier}
              onChange={(modifier) => setSimEquipment(s => ({ ...s, modifier }))}
              livePrices={livePrices}
            />

            {/* Food Selector */}
            <div className="flex flex-col items-center gap-1.5">
              <EquipmentSelectorPopover
                slot="food"
                currentValue={simEquipment.food}
                isOpen={activeSelector === 'food'}
                onOpenChange={(open) => setActiveSelector(open ? 'food' : null)}
                onSelect={(code) => setSimEquipment(s => ({ ...s, food: code }))}
                gameConfig={gameConfig}
                livePrices={livePrices}
                equipPrices={equipPrices}
              />
              {simEquipment.food && (
                <div className="flex items-center gap-1">
                  <img src={`${PUBLIC_IMAGES_BASE_URL}health.svg`} className="h-3 w-3" alt="health" />
                  <span className="text-[10px] font-mono font-bold text-zinc-400">
                    +{FOOD_MULTIPLIERS[simEquipment.food] * 100}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Final Simulator Dashboard */}
        <div className="w-full bg-black/30 rounded-3xl p-8 border border-zinc-500/10 shadow-[inset_0_0_80px_rgba(0,0,0,0.5)]">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-inner">
                  <img src={BATTLE_ICON} className="h-5 w-5 opacity-80" alt="results" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Simulated Stats</h2>
                  <p className="text-[11px] text-zinc-500 font-medium">Live preview of your configured loadout attributes.</p>
                </div>
              </div>


            </div>

            {/* Dashboard Grid */}
            <div className="flex flex-wrap justify-center gap-4 w-full">
              <StatsDashboard
                attackData={simAttackData}
                effectiveStats={simEffectiveStats}
                // roundValues={true}
                showLootChance={true}
                showHealthAndHunger={true}
                healthRestored={healthRestored}
              />
            </div>
          </div>
        </div>

        {/* Battle Simulation */}
        <BattleSimulation
          attackData={simAttackData}
          effectiveStats={simEffectiveStats}
          healthRestored={healthRestored}
          simEquipment={simEquipment}
          gameConfig={gameConfig}
          livePrices={livePrices}
          equipPrices={equipPrices}
          totalHungerPoints={totalHungerPoints}
        />

      </div>
    </div>
  );
}
