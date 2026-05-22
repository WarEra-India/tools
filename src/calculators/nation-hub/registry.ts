import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { Country } from "@/lib/api/warera";
import type { LensId } from "./state";

/**
 * Props every lens view receives.
 *  - DetailView is rendered when exactly one country is selected.
 *  - CompareView is rendered when 2+ countries are selected (compare-supporting lenses only).
 */
export interface DetailViewProps {
  country: Country;
}

export interface CompareViewProps {
  countries: Country[];
}

export interface LensEntry {
  id: LensId;
  label: string;
  /** Icon name from lucide-react. Component picked up by the consumer. */
  icon: string;
  /** Short blurb shown under the tab label or as tooltip. */
  blurb: string;
  /** Rendered in detail mode (1 country). All lenses support this. */
  Detail: LazyExoticComponent<ComponentType<DetailViewProps>>;
  /** Rendered in compare mode (2+ countries). Null = lens hidden in compare. */
  Compare: LazyExoticComponent<ComponentType<CompareViewProps>> | null;
}

/**
 * Registry order = tab order in detail mode.
 *
 * Phase 3: Compare views for Births, Land, and Industry are now real
 * adapters that render meaningful side-by-side comparisons. Power, Records,
 * and Archetype don't compare meaningfully (per spec) so Compare stays null
 * and they're hidden in compare mode.
 */
export const LENS_REGISTRY: LensEntry[] = [
  {
    id: "power",
    label: "Power",
    icon: "Zap",
    blurb: "Tactical strength, firepower, eco rotations.",
    Detail: lazy(() => import("./lenses/power/DetailAdapter")),
    Compare: null,
  },
  {
    id: "births",
    label: "Births",
    icon: "TrendingUp",
    blurb: "New player join rate over time.",
    Detail: lazy(() => import("./lenses/births/DetailAdapter")),
    Compare: lazy(() => import("./lenses/births/CompareAdapter")),
  },
  {
    id: "land",
    label: "Land",
    icon: "Map",
    blurb: "Controlled territory, gains, losses.",
    Detail: lazy(() => import("./lenses/land/DetailAdapter")),
    Compare: lazy(() => import("./lenses/land/CompareAdapter")),
  },
  {
    id: "records",
    label: "Records",
    icon: "Flag",
    blurb: "Weekly damages, top citizens, country leaderboards.",
    Detail: lazy(() => import("./lenses/records/DetailAdapter")),
    Compare: null,
  },
  {
    id: "archetype",
    label: "Archetype",
    icon: "Radar",
    blurb: "War / Eco skill investment distribution.",
    Detail: lazy(() => import("./lenses/archetype/DetailAdapter")),
    Compare: null,
  },
  {
    id: "industry",
    label: "Industry",
    icon: "Globe",
    blurb: "Company distribution, taxes, production.",
    Detail: lazy(() => import("./lenses/industry/DetailAdapter")),
    Compare: lazy(() => import("./lenses/industry/CompareAdapter")),
  },
];

export function getLens(id: LensId): LensEntry | undefined {
  return LENS_REGISTRY.find((l) => l.id === id);
}
