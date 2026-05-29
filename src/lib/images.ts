// returns mmyyyy string of current date
function monthUnique(): string {
  return new Date().toLocaleDateString("en-US", { month: "2-digit", year: "numeric" }).replace("/","");
}

/**
 * Returns the image URL for a game item.
 * Takes an itemCode (e.g. "limestone", "cookedFish") which matches
 * the image slug used by warera.io directly.
 */
export function itemImageUrl(itemCode: string): string {
  return `https://app.warera.io/images/items/${itemCode}.png?v=${monthUnique()}`;
}
