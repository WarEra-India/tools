import { lazy, type LazyExoticComponent, type ComponentType } from "react"

export interface CalculatorMeta {
  id: string
  name: string
  description: string
  path: string
  icon?: string
  iconUrl?: string
  component: LazyExoticComponent<ComponentType>
}

export const calculators: CalculatorMeta[] = [
  {
    id: "company-production-profit",
    name: "Company Production",
    description:
      "Calculate the most profitable items to produce based on current market prices and production points.",
    path: "/company-production-profit",
    icon: "companies",
    component: lazy(() => import("./company-production-profit/index")),
  },
  {
    id: "land-area",
    name: "Land Area",
    description:
      "All countries ranked by total controlled land area, including occupied territories calculated from map data.",
    path: "/land-area",
    icon: "ground",
    component: lazy(() => import("./land-area/index")),
  },
  {
    id: "national-records",
    name: "National Records",
    description:
      "Historical data, weekly damages, and top citizens leaderboards for every country.",
    path: "/national-records",
    icon: "flag",
    // iconUrl: "https://app.warera.io/images/flags/in.svg",
    component: lazy(() => import("./national-records/index")),
  },
  {
    id: "craft-theory",
    name: "Craft Theory",
    description: "Craft items based on current market prices and production points.",
    path: "/craft-theory",
    icon: "craftItem",
    component: lazy(() => import("./craft-theory/index")),
  },
  {
    id: "nation-power",
    name: "Nation Strategic Control",
    description: "Analyze a nation's tactical strength, firepower distribution, and plan eco rotations.",
    path: "/nation-power",
    icon: "battle",
    component: lazy(() => import("./nation-power/index")),
  },
  {
    id: "baby-boom",
    name: "Baby Boom Analysis",
    description: "Track and compare new player join rates (account creations) across different nations.",
    path: "/baby-boom",
    icon: "worker",
    component: lazy(() => import("./baby-boom/index")),
  },
  {
    id: "archetype-analysis",
    name: "Strategic Archetype Analysis",
    description: "Analyze and categorize national roster into tactical archetypes (War/Eco/Hybrid) based on skill investment.",
    path: "/archetype-analysis",
    icon: "skills",
    component: lazy(() => import("./archetype-analysis/index")),
  },
  {
    id: "war-room",
    name: "War Room",
    description: "Optimize your combat loadout, simulate stats, and prepare for battle in the War Room.",
    path: "/war-room",
    icon: "battle",
    component: lazy(() => import("./war-room/index")),
  },
  {
    id: "global-company-analyzer",
    name: "Global Company Analyzer",
    description: "Analyze world-wide company distribution, regional taxes, worker counts, and production bonuses on a global map.",
    path: "/global-company-analyzer",
    icon: "globe",
    component: lazy(() => import("./global-company-analyzer/index")),
  },
];
