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
    name: "Production",
    description:
      "Calculate the most profitable items to produce based on current market prices and production points.",
    path: "/company-production-profit",
    icon: "companies",
    component: lazy(() => import("./company-production-profit/index")),
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
    id: "battle-analysis",
    name: "Battle Analysis",
    description:
      "See what you spent vs gained in battles you fought — wear backtracking from your loadout and skills.",
    path: "/battle-analysis",
    icon: "battle",
    component: lazy(() => import("./battle-analysis/index")),
  },
  {
    id: "nation-hub",
    name: "Nation Intelligence",
    description:
      "Analyze one or many nations across power, births, land, records, archetype, and industry",
    path: "/nation-hub",
    icon: "globe",
    component: lazy(() => import("./nation-hub/index")),
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
    id: "journal",
    name: "Journal",
    description: "Explore the articles",
    path: "/journal",
    icon: "articleTip",
    component: lazy(() => import("./journal/index")),
  },
];
