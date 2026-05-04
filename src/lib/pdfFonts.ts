import type jsPDF from "jspdf";
import dejavuRegularUrl from "@/assets/fonts/DejaVuSans.ttf?url";
import dejavuBoldUrl from "@/assets/fonts/DejaVuSans-Bold.ttf?url";

let cachedRegular: string | null = null;
let cachedBold: string | null = null;

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

/**
 * Register DejaVu Sans (regular + bold) with the given jsPDF instance.
 * Provides full Mongolian Cyrillic glyph coverage so text renders correctly
 * (no boxes / placeholders) and remains selectable/searchable in the PDF.
 *
 * After calling this, use:
 *   pdf.setFont("DejaVuSans", "normal" | "bold")
 */
export async function registerDejaVuFont(pdf: jsPDF): Promise<void> {
  if (!cachedRegular) cachedRegular = await fetchAsBase64(dejavuRegularUrl);
  if (!cachedBold) cachedBold = await fetchAsBase64(dejavuBoldUrl);

  pdf.addFileToVFS("DejaVuSans.ttf", cachedRegular);
  pdf.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");

  pdf.addFileToVFS("DejaVuSans-Bold.ttf", cachedBold);
  pdf.addFont("DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
}
