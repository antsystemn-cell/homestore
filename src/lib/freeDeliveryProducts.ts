// Products that always ship for free regardless of cart total / sale items.
// Match is by product slug (preferred) or product id.
export const FREE_DELIVERY_SLUGS: string[] = ["kickscooter"];
export const FREE_DELIVERY_IDS: string[] = [];

export function hasFreeDeliveryProduct(items: Array<{ product: { slug?: string; id: string } }>): boolean {
  return items.some((it) => {
    const slug = (it.product.slug || "").toLowerCase();
    return (
      (slug && FREE_DELIVERY_SLUGS.includes(slug)) ||
      FREE_DELIVERY_IDS.includes(it.product.id)
    );
  });
}
