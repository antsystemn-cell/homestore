/**
 * Build a Supabase Storage transformed image URL.
 * If the URL is not a Supabase Storage URL (e.g. /placeholder.svg, base64 legacy),
 * returns the original unchanged.
 *
 * Supabase Storage Image Transformations are available on Pro+ plans. On Free plan
 * the query params are ignored and the original image is served — no harm done.
 */
export function transformImage(url: string | null | undefined, width: number, quality = 75): string {
  if (!url) return "/placeholder.svg";
  if (url.startsWith("data:") || !url.includes("/storage/v1/object/public/")) {
    return url;
  }
  // Switch from /object/public/ to /render/image/public/ for transforms
  const transformed = url.replace("/object/public/", "/render/image/public/");
  const sep = transformed.includes("?") ? "&" : "?";
  return `${transformed}${sep}width=${width}&quality=${quality}&resize=contain`;
}

/**
 * Build a srcset string for responsive images.
 */
export function buildSrcSet(url: string | null | undefined, widths: number[] = [200, 400, 800]): string {
  if (!url) return "";
  if (url.startsWith("data:") || !url.includes("/storage/v1/object/public/")) {
    return "";
  }
  return widths.map((w) => `${transformImage(url, w)} ${w}w`).join(", ");
}
