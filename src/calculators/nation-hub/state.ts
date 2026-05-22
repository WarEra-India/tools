import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAllCountries, type Country } from "@/lib/api/warera";

export type LensId = "power" | "births" | "land" | "records" | "archetype" | "industry";

export const ALL_LENS_IDS: LensId[] = ["power", "births", "land", "records", "archetype", "industry"];

/**
 * Lenses that work in compare mode (2+ countries).
 * Per the design: only Births, Land, and Industry compare meaningfully.
 */
export const COMPARE_LENS_IDS: LensId[] = ["births", "land", "industry"];

const COUNTRIES_PARAM = "c";
const TAB_PARAM = "tab";

/**
 * Reads selected country codes from the URL (?c=us,in,de).
 * Returns codes lowercased and de-duplicated.
 */
export function parseCountryCodes(searchParams: URLSearchParams): string[] {
  const raw = searchParams.get(COUNTRIES_PARAM);
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of raw.split(",")) {
    const trimmed = code.trim().toLowerCase();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out;
}

/**
 * True if URL has at least one country code — results screen should render.
 */
export function isResultsRoute(searchParams: URLSearchParams): boolean {
  return parseCountryCodes(searchParams).length > 0;
}

/**
 * Build the results URL for a given set of countries (codes or full objects).
 */
export function buildResultsSearch(
  countries: Array<Country | string>,
  tab?: LensId,
): string {
  const codes = countries.map((c) => (typeof c === "string" ? c : c.code).toLowerCase());
  const params = new URLSearchParams();
  params.set(COUNTRIES_PARAM, codes.join(","));
  if (tab) params.set(TAB_PARAM, tab);
  return `?${params.toString()}`;
}

/**
 * Hook: loads the country directory once and resolves the URL ?c=... codes
 * into full Country objects in the same order. Unknown codes are dropped.
 *
 * Returns { countries, loading, error } where `countries` is empty while loading.
 */
export function useSelectedCountries(): {
  countries: Country[];
  loading: boolean;
  error: string | null;
} {
  const [searchParams] = useSearchParams();
  const [directory, setDirectory] = useState<Record<string, Country> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllCountries()
      .then((map) => {
        if (!cancelled) setDirectory(map);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load countries");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const codes = useMemo(() => parseCountryCodes(searchParams), [searchParams]);

  const countries = useMemo(() => {
    if (!directory) return [];
    // Build a code → Country lookup once.
    const byCode: Record<string, Country> = {};
    for (const c of Object.values(directory)) {
      byCode[c.code.toLowerCase()] = c;
    }
    const out: Country[] = [];
    for (const code of codes) {
      const c = byCode[code];
      if (c) out.push(c);
    }
    return out;
  }, [directory, codes]);

  return { countries, loading, error };
}

/**
 * Hook: reads the active tab from URL ?tab=power, with fallback + writer.
 * Tab is only meaningful in detail mode (1 country selected).
 */
export function useActiveTab(defaultTab: LensId = "power"): [LensId, (next: LensId) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(TAB_PARAM) as LensId | null;
  const active: LensId = raw && ALL_LENS_IDS.includes(raw) ? raw : defaultTab;

  const setTab = (next: LensId) => {
    const params = new URLSearchParams(searchParams);
    params.set(TAB_PARAM, next);
    setSearchParams(params, { replace: true });
  };

  return [active, setTab];
}
