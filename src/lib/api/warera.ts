export const API_BASE = "https://api2.warera.io/trpc";

async function post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const token = localStorage.getItem("warera-api-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  if (token) {
    headers["X-API-KEY"] = token;
  }

  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json?.result?.data as T;
}

export interface RankingResult<T> {
  items: T[];
}

export interface CountryRanking {
  entityId: string;
  name: string;
  value: number;
}

export async function getCountryRanking(rankingType: string): Promise<CountryRanking[]> {
  const data = await post<RankingResult<CountryRanking>>("ranking.getRanking", { rankingType });
  return data.items;
}

export interface Region {
  _id: string;
  name: string;
  countryId: string;
  defenseBonus: number;
}

export async function getAllRegions(): Promise<Record<string, Region>> {
  const data = await post<Record<string, Region>>("region.getRegionsObject", {});
  // Convert object of `{ id: { name: "", country: "", ... } }` to `Region`
  const map: Record<string, Region> = {};
  for (const key in data) {
    const raw: any = data[key];
    map[key] = {
      _id: raw._id,
      name: raw.name,
      countryId: raw.country,
      defenseBonus: raw.defenseBonus || 0,
    };
  }
  return map;
}

export interface Country {
  _id: string;
  name: string;
  code: string;
  currency: string;
  flag: string;
}

let countriesData: Record<string, Country> | null = null;
export async function getAllCountries(): Promise<Record<string, Country>> {
  if (countriesData) return countriesData;
  const data = await post<Country[]>("country.getAllCountries", {});
  const map: Record<string, Country> = {};
  for (const c of data) {
    if (c._id) map[c._id] = c;
  }
  countriesData = map;
  return map;
}

export async function getBunkerLevel(regionId: string): Promise<number> {
  try {
    const data = await post<{ level: number }>("upgrade.getUpgradeByTypeAndEntity", {
      upgradeType: "bunker",
      regionId,
    });
    return data?.level || 0;
  } catch (err) {
    console.warn(`Could not get bunker level for region ${regionId}, assuming 0:`, err);
    return 0;
  }
}

export interface Battle {
  _id: string;
  attackerCountryId: string;
  defenderCountryId: string;
  regionId: string;
  isActive: boolean;
  startTime: string;
  attackerPoints: number;
  defenderPoints: number;
}

export async function getActiveBattles(): Promise<Battle[]> {
  const data = await post<{ items: any[] }>("battle.getBattles", {
    isActive: true,
    limit: 100,
  });
  if (!data?.items) return [];
  return data.items.map((b: any) => ({
    _id: b._id,
    attackerCountryId: b.attacker?.country?._id || b.attacker?.country,
    defenderCountryId: b.defender?.country?._id || b.defender?.country,
    regionId: b.defender?.region?._id || b.defender?.region || b.region?._id || b.region,
    isActive: b.isActive,
    startTime: b.createdAt,
    attackerPoints: b.attacker?.points || 0,
    defenderPoints: b.defender?.points || 0,
  }));
}

export async function getLiveBattleData(battleId: string): Promise<any> {
  return post<any>("battle.getLiveBattleData", { battleId });
}

export async function getLastHits(roundId: string): Promise<any> {
  const data = await post<any>("round.getLastHits", { roundId });
  return data;
}

export async function getBattleRanking(battleId: string, side: "attacker" | "defender"): Promise<any[]> {
  const data = await post<any>("battleRanking.getRanking", {
    battleId,
    dataType: "damage",
    type: "user",
    side
  });
  return data.rankings || data.items || [];
}

export interface Transaction {
  price: number;
  quantity: number;
  createdAt: string;
}

export async function getTransactions(itemCode: string, limit: number = 50): Promise<Transaction[]> {
  const data = await post<{ items: Transaction[] }>("transaction.getPaginatedTransactions", {
    itemCode,
    transactionType: ["itemMarket", "trading"],
    limit
  });
  return data.items;
}

export interface Event {
  type: string;
  createdAt: string;
  data: any;
}

export async function getEvents(): Promise<Event[]> {
  const data = await post<{ items: Event[] }>("event.getEventsPaginated", {
    eventTypes: ["warDeclared", "battleOpened", "battleEnded", "peace_agreement", "allianceFormed", "allianceBroken"],
    limit: 50
  });
  return data.items;
}

export async function getItemPrices(): Promise<Record<string, number>> {
  return post<Record<string, number>>("itemTrading.getPrices", {});
}

export async function getTopOrders(itemCode: string): Promise<any> {
  return post<any>("tradingOrder.getTopOrders", { itemCode, limit: 10 });
}
