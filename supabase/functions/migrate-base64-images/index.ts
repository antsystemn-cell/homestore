// One-shot migration: scan products/brands/promo_banners for `data:image/...`
// URLs, upload each Base64 payload to the `product-images` Storage bucket,
// and replace the column value with the resulting public URL.
//
// Idempotent: rows whose URLs already start with http(s) are skipped.
// Run by POSTing to this function (admin-authenticated). Returns a summary.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "product-images";

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const contentType = m[1];
  const b64 = m[2];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

function extFromContentType(ct: string): string {
  if (ct.includes("webp")) return "webp";
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("gif")) return "gif";
  return "bin";
}

async function uploadDataUrl(
  supabase: ReturnType<typeof createClient>,
  dataUrl: string,
  prefix: string
): Promise<string | null> {
  const parsed = dataUrlToBytes(dataUrl);
  if (!parsed) return null;
  const ext = extFromContentType(parsed.contentType);
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, parsed.bytes, {
    contentType: parsed.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("upload failed", path, error.message);
    return null;
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function migrateValue(
  supabase: ReturnType<typeof createClient>,
  value: unknown,
  prefix: string
): Promise<string | null | undefined> {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("data:")) return undefined; // already a URL or empty
  return await uploadDataUrl(supabase, value, prefix);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const url = new URL(req.url);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "5", 10);

  const summary: Record<string, { scanned: number; migrated: number; failed: number }> = {
    products_image: { scanned: 0, migrated: 0, failed: 0 },
    products_thumbnail: { scanned: 0, migrated: 0, failed: 0 },
    products_colors: { scanned: 0, migrated: 0, failed: 0 },
    products_detail_media: { scanned: 0, migrated: 0, failed: 0 },
    brands: { scanned: 0, migrated: 0, failed: 0 },
    promo_banners: { scanned: 0, migrated: 0, failed: 0 },
    payment_providers: { scanned: 0, migrated: 0, failed: 0 },
  };

  try {
    // ---- products (paginated) ----
    const { data: products, error: pErr, count } = await supabase
      .from("products")
      .select("id,image_url,thumbnail_url,colors,detail_media", { count: "exact" })
      .order("id")
      .range(offset, offset + limit - 1);
    if (pErr) throw pErr;

    for (const p of products ?? []) {
      const updates: Record<string, unknown> = {};

      // image_url
      if (typeof p.image_url === "string" && p.image_url.startsWith("data:")) {
        summary.products_image.scanned++;
        const url = await uploadDataUrl(supabase, p.image_url, "products");
        if (url) {
          updates.image_url = url;
          summary.products_image.migrated++;
        } else summary.products_image.failed++;
      }

      // thumbnail_url
      if (typeof p.thumbnail_url === "string" && p.thumbnail_url.startsWith("data:")) {
        summary.products_thumbnail.scanned++;
        const url = await uploadDataUrl(supabase, p.thumbnail_url, "thumbs");
        if (url) {
          updates.thumbnail_url = url;
          summary.products_thumbnail.migrated++;
        } else summary.products_thumbnail.failed++;
      }

      // colors[].image
      if (Array.isArray(p.colors)) {
        let changed = false;
        const newColors = await Promise.all(
          (p.colors as Array<Record<string, unknown>>).map(async (c) => {
            if (typeof c?.image === "string" && c.image.startsWith("data:")) {
              summary.products_colors.scanned++;
              const url = await uploadDataUrl(supabase, c.image, "colors");
              if (url) {
                changed = true;
                summary.products_colors.migrated++;
                return { ...c, image: url };
              }
              summary.products_colors.failed++;
            }
            return c;
          })
        );
        if (changed) updates.colors = newColors;
      }

      // detail_media[].url and detail_media[].thumbnail
      if (Array.isArray(p.detail_media)) {
        let changed = false;
        const newMedia = await Promise.all(
          (p.detail_media as Array<Record<string, unknown>>).map(async (m) => {
            const out: Record<string, unknown> = { ...m };
            if (typeof m?.url === "string" && m.url.startsWith("data:")) {
              summary.products_detail_media.scanned++;
              const url = await uploadDataUrl(supabase, m.url, "media");
              if (url) {
                out.url = url;
                changed = true;
                summary.products_detail_media.migrated++;
              } else summary.products_detail_media.failed++;
            }
            if (typeof m?.thumbnail === "string" && m.thumbnail.startsWith("data:")) {
              summary.products_detail_media.scanned++;
              const url = await uploadDataUrl(supabase, m.thumbnail, "media");
              if (url) {
                out.thumbnail = url;
                changed = true;
                summary.products_detail_media.migrated++;
              } else summary.products_detail_media.failed++;
            }
            return out;
          })
        );
        if (changed) updates.detail_media = newMedia;
      }

      if (Object.keys(updates).length) {
        const { error: uErr } = await supabase.from("products").update(updates).eq("id", p.id);
        if (uErr) console.error("product update failed", p.id, uErr.message);
      }
    }

    // ---- non-product tables (run only on first batch) ----
    if (offset === 0) {
      const { data: brands } = await supabase.from("brands").select("id,logo_url");
      for (const b of brands ?? []) {
        if (typeof b.logo_url === "string" && b.logo_url.startsWith("data:")) {
          summary.brands.scanned++;
          const url = await uploadDataUrl(supabase, b.logo_url, "brands");
          if (url) {
            await supabase.from("brands").update({ logo_url: url }).eq("id", b.id);
            summary.brands.migrated++;
          } else summary.brands.failed++;
        }
      }

      const { data: banners } = await supabase.from("promo_banners").select("id,banner_image");
      for (const b of banners ?? []) {
        if (typeof b.banner_image === "string" && b.banner_image.startsWith("data:")) {
          summary.promo_banners.scanned++;
          const url = await uploadDataUrl(supabase, b.banner_image, "banners");
          if (url) {
            await supabase.from("promo_banners").update({ banner_image: url }).eq("id", b.id);
            summary.promo_banners.migrated++;
          } else summary.promo_banners.failed++;
        }
      }

      const { data: providers } = await supabase.from("payment_providers").select("id,logo_url");
      for (const p of providers ?? []) {
        if (typeof p.logo_url === "string" && p.logo_url.startsWith("data:")) {
          summary.payment_providers.scanned++;
          const url = await uploadDataUrl(supabase, p.logo_url, "providers");
          if (url) {
            await supabase.from("payment_providers").update({ logo_url: url }).eq("id", p.id);
            summary.payment_providers.migrated++;
          } else summary.payment_providers.failed++;
        }
      }
    }

    const total = count ?? 0;
    const nextOffset = offset + (products?.length ?? 0);
    const hasMore = nextOffset < total;

    return new Response(JSON.stringify({ ok: true, summary, total, nextOffset, hasMore }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("migration error", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message, summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
