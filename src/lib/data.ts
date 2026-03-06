import type { GameData } from "./calculator";
import companyProfits from "../data/company-profits.json";

export function getDefaultData(): GameData {
  return JSON.parse(JSON.stringify(companyProfits)) as GameData;
}
