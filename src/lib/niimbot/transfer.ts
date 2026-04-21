export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function isWebShareFilesSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
  };
  if (typeof nav.canShare !== "function" || typeof nav.share !== "function") return false;
  try {
    const probe = new File(["x"], "probe.txt", { type: "text/plain" });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export async function shareBlob(blob: Blob, filename: string, title: string): Promise<boolean> {
  if (!isWebShareFilesSupported()) return false;
  try {
    const file = new File([blob], filename, { type: blob.type });
    await navigator.share({ files: [file], title });
    return true;
  } catch (e) {
    console.error("shareBlob error", e);
    return false;
  }
}
