import * as Icons from "lucide-react";
import { LENS_REGISTRY } from "../registry";
import type { LensId } from "../state";

interface Props {
  active: LensId;
  onChange: (next: LensId) => void;
}

/**
 * Horizontal tab strip across all 6 lenses. Presentational — the active tab
 * lives in the URL and is owned by the results screen so the strip can sit in
 * the sticky command bar while the lens body renders below.
 *
 * Mobile: tabs collapse to icon-only with the label moving to a `title`
 * tooltip; the strip stays a single row instead of wrapping, with horizontal
 * scroll as a final fallback for very narrow screens.
 */
export function LensTabStrip({ active, onChange }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto bg-zinc-950/60 border border-zinc-800 rounded-2xl p-1.5 scrollbar-thin">
      {LENS_REGISTRY.map((lens) => {
        // lucide-react ships a record of icon components — look it up by name.
        const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[lens.icon];
        const isActive = lens.id === active;
        return (
          <button
            key={lens.id}
            onClick={() => onChange(lens.id)}
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
  );
}
