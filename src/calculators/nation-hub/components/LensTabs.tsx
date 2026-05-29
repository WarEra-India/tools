import { Suspense } from "react";
import type { Country } from "@/lib/api/warera";
import { LENS_REGISTRY } from "../registry";
import type { LensId } from "../state";

interface Props {
  country: Country;
  activeTab: LensId;
}

/**
 * Detail mode (1 country selected) body — renders the active lens's Detail
 * view. The tab strip that drives `activeTab` lives in the results screen's
 * sticky command bar (see LensTabStrip).
 */
export function LensTabs({ country, activeTab }: Props) {
  const activeEntry = LENS_REGISTRY.find((l) => l.id === activeTab) ?? LENS_REGISTRY[0];
  const ActiveDetail = activeEntry.Detail;

  return (
    <Suspense fallback={<div className="min-h-[360px] rounded-xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />}>
      <ActiveDetail country={country} />
    </Suspense>
  );
}
