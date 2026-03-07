/**
 * Canonical item-code → display-name mapping.
 * Item codes match the API field names and image slugs used by warera.io.
 */

export const ITEM_NAMES: Record<string, string> = {
  limestone: "Limestone",
  grain: "Grain",
  livestock: "Livestock",
  fish: "Fish",
  iron: "Iron",
  coca: "Mysterious Plant",
  lead: "Lead",
  petroleum: "Petroleum",
  concrete: "Concrete",
  steel: "Steel",
  bread: "Bread",
  steak: "Steak",
  cookedFish: "Cooked Fish",
  lightAmmo: "Light Ammo",
  ammo: "Ammo",
  cocain: "Pill",
  oil: "Oil",
  heavyAmmo: "Heavy Ammo",
};

export function itemName(code: string): string {
  return ITEM_NAMES[code] ?? code;
}
