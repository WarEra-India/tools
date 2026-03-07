/**
 * Military Unit Cost/Benefit Calculator
 *
 * HQ upgrades: 4 levels, give damage bonus to MU members, cost steel, oil/h maintenance.
 * Dormitory upgrades: 5 levels, allow more members, cost steel.
 * Battle Orders: cost depends on member count and priority.
 */

export interface HQLevel {
  level: number
  steelCost: number
  cumulativeCost: number
  damageBonus: number // percentage
  oilPerHour: number
}

export const HQ_LEVELS: HQLevel[] = [
  { level: 1, steelCost: 100, cumulativeCost: 100, damageBonus: 5, oilPerHour: 1 },
  { level: 2, steelCost: 200, cumulativeCost: 300, damageBonus: 10, oilPerHour: 2 },
  { level: 3, steelCost: 300, cumulativeCost: 600, damageBonus: 15, oilPerHour: 5 },
  { level: 4, steelCost: 600, cumulativeCost: 1200, damageBonus: 20, oilPerHour: 10 },
]

export interface DormLevel {
  level: number
  steelCost: number
  cumulativeCost: number
  maxMembers: number
}

export const DORM_LEVELS: DormLevel[] = [
  { level: 0, steelCost: 0, cumulativeCost: 0, maxMembers: 5 },
  { level: 1, steelCost: 200, cumulativeCost: 200, maxMembers: 10 },
  { level: 2, steelCost: 300, cumulativeCost: 500, maxMembers: 15 },
  { level: 3, steelCost: 400, cumulativeCost: 900, maxMembers: 20 },
  { level: 4, steelCost: 500, cumulativeCost: 1400, maxMembers: 25 },
]

export interface OrderPriority {
  name: string
  multiplier: number
}

export const ORDER_PRIORITIES: OrderPriority[] = [
  { name: "Low", multiplier: 1 },
  { name: "Medium", multiplier: 2 },
  { name: "High", multiplier: 3 },
]

/** Base order cost per member per priority */
export const ORDER_COST_PER_MEMBER = 0.5 // gold/member for low priority

export function calculateOrderCost(members: number, priority: OrderPriority): number {
  return members * ORDER_COST_PER_MEMBER * priority.multiplier
}

export interface HQAnalysis {
  level: number
  steelCost: number
  cumulativeCost: number
  upgradeCostCoins: number
  cumulativeCostCoins: number
  damageBonus: number
  oilPerHour: number
  oilCostPerDay: number
  marginalDamagePercent: number
  /** Extra damage value per day = memberCount * avgDmg * marginalBonusDelta */
  extraDamageValuePerDay: number
  /** Days until the upgrade pays for itself through extra damage */
  paybackDays: number
}

export function calculateHQAnalysis(
  steelPrice: number,
  oilPrice: number,
  memberCount: number,
  avgDmgPerMember: number,
  profitPerDmg: number,
): HQAnalysis[] {
  let prevBonus = 0
  return HQ_LEVELS.map((hq) => {
    const upgradeCostCoins = hq.steelCost * steelPrice
    const cumulativeCostCoins = hq.cumulativeCost * steelPrice
    const oilCostPerDay = hq.oilPerHour * 24 * oilPrice
    const marginalDamagePercent = hq.damageBonus - prevBonus
    const extraDmgPerDay =
      memberCount * avgDmgPerMember * (marginalDamagePercent / 100)
    const extraDamageValuePerDay = extraDmgPerDay * profitPerDmg - oilCostPerDay
    const paybackDays = extraDamageValuePerDay > 0 ? upgradeCostCoins / extraDamageValuePerDay : Infinity
    prevBonus = hq.damageBonus
    return {
      level: hq.level,
      steelCost: hq.steelCost,
      cumulativeCost: hq.cumulativeCost,
      upgradeCostCoins,
      cumulativeCostCoins,
      damageBonus: hq.damageBonus,
      oilPerHour: hq.oilPerHour,
      oilCostPerDay,
      marginalDamagePercent,
      extraDamageValuePerDay,
      paybackDays,
    }
  })
}

export interface DormAnalysis {
  level: number
  steelCost: number
  cumulativeCost: number
  upgradeCostCoins: number
  cumulativeCostCoins: number
  maxMembers: number
  extraSlots: number
  costPerSlot: number
}

export function calculateDormAnalysis(steelPrice: number): DormAnalysis[] {
  let prevMembers = 5
  return DORM_LEVELS.map((d) => {
    const upgradeCostCoins = d.steelCost * steelPrice
    const cumulativeCostCoins = d.cumulativeCost * steelPrice
    const extraSlots = d.maxMembers - prevMembers
    const costPerSlot = extraSlots > 0 ? upgradeCostCoins / extraSlots : 0
    if (d.level > 0) prevMembers = d.maxMembers
    return {
      level: d.level,
      steelCost: d.steelCost,
      cumulativeCost: d.cumulativeCost,
      upgradeCostCoins,
      cumulativeCostCoins,
      maxMembers: d.maxMembers,
      extraSlots: d.level === 0 ? 5 : extraSlots,
      costPerSlot: d.level === 0 ? 0 : costPerSlot,
    }
  })
}

export interface TotalMUCost {
  hqLevel: number
  dormLevel: number
  totalSteelCost: number
  totalCoinCost: number
  maxMembers: number
  damageBonus: number
  dailyOilCost: number
}

export function calculateTotalCost(
  hqLevel: number,
  dormLevel: number,
  steelPrice: number,
  oilPrice: number,
): TotalMUCost {
  const hq = HQ_LEVELS[hqLevel - 1]
  const dorm = DORM_LEVELS[dormLevel]
  const totalSteel = hq.cumulativeCost + dorm.cumulativeCost
  return {
    hqLevel,
    dormLevel,
    totalSteelCost: totalSteel,
    totalCoinCost: totalSteel * steelPrice,
    maxMembers: dorm.maxMembers,
    damageBonus: hq.damageBonus,
    dailyOilCost: hq.oilPerHour * 24 * oilPrice,
  }
}
