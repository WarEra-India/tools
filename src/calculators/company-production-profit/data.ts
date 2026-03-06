import type { GameData } from "./calculator";
import gameData from "./data.json";

export function getDefaultData(): GameData {
  return JSON.parse(JSON.stringify(gameData)) as GameData;
}
