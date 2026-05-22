import { Suspense } from "react";
import * as Icons from "lucide-react";
import type { Country } from "@/lib/api/warera";
import { LENS_REGISTRY } from "../registry";

interface Props {
  countries: Country[];
}

// Per-lens accent so each section is visually distinct without relying on a
// section number. Subtle — tinted icon background only.
const LENS_TINT: Record<string, string> = {
  power:     "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  births:    "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  land:      "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  records:   "bg-rose-500/10 text-rose-400 ring-rose-500/20",
  archetype: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
  industry:  "bg-sky-500/10 text-sky-400 ring-sky-500/20",
};

/**
 * Compare mode (2+ countries) — stacked widgets for lenses that support
 * comparison. No tabs. Per spec: only Births, Land, Industry have a
 * Compare component, so only those render.
 */
export function LensStack({ countries }: Props) {
  const supported = LENS_REGISTRY.filter((l) => l.Compare !== null);

  return (
    <div className="space-y-8">
      {supported.map((lens) => {
        const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[lens.icon];
        const Compare = lens.Compare!;
        const tint = LENS_TINT[lens.id] ?? "bg-zinc-800 text-zinc-300 ring-zinc-700";
        return (
          <section key={lens.id} className="space-y-4">
            <header className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ring-1 ${tint}`}>
                {Icon && <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">
                  {lens.label}
                </h2>
                <p className="text-xs text-zinc-500 truncate">{lens.blurb}</p>
              </div>
              <div className="hidden sm:block text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                {countries.length} nations
              </div>
            </header>
            <Suspense fallback={<div className="min-h-[260px] rounded-xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />}>
              <Compare countries={countries} />
            </Suspense>
          </section>
        );
      })}
    </div>
  );
}
