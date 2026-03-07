/**
 * XP & Level Progression Calculator.
 *
 * XP sources:
 *  - Daily missions: up to 200 XP/day (10 missions × 10 XP + 100 bonus)
 *  - Weekly missions: up to 600 XP/week (10 missions × 30 XP + 300 bonus)
 *  - Starting missions: 1200 XP one-time (14 missions × 50 XP + 500 bonus)
 *
 * Levels 1-50, with XP requirements scaling up.
 * 4 skill points per level.
 */

export interface LevelData {
  level: number
  xpNeeded: number      // XP to reach THIS level from previous
  cumulativeXP: number  // total XP from level 1 to this level
  totalSkillPoints: number
}

const XP_TABLE: [number, number][] = [
  [1, 0],
  [2, 100], [3, 100], [4, 100],
  [5, 200], [6, 200], [7, 200],
  [8, 300], [9, 400], [10, 500],
  [11, 600], [12, 700], [13, 800], [14, 900], [15, 1000],
  [16, 1100], [17, 1200], [18, 1300], [19, 1400], [20, 1500],
  [21, 1600], [22, 1700], [23, 1800], [24, 1900], [25, 2000],
  [26, 2000], [27, 2000], [28, 2000], [29, 2000], [30, 2000],
  [31, 2500], [32, 2500], [33, 2500], [34, 2500], [35, 2500],
  [36, 2500], [37, 2500], [38, 2500], [39, 2500], [40, 2500],
  [41, 3000], [42, 3000], [43, 3000], [44, 3000], [45, 3000],
  [46, 3000], [47, 3000], [48, 3000], [49, 3000], [50, 3000],
]

export function getLevelTable(): LevelData[] {
  let cumulative = 0
  return XP_TABLE.map(([level, xp]) => {
    cumulative += xp
    return {
      level,
      xpNeeded: xp,
      cumulativeXP: cumulative,
      totalSkillPoints: level * 4,
    }
  })
}

export interface ProgressionResult {
  currentLevel: number
  currentXP: number
  targetLevel: number
  xpRemaining: number
  daysToTarget: number
  weeksToTarget: number
  skillPointsGained: number
}

export function calculateProgression(
  currentLevel: number,
  currentXP: number, // XP towards next level
  targetLevel: number,
  dailyXP: number,   // average daily XP earned
): ProgressionResult {
  const table = getLevelTable()
  const current = table.find((t) => t.level === currentLevel)
  const target = table.find((t) => t.level === targetLevel)

  if (!current || !target || targetLevel <= currentLevel) {
    return {
      currentLevel,
      currentXP,
      targetLevel,
      xpRemaining: 0,
      daysToTarget: 0,
      weeksToTarget: 0,
      skillPointsGained: 0,
    }
  }

  // XP remaining until target level
  let xpRemaining = -currentXP
  for (let lvl = currentLevel + 1; lvl <= targetLevel; lvl++) {
    const entry = table.find((t) => t.level === lvl)
    if (entry) xpRemaining += entry.xpNeeded
  }
  xpRemaining = Math.max(0, xpRemaining)

  const daysToTarget = dailyXP > 0 ? xpRemaining / dailyXP : Infinity
  const skillPointsGained = (targetLevel - currentLevel) * 4

  return {
    currentLevel,
    currentXP,
    targetLevel,
    xpRemaining,
    daysToTarget,
    weeksToTarget: daysToTarget / 7,
    skillPointsGained,
  }
}

/** Maximum daily XP = 200 (daily missions) + 600/7 (weekly missions averaged) ≈ 286 */
export const MAX_DAILY_XP = 200
export const MAX_WEEKLY_XP = 600
export const STARTING_XP = 1200
