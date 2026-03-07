import type { GameData } from "./calculator";
import gameData from "./data.json";

export type StaticGameData = {
  rawPP: Record<string, number>;
  recipes: Record<string, { pp: number; inputs: Record<string, number> }>;
};

export function getStaticData(): StaticGameData {
  return JSON.parse(JSON.stringify(gameData)) as StaticGameData;
}

/** Returns a full GameData object with all prices set to 0. */
export function getDefaultData(): GameData {
  const { rawPP, recipes } = getStaticData();
  const prices: Record<string, number> = {};
  for (const code of Object.keys(rawPP)) prices[code] = 0;
  for (const code of Object.keys(recipes)) prices[code] = 0;
  return { prices, rawPP, recipes };
}
