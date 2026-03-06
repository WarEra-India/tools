/**
 * Returns the image URL for a game item.
 * Items are served from https://app.warera.io/images/items/{slug}.png
 * where the slug is the lowercase item name with spaces replaced by underscores.
 */
export function itemImageUrl(item: string): string {
  const slug = encodeURIComponent(item.toLowerCase().replace(/\s+/g, "_"))
  return `https://app.warera.io/images/items/${slug}.png`
}
