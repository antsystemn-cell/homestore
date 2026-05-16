import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { track } from "@/lib/tracking";

/** Бүх замын өөрчлөлтийг page_view event болгож илгээнэ. */
export default function PageViewTracker() {
  const loc = useLocation();
  useEffect(() => {
    if (loc.pathname.startsWith("/admin") || loc.pathname.startsWith("/warehouse") || loc.pathname.startsWith("/driver")) return;
    track("page_view", { page_path: loc.pathname });
  }, [loc.pathname]);
  return null;
}
