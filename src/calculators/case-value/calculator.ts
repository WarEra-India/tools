/**
 * Case Expected Value Calculator.
 *
 * Opening a case:
 *  - 30% chance → weapon
 *  - 70% chance → other equipment (helmet, chest, pants, boots, gloves)
 *
 * Rarity tiers:
 *  T1 Common (Grey)    62%
 *  T2 Uncommon (Green) 30%
 *  T3 Rare (Blue)      7.1%
 *  T4 Epic (Purple)    0.85%
 *  T5 Legendary (Yellow) 0.04%
 *  T6 Mythic (Red)     0.01%
 *
 * Loot Chance skill: base 5%, up to 70% at skill level 10.
 * Loot chance stacks per hit, can exceed 100% for multiple cases.
 */

export interface RarityTier {
  name: string
  color: string
  chance: number // percentage
  estimatedValue: number // user-set average market value
}

export const DEFAULT_RARITIES: RarityTier[] = [
  { name: "Common", color: "#9ca3af", chance: 62, estimatedValue: 0.5 },
  { name: "Uncommon", color: "#4ade80", chance: 30, estimatedValue: 2 },
  { name: "Rare", color: "#60a5fa", chance: 7.1, estimatedValue: 10 },
  { name: "Epic", color: "#c084fc", chance: 0.85, estimatedValue: 50 },
  { name: "Legendary", color: "#facc15", chance: 0.04, estimatedValue: 500 },
  { name: "Mythic", color: "#ef4444", chance: 0.01, estimatedValue: 5000 },
]

export interface CaseResult {
  expectedValue: number
  rarityBreakdown: { name: string; color: string; chance: number; ev: number }[]
  expectedCasesPerBattle: number
  evPerBattle: number
  profitPerCase: number // EV minus case market price
}

export function calculateCaseEV(
  rarities: RarityTier[],
  caseMarketPrice: number,
  lootChancePercent: number,
  hitsPerBattle: number,
): CaseResult {
  const breakdown = rarities.map((r) => ({
    name: r.name,
    color: r.color,
    chance: r.chance,
    ev: (r.chance / 100) * r.estimatedValue,
  }))

  const expectedValue = breakdown.reduce((sum, r) => sum + r.ev, 0)
  const lootPerHit = lootChancePercent / 100
  const expectedCasesPerBattle = lootPerHit * hitsPerBattle
  const evPerBattle = expectedCasesPerBattle * expectedValue

  return {
    expectedValue,
    rarityBreakdown: breakdown,
    expectedCasesPerBattle,
    evPerBattle,
    profitPerCase: expectedValue - caseMarketPrice,
  }
}

export const LOOT_CHANCE_BY_LEVEL = [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70]
