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
  // {
  //   id: "battle-damage",
  //   name: "Battle Damage",
  //   description:
  //     "Calculate your damage output based on stats, bonuses, ammo, and equipment.",
  //   path: "/battle-damage",
  //   icon: "battle",
  //   component: lazy(() => import("./battle-damage/index")),
  // },
  // {
  //   id: "food-efficiency",
  //   name: "Food Efficiency",
  //   description:
  //     "Compare food items by health and damage per coin using live market prices.",
  //   path: "/food-efficiency",
  //   icon: "food",
  //   component: lazy(() => import("./food-efficiency/index")),
  // },
  // {
  //   id: "skill-planner",
  //   name: "Skill Planner",
  //   description:
  //     "Plan your skill point allocation across combat, economic, and special skills.",
  //   path: "/skill-planner",
  //   icon: "skills",
  //   component: lazy(() => import("./skill-planner/index")),
  // },
  // {
  //   id: "company-upgrade-roi",
  //   name: "Company Upgrade ROI",
  //   description:
  //     "Analyze payback time for Automated Engine and Storage upgrades.",
  //   path: "/company-upgrade-roi",
  //   icon: "upgrade",
  //   component: lazy(() => import("./company-upgrade-roi/index")),
  // },
  // {
  //   id: "worker-wage",
  //   name: "Worker Wage Profitability",
  //   description:
  //     "Determine optimal wages for workers and analyze owner profitability.",
  //   path: "/worker-wage",
  //   icon: "worker",
  //   component: lazy(() => import("./worker-wage/index")),
  // },
  // {
  //   id: "case-value",
  //   name: "Case Expected Value",
  //   description:
  //     "Calculate the expected value of opening vs selling equipment cases.",
  //   path: "/case-value",
  //   iconUrl: "https://app.warera.io/images/items/case1.png",
  //   component: lazy(() => import("./case-value/index")),
  // },
  // {
  //   id: "xp-progression",
  //   name: "XP & Level Progression",
  //   description:
  //     "Plan your leveling journey and see how long it takes to reach your target level.",
  //   path: "/xp-progression",
  //   icon: "xp",
  //   component: lazy(() => import("./xp-progression/index")),
  // },
  // {
  //   id: "mu-cost-benefit",
  //   name: "MU Cost/Benefit",
  //   description:
  //     "Analyze Military Unit upgrade costs — HQ, Dormitory, orders, and maintenance.",
  //   path: "/mu-cost-benefit",
  //   icon: "military",
  //   component: lazy(() => import("./mu-cost-benefit/index")),
  // },
]
