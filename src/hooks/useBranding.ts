import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBranding = () => {
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { data, error } = await supabase
          .from("site_branding")
          .select("*")
          .eq("id", "00000000-0000-0000-0000-000000000000")
          .single();

        if (data) {
          setBranding(data);
          updateMeta(data);
        }
      } catch (error) {
        console.error("Error loading branding:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();

    // Subscribe to changes
    const channel = supabase
      .channel("branding-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "site_branding", filter: "id=eq.00000000-0000-0000-0000-000000000000" },
        (payload) => {
          setBranding(payload.new);
          updateMeta(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateMeta = (data: any) => {
    if (data.site_title) {
      document.title = data.site_title;
      // Update OG title
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", data.site_title);
      const twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) twTitle.setAttribute("content", data.site_title);
    }

    if (data.site_description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", data.site_description);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", data.site_description);
      const twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twDesc) twDesc.setAttribute("content", data.site_description);
    }

    if (data.favicon_url) {
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) favicon.setAttribute("href", data.favicon_url);
      const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (appleIcon) appleIcon.setAttribute("href", data.favicon_url);
    }

    if (data.og_image_url) {
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) ogImg.setAttribute("content", data.og_image_url);
      const twImg = document.querySelector('meta[name="twitter:image"]');
      if (twImg) twImg.setAttribute("content", data.og_image_url);
    }
  };

  return { branding, loading };
};
