-- ============================================================
-- AuraLingovia Gamification & Extended Features
-- XP/Level, Achievements, Streaks, Notes, Goals, Favorites
-- ============================================================

-- ============================================================
-- USER PROGRESS (XP, Level, Streak)
-- ============================================================

create table if not exists public.user_progress (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  total_xp             int not null default 0,
  level                int not null default 1,
  streak_current       int not null default 0,
  streak_longest       int not null default 0,
  streak_last_active   date,          -- date of last study activity
  exercises_completed  int not null default 0,
  simulations_completed int not null default 0,
  total_study_sec      bigint not null default 0,
  updated_at           timestamptz not null default now()
);

grant select, insert, update on public.user_progress to authenticated;
grant all on public.user_progress to service_role;
alter table public.user_progress enable row level security;
create policy "progress_own" on public.user_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress_admin_read" on public.user_progress for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Auto-create progress row when user is created
create or replace function public.handle_new_user_progress()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_progress (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_progress on auth.users;
create trigger on_auth_user_created_progress
  after insert on auth.users
  for each row execute function public.handle_new_user_progress();

-- ============================================================
-- ACHIEVEMENTS (master catalog)
-- ============================================================

create table if not exists public.achievements (
  id          text primary key,             -- slug: 'first_login', 'streak_7'
  title       text not null,
  description text not null,
  icon        text not null default 'trophy', -- lucide icon name
  category    text not null default 'general', -- general | streak | exercise | simulation
  xp_reward   int not null default 0,
  hidden      boolean not null default false,
  sort_order  int not null default 0
);

grant select on public.achievements to authenticated;
grant all on public.achievements to service_role;
alter table public.achievements enable row level security;
create policy "achievements_read" on public.achievements for select to authenticated using (true);

-- Seed achievement catalog
insert into public.achievements (id, title, description, icon, category, xp_reward, sort_order) values
  ('first_login',      'First Step',           'Log in to AuraLingovia for the first time',            'log-in',         'general',    10,  1),
  ('profile_complete', 'Ready to Learn',       'Complete your profile with name and exam date',         'user-check',     'general',    20,  2),
  ('first_exercise',   'Getting Started',      'Complete your first exercise',                          'book-open',      'exercise',   25,  3),
  ('first_perfect',    'Perfectionist',        'Score 100% on any exercise',                            'star',           'exercise',   50,  4),
  ('exercise_5',       'Warming Up',           'Complete 5 exercises',                                  'zap',            'exercise',   30,  5),
  ('exercise_10',      'On a Roll',            'Complete 10 exercises',                                 'trending-up',    'exercise',   50,  6),
  ('exercise_25',      'Dedicated Learner',    'Complete 25 exercises',                                 'award',          'exercise',   75,  7),
  ('exercise_50',      'Half Century',         'Complete 50 exercises',                                 'medal',          'exercise',   100, 8),
  ('exercise_100',     'Century Club',         'Complete 100 exercises',                                'trophy',         'exercise',   200, 9),
  ('exercise_500',     'Elite Practitioner',   'Complete 500 exercises',                                'crown',          'exercise',   500, 10),
  ('first_simulation', 'Exam Ready',           'Complete your first full exam simulation',              'clipboard-check','simulation', 75,  11),
  ('simulation_5',     'Simulation Master',    'Complete 5 full exam simulations',                      'graduation-cap', 'simulation', 150, 12),
  ('streak_3',         'Habit Forming',        'Study for 3 consecutive days',                          'flame',          'streak',     30,  13),
  ('streak_7',         'Week Warrior',         'Study for 7 consecutive days',                          'flame',          'streak',     75,  14),
  ('streak_14',        'Two Week Titan',       'Study for 14 consecutive days',                         'flame',          'streak',     150, 15),
  ('streak_30',        'Monthly Champion',     'Study for 30 consecutive days',                         'flame',          'streak',     300, 16),
  ('streak_60',        'Unstoppable',          'Study for 60 consecutive days',                         'flame',          'streak',     500, 17),
  ('streak_100',       'Legendary',            'Study for 100 consecutive days',                        'flame',          'streak',     1000,18),
  ('level_5',          'Level 5',              'Reach Level 5',                                         'chevrons-up',    'general',    50,  19),
  ('level_10',         'Level 10',             'Reach Level 10',                                        'chevrons-up',    'general',    100, 20),
  ('level_25',         'Level 25',             'Reach Level 25',                                        'chevrons-up',    'general',    250, 21)
on conflict (id) do update set
  title       = excluded.title,
  description = excluded.description,
  icon        = excluded.icon,
  category    = excluded.category,
  xp_reward   = excluded.xp_reward,
  sort_order  = excluded.sort_order;

-- ============================================================
-- USER ACHIEVEMENTS (unlocked)
-- ============================================================

create table if not exists public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id),
  unlocked_at    timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create index on public.user_achievements(user_id);
grant select, insert on public.user_achievements to authenticated;
grant all on public.user_achievements to service_role;
alter table public.user_achievements enable row level security;
create policy "user_achievements_own" on public.user_achievements for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_achievements_admin" on public.user_achievements for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- STUDY NOTES
-- ============================================================

create table if not exists public.study_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Untitled Note',
  content     text not null default '',
  color       text not null default 'default',  -- default | yellow | blue | green | red
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on public.study_notes(user_id, pinned, updated_at);
grant select, insert, update, delete on public.study_notes to authenticated;
grant all on public.study_notes to service_role;
alter table public.study_notes enable row level security;
create policy "notes_own" on public.study_notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- WEEKLY GOALS
-- ============================================================

create table if not exists public.weekly_goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  week_start      date not null,          -- Monday of the week (ISO week)
  exercises_goal  int not null default 20,
  exercises_done  int not null default 0,
  simulations_goal int not null default 2,
  simulations_done int not null default 0,
  study_min_goal  int not null default 60,  -- minutes
  study_min_done  int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, week_start)
);

create index on public.weekly_goals(user_id, week_start);
grant select, insert, update on public.weekly_goals to authenticated;
grant all on public.weekly_goals to service_role;
alter table public.weekly_goals enable row level security;
create policy "goals_own" on public.weekly_goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- FAVORITES
-- ============================================================

create table if not exists public.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,    -- 'exercise' | 'note' | 'redemittel'
  reference_id text,            -- exam id or custom id
  title       text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, type, reference_id)
);

create index on public.favorites(user_id, type);
grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "favorites_own" on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- CERTIFICATES
-- ============================================================

create table if not exists public.certificates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  milestone     text not null,   -- 'level_10' | 'simulation_5' | etc.
  issued_at     timestamptz not null default now()
);

create index on public.certificates(user_id);
grant select on public.certificates to authenticated;
grant all on public.certificates to service_role;
alter table public.certificates enable row level security;
create policy "certificates_own" on public.certificates for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- STUDY TIMER SESSIONS
-- ============================================================

create table if not exists public.study_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  duration_sec int,             -- filled on end
  mode        text not null default 'free',  -- 'free' | 'pomodoro'
  created_at  timestamptz not null default now()
);

create index on public.study_sessions(user_id, started_at);
grant select, insert, update on public.study_sessions to authenticated;
grant all on public.study_sessions to service_role;
alter table public.study_sessions enable row level security;
create policy "study_sessions_own" on public.study_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- XP AWARD FUNCTION (called after exercise completion)
-- ============================================================

create or replace function public.award_xp(
  _user_id    uuid,
  _xp         int,
  _source     text default 'exercise'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  _new_xp    int;
  _new_level int;
begin
  insert into public.user_progress (user_id, total_xp)
  values (_user_id, _xp)
  on conflict (user_id) do update
    set total_xp   = user_progress.total_xp + _xp,
        updated_at = now()
  returning total_xp into _new_xp;

  -- Level formula: sum of 1..n * 150 = level n needs n*(n+1)/2 * 150 total XP
  -- Simpler: level = floor(sqrt(total_xp / 100)) + 1
  _new_level := greatest(1, floor(sqrt(_new_xp::float / 100))::int + 1);

  update public.user_progress
  set level = _new_level
  where user_id = _user_id and level <> _new_level;
end;
$$;

-- ============================================================
-- STREAK UPDATE FUNCTION
-- ============================================================

create or replace function public.update_streak(_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  _last_active date;
  _today       date := current_date;
begin
  insert into public.user_progress (user_id, streak_current, streak_longest, streak_last_active)
  values (_user_id, 1, 1, _today)
  on conflict (user_id) do nothing;

  select streak_last_active into _last_active
  from public.user_progress where user_id = _user_id;

  if _last_active = _today then
    -- already updated today, no-op
    return;
  elsif _last_active = _today - 1 then
    -- consecutive day
    update public.user_progress set
      streak_current     = streak_current + 1,
      streak_longest     = greatest(streak_longest, streak_current + 1),
      streak_last_active = _today,
      updated_at         = now()
    where user_id = _user_id;
  else
    -- streak broken
    update public.user_progress set
      streak_current     = 1,
      streak_last_active = _today,
      updated_at         = now()
    where user_id = _user_id;
  end if;
end;
$$;

-- ============================================================
-- EXERCISE COMPLETION FUNCTION
-- Awards XP, updates streak, increments counters
-- ============================================================

create or replace function public.record_exercise_completion(
  _user_id    uuid,
  _is_perfect boolean default false,
  _is_simulation boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
declare
  _xp int := case when _is_simulation then 50 else 10 end;
begin
  if _is_perfect then _xp := _xp + 25; end if;

  -- Update counters
  insert into public.user_progress (user_id, exercises_completed, simulations_completed, total_xp)
  values (_user_id,
          case when not _is_simulation then 1 else 0 end,
          case when _is_simulation     then 1 else 0 end,
          _xp)
  on conflict (user_id) do update set
    exercises_completed   = user_progress.exercises_completed   + (case when not _is_simulation then 1 else 0 end),
    simulations_completed = user_progress.simulations_completed + (case when _is_simulation     then 1 else 0 end),
    total_xp              = user_progress.total_xp + _xp,
    updated_at            = now();

  -- Update level
  perform public.award_xp(_user_id, 0); -- recalculate level

  -- Update streak
  perform public.update_streak(_user_id);
end;
$$;

grant execute on function public.award_xp to authenticated;
grant execute on function public.update_streak to authenticated;
grant execute on function public.record_exercise_completion to authenticated;
