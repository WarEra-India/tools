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
    icon: "company",
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
    icon: "craft",
    component: lazy(() => import("./craft-theory/index")),
  },
]
