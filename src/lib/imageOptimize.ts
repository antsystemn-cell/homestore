/**
 * Optimizes an image file: converts to WebP and resizes to max 1200px width.
 * Returns a base64 data URL in WebP format.
 */
export const MAX_IMAGE_WIDTH = 1200;
export const WEBP_QUALITY = 0.82;

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
