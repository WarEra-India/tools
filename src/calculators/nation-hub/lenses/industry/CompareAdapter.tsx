import { useEffect, useMemo, useState } from "react";
import { Loader2, Factory, Users, Coins, TrendingUp } from "lucide-react";
import { CountryFlag } from "@/components/CountryFlag";
import type { CompareViewProps } from "../../registry";
import GlobalCompanyAnalyzer from "./index";

// Same aggregated endpoint the Atlas itself caches in IndexedDB. For compare
// mode we hit it directly (skip the cache) — it's a single fetch and we want
// fresh numbers next to the per-country tab.
const AGG_URL = "https://warvault.shadoooow.workers.dev/api/companies/aggregated";

interface AggregatedCountry {
  countryId: string;
  name: string;
  code: string;
  totalCompanies: number;
  activeCompanies: number;
  totalWorkers: number;
  totalValue: number;
  incomeTax: number;
  companyBreakdown: Record<string, number>;
}

function formatNumber(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
}

/**
 * Compare-mode view for Industry.
 *
 * Top: a strip of per-country aggregate cards (companies, workers, valuation,
 *      top sector) so users can scan key industrial stats side-by-side.
 * Below: the full Industrial Atlas map embedded — same global view, but the
 *        user has the selected countries' stats right above for context.
 */
export default function IndustryCompareAdapter({ countries }: CompareViewProps) {
  const [aggregated, setAggregated] = useState<Record<string, AggregatedCountry> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(AGG_URL)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const data = (json?.data ?? json) as Record<string, AggregatedCountry>;
        setAggregated(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load industry data");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (!aggregated) return [];
    // Match selected countries to aggregated keys by id, name, or code.
    // The aggregated map is keyed by countryId but we look up by _id from props.
    const byId: Record<string, AggregatedCountry> = {};
    const byCode: Record<string, AggregatedCountry> = {};
    for (const v of Object.values(aggregated)) {
      byId[v.countryId] = v;
      if (v.code) byCode[v.code.toLowerCase()] = v;
    }
    return countries.map((c) => ({
      country: c,
      agg: byId[c._id] ?? byCode[c.code.toLowerCase()] ?? null,
    }));
  }, [aggregated, countries]);

  return (
    <div className="space-y-6">
      {/* Per-country stats strip */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {!aggregated && !error ? (
        <div className="flex items-center justify-center h-32 rounded-xl border border-zinc-800 bg-zinc-950/40">
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.min(rows.length, 4)}, minmax(0, 1fr))` }}
        >
          {rows.map(({ country, agg }) => {
            // Pick top sector from companyBreakdown.
            const topSector = agg?.companyBreakdown
              ? Object.entries(agg.companyBreakdown).sort((a, b) => b[1] - a[1])[0]
              : null;
            return (
              <div
                key={country._id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <CountryFlag countryCode={country.code} className="w-5 h-3.5" />
                  <span className="text-xs font-black uppercase tracking-widest text-white truncate">
                    {country.name}
                  </span>
                </div>
                {agg ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Stat icon={<Factory className="w-3 h-3" />} label="Companies" value={`${agg.activeCompanies}/${agg.totalCompanies}`} />
                    <Stat icon={<Users className="w-3 h-3" />} label="Workers" value={formatNumber(agg.totalWorkers)} />
                    <Stat icon={<Coins className="w-3 h-3" />} label="Valuation" value={formatNumber(agg.totalValue)} />
                    <Stat icon={<TrendingUp className="w-3 h-3" />} label="Top sector" value={topSector?.[0] ?? "—"} />
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-600 italic">No industry data</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Map below — embedded global view for spatial context, with the
          selected countries' regions outlined in blue. */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Industrial map — selected outlined
        </p>
        <GlobalCompanyAnalyzer
          embedded
          highlightCountryIds={countries.map((c) => c._id)}
        />
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] text-zinc-500 uppercase font-bold flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="text-sm font-black text-white font-mono truncate">{value}</span>
    </div>
  );
}
