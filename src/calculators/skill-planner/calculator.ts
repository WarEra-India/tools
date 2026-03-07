export interface SkillDef {
  id: string
  name: string
  category: "combat" | "economic" | "special"
  unlockLevel: number
  maxLevel: number
  values: number[]   // index 0 = lvl 0, index 10 = lvl 10
  unit: string
  isBar: boolean
}

export const SKILLS: SkillDef[] = [
  {
    id: "health",
    name: "Health",
    category: "combat",
    unlockLevel: 5,
    maxLevel: 10,
    values: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150],
    unit: "HP",
    isBar: true,
  },
  {
    id: "hunger",
    name: "Hunger",
    category: "combat",
    unlockLevel: 5,
    maxLevel: 10,
    values: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    unit: "",
    isBar: true,
  },
  {
    id: "attack",
    name: "Attack",
    category: "combat",
    unlockLevel: 1,
    maxLevel: 10,
    values: [100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300],
    unit: "",
    isBar: false,
  },
  {
    id: "precision",
    name: "Precision",
    category: "combat",
    unlockLevel: 1,
    maxLevel: 10,
    values: [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
    unit: "%",
    isBar: false,
  },
  {
    id: "critChance",
    name: "Crit Chance",
    category: "combat",
    unlockLevel: 5,
    maxLevel: 10,
    values: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
    unit: "%",
    isBar: false,
  },
  {
    id: "critDamage",
    name: "Crit Damage",
    category: "combat",
    unlockLevel: 10,
    maxLevel: 10,
    values: [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
    unit: "%",
    isBar: false,
  },
  {
    id: "armor",
    name: "Armor",
    category: "combat",
    unlockLevel: 10,
    maxLevel: 10,
    values: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
    unit: "%",
    isBar: false,
  },
  {
    id: "dodge",
    name: "Dodge",
    category: "combat",
    unlockLevel: 15,
    maxLevel: 10,
    values: [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30],
    unit: "%",
    isBar: false,
  },
  {
    id: "energy",
    name: "Energy",
    category: "economic",
    unlockLevel: 1,
    maxLevel: 10,
    values: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150],
    unit: "",
    isBar: true,
  },
  {
    id: "entrepreneurship",
    name: "Entrepreneurship",
    category: "economic",
    unlockLevel: 5,
    maxLevel: 10,
    values: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150],
    unit: "",
    isBar: true,
  },
  {
    id: "production",
    name: "Production",
    category: "economic",
    unlockLevel: 1,
    maxLevel: 10,
    values: [12, 13, 14, 16, 18, 20, 22, 25, 28, 32, 36],
    unit: "PP",
    isBar: false,
  },
  {
    id: "companies",
    name: "Companies",
    category: "economic",
    unlockLevel: 1,
    maxLevel: 10,
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    unit: "",
    isBar: false,
  },
  {
    id: "lootChance",
    name: "Loot Chance",
    category: "special",
    unlockLevel: 5,
    maxLevel: 10,
    values: [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70],
    unit: "%",
    isBar: false,
  },
]

/** Cost of upgrading from level (n-1) to level n. Level 1 costs 1, level 2 costs 2, etc. */
export function skillUpgradeCost(level: number): number {
  return level
}

/** Total cost to reach a given skill level from 0. */
export function totalCostForLevel(level: number): number {
  return (level * (level + 1)) / 2
}

/** Total skill points available at a given player level. */
export function skillPointsAtLevel(playerLevel: number): number {
  return playerLevel * 4
}

export interface SkillAllocation {
  [skillId: string]: number
}

export function totalPointsUsed(alloc: SkillAllocation): number {
  return Object.values(alloc).reduce((sum, lvl) => sum + totalCostForLevel(lvl), 0)
}

/** Preset allocations for common playstyles */
export function combatPreset(): SkillAllocation {
  const alloc: SkillAllocation = {}
  for (const s of SKILLS) alloc[s.id] = 0
  alloc.attack = 10
  alloc.precision = 10
  alloc.critChance = 8
  alloc.critDamage = 6
  alloc.health = 8
  alloc.hunger = 5
  alloc.armor = 3
  alloc.lootChance = 5
  return alloc
}

export function economicPreset(): SkillAllocation {
  const alloc: SkillAllocation = {}
  for (const s of SKILLS) alloc[s.id] = 0
  alloc.companies = 10
  alloc.entrepreneurship = 10
  alloc.production = 10
  alloc.energy = 10
  alloc.attack = 5
  alloc.precision = 5
  alloc.health = 5
  return alloc
}

export function balancedPreset(): SkillAllocation {
  const alloc: SkillAllocation = {}
  for (const s of SKILLS) alloc[s.id] = 0
  alloc.attack = 7
  alloc.precision = 7
  alloc.health = 5
  alloc.hunger = 5
  alloc.energy = 5
  alloc.companies = 5
  alloc.production = 5
  alloc.entrepreneurship = 5
  alloc.critChance = 5
  alloc.lootChance = 3
  return alloc
}
