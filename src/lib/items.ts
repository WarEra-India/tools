/**
 * Canonical item-code → display-name mapping.
 * Item codes match the API field names and image slugs used by warera.io.
 */

export const ITEM_NAMES: Record<string, { name: string, rarity: string }> = {
  // Raw Food
  grain: { name: "Grain", rarity: "common" },
  livestock: { name: "Livestock", rarity: "common" },
  fish: { name: "Fish", rarity: "common" },

  // Raw Building Materials
  limestone: { name: "Limestone", rarity: "common" },
  iron: { name: "Iron", rarity: "common" },
  lead: { name: "Lead", rarity: "common" },
  oil: { name: "Oil", rarity: "common" },
  wood: { name: "Wood", rarity: "common" },

  // Processed Building Materials
  concrete: { name: "Concrete", rarity: "uncommon" },
  steel: { name: "Steel", rarity: "uncommon" },
  petroleum: { name: "Petroleum", rarity: "uncommon" },
  paper: { name: "Paper", rarity: "uncommon" },

  // Processed Food
  bread: { name: "Bread", rarity: "uncommon" },
  steak: { name: "Steak", rarity: "rare" },
  cookedFish: { name: "Cooked Fish", rarity: "rare" },

  // Ammo
  lightAmmo: { name: "Light Ammo", rarity: "uncommon" },
  ammo: { name: "Ammo", rarity: "rare" },
  heavyAmmo: { name: "Heavy Ammo", rarity: "epic" },

  // Buffs
  coca: { name: "Mysterious Plant", rarity: "common" },
  cocain: { name: "Pill", rarity: "epic" },

  // Scraps
  scraps: { name: "Scraps", rarity: "rare" },
};

export function itemName(code: string): string {
  return ITEM_NAMES[code]?.name ?? code;
}
