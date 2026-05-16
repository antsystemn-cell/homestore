/**
 * EasyShop visitor + lead tracking utility
 * - Хадгалагдсан session token-аар бүх event-ийг analytics_events руу бичнэ
 * - lead_scores-ийг шинэчилнэ (cold/warm/hot)
 */
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "es_session_token";
const RETURNING_KEY = "es_returning";
const SESSION_DB_ID_KEY = "es_session_id";

const SCORE_RULES: Record<string, number> = {
  page_view: 1,
  product_view: 5,
  category_view: 3,
  add_to_cart: 20,
  remove_from_cart: -5,
  checkout_start: 40,
  invoice_create: 70,
  purchase: 100,
  search: 2,
  banner_click: 3,
};

function getDevice(): string {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

function getUtm(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get("utm_source") || undefined,
    utm_medium: p.get("utm_medium") || undefined,
    utm_campaign: p.get("utm_campaign") || undefined,
  };
}

function statusFromScore(score: number): "cold" | "warm" | "hot" {
  if (score >= 60) return "hot";
  if (score >= 25) return "warm";
  return "cold";
}

let sessionInitPromise: Promise<{ id: string; token: string } | null> | null = null;

async function ensureSession(): Promise<{ id: string; token: string } | null> {
  if (typeof window === "undefined") return null;
  const existingId = localStorage.getItem(SESSION_DB_ID_KEY);
  const existingToken = localStorage.getItem(TOKEN_KEY);
  if (existingId && existingToken) return { id: existingId, token: existingToken };

  if (sessionInitPromise) return sessionInitPromise;

  sessionInitPromise = (async () => {
    try {
      const token = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) + "-" + Date.now();
      const isReturning = !!localStorage.getItem(RETURNING_KEY);
      const utm = getUtm();
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("analytics_sessions")
        .insert({
          session_token: token,
          user_id: userData?.user?.id ?? null,
          device: getDevice(),
          user_agent: navigator.userAgent.slice(0, 500),
          referrer: document.referrer || null,
          landing_path: window.location.pathname,
          is_returning: isReturning,
          ...utm,
        })
        .select("id")
        .single();
      if (error || !data) return null;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(SESSION_DB_ID_KEY, data.id);
      localStorage.setItem(RETURNING_KEY, "1");
      // initial lead row
      await supabase.from("lead_scores").insert({
        session_id: data.id,
        session_token: token,
        user_id: userData?.user?.id ?? null,
        score: isReturning ? 15 : 0,
        status: isReturning ? "cold" : "cold",
        last_activity: new Date().toISOString(),
      });
      return { id: data.id, token };
    } catch {
      return null;
    } finally {
      sessionInitPromise = null;
    }
  })();

  return sessionInitPromise;
}

async function bumpLead(sessionId: string, delta: number, lastEvent: string, productId?: string | null) {
  try {
    const { data: existing } = await supabase
      .from("lead_scores")
      .select("score")
      .eq("session_id", sessionId)
      .maybeSingle();
    const newScore = (existing?.score ?? 0) + delta;
    await supabase
      .from("lead_scores")
      .update({
        score: newScore,
        status: statusFromScore(newScore),
        last_activity: new Date().toISOString(),
        last_event_type: lastEvent,
        last_product_id: productId ?? null,
      })
      .eq("session_id", sessionId);
  } catch {
    // ignore
  }
}

export interface TrackPayload {
  product_id?: string | null;
  category?: string | null;
  value?: number | null;
  page_path?: string;
  metadata?: Record<string, unknown>;
}

export async function track(eventType: string, payload: TrackPayload = {}) {
  try {
    const session = await ensureSession();
    if (!session) return;
    const { data: userData } = await supabase.auth.getUser();

    await supabase.from("analytics_events").insert({
      session_id: session.id,
      session_token: session.token,
      user_id: userData?.user?.id ?? undefined,
      event_type: eventType,
      product_id: payload.product_id ?? undefined,
      category: payload.category ?? undefined,
      value: payload.value ?? undefined,
      page_path: payload.page_path ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
      metadata: (payload.metadata ?? {}) as never,
    });

    // update last_seen_at
    await supabase
      .from("analytics_sessions")
      .update({ last_seen_at: new Date().toISOString(), user_id: userData?.user?.id ?? null })
      .eq("id", session.id);

    const delta = SCORE_RULES[eventType] ?? 0;
    if (delta !== 0) await bumpLead(session.id, delta, eventType, payload.product_id ?? null);
  } catch {
    // silent
  }
}

export async function attachLeadContact(opts: { phone?: string; name?: string }) {
  try {
    const session = await ensureSession();
    if (!session) return;
    const update: Record<string, unknown> = {};
    if (opts.phone) update.phone = opts.phone;
    if (opts.name) update.name = opts.name;
    if (!Object.keys(update).length) return;
    await supabase.from("lead_scores").update(update).eq("session_id", session.id);
  } catch {
    // silent
  }
}

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
