export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export interface ItemInfo {
  name: string;
  rarity: ItemRarity;
  type?: "raw" | "product" | "weapon" | "case" | "equipment";
}

export const ITEM_NAMES: Record<string, ItemInfo> = {
  // Raw Resources
  grain: { name: "Grain", rarity: "common", type: "raw" },
  livestock: { name: "Livestock", rarity: "common", type: "raw" },
  fish: { name: "Fish", rarity: "common", type: "raw" },
  limestone: { name: "Limestone", rarity: "common", type: "raw" },
  iron: { name: "Iron", rarity: "common", type: "raw" },
  lead: { name: "Lead", rarity: "common", type: "raw" },
  petroleum: { name: "Petroleum", rarity: "common", type: "raw" },
  wood: { name: "Wood", rarity: "common", type: "raw" },
  coca: { name: "Mysterious Plant", rarity: "common", type: "raw" },

  // Processed Products / Materials
  concrete: { name: "Concrete", rarity: "uncommon", type: "product" },
  steel: { name: "Steel", rarity: "uncommon", type: "product" },
  oil: { name: "Oil", rarity: "uncommon", type: "product" },
  paper: { name: "Paper", rarity: "uncommon", type: "product" },

  // Processed Food
  bread: { name: "Bread", rarity: "uncommon", type: "product" },
  steak: { name: "Steak", rarity: "rare", type: "product" },
  cookedFish: { name: "Cooked Fish", rarity: "epic", type: "product" },

  // Ammo
  lightAmmo: { name: "Light Ammo", rarity: "uncommon", type: "product" },
  ammo: { name: "Ammo", rarity: "rare", type: "product" },
  heavyAmmo: { name: "Heavy Ammo", rarity: "epic", type: "product" },

  // Buffs
  cocain: { name: "Pill", rarity: "epic", type: "product" },

  // Scraps
  scraps: { name: "Scraps", rarity: "rare", type: "product" },

  // Weapons
  knife: { name: "Knife", rarity: "common", type: "weapon" },
  gun: { name: "Gun", rarity: "uncommon", type: "weapon" },
  rifle: { name: "Rifle", rarity: "rare", type: "weapon" },
  sniper: { name: "Sniper", rarity: "epic", type: "weapon" },
  tank: { name: "Tank", rarity: "legendary", type: "weapon" },
  jet: { name: "Jet", rarity: "mythic", type: "weapon" },

  // Cases
  case1: { name: "Standard Case", rarity: "legendary", type: "case" },
  case2: { name: "Elite Case", rarity: "mythic", type: "case" },
  woodenCase: { name: "Wooden Case", rarity: "legendary", type: "case" },

  // Equipment - Helmets
  helmet1: { name: "Basic Helmet", rarity: "common", type: "equipment" },
  helmet2: { name: "Reinforced Helmet", rarity: "uncommon", type: "equipment" },
  helmet3: { name: "Advanced Helmet", rarity: "rare", type: "equipment" },
  helmet4: { name: "Elite Helmet", rarity: "epic", type: "equipment" },
  helmet5: { name: "Legendary Helmet", rarity: "legendary", type: "equipment" },
  helmet6: { name: "Mythic Helmet", rarity: "mythic", type: "equipment" },

  // Equipment - Chests
  chest1: { name: "Basic Chest", rarity: "common", type: "equipment" },
  chest2: { name: "Reinforced Chest", rarity: "uncommon", type: "equipment" },
  chest3: { name: "Advanced Chest", rarity: "rare", type: "equipment" },
  chest4: { name: "Elite Chest", rarity: "epic", type: "equipment" },
  chest5: { name: "Legendary Chest", rarity: "legendary", type: "equipment" },
  chest6: { name: "Mythic Chest", rarity: "mythic", type: "equipment" },

  // Equipment - Boots
  boots1: { name: "Basic Boots", rarity: "common", type: "equipment" },
  boots2: { name: "Reinforced Boots", rarity: "uncommon", type: "equipment" },
  boots3: { name: "Advanced Boots", rarity: "rare", type: "equipment" },
  boots4: { name: "Elite Boots", rarity: "epic", type: "equipment" },
  boots5: { name: "Legendary Boots", rarity: "legendary", type: "equipment" },
  boots6: { name: "Mythic Boots", rarity: "mythic", type: "equipment" },

  // Equipment - Gloves
  gloves1: { name: "Basic Gloves", rarity: "common", type: "equipment" },
  gloves2: { name: "Reinforced Gloves", rarity: "uncommon", type: "equipment" },
  gloves3: { name: "Advanced Gloves", rarity: "rare", type: "equipment" },
  gloves4: { name: "Elite Gloves", rarity: "epic", type: "equipment" },
  gloves5: { name: "Legendary Gloves", rarity: "legendary", type: "equipment" },
  gloves6: { name: "Mythic Gloves", rarity: "mythic", type: "equipment" },

  // Equipment - Pants
  pants1: { name: "Basic Pants", rarity: "common", type: "equipment" },
  pants2: { name: "Reinforced Pants", rarity: "uncommon", type: "equipment" },
  pants3: { name: "Advanced Pants", rarity: "rare", type: "equipment" },
  pants4: { name: "Elite Pants", rarity: "epic", type: "equipment" },
  pants5: { name: "Legendary Pants", rarity: "legendary", type: "equipment" },
  pants6: { name: "Mythic Pants", rarity: "mythic", type: "equipment" },
};

export function itemName(code: string): string {
  return ITEM_NAMES[code]?.name ?? code;
}

export function itemRarity(code: string): ItemRarity | undefined {
  return ITEM_NAMES[code]?.rarity;
}
