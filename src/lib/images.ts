/**
 * Returns the image URL for a game item.
 * Takes an itemCode (e.g. "limestone", "cookedFish") which matches
 * the image slug used by warera.io directly.
 */
export function itemImageUrl(itemCode: string): string {
  return `https://app.warera.io/images/items/${itemCode}.png`;
}
