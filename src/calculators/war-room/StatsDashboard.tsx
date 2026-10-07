import { StatBreakdown } from "./components";

interface AttackData {
  breakdown: {
    skill: number;
    weapon: number;
    overflow?: number;
    ammo: number;
    military: number;
    orders: number;
    buff: number;
    debuff: number;
  };
  total: number;
}

interface EffectiveStats {
  precision: {
    skill: number;
    equipment: number;
    raw?: number;
    limited?: number;
    overflowDamage?: number;
    total: number;
  };
  criticalChance: { skill: number; equipment: number; total: number };
  criticalDamages: { skill: number; equipment: number; total: number };
  armor: { skill: number; chest: number; pants: number; raw: number; effective: number };
  dodge: { skill: number; boots: number; raw: number; effective: number };
  health: { skill: number };
  hunger: { skill: number };
  lootChance: { skill: number };
}

const r = (v: number, round: boolean) => round ? Math.ceil(v) : v;

export default function StatsDashboard({
  attackData,
  effectiveStats,
  roundValues = false,
  showLootChance = false,
  showHealthAndHunger = false,
  healthRestored,
  effectiveHealthBase,
}: {
  attackData: AttackData;
  effectiveStats: EffectiveStats;
  roundValues?: boolean;
  showLootChance?: boolean;
  showHealthAndHunger?: boolean;
  healthRestored?: number;
  effectiveHealthBase?: number;
}) {
  const bd = attackData.breakdown;

  return (
    <>
      <StatBreakdown
        icon="attack"
        label="Attack"
        breakdown={{
          skill: r(bd.skill, roundValues),
          weapon: r(bd.weapon, roundValues),
          ...((bd.overflow ?? 0) > 0 ? { overflow: r(bd.overflow!, roundValues) } : {}),
          ...(bd.ammo > 0 ? { ammo: r(bd.ammo, roundValues) } : {}),
          ...(bd.military > 0 ? { military: r(bd.military, roundValues) } : {}),
          ...(bd.orders != 0 ? { orders: bd.orders } : {}),
          ...(bd.buff > 0 ? { buff: r(bd.buff, roundValues) } : {}),
          ...(bd.debuff > 0 ? { debuff: -r(bd.debuff, roundValues) } : {}),
        }}
        total={r(attackData.total, roundValues)}
        isPercentage={false}
      />

      <StatBreakdown
        icon="precision"
        label="Precision"
        breakdown={{
          skill: r(effectiveStats.precision.skill, roundValues),
          gloves: r(effectiveStats.precision.equipment, roundValues),
          ...((effectiveStats.precision.limited ?? 0) > 0
            ? { limited: -r(effectiveStats.precision.limited!, roundValues) }
            : {}),
        }}
        total={r(effectiveStats.precision.total, roundValues)}
      />

      <StatBreakdown
        icon="criticalChance"
        label="Crit Chance"
        breakdown={{
          skill: r(effectiveStats.criticalChance.skill, roundValues),
          weapon: r(effectiveStats.criticalChance.equipment, roundValues),
        }}
        total={r(effectiveStats.criticalChance.total, roundValues)}
      />

      <StatBreakdown
        icon="criticalDamages"
        label="Crit Damage"
        breakdown={{
          skill: r(effectiveStats.criticalDamages.skill, roundValues),
          helmet: r(effectiveStats.criticalDamages.equipment, roundValues),
        }}
        total={r(effectiveStats.criticalDamages.total, roundValues)}
      />

      <StatBreakdown
        icon="armor"
        label="Armor"
        breakdown={{
          skill: r(effectiveStats.armor.skill, roundValues),
          chest: r(effectiveStats.armor.chest, roundValues),
          pants: r(effectiveStats.armor.pants, roundValues),
        }}
        total={`${effectiveStats.armor.effective}% (${r(effectiveStats.armor.raw, roundValues)})`}
        isPercentage={false}
      />

      <StatBreakdown
        icon="dodge"
        label="Dodge"
        breakdown={{
          skill: r(effectiveStats.dodge.skill, roundValues),
          boots: r(effectiveStats.dodge.boots, roundValues),
        }}
        total={`${effectiveStats.dodge.effective}% (${r(effectiveStats.dodge.raw, roundValues)})`}
        isPercentage={false}
      />

      {showLootChance && (
        <StatBreakdown
          icon="lootChance"
          label="Loot Chance"
          breakdown={{
            skill: r(effectiveStats.lootChance.skill, roundValues),
          }}
          total={r(effectiveStats.lootChance.skill, roundValues)}
        />
      )}

      {showHealthAndHunger && (() => {
        const baseHealth = effectiveStats.health.skill;
        const healthBase = effectiveHealthBase ?? baseHealth;
        const regenAmount = healthBase - baseHealth;
        return (
          <StatBreakdown
            icon="health"
            label="Health"
            breakdown={{
              skill: r(baseHealth, roundValues),
              ...(regenAmount > 0 ? { regen: r(regenAmount, roundValues) } : {}),
              ...(healthRestored ? { food: r(healthRestored, roundValues) } : {}),
            }}
            total={r(healthBase + (healthRestored || 0), roundValues)}
            isPercentage={false}
          />
        );
      })()}
    </>
  );
}
