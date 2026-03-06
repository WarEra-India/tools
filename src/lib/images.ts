/**
 * Returns the image URL for a game item.
 * Items are served from https://app.warera.io/images/items/{slug}.png
 * where slug is camel case format of the item
 */

const SpecialCases: Record<string, string> = {
  "Pill": "cocain",
  "Mysterious Plant": "coca",
};

export function itemImageUrl(item: string): string {
  if (SpecialCases[item]) {
    return `https://app.warera.io/images/items/${SpecialCases[item]}.png`;
  }
  const slug = item.replace(/\s+/g, '').replace(/^./, str => str.toLowerCase()).replace(/\b./g, str => str.toUpperCase()).replace(/^./, str => str.toLowerCase());
  return `https://app.warera.io/images/items/${slug}.png`
}
