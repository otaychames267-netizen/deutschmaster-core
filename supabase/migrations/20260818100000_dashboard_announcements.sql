-- Admin-authored dashboard announcements for active subscribers, auto-
-- expiring 24h after publication. Server-side expiry (RLS filters on
-- expires_at, not a frontend timer) so it behaves correctly across
-- refresh/logout-login/other devices. Reuses the existing has_plan_access/
-- is_d17_staff access-control functions rather than building a parallel
-- subscription check.

CREATE TABLE public.dashboard_announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message      text NOT NULL CHECK (char_length(trim(message)) > 0),
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dashboard_announcements_active_idx ON public.dashboard_announcements(expires_at DESC);

ALTER TABLE public.dashboard_announcements ENABLE ROW LEVEL SECURITY;

-- Active subscribers (any plan) and staff can read non-expired rows.
-- Expired rows are invisible to everyone except staff (who can still see
-- history in the admin list).
CREATE POLICY "active subscribers read current announcements" ON public.dashboard_announcements
  FOR SELECT USING (
    (public.has_plan_access(auth.uid()) AND expires_at > now())
    OR public.is_d17_staff(auth.uid())
  );

-- Admin-only publish. No UPDATE/DELETE policy — announcements are
-- immutable once published (matches this app's existing audit-log
-- immutability posture elsewhere); publishing a correction just means
-- publishing a new one, the old one still expires on its own schedule.
CREATE POLICY "staff publish announcements" ON public.dashboard_announcements
  FOR INSERT WITH CHECK (public.is_d17_staff(auth.uid()) AND created_by = auth.uid());

GRANT SELECT ON public.dashboard_announcements TO authenticated;
GRANT INSERT ON public.dashboard_announcements TO authenticated;
