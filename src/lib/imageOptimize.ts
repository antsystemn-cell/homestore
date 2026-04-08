/**
 * Optimizes an image file: converts to WebP and resizes to max 1200px width.
 * Returns a base64 data URL in WebP format.
 */
export const MAX_IMAGE_WIDTH = 1200;
export const WEBP_QUALITY = 0.82;

/** Thumbnail settings for product card listings — much smaller payload */
export const THUMB_WIDTH = 400;
export const THUMB_QUALITY = 0.65;

export function optimizeImage(
  file: File,
  maxWidth = MAX_IMAGE_WIDTH,
  quality = WEBP_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth;
      let height = img.naturalHeight;

      // Scale down if wider than maxWidth, preserving aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to WebP
      const webpDataUrl = canvas.toDataURL("image/webp", quality);
      resolve(webpDataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for optimization"));
    };

    img.src = objectUrl;
  });
}

/**
 * Optimizes a base64 data URL image: converts to WebP and resizes.
 */
export function optimizeDataUrl(
  dataUrl: string,
  maxWidth = MAX_IMAGE_WIDTH,
  quality = WEBP_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
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
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/webp", quality));
    };
    img.onerror = () => reject(new Error("Failed to load image for optimization"));
    img.src = dataUrl;
  });
}

/**
 * Generate a small thumbnail from a base64 data URL.
 * Used for product card listings to reduce data transfer.
 */
export function generateThumbnail(
  dataUrl: string,
  maxWidth = THUMB_WIDTH,
  quality = THUMB_QUALITY
): Promise<string> {
  return optimizeDataUrl(dataUrl, maxWidth, quality);
}

/**
 * Generate a thumbnail directly from a File.
 */
export function generateThumbnailFromFile(
  file: File,
  maxWidth = THUMB_WIDTH,
  quality = THUMB_QUALITY
): Promise<string> {
  return optimizeImage(file, maxWidth, quality);
}

/**
 * Estimate the byte size of a base64 data URL string.
 */
export function estimateBase64Size(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}
