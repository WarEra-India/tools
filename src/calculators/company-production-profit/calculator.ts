export interface GameData {
  prices: Record<string, number>;
  rawPP: Record<string, number>;
  recipes: Record<string, { pp: number; inputs: Record<string, number> }>;
}

export interface ProfitRow {
  item: string;
  type: "Raw" | "Processed";
  sell: number;
  cost: number;
  profit: number;
  pp: number;
  profitPP: number;
  inputs?: Record<string, number>;
}

export function calculate(data: GameData): ProfitRow[] {
  const rows: ProfitRow[] = [];

  // RAW MATERIALS
  for (const r in data.rawPP) {
    const price = data.prices[r] ?? 0;
    const pp = data.rawPP[r];

    rows.push({
      item: r,
      type: "Raw",
      sell: price,
      cost: 0,
      profit: price,
      pp: pp,
      profitPP: price / pp,
    });
  }

  // PROCESSED ITEMS
  for (const item in data.recipes) {
    const recipe = data.recipes[item];
    let rawCost = 0;
    let totalPP = recipe.pp;

    for (const input in recipe.inputs) {
      const qty = recipe.inputs[input];
      rawCost += qty * (data.prices[input] ?? 0);
      totalPP += qty * data.rawPP[input];
    }

    const sell = data.prices[item] ?? 0;
    const profit = sell - rawCost;

    rows.push({
      item: item,
      type: "Processed",
      sell: sell,
      cost: rawCost,
      profit: profit,
      pp: totalPP,
      profitPP: profit / totalPP,
      inputs: recipe.inputs,
    });
  }

  rows.sort((a, b) => b.profitPP - a.profitPP);

  return rows;
}
