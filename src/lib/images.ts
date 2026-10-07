// returns mmyyyy string of current date
function monthUnique(): string {
  return new Date().toLocaleDateString("en-US", { month: "2-digit", year: "numeric" }).replace("/","");
}

/**
 * Returns the image URL for a game item.
 * Takes an itemCode (e.g. "limestone", "cookedFish", "helmet1") which matches
 * the image slug used by warera.io. Equipment slots (helmet, chest, boots, gloves, pants)
 * strip the numeric rarity tier to load the base image (e.g. helmet.png).
 */
export function itemImageUrl(itemCode: string): string {
  const normalized = itemCode.replace(/^(helmet|chest|boots|gloves|pants)\d+$/, "$1");
  return `https://media.warera.io/images/itemsv2/${normalized}.png?v=${monthUnique()}`;
}
