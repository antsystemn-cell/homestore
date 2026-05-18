import { supabase } from "@/integrations/supabase/client";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit confusing chars

export function generateShortCode(length = 7): string {
  let out = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += ALPHABET[arr[i] % ALPHABET.length];
  return out;
}

export interface ProductCollection {
  id: string;
  short_code: string;
  title: string;
  description: string | null;
  product_ids: string[];
  view_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchCollections(): Promise<ProductCollection[]> {
  const { data, error } = await supabase
    .from("product_collections")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as any;
}

export async function fetchCollectionByCode(code: string): Promise<ProductCollection | null> {
  const { data, error } = await supabase
    .from("product_collections")
    .select("*")
    .eq("short_code", code)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as any) || null;
}

// Validate custom short codes: 3-32 chars, letters/numbers/hyphen/underscore only
export function isValidShortCode(code: string): boolean {
  return /^[A-Za-z0-9_-]{3,32}$/.test(code);
}

export async function isShortCodeAvailable(code: string): Promise<boolean> {
  const { data } = await supabase
    .from("product_collections")
    .select("id")
    .eq("short_code", code)
    .maybeSingle();
  return !data;
}

export async function createCollection(input: { title: string; description?: string; product_ids: string[]; short_code?: string }) {
  let short_code = (input.short_code || "").trim();
  if (short_code) {
    if (!isValidShortCode(short_code)) {
      throw new Error("URL зөвхөн үсэг, тоо, - _ агуулсан 3-32 тэмдэгт байх ёстой");
    }
    const available = await isShortCodeAvailable(short_code);
    if (!available) throw new Error("Энэ URL аль хэдийн ашиглагдсан байна");
  } else {
    short_code = generateShortCode();
    for (let i = 0; i < 3; i++) {
      if (await isShortCodeAvailable(short_code)) break;
      short_code = generateShortCode();
    }
  }
  const { data, error } = await supabase
    .from("product_collections")
    .insert({
      short_code,
      title: input.title,
      description: input.description || null,
      product_ids: input.product_ids,
    })
    .select()
    .single();
  if (error) throw error;
  return data as any as ProductCollection;
}

export async function updateCollection(id: string, patch: Partial<{ title: string; description: string; product_ids: string[]; is_active: boolean }>) {
  const { error } = await supabase.from("product_collections").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCollection(id: string) {
  const { error } = await supabase.from("product_collections").delete().eq("id", id);
  if (error) throw error;
}

export async function incrementCollectionView(short_code: string) {
  await supabase.rpc("increment_collection_view", { _short_code: short_code });
}

export function buildCollectionUrl(short_code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://easyshop.mn";
  return `${origin}/c/${short_code}`;
}
