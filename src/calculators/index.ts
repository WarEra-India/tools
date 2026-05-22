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
    id: "war-room",
    name: "War Room",
    description: "Optimize your combat loadout, simulate stats, and prepare for battle in the War Room.",
    path: "/war-room",
    icon: "battle",
    component: lazy(() => import("./war-room/index")),
  },
  {
    id: "nation-hub",
    name: "Nation Intelligence Hub",
    description:
      "Analyze one or many nations across power, births, land, records, archetype, and industry — global view for a single country, comparison view for multiple.",
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
];
