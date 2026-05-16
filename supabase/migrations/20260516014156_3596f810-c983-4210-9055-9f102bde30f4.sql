
-- ============ analytics_sessions ============
CREATE TABLE public.analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  user_id UUID,
  device TEXT,
  user_agent TEXT,
  referrer TEXT,
  landing_path TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_hash TEXT,
  is_returning BOOLEAN NOT NULL DEFAULT false,
  country TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_last_seen ON public.analytics_sessions(last_seen_at DESC);
CREATE INDEX idx_sessions_user ON public.analytics_sessions(user_id);

ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert sessions"
  ON public.analytics_sessions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update own session by token"
  ON public.analytics_sessions FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins view all sessions"
  ON public.analytics_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- ============ analytics_events ============
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  session_token TEXT,
  user_id UUID,
  event_type TEXT NOT NULL,
  product_id UUID,
  category TEXT,
  page_path TEXT,
  value NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_created ON public.analytics_events(created_at DESC);
CREATE INDEX idx_events_session ON public.analytics_events(session_id);
CREATE INDEX idx_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_events_user ON public.analytics_events(user_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events"
  ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view all events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- ============ lead_scores ============
CREATE TABLE public.lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID UNIQUE REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE,
  user_id UUID,
  phone TEXT,
  name TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'cold',
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_product_id UUID,
  last_event_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_score ON public.lead_scores(score DESC);
CREATE INDEX idx_leads_status ON public.lead_scores(status);
CREATE INDEX idx_leads_last_activity ON public.lead_scores(last_activity DESC);

ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can upsert lead scores"
  ON public.lead_scores FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update lead scores"
  ON public.lead_scores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins view all leads"
  ON public.lead_scores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- ============ recovery_actions ============
CREATE TABLE public.recovery_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  phone TEXT,
  name TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  channel TEXT,
  note TEXT,
  cart_snapshot JSONB,
  invoice_id UUID,
  handled_by UUID,
  handled_by_email TEXT,
  contacted_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recovery_status ON public.recovery_actions(status);
CREATE INDEX idx_recovery_created ON public.recovery_actions(created_at DESC);

ALTER TABLE public.recovery_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create recovery rows"
  ON public.recovery_actions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins manage recovery"
  ON public.recovery_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- timestamps trigger
CREATE TRIGGER trg_lead_scores_updated_at
  BEFORE UPDATE ON public.lead_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_recovery_actions_updated_at
  BEFORE UPDATE ON public.recovery_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recovery_actions;
