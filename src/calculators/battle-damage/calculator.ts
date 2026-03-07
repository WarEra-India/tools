export interface BattleStats {
  attack: number
  precision: number   // 0–100
  critChance: number  // 0–100
  critDamage: number  // 0–100
  armor: number       // 0–100
  dodge: number       // 0–100
  lootChance: number  // 0–100
}

export interface BattleBonuses {
  alliance: boolean        // +10%
  swornEnemy: boolean      // +10%
  coreRegion: boolean      // +15%
  resistanceBonus: number  // 0–40
  militaryBase: number     // 0–25
  bunker: number           // 0–25
  countryOrder: "none" | "low" | "medium" | "high"
  muOrder: "none" | "low" | "medium" | "high"
  muHQ: number             // 0–20
  militaryRank: number     // 0–100+
  pillActive: boolean      // +80%
}

export interface AmmoType {
  name: string
  attackBonus: number
}

export const AMMO_TYPES: AmmoType[] = [
  { name: "No Ammo", attackBonus: 0 },
  { name: "Light Ammo", attackBonus: 20 },
  { name: "Ammo", attackBonus: 50 },
  { name: "Heavy Ammo", attackBonus: 100 },
]

const ORDER_BONUS: Record<string, number> = {
  none: 0,
  low: 5,
  medium: 10,
  high: 15,
}

export interface BattleResult {
  effectiveAttack: number
  totalDamageBonus: number
  normalHitDamage: number
  critHitDamage: number
  missHitDamage: number
  avgDamagePerHit: number
  healthLossPerHit: number
  dodgeChance: number
  avgHealthLossPerHit: number
  hitsPerHealthBar: number
  totalDamagePerHealthBar: number
  damagePerFood: Record<string, number>
  lootChancePerHit: number
  expectedCasesPerBar: number
}

export function calculateBattle(
  stats: BattleStats,
  bonuses: BattleBonuses,
  ammo: AmmoType
): BattleResult {
  const effectiveAttack = stats.attack + ammo.attackBonus

  // Sum all damage bonuses
  let totalDamageBonus = 0
  if (bonuses.alliance) totalDamageBonus += 10
  if (bonuses.swornEnemy) totalDamageBonus += 10
  if (bonuses.coreRegion) totalDamageBonus += 15
  totalDamageBonus += bonuses.resistanceBonus
  totalDamageBonus += bonuses.militaryBase
  totalDamageBonus += bonuses.bunker
  totalDamageBonus += ORDER_BONUS[bonuses.countryOrder] ?? 0
  totalDamageBonus += ORDER_BONUS[bonuses.muOrder] ?? 0
  totalDamageBonus += bonuses.muHQ
  totalDamageBonus += bonuses.militaryRank
  if (bonuses.pillActive) totalDamageBonus += 80

  const bonusMultiplier = 1 + totalDamageBonus / 100

  const normalHitDamage = effectiveAttack * bonusMultiplier
  const critHitDamage = (effectiveAttack + (stats.critDamage / 100) * effectiveAttack) * bonusMultiplier
  const missHitDamage = (effectiveAttack * 0.5) * bonusMultiplier

  const precisionRate = Math.min(stats.precision, 100) / 100
  const critRate = Math.min(stats.critChance, 100) / 100
  const dodgeRate = Math.min(stats.dodge, 100) / 100
  const armorRate = Math.min(stats.armor, 90) / 100

  // Average damage per attempted hit:
  // crit hits: critRate * critDamage (miss takes priority over crit for health, but damage-wise crits that miss still do miss damage)
  // Actually from wiki: "If a hit is a critical and a miss at the same time, the miss takes priority"
  // So: miss happens (1-precision)% of the time, dealing 50% attack
  //     normal hit: precision * (1-critChance), dealing attack
  //     crit hit: precision * critChance (but only if NOT miss, since miss takes priority... wait)
  // Re-reading: precision is the "average percentage of base-damage hits". So:
  // - precisionRate = chance of normal hit
  // - critRate = chance of crit (independent-ish, but "If a hit is a critical and a miss at the same time, the miss takes priority")
  // This means: out of all hits, some fraction are misses, some are normal, some are crit.
  // miss rate = 1 - precision/100 (but crits can be hidden by misses)
  // actual visible crit rate = critRate * precisionRate (roughly)
  // Let me model it as:
  // P(miss) = 1 - precisionRate
  // P(normal) = precisionRate * (1 - critRate) 
  // P(crit visible) = precisionRate * critRate
  // But also some "hidden" crits that are misses = (1-precisionRate) * critRate → still do miss damage
  
  const pMiss = 1 - precisionRate
  const pNormalHit = precisionRate * (1 - critRate) 
  const pCritHit = precisionRate * critRate

  const avgDamagePerHit = pMiss * missHitDamage + pNormalHit * normalHitDamage + pCritHit * critHitDamage

  // Health loss per hit
  const baseHealthLoss = 10
  const healthLossPerHit = Math.max(1, baseHealthLoss - armorRate * baseHealthLoss)
  // With dodge, sometimes 0 health loss
  const avgHealthLossPerHit = healthLossPerHit * (1 - dodgeRate)

  // Hits until health runs out (minimum health to fight is 10)
  // We compute damage per health point instead of per health bar since we don't know maxHealth
  
  const damagePerHealthPoint = avgHealthLossPerHit > 0 ? avgDamagePerHit / avgHealthLossPerHit : Infinity

  // Damage per food item
  const foodHealth: Record<string, number> = { bread: 10, steak: 20, cookedFish: 30 }
  const damagePerFood: Record<string, number> = {}
  for (const [food, hp] of Object.entries(foodHealth)) {
    // Each food restores hp health -> hp / healthLossPerHit * avgDamage (but dodge complicates)
    // Extra hits = hp / avgHealthLossPerHit
    const extraHits = avgHealthLossPerHit > 0 ? hp / avgHealthLossPerHit : Infinity
    damagePerFood[food] = extraHits * avgDamagePerHit
  }

  // Loot chance
  const lootChancePerHit = stats.lootChance / 100

  return {
    effectiveAttack,
    totalDamageBonus,
    normalHitDamage,
    critHitDamage,
    missHitDamage,
    avgDamagePerHit,
    healthLossPerHit,
    dodgeChance: dodgeRate * 100,
    avgHealthLossPerHit,
    hitsPerHealthBar: 0, // will be computed in UI with maxHealth
    totalDamagePerHealthBar: damagePerHealthPoint,
    damagePerFood,
    lootChancePerHit,
    expectedCasesPerBar: 0, // computed in UI
  }
}
