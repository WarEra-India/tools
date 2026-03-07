export interface FoodItem {
  code: string
  name: string
  healthRestored: number
  type: "food" | "pill"
  damageBuffPercent?: number
}

export const FOOD_ITEMS: FoodItem[] = [
  { code: "bread", name: "Bread", healthRestored: 10, type: "food" },
  { code: "steak", name: "Steak", healthRestored: 20, type: "food" },
  { code: "cookedFish", name: "Cooked Fish", healthRestored: 30, type: "food" },
  { code: "cocain", name: "Pill", healthRestored: 0, type: "pill", damageBuffPercent: 80 },
]

export interface FoodEfficiencyRow {
  code: string
  name: string
  type: "food" | "pill"
  healthRestored: number
  price: number
  healthPerCoin: number
  hitsPerUnit: number
  damagePerUnit: number
  damagePerCoin: number
}

export function calculateFoodEfficiency(
  prices: Record<string, number>,
  attack: number,
  healthLossPerHit: number,
): FoodEfficiencyRow[] {
  return FOOD_ITEMS.filter((f) => f.type === "food").map((food) => {
    const price = prices[food.code] ?? 0
    const hitsPerUnit = healthLossPerHit > 0 ? food.healthRestored / healthLossPerHit : 0
    const damagePerUnit = hitsPerUnit * attack
    const healthPerCoin = price > 0 ? food.healthRestored / price : 0
    const damagePerCoin = price > 0 ? damagePerUnit / price : 0

    return {
      code: food.code,
      name: food.name,
      type: food.type,
      healthRestored: food.healthRestored,
      price,
      healthPerCoin,
      hitsPerUnit,
      damagePerUnit,
      damagePerCoin,
    }
  })
}
