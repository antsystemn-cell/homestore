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

export async function createCollection(input: { title: string; description?: string; product_ids: string[] }) {
  let short_code = generateShortCode();
  // ensure uniqueness with a couple of retries
  for (let i = 0; i < 3; i++) {
    const { data: exists } = await supabase
      .from("product_collections")
      .select("id")
      .eq("short_code", short_code)
      .maybeSingle();
    if (!exists) break;
    short_code = generateShortCode();
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
