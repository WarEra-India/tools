import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

interface Props {
  count: number;                      // selected country count
  disabled?: boolean;
  onClick: () => void;
  /**
   * Whether parent has begun the navigation transition. Triggers the
   * morph-to-progress-bar animation before the page itself fades.
   */
  transitioning?: boolean;
}

/**
 * Big landing-page CTA. Three states:
 *  - idle:        "Pick a nation to analyze"   (dimmed)
 *  - ready:       "Analyze 3 Nations"          (gradient + sparkle)
 *  - transitioning: morphs into a progress bar that fills as the route changes
 */
export function AnalyzeButton({ count, disabled, onClick, transitioning }: Props) {
  const [progress, setProgress] = useState(0);

  // Animate progress bar fill while transitioning. Caps at 90% — the actual
  // route change pops the page so we never need to hit 100%.
  useEffect(() => {
    if (!transitioning) {
      setProgress(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const next = Math.min(90, (elapsed / 600) * 100);
      setProgress(next);
      if (next < 90) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [transitioning]);

  const isReady = count > 0;
  const label = count === 0
    ? "Pick a nation to analyze"
    : count === 1
      ? "Analyze nation"
      : `Compare ${count} nations`;

  return (
    <button
      onClick={onClick}
      disabled={disabled || !isReady || transitioning}
      className={`
        relative w-full h-16 rounded-2xl font-black uppercase tracking-widest text-sm
        overflow-hidden transition-all duration-300
        ${isReady && !transitioning
          ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.01]"
          : "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed"}
        ${transitioning ? "scale-[0.99]" : ""}
      `}
    >
      {/* Progress fill that grows while transitioning. */}
      {transitioning && (
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-violet-400 transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      )}

      <span className="relative flex items-center justify-center gap-3">
        {transitioning ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isReady ? (
          <Sparkles className="w-5 h-5" />
        ) : null}
        {transitioning ? "Loading…" : label}
      </span>
    </button>
  );
}
