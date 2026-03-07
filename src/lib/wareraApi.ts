const API_BASE = "https://api5.warera.io/trpc";

async function post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "*/*" },
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
export async function getUserLiteSuggestion(
  userId: string,
): Promise<UserLiteSuggestion> {
  const data = await post<UserProfile>("user.getUserLite", { userId });
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
}

export interface UserProfile {
  _id: string;
  username: string;
  country: string;
  avatarUrl: string;
  leveling: {
    level: number;
    totalXp: number;
    availableSkillPoints: number;
    spentSkillPoints: number;
    totalSkillPoints: number;
  };
  skills: Record<string, UserSkill>;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  return post<UserProfile>("user.getUserLite", { userId });
}

/* ---------- companies ---------- */

interface CompaniesResult {
  items: string[];
}

export async function getCompanyIds(userId: string): Promise<string[]> {
  const data = await post<CompaniesResult>("company.getCompanies", {
    userId,
    perPage: 50,
  });
  return data.items;
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

/* ---------- aggregated fetch ---------- */

export interface FullProfile {
  user: UserProfile;
  companies: CompanyInfo[];
}

export async function fetchFullProfile(username: string): Promise<FullProfile> {
  const userId = await searchUser(username);
  if (!userId) throw new Error("User not found");

  const [user, companyIds] = await Promise.all([
    getUserProfile(userId),
    getCompanyIds(userId),
  ]);

  const companies = await Promise.all(companyIds.map(getCompanyById));

  return { user, companies };
}
