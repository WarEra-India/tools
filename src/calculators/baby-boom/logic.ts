import { type Country } from "@/lib/api/warera";
import { getUserProfilesBatch } from "@/lib/wareraApi";

export const GAME_API = "https://api2.warera.io/trpc";

export const COUNTRY_COLORS = [...new Set(
  ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6b7280", "#d4d4d8", "#a855f7", "#f43f5e", "#2563eb", "#0891b2", "#84cc16", "#f97316", "#eab308", "#db2777", "#1e40af", "#16a34a", "#c084fc", "#fbbf24", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6b7280", "#d4d4d8", "#a855f7", "#f43f5e", "#2563eb", "#0891b2", "#84cc16", "#f97316", "#eab308", "#db2777", "#1e40af", "#16a34a", "#c084fc", "#fbbf24"]
)];

export interface RawUser {
  _id: string;
  createdAt: string;
}

export interface EnrichedUser {
  _id: string;
  createdAt: string;
  level: number;
  isActive: boolean;
}

export type CountryResults = Record<string, EnrichedUser[]>;

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function timeRangeCutoff(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function fetchUsersForCountry(countryId: string, timeRangeDays: number): Promise<RawUser[]> {
  const cutoff = timeRangeCutoff(timeRangeDays);
  const allItems: RawUser[] = [];
  let cursor: string | undefined;

  while (true) {
    const body: Record<string, unknown> = { countryId, limit: 100 };
    if (cursor) body.cursor = cursor;

    const res = await fetch(`${GAME_API}/user.getUsersByCountry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "*/*" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    const data = json?.result?.data;
    const items: RawUser[] = data?.items || [];

    let hitCutoff = false;
    for (const item of items) {
      if (new Date(item.createdAt) >= cutoff) {
        allItems.push(item);
      } else {
        hitCutoff = true;
        break;
      }
    }

    if (hitCutoff || !data?.nextCursor) break;
    cursor = data.nextCursor;
  }

  return allItems;
}

export async function fetchAndEnrichCountry(countryId: string, timeRangeDays: number): Promise<EnrichedUser[]> {
  const rawUsers = await fetchUsersForCountry(countryId, timeRangeDays);
  if (rawUsers.length === 0) return [];

  const profiles = await getUserProfilesBatch(rawUsers.map(u => u._id));
  const profileMap = new Map(profiles.map(p => [p._id, p]));

  const enriched: EnrichedUser[] = [];
  for (const raw of rawUsers) {
    const profile = profileMap.get(raw._id);
    if (!profile) continue;
    enriched.push({
      _id: raw._id,
      createdAt: raw.createdAt,
      level: profile.leveling.level,
      isActive: (profile as any).isActive === true,
    });
  }
  return enriched;
}

export function applyDisplayFilters(
  allResults: CountryResults,
  minLevel: number,
  activeOnly: boolean,
): CountryResults {
  const out: CountryResults = {};
  for (const [id, users] of Object.entries(allResults)) {
    out[id] = users.filter(u => u.level >= minLevel && (!activeOnly || u.isActive));
  }
  return out;
}

export function buildChartData(
  filteredResults: CountryResults,
  selectedCountries: Country[],
  timeRange: number,
): Array<Record<string, string | number>> {
  const dates: Record<string, Record<string, number>> = {};
  const now = new Date();

  for (let i = 0; i < timeRange; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = localDateKey(d);
    dates[key] = {};
    selectedCountries.forEach(c => { dates[key][c.name] = 0; });
  }

  selectedCountries.forEach(c => {
    (filteredResults[c._id] || []).forEach(u => {
      const key = localDateKey(new Date(u.createdAt));
      if (dates[key]) dates[key][c.name] = (dates[key][c.name] || 0) + 1;
    });
  });

  return Object.entries(dates)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => (a.date as string).localeCompare(b.date as string));
}

export function countInRange(users: EnrichedUser[], timeRange: number): number {
  const cutoff = timeRangeCutoff(timeRange);
  return users.filter(u => new Date(u.createdAt) >= cutoff).length;
}
