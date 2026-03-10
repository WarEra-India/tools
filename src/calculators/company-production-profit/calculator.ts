export interface GameData {
  prices: Record<string, number>;
  rawPP: Record<string, number>;
  recipes: Record<string, { pp: number; inputs: Record<string, number> }>;
  /** deposit type → best bonus percent (e.g. 35 means +35% PP) */
  locationBonus?: Record<string, number>;
}

export interface ProfitRow {
  item: string;
  type: "Raw" | "Processed";
  sell: number;
  cost: number;
  profit: number;
  bonusAmount: number;
  pp: number;
  basePP: number;
  bonusPct: number;
  profitPP: number;
  inputs?: Record<string, number>;
}

export function calculate(data: GameData): ProfitRow[] {
  const rows: ProfitRow[] = [];
  const bonus = data.locationBonus ?? {};

  // RAW MATERIALS
  for (const r in data.rawPP) {
    const price = data.prices[r] ?? 0;
    const basePP = data.rawPP[r];
    const bonusPct = bonus[r] ?? 0;
    const bonusAmount = price * bonusPct / 100;

    rows.push({
      item: r,
      type: "Raw",
      sell: price,
      cost: 0,
      profit: price,
      bonusAmount: bonusAmount,
      pp: basePP,
      basePP: basePP,
      bonusPct: bonusPct,
      profitPP: (price + bonusAmount) / basePP,
    });
  }

  // PROCESSED ITEMS
  for (const item in data.recipes) {
    const recipe = data.recipes[item];
    let rawCost = 0;

    // Determine the primary raw input to pick the location bonus
    const primaryInput = Object.keys(recipe.inputs)[0] ?? "";
    const bonusPct = bonus[primaryInput] ?? 0;

    let baseTotalPP = recipe.pp;

    for (const input in recipe.inputs) {
      const qty = recipe.inputs[input];
      rawCost += qty * (data.prices[input] ?? 0);
      baseTotalPP += qty * data.rawPP[input];
    }

    const sell = data.prices[item] ?? 0;
    const profit = sell - rawCost;
    const bonusAmount = profit * bonusPct / 100;

    rows.push({
      item: item,
      type: "Processed",
      sell: sell,
      cost: rawCost,
      profit: profit,
      bonusAmount: bonusAmount,
      pp: baseTotalPP,
      basePP: baseTotalPP,
      bonusPct: bonusPct,
      profitPP: (profit + bonusAmount) / baseTotalPP,
      inputs: recipe.inputs,
    });
  }

  rows.sort((a, b) => b.profitPP - a.profitPP);

  return rows;
}
