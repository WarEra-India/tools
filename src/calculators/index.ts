import { lazy, type LazyExoticComponent, type ComponentType } from "react"

export interface CalculatorMeta {
  id: string
  name: string
  description: string
  path: string
  icon: string
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
]
