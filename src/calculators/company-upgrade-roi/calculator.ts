/**
 * Automated Engine upgrades: each level produces PP/h, costs steel to upgrade.
 * Storage upgrades: each level stores more PP, costs steel.
 * Both have 7 levels. We compute ROI for each upgrade level.
 */

export interface UpgradeLevel {
  level: number
  steelCost: number
  cumulativeSteelCost: number
  value: number // PP/h for engine, PP stored for storage
}

export const ENGINE_LEVELS: UpgradeLevel[] = [
  { level: 1, steelCost: 10, cumulativeSteelCost: 10, value: 1 },
  { level: 2, steelCost: 20, cumulativeSteelCost: 30, value: 2 },
  { level: 3, steelCost: 40, cumulativeSteelCost: 70, value: 3 },
  { level: 4, steelCost: 80, cumulativeSteelCost: 150, value: 4 },
  { level: 5, steelCost: 160, cumulativeSteelCost: 310, value: 5 },
  { level: 6, steelCost: 320, cumulativeSteelCost: 630, value: 6 },
  { level: 7, steelCost: 640, cumulativeSteelCost: 1270, value: 7 },
]

export const STORAGE_LEVELS: UpgradeLevel[] = [
  { level: 1, steelCost: 10, cumulativeSteelCost: 10, value: 200 },
  { level: 2, steelCost: 20, cumulativeSteelCost: 30, value: 400 },
  { level: 3, steelCost: 40, cumulativeSteelCost: 70, value: 600 },
  { level: 4, steelCost: 80, cumulativeSteelCost: 150, value: 800 },
  { level: 5, steelCost: 160, cumulativeSteelCost: 310, value: 1000 },
  { level: 6, steelCost: 320, cumulativeSteelCost: 630, value: 1200 },
  { level: 7, steelCost: 640, cumulativeSteelCost: 1270, value: 1400 },
]

export interface EngineROI {
  level: number
  steelCost: number
  cumulativeSteelCost: number
  ppPerHour: number
  upgradeCostCoins: number
  cumulativeCostCoins: number
  revenuePerHour: number
  marginalRevenuePerHour: number
  paybackHours: number
}

export function calculateEngineROI(
  steelPrice: number,
  profitPerPP: number,
  productionBonus: number, // percentage, e.g. 30 for 30%
): EngineROI[] {
  const bonusMult = 1 + productionBonus / 100
  let prevRevenue = 0

  return ENGINE_LEVELS.map((lvl) => {
    const effectivePPH = lvl.value * bonusMult
    const revenuePerHour = effectivePPH * profitPerPP
    const marginalRevenuePerHour = revenuePerHour - prevRevenue
    const upgradeCostCoins = lvl.steelCost * steelPrice
    const cumulativeCostCoins = lvl.cumulativeSteelCost * steelPrice
    const paybackHours = marginalRevenuePerHour > 0 ? upgradeCostCoins / marginalRevenuePerHour : Infinity

    prevRevenue = revenuePerHour

    return {
      level: lvl.level,
      steelCost: lvl.steelCost,
      cumulativeSteelCost: lvl.cumulativeSteelCost,
      ppPerHour: effectivePPH,
      upgradeCostCoins,
      cumulativeCostCoins,
      revenuePerHour,
      marginalRevenuePerHour,
      paybackHours,
    }
  })
}

export interface StorageROI {
  level: number
  steelCost: number
  cumulativeSteelCost: number
  maxPP: number
  upgradeCostCoins: number
  hoursToFill: number
}

export function calculateStorageROI(
  steelPrice: number,
  engineLevel: number,
  productionBonus: number,
): StorageROI[] {
  const bonusMult = 1 + productionBonus / 100
  const enginePPH = (ENGINE_LEVELS[engineLevel - 1]?.value ?? 0) * bonusMult

  return STORAGE_LEVELS.map((lvl) => {
    return {
      level: lvl.level,
      steelCost: lvl.steelCost,
      cumulativeSteelCost: lvl.cumulativeSteelCost,
      maxPP: lvl.value,
      upgradeCostCoins: lvl.steelCost * steelPrice,
      hoursToFill: enginePPH > 0 ? lvl.value / enginePPH : Infinity,
    }
  })
}

/** Cost to create a new company: 100 concrete */
export const NEW_COMPANY_COST_CONCRETE = 100
