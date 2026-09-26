-- Manual subscription activation for off-platform payments (virement, cash,
-- or any D17 transfer confirmed manually outside the automated D17 pipeline).
--
-- Deliberately reuses the exact same `subscriptions` table + the exact same
-- provision_essay_credits/provision_muendlich_subscription RPCs the D17
-- auto-approval path (activate_d17_order) already calls — a manually
-- activated student ends up in byte-for-byte the same state a normal paying
-- subscriber would (same status/plan_code/expires_at shape, same essay
-- credit / speaking minute wallet grants), so has_plan_access, RLS, and
-- every content-gating check downstream behave identically with zero
-- special-casing. This migration adds no new access-control path — it's a
-- new *writer* into the same tables the real subscription system already
-- reads from.
--
-- ============ AUDIT TABLE ============
create table public.manual_subscription_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('grant', 'extend', 'remove')),
  action_label text not null,
  plan_code text,
  previous_status text,
  new_status text,
  previous_expires_at timestamptz,
  new_expires_at timestamptz,
  subscription_id uuid,
  payment_method text check (payment_method is null or payment_method in ('virement', 'cash', 'd17', 'other')),
  reference text,
  notes text,
  created_at timestamptz not null default now()
);
grant all on public.manual_subscription_actions to service_role;
alter table public.manual_subscription_actions enable row level security;
-- Written and read exclusively via supabaseAdmin (service_role) from server
-- functions — same pattern as auth_email_log / d17_admin_actions. Admin
-- dashboard reads go through a server function, not a direct client query,
-- so no "authenticated" SELECT policy is needed; this policy just makes the
-- intent explicit and blocks every other role by default.
create policy "manual_subscription_actions_service_role_all" on public.manual_subscription_actions
  for all to service_role using (true) with check (true);
create index on public.manual_subscription_actions(user_id);
create index on public.manual_subscription_actions(created_at desc);

-- ============ ATOMIC ACTIVATION RPC ============
-- Mirrors activate_d17_order's shape (adopt the caller's own D17/manual-
-- owned subscription row if one exists — identified by
-- lemonsqueezy_subscription_id IS NULL, so a Lemon-Squeezy-managed
-- subscription is never touched/fought over — else insert a fresh row),
-- but generalized for arbitrary durations and wrapped with the audit
-- insert in the same transaction: either the whole action commits
-- (subscription state + wallet grants + audit row) or none of it does.
--
-- For 'extend', the target date is computed IN HERE from the freshly-read
-- current expires_at (GREATEST(current, now()) + p_extend_days), not from
-- a value the caller read earlier and might be stale by the time this
-- runs — the same "compute from what we just locked/read, not from
-- client-supplied state" discipline as this project's other atomic RPCs
-- (e.g. d17_enforce_attempt_caps).
create or replace function public.admin_manual_subscription_action(
  p_admin_id uuid,
  p_user_id uuid,
  p_action text,                 -- 'grant' | 'extend' | 'remove'
  p_action_label text,           -- audit-friendly label, e.g. 'grant_12m', 'extend_90d', 'remove'
  p_plan_code text default null, -- required for grant/extend
  p_is_trial boolean default false,
  p_new_expires_at timestamptz default null,  -- absolute target for 'grant' (also the from-now base for 'extend' when no existing row)
  p_extend_days integer default null,          -- required for 'extend'
  p_payment_method text default null,
  p_reference text default null,
  p_notes text default null
) returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $$
declare
  v_existing_id      uuid;
  v_prev_expires_at  timestamptz;
  v_prev_status      text;
  v_new_expires_at   timestamptz;
  v_new_status       text;
  v_sub_id           uuid;
begin
  if p_action not in ('grant', 'extend', 'remove') then
    raise exception 'admin_manual_subscription_action: invalid action "%"', p_action;
  end if;
  if p_action in ('grant', 'extend') and p_plan_code is null then
    raise exception 'admin_manual_subscription_action: plan_code is required for action "%"', p_action;
  end if;

  select id, expires_at, status into v_existing_id, v_prev_expires_at, v_prev_status
    from subscriptions
    where user_id = p_user_id and lemonsqueezy_subscription_id is null
    order by created_at desc limit 1;

  if p_action = 'remove' then
    v_new_status := 'cancelled';
    v_new_expires_at := v_prev_expires_at;  -- expires_at is NOT NULL; leave it, status alone gates access
    if v_existing_id is not null then
      update subscriptions
        set status = 'cancelled', cancelled_at = now(), updated_at = now()
        where id = v_existing_id
        returning id into v_sub_id;
    end if;

  elsif p_action = 'grant' then
    if p_new_expires_at is null then
      raise exception 'admin_manual_subscription_action: new_expires_at is required for action "grant"';
    end if;
    v_new_status := 'active';
    v_new_expires_at := p_new_expires_at;
    if v_existing_id is not null then
      update subscriptions
        set plan_code = p_plan_code::plan_code, status = 'active', is_trial = p_is_trial,
            expires_at = v_new_expires_at, cancelled_at = null, updated_at = now()
        where id = v_existing_id
        returning id into v_sub_id;
    else
      insert into subscriptions (user_id, plan_code, status, is_trial, started_at, expires_at)
      values (p_user_id, p_plan_code::plan_code, 'active', p_is_trial, now(), v_new_expires_at)
      returning id into v_sub_id;
    end if;

  else -- 'extend'
    if p_extend_days is null or p_extend_days <= 0 then
      raise exception 'admin_manual_subscription_action: a positive extend_days is required for action "extend"';
    end if;
    v_new_status := 'active';
    v_new_expires_at := greatest(coalesce(v_prev_expires_at, now()), now()) + (p_extend_days || ' days')::interval;
    if v_existing_id is not null then
      update subscriptions
        set plan_code = p_plan_code::plan_code, status = 'active', is_trial = false,
            expires_at = v_new_expires_at, cancelled_at = null, updated_at = now()
        where id = v_existing_id
        returning id into v_sub_id;
    else
      insert into subscriptions (user_id, plan_code, status, is_trial, started_at, expires_at)
      values (p_user_id, p_plan_code::plan_code, 'active', false, now(), v_new_expires_at)
      returning id into v_sub_id;
    end if;
  end if;

  -- Same wallet-grant contract as activate_d17_order — a manually granted
  -- schriftlich/komplett subscriber gets the same 30 essay credits, a
  -- muendlich/komplett subscriber the same 300 speaking minutes, a real
  -- paying subscriber would. Deliberately skipped for 'remove': revoking
  -- subscription access must never silently wipe an already-granted wallet
  -- balance as a side effect.
  if p_action in ('grant', 'extend') then
    if p_plan_code in ('muendlich', 'komplett') then
      perform provision_muendlich_subscription(p_user_id, 300, coalesce(p_action_label, p_action));
    end if;
    if p_plan_code in ('schriftlich', 'komplett') then
      perform provision_essay_credits(p_user_id, 30, coalesce(p_action_label, p_action));
    end if;
  end if;

  insert into manual_subscription_actions (
    admin_id, user_id, action, action_label, plan_code,
    previous_status, new_status, previous_expires_at, new_expires_at,
    subscription_id, payment_method, reference, notes
  ) values (
    p_admin_id, p_user_id, p_action, p_action_label, p_plan_code,
    v_prev_status, v_new_status, v_prev_expires_at, v_new_expires_at,
    v_sub_id, p_payment_method, p_reference, p_notes
  );

  return v_sub_id;
end;
$$;

REVOKE ALL ON FUNCTION public.admin_manual_subscription_action(uuid, uuid, text, text, text, boolean, timestamptz, integer, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manual_subscription_action(uuid, uuid, text, text, text, boolean, timestamptz, integer, text, text, text) TO service_role;
