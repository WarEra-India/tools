/**
 * Worker wage profitability calculator.
 *
 * A worker spends 10 energy per session and produces PP based on their Production skill.
 * The owner pays wage (coins/PP). Income tax takes a cut.
 * We compare: owner profit, worker income, and self-work income.
 */

export interface WorkerCalcInput {
  productionSkillPP: number  // PP per work session (12 base, up to 36)
  wagePerPP: number          // coins/PP offered
  incomeTax: number          // percentage, e.g. 10 for 10%
  itemProfitPerPP: number    // owner's profit per PP produced (from production calc)
  selfWorkPP: number         // PP produced when self-working (uses entrepreneurship)
  productionBonus: number    // percentage bonus on PP
}

export interface WorkerCalcResult {
  ppPerSession: number
  effectivePPPerSession: number
  grossWage: number
  taxAmount: number
  netWage: number
  netWagePerEnergy: number
  ownerCostPerSession: number
  ownerRevenuePerSession: number
  ownerProfitPerSession: number
  maxProfitableWage: number
  selfWorkRevenuePerSession: number
}

export function calculateWorkerProfitability(input: WorkerCalcInput): WorkerCalcResult {
  const bonusMult = 1 + input.productionBonus / 100
  const effectivePP = input.productionSkillPP * bonusMult
  const grossWage = effectivePP * input.wagePerPP
  const taxAmount = grossWage * (input.incomeTax / 100)
  const netWage = grossWage - taxAmount

  const ownerRevenue = effectivePP * input.itemProfitPerPP
  const ownerProfit = ownerRevenue - grossWage

  // Max wage where owner breaks even
  const maxWage = input.itemProfitPerPP // since grossWage = PP * wage, and revenue = PP * profitPerPP

  const selfWorkEffectivePP = input.selfWorkPP * bonusMult
  const selfWorkRevenue = selfWorkEffectivePP * input.itemProfitPerPP

  return {
    ppPerSession: input.productionSkillPP,
    effectivePPPerSession: effectivePP,
    grossWage,
    taxAmount,
    netWage,
    netWagePerEnergy: netWage / 10,
    ownerCostPerSession: grossWage,
    ownerRevenuePerSession: ownerRevenue,
    ownerProfitPerSession: ownerProfit,
    maxProfitableWage: maxWage,
    selfWorkRevenuePerSession: selfWorkRevenue,
  }
}

/** Base PP per work session at each Production skill level */
export const PRODUCTION_SKILL_PP = [12, 13, 14, 16, 18, 20, 22, 25, 28, 32, 36]
