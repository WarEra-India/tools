import type { GameData } from "./calculator";

const gameData: GameData = {
  prices: {
    Grain: 0.08,
    Limestone: 0.08,
    Lead: 0.09,
    Petroleum: 0.08,
    "Mysterious Plant": 0.08,
    Iron: 0.08,
    Fish: 3.86,
    Livestock: 1.57,
    Bread: 1.76,
    Concrete: 1.6,
    Steel: 1.6,
    Oil: 0.17,
    "Light Ammo": 0.18,
    Ammo: 0.74,
    "Heavy Ammo": 2.62,
    "Cooked Fish": 7.78,
    Steak: 3.77,
    Pill: 36,
  },
  rawPP: {
    Grain: 1,
    Limestone: 1,
    Lead: 1,
    Petroleum: 1,
    "Mysterious Plant": 1,
    Iron: 1,
    Fish: 40,
    Livestock: 20,
  },
  recipes: {
    Bread: { pp: 10, inputs: { Grain: 10 } },
    Concrete: { pp: 10, inputs: { Limestone: 10 } },
    Steel: { pp: 10, inputs: { Iron: 10 } },
    Oil: { pp: 1, inputs: { Petroleum: 1 } },
    "Light Ammo": { pp: 1, inputs: { Lead: 1 } },
    Ammo: { pp: 4, inputs: { Lead: 4 } },
    "Heavy Ammo": { pp: 16, inputs: { Lead: 16 } },
    "Cooked Fish": { pp: 40, inputs: { Fish: 1 } },
    Steak: { pp: 20, inputs: { Livestock: 1 } },
    Pill: { pp: 200, inputs: { "Mysterious Plant": 200 } },
  },
};

export function getDefaultData(): GameData {
  return JSON.parse(JSON.stringify(gameData));
}
