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
    id: "battle-plan",
    name: "Battle Plan",
    description: "Intelligence, combat analysis, live battles, and market tracking.",
    path: "/battle-plan",
    icon: "battle",
    component: lazy(() => import("./battle-plan/index")),
  },
  {
    id: "company-production-profit",
    name: "Company Production",
    description:
      "Calculate the most profitable items to produce based on current market prices and production points.",
    path: "/company-production-profit",
    icon: "company",
    component: lazy(() => import("./company-production-profit/index")),
  },
]
