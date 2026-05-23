/**
 * Image optimization + Storage upload utilities.
 * 
 * NEW APPROACH (2026-04): Instead of returning Base64 data URLs (which bloat
 * DB row size and prevent browser caching/lazy-loading), we upload optimized
 * WebP images to Supabase Storage and return public URLs.
 * 
 * Backward compatibility: optimizeImage/optimizeDataUrl/generateThumbnail
 * still return strings, but now those strings are stable HTTPS URLs instead
 * of data: URLs. Existing call sites work without changes.
 */
import { supabase } from "@/integrations/supabase/client";

export const MAX_IMAGE_WIDTH = 1200;
export const WEBP_QUALITY = 0.82;

/** Thumbnail settings for product card listings — much smaller payload */
export const THUMB_WIDTH = 200;
export const THUMB_QUALITY = 0.55;

const STORAGE_BUCKET = "product-images";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Convert a canvas to a WebP Blob (preferred) with toDataURL fallback. */
function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob returned null"));
        },
        "image/webp",
        quality
      );
    } else {
      try {
        const dataUrl = canvas.toDataURL("image/webp", quality);
        const byteString = atob(dataUrl.split(",")[1]);
        const arr = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i);
        resolve(new Blob([arr], { type: "image/webp" }));
      } catch (e) {
        reject(e as Error);
      }
    }
  });
}

/** Resize/encode an Image element to a WebP blob respecting maxWidth. */
async function imageToWebpBlob(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  let width = img.naturalWidth;
  let height = img.naturalHeight;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");
  ctx.drawImage(img, 0, 0, width, height);

  return canvasToWebpBlob(canvas, quality);
}

/** Upload a WebP blob to Supabase Storage and return its public URL. */
async function uploadWebp(blob: Blob, prefix = "img"): Promise<string> {
  const filename = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.webp`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, blob, {
      contentType: "image/webp",
      cacheControl: "31536000", // 1 year — files are immutable (random filename)
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

/** Load a File or data: URL into an HTMLImageElement. */
function loadImage(src: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl: string | null = null;

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    if (typeof src === "string") {
      img.src = src;
    } else {
      objectUrl = URL.createObjectURL(src);
      img.src = objectUrl;
    }
  });
}

// ---------------------------------------------------------------------------
// Public API (returns Storage URLs — was Base64 data URLs before)
// ---------------------------------------------------------------------------

/**
 * Optimize a file: convert to WebP, resize to maxWidth, upload to Storage.
 * Returns a public HTTPS URL (NOT a data: URL).
 */
export async function optimizeImage(
  file: File,
  maxWidth = MAX_IMAGE_WIDTH,
  quality = WEBP_QUALITY
): Promise<string> {
  const img = await loadImage(file);
  const blob = await imageToWebpBlob(img, maxWidth, quality);
  return uploadWebp(blob, "full");
}

/**
 * Optimize a data: URL (or existing http URL): convert to WebP, resize, upload.
 * If the input is already a Storage URL, it is returned as-is.
 */
export async function optimizeDataUrl(
  dataUrl: string,
  maxWidth = MAX_IMAGE_WIDTH,
  quality = WEBP_QUALITY
): Promise<string> {
  // Pass-through for already-uploaded URLs
  if (dataUrl.startsWith("http") && !dataUrl.startsWith("data:")) {
    return dataUrl;
  }
  const img = await loadImage(dataUrl);
  const blob = await imageToWebpBlob(img, maxWidth, quality);
  return uploadWebp(blob, "full");
}

/**
 * Generate a small thumbnail and upload it. Used for product card listings.
 * Accepts either a data: URL or an http(s) URL — http URLs will be re-fetched
 * via the browser, downscaled, and uploaded as a separate thumbnail.
 */
export async function generateThumbnail(
  source: string,
  maxWidth = THUMB_WIDTH,
  quality = THUMB_QUALITY
): Promise<string> {
  const img = await loadImage(source);
  const blob = await imageToWebpBlob(img, maxWidth, quality);
  return uploadWebp(blob, "thumb");
}

/**
 * Crop an image to a target aspect ratio (center crop), resize to maxWidth,
 * encode as WebP and upload. aspectRatio = width / height (e.g. 16/9).
 */
export async function cropAndOptimizeImage(
  file: File | string,
  aspectRatio: number,
  maxWidth = MAX_IMAGE_WIDTH,
  quality = WEBP_QUALITY
): Promise<string> {
  const img = await loadImage(file);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const srcRatio = srcW / srcH;
  let cropW = srcW;
  let cropH = srcH;
  if (srcRatio > aspectRatio) cropW = Math.round(srcH * aspectRatio);
  else if (srcRatio < aspectRatio) cropH = Math.round(srcW / aspectRatio);
  const sx = Math.round((srcW - cropW) / 2);
  const sy = Math.round((srcH - cropH) / 2);
  const outW = Math.min(cropW, maxWidth);
  const outH = Math.round(outW / aspectRatio);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH);
  const blob = await canvasToWebpBlob(canvas, quality);
  return uploadWebp(blob, "ads");
}

/** Generate a thumbnail directly from a File. */
export async function generateThumbnailFromFile(
  file: File,
  maxWidth = THUMB_WIDTH,
  quality = THUMB_QUALITY
): Promise<string> {
  const img = await loadImage(file);
  const blob = await imageToWebpBlob(img, maxWidth, quality);
  return uploadWebp(blob, "thumb");
}

/** Estimate the byte size of a base64 data URL string (legacy). */
export function estimateBase64Size(dataUrl: string): number {
  if (!dataUrl.startsWith("data:")) return 0;
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}
