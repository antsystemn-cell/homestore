import { useEffect, useState } from "react";

/**
 * Tracks vertical scroll position and direction.
 * Returns:
 *  - scrollY: current scroll position
 *  - direction: "up" | "down" | "idle"
 *  - isScrolled: true once user has scrolled past `threshold` pixels
 */
export function useScrollDirection(threshold = 40) {
  const [scrollY, setScrollY] = useState(0);
  const [direction, setDirection] = useState<"up" | "down" | "idle">("idle");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY;

      // Ignore tiny jitter
      if (Math.abs(delta) > 2) {
        setDirection(delta > 0 ? "down" : "up");
      }

      setScrollY(y);
      setIsScrolled(y > threshold);
      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return { scrollY, direction, isScrolled };
}
