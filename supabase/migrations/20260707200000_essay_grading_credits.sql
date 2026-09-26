-- Essay grading credit system: flat 1-credit-per-essay, admin-granted balances,
-- atomic deduct/refund RPCs, dedicated essay_gradings table (kept separate from
-- attempt_results since that table's score/points columns are MCQ-shaped and
-- don't fit a 4-criterion essay rubric).

-- ============================================================
-- STUDENT_CREDITS — fast-read balance, one row per user
-- ============================================================

create table public.student_credits (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  balance    int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

grant select on public.student_credits to authenticated;
grant all on public.student_credits to service_role;
alter table public.student_credits enable row level security;
create policy "credits_select_own_or_admin" on public.student_credits for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- CREDIT_TRANSACTIONS — append-only audit log (grants/spends/refunds)
-- ============================================================

create table public.credit_transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  delta              int not null,
  reason             text not null,
  related_grading_id uuid,
  granted_by         uuid references auth.users(id),
  created_at         timestamptz not null default now()
);

create index on public.credit_transactions(user_id, created_at desc);

grant select on public.credit_transactions to authenticated;
grant all on public.credit_transactions to service_role;
alter table public.credit_transactions enable row level security;
create policy "credit_tx_select_own_or_admin" on public.credit_transactions for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- ESSAY_GRADINGS — one row per graded attempt
-- ============================================================

create table public.essay_gradings (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  exam_id                uuid not null references public.exams(id) on delete cascade,
  exam_item_id           uuid not null references public.exam_items(id) on delete cascade,
  essay_text             text not null,
  word_count             int not null,
  model                  text not null,
  task_fulfillment_score int not null check (task_fulfillment_score between 0 and 25),
  grammar_score          int not null check (grammar_score between 0 and 25),
  structure_score        int not null check (structure_score between 0 and 25),
  vocabulary_score       int not null check (vocabulary_score between 0 and 25),
  overall_score          int not null check (overall_score between 0 and 100),
  passed                 boolean not null,
  feedback               jsonb not null,
  created_at             timestamptz not null default now()
);

create index on public.essay_gradings(user_id, created_at desc);

grant select on public.essay_gradings to authenticated;
grant all on public.essay_gradings to service_role;
alter table public.essay_gradings enable row level security;
create policy "gradings_select_own_or_admin" on public.essay_gradings for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RPCs
-- ============================================================

create or replace function public.deduct_essay_credit(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance int;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  update public.student_credits
  set balance = balance - 1, updated_at = now()
  where user_id = p_user_id and balance >= 1
  returning balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.credit_transactions (user_id, delta, reason)
  values (p_user_id, -1, 'essay_grading');

  return v_new_balance;
end;
$$;

grant execute on function public.deduct_essay_credit(uuid) to authenticated;
revoke execute on function public.deduct_essay_credit(uuid) from anon;

create or replace function public.refund_essay_credit(p_user_id uuid, p_reason text default 'essay_grading_refund')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  update public.student_credits
  set balance = balance + 1, updated_at = now()
  where user_id = p_user_id;

  insert into public.credit_transactions (user_id, delta, reason)
  values (p_user_id, 1, p_reason);
end;
$$;

grant execute on function public.refund_essay_credit(uuid, text) to authenticated;
revoke execute on function public.refund_essay_credit(uuid, text) from anon;

create or replace function public.admin_grant_credits(p_student_id uuid, p_amount int, p_note text default 'admin_grant')
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance int;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  insert into public.student_credits (user_id, balance)
  values (p_student_id, p_amount)
  on conflict (user_id) do update
    set balance = student_credits.balance + p_amount, updated_at = now()
  returning balance into v_new_balance;

  insert into public.credit_transactions (user_id, delta, reason, granted_by)
  values (p_student_id, p_amount, p_note, auth.uid());

  return v_new_balance;
end;
$$;

grant execute on function public.admin_grant_credits(uuid, int, text) to authenticated;
revoke execute on function public.admin_grant_credits(uuid, int, text) from anon;

create or replace function public.get_my_credit_balance()
returns int
language sql
security definer
set search_path = public
stable
as $$
  -- coalesce must wrap the whole subquery, not just the column: a zero-row
  -- result (student has no student_credits row yet) makes a per-row coalesce
  -- return NULL overall, not 0.
  select coalesce((select balance from public.student_credits where user_id = auth.uid()), 0);
$$;

grant execute on function public.get_my_credit_balance() to authenticated;
revoke execute on function public.get_my_credit_balance() from anon;
