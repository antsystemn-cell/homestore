import { useEffect, useState } from "react";
import { getDominantColor } from "@/lib/dominantColor";

/** Returns the dominant color of an image URL, or null while loading / on failure. */
export function useDominantColor(src?: string | null): string | null {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setColor(null);
    if (!src) return;
    getDominantColor(src).then((c) => {
      if (active) setColor(c);
    });
    return () => {
      active = false;
    };
  }, [src]);

  return color;
}
