/**
 * Image URL helpers.
 *
 * NOTE: Supabase Image Render/Transform endpoint (`/render/image/public/`)
 * was removed to eliminate Cloud bandwidth costs. We now serve original
 * Storage URLs directly so the browser can cache them with the long
 * Cache-Control headers set at upload time.
 */
export function transformImage(url: string | null | undefined, _width?: number, _quality?: number): string {
  if (!url) return "/placeholder.svg";
  return url;
}

/**
 * srcset disabled — single original URL is used so browser cache is reused.
 */
export function buildSrcSet(_url: string | null | undefined, _widths: number[] = [200, 400, 800]): string {
  return "";
}
