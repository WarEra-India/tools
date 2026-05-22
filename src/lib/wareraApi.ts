export const API_BASE = "https://api2.warera.io/trpc";

async function post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const token = localStorage.getItem("warera-api-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "*/*",
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

/* ---------- search ---------- */

interface SearchResult {
  userIds: string[];
  hasData: boolean;
}

export async function searchUser(username: string): Promise<string | null> {
  const data = await post<SearchResult>("search.searchAnything", {
    searchText: username,
  });
  return data.userIds[0] ?? null;
}

/** Return up to `limit` user IDs matching the search text. */
export async function searchUsers(
  text: string,
  limit = 5,
): Promise<string[]> {
  const data = await post<SearchResult>("search.searchAnything", {
    searchText: text,
  });
  return data.userIds.slice(0, limit);
}

export interface UserLiteSuggestion {
  _id: string;
  username: string;
  avatarUrl: string;
  level: number;
}

/** Fetch minimal info for a user (for search suggestions). */
export async function getUserByIdSuggestion(
  userId: string,
): Promise<UserLiteSuggestion> {
  const data = await post<UserProfile>("user.getUserById", { userId });
  return {
    _id: data._id,
    username: data.username,
    avatarUrl: data.avatarUrl,
    level: data.leveling.level,
  };
}

/* ---------- user profile ---------- */

export interface UserSkill {
  level: number;
  value: number;
  total: number;
  currentBarValue?: number;
  hourlyBarRegen?: number;
  weapon: number | null;
  equipment: number | null;
  limited: number | null;
  totalAfterSoftCap: number | null;
  ammoPercent?: number;
  buffsPercent?: number;
  debuffsPercent?: number;
  militaryRankPercent?: number;
}

export interface UserProfile {
  _id: string;
  username: string;
  country: string;
  avatarUrl: string;
  militaryRank: number;
  leveling: {
    level: number;
    totalXp: number;
    availableSkillPoints: number;
    spentSkillPoints: number;
    totalSkillPoints: number;
  };
  skills: Record<string, UserSkill>;
  buffs?: {
    buffCodes?: string[];
    buffEndAt?: string;
    debuffCodes?: string[];
    debuffEndAt?: string;
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  return post<UserProfile>("user.getUserById", { userId });
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function getUserProfilesBatch(userIds: string[]): Promise<UserProfile[]> {
  if (userIds.length === 0) return [];
  
  const chunks = chunkArray(userIds, 50);
  const allProfiles: UserProfile[] = [];

  for (const chunk of chunks) {
    const url =
      API_BASE + "/" + chunk.map(() => "user.getUserById").join(",") + "?batch=1";
    const body: Record<string, { userId: string }> = {};
    chunk.forEach((id, i) => { body[i] = { userId: id }; });
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "*/*" },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    const batchData = (json as { result: { data: UserProfile } }[]).map((r) => r.result.data);
    allProfiles.push(...batchData);
  }

  return allProfiles;
}

/* ---------- companies ---------- */

interface CompaniesResult {
  items: string[];
}

export async function getCompanyIds(userId: string): Promise<string[]> {
  const data = await post<CompaniesResult>("company.getCompanies", {
    userId,
    perPage: 100,
  });
  return data.items;
}

export interface UserWorkers {
  _id: string,
  user: string,
  company: string,
  employer: string,
  wage: number,
  joinedAt: string,
  lockedUntil: string,
  fidelity: number,
  createdAt: string,
  updatedAt: string,
  __v: number,
  lastFidelityIncreaseAt: string,
  lastWageReductionAt: string,
  previousWage: number,
  lastWageReductionAcceptationAt: string
}

export async function getUserWorkers(userId: string): Promise<UserWorkers[]> {
  const data = await post<Record<string, any>>("worker.getWorkers", { userId }).catch((e) => {
    console.error("Failed to fetch workers:", e);
    return { workersPerCompany: [] };
  });
  const workers: UserWorkers[] = [];
  data.workersPerCompany.forEach((company: any) => {
    workers.push(...company.workers);
  });
  return workers;
}

export interface CompanyInfo {
  _id: string;
  user: string;
  region: string;
  itemCode: string;
  name: string;
  workerCount: number;
  production: number;
  estimatedValue: number;
  activeUpgradeLevels: Record<string, number>;
}

export async function getCompanyById(companyId: string): Promise<CompanyInfo> {
  return post<CompanyInfo>("company.getById", { companyId });
}

async function getCompaniesBatch(companyIds: string[]): Promise<CompanyInfo[]> {
  if (companyIds.length === 0) return [];

  const chunks = chunkArray(companyIds, 50);
  const allCompanies: CompanyInfo[] = [];

  for (const chunk of chunks) {
    const url =
      API_BASE + "/" + chunk.map(() => "company.getById").join(",") + "?batch=1";
    const body: Record<string, { companyId: string }> = {};
    chunk.forEach((id, i) => { body[i] = { companyId: id }; });
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "*/*" },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    const batchData = (json as { result: { data: CompanyInfo } }[]).map((r) => r.result.data);
    allCompanies.push(...batchData);
  }

  return allCompanies;
}

/* ---------- aggregated fetch ---------- */

export interface FullProfile {
  user: UserProfile;
  companies: CompanyInfo[];
  workers: UserWorkers[];
  equipment?: CurrentEquipment;
}

export async function fetchFullProfileById(userId: string): Promise<FullProfile> {
  const [user, companyIds, workers, equipment] = await Promise.all([
    getUserProfile(userId),
    getCompanyIds(userId),
    getUserWorkers(userId),
    fetchCurrentEquipment(userId),
  ]);

  const companies = await getCompaniesBatch(companyIds);

  return { user, companies, workers, equipment };
}

/* ---------- equipment ---------- */

export interface EquippedItem {
  _id: string;
  code: string;
  type?: "equipment" | "weapon";
  skills: Record<string, number>;
  state: number;
  maxState: number;
  quantity: number;
  lastAcquisitionAt: string;
}

export interface CurrentEquipment {
  weapon?: EquippedItem;
  ammo?: string;
  helmet?: EquippedItem;
  chest?: EquippedItem;
  boots?: EquippedItem;
  gloves?: EquippedItem;
  pants?: EquippedItem;
}

export async function fetchCurrentEquipment(userId: string): Promise<CurrentEquipment> {
  return post<CurrentEquipment>("inventory.fetchCurrentEquipment", { userId });
}
