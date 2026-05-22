import { Suspense } from "react";
import * as Icons from "lucide-react";
import type { Country } from "@/lib/api/warera";
import { LENS_REGISTRY } from "../registry";
import { useActiveTab } from "../state";

interface Props {
  country: Country;
}

/**
 * Detail mode (1 country selected) — horizontal tab strip across all 6 lenses,
 * active tab renders its Detail view.
 *
 * Mobile: tabs collapse to icon-only with the label moving to a `title`
 * tooltip; the strip stays a single row instead of wrapping, with horizontal
 * scroll as a final fallback for very narrow screens.
 */
export function LensTabs({ country }: Props) {
  const [active, setActive] = useActiveTab("power");
  const activeEntry = LENS_REGISTRY.find((l) => l.id === active) ?? LENS_REGISTRY[0];
  const ActiveDetail = activeEntry.Detail;

  return (
    <div className="space-y-6">
      {/* Tab strip — relative so the right-edge gradient fade can float over it. */}
      <div className="relative">
        <div className="flex gap-1 overflow-x-auto bg-zinc-950/60 border border-zinc-800 rounded-2xl p-1.5 scrollbar-thin">
          {LENS_REGISTRY.map((lens) => {
            // lucide-react ships a record of icon components — look it up by name.
            const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[lens.icon];
            const isActive = lens.id === active;
            return (
              <button
                key={lens.id}
                onClick={() => setActive(lens.id)}
                className={`
                  shrink-0 sm:flex-1 sm:min-w-[110px]
                  flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl
                  text-xs font-bold uppercase tracking-wider transition-all
                  ${isActive
                    ? "bg-zinc-800 text-white shadow-lg"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"}
                `}
                title={lens.blurb}
                aria-label={lens.label}
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                {/* Label hidden on small screens to avoid horizontal scroll. */}
                <span className="hidden sm:inline">{lens.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active lens body */}
      <Suspense fallback={<div className="min-h-[360px] rounded-xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />}>
        <ActiveDetail country={country} />
      </Suspense>
    </div>
  );
}
