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

export interface BattleSide {
  region?: string;
  country?: string;
  wonRoundsCount?: number;
  damages?: number;
  hitCount?: number;
  points?: number;
}

export interface BattleListItem {
  _id: string;
  war?: string;
  type?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  roundsToWin?: number;
  attacker: BattleSide;
  defender: BattleSide;
  stats?: { hitCount?: number };
}

export interface BattlesPage {
  items: BattleListItem[];
  nextCursor: string | null;
}

const battlesCache = new Map<string, BattlesPage>();

function battlesCacheKey(opts?: {
  cursor?: string | null;
  limit?: number;
  isActive?: boolean;
}): string {
  return JSON.stringify({
    cursor: opts?.cursor ?? null,
    limit: opts?.limit ?? null,
    isActive: opts?.isActive ?? null,
  });
}

export async function getBattles(opts?: {
  cursor?: string | null;
  limit?: number;
  isActive?: boolean;
}): Promise<BattlesPage> {
  const key = battlesCacheKey(opts);
  const cached = battlesCache.get(key);
  if (cached) return cached;

  const body: Record<string, unknown> = {};
  if (opts?.cursor != null) body.cursor = opts.cursor;
  if (opts?.limit != null) body.limit = opts.limit;
  if (opts?.isActive != null) body.isActive = opts.isActive;

  const data = await post<{ items?: BattleListItem[]; nextCursor?: string | null }>(
    "battle.getBattles",
    body,
  );
  const page: BattlesPage = {
    items: data?.items ?? [],
    nextCursor: data?.nextCursor ?? null,
  };
  battlesCache.set(key, page);
  return page;
}

export interface BattlePoolLootItem {
  item: {
    _id: string;
    type?: string;
    code: string;
    skills?: Record<string, number>;
    state?: number;
    maxState?: number;
    quantity?: number;
  };
  rank?: number;
  round?: string | null;
  pool?: string;
}

export interface BattleLootSummary {
  _id: string;
  user: string;
  battle: string;
  hits: number;
  totalDmg: number;
  case1Count: number;
  case2Count: number;
  poolLoot: BattlePoolLootItem[];
  totalMoneyFromBounty: number;
  totalMoneyFromContract: number;
  createdAt?: string;
  updatedAt?: string;
}

const lootSummaryCache = new Map<string, BattleLootSummary | null>();

export async function getBattleLootSummary(
  battleId: string,
  userId: string,
): Promise<BattleLootSummary | null> {
  const key = `${battleId}|${userId}`;
  if (lootSummaryCache.has(key)) return lootSummaryCache.get(key) ?? null;

  try {
    const data = await post<BattleLootSummary | null>(
      "battleLootSummary.getByBattleAndUser",
      { battleId, userId },
    );
    if (!data || typeof data !== "object") {
      lootSummaryCache.set(key, null);
      return null;
    }
    const summary: BattleLootSummary = {
      ...data,
      hits: data.hits ?? 0,
      totalDmg: data.totalDmg ?? 0,
      case1Count: data.case1Count ?? 0,
      case2Count: data.case2Count ?? 0,
      poolLoot: data.poolLoot ?? [],
      totalMoneyFromBounty: data.totalMoneyFromBounty ?? 0,
      totalMoneyFromContract: data.totalMoneyFromContract ?? 0,
    };
    lootSummaryCache.set(key, summary);
    return summary;
  } catch {
    lootSummaryCache.set(key, null);
    return null;
  }
}

export async function getActiveBattles(): Promise<Battle[]> {
  const data = await getBattles({ isActive: true, limit: 100 });
  return data.items.map((b) => ({
    _id: b._id,
    attackerCountryId: b.attacker?.country ?? "",
    defenderCountryId: b.defender?.country ?? "",
    regionId: b.defender?.region ?? "",
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

export interface BattleRankingLootItem {
  _id: string;
  type?: string;
  code: string;
  skills?: Record<string, number>;
  state?: number;
  maxState?: number;
  quantity?: number;
}

export interface BattleRankingEntry {
  _id: string;
  user: string;
  value: number;
  rank: number;
  badge?: string;
  lootItem?: BattleRankingLootItem | null;
}

export type BattleRankingSide = "attacker" | "defender" | "merged";

export interface BattleRankingPage {
  items: BattleRankingEntry[];
  nextCursor: string | null;
}

const battleRankingPageCache = new Map<string, BattleRankingPage>();

export async function getBattleRanking(
  battleId: string,
  side: BattleRankingSide = "merged",
  limit = 100,
  cursor?: string | null,
): Promise<BattleRankingPage> {
  const key = `${battleId}|${side}|${limit}|${cursor ?? ""}`;
  const cached = battleRankingPageCache.get(key);
  if (cached) return cached;

  const body: Record<string, unknown> = {
    battleId,
    dataType: "damage",
    type: "user",
    side,
    limit,
  };
  if (cursor != null) body.cursor = cursor;

  const data = await post<{
    items?: BattleRankingEntry[];
    rankings?: BattleRankingEntry[];
    nextCursor?: string | null;
  }>("battleRanking.getRanking", body);

  const page: BattleRankingPage = {
    items: data.rankings || data.items || [],
    nextCursor: data.nextCursor ?? null,
  };
  battleRankingPageCache.set(key, page);
  return page;
}

const userBattleRankingCache = new Map<string, BattleRankingEntry | null>();

/**
 * Walk merged battle rankings page-by-page until the user is found (or ranking ends).
 */
export async function getUserBattleRanking(
  battleId: string,
  userId: string,
  pageSize = 100,
): Promise<BattleRankingEntry | null> {
  const cacheKey = `${battleId}|${userId}|merged`;
  if (userBattleRankingCache.has(cacheKey)) {
    return userBattleRankingCache.get(cacheKey) ?? null;
  }

  let cursor: string | null = null;
  // Safety: avoid unbounded loops on huge rankings
  const maxPages = 200;

  for (let pageNum = 0; pageNum < maxPages; pageNum++) {
    const page = await getBattleRanking(battleId, "merged", pageSize, cursor);
    const found = page.items.find((e) => e.user === userId);
    if (found) {
      userBattleRankingCache.set(cacheKey, found);
      return found;
    }
    if (!page.nextCursor || page.items.length === 0) break;
    cursor = page.nextCursor;
  }

  userBattleRankingCache.set(cacheKey, null);
  return null;
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
