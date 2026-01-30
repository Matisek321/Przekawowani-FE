-- ============================================================================
-- migration: re-enable RLS and restore policies (profiles, roasteries, coffees, ratings)
-- timestamp (utc): 2026-01-30 12:00:00
-- purpose:
--   - add created_by column to coffees table for ownership tracking
--   - enable row level security on affected tables
--   - restore previously created row level security policies
--   - allow coffee deletion by owner
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- 0) add created_by column to coffees for ownership tracking
-- --------------------------------------------------------------------------
alter table public.coffees
  add column if not exists created_by uuid references auth.users (id) on delete set null;

-- index for faster ownership lookups
create index if not exists coffees_created_by_idx on public.coffees (created_by);

-- --------------------------------------------------------------------------
-- 1) enable row level security
-- --------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.roasteries enable row level security;
alter table public.coffees enable row level security;
alter table public.ratings enable row level security;

-- --------------------------------------------------------------------------
-- 2) profiles policies
-- --------------------------------------------------------------------------
-- select policies (anon + authenticated): public readable profiles
drop policy if exists profiles_select_anon on public.profiles;
create policy profiles_select_anon
  on public.profiles
  for select
  to anon
  using (true);

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
  on public.profiles
  for select
  to authenticated
  using (true);

-- insert policies
drop policy if exists profiles_insert_anon on public.profiles;
create policy profiles_insert_anon
  on public.profiles
  for insert
  to anon
  with check (false); -- anon cannot create profiles

drop policy if exists profiles_insert_authenticated on public.profiles;
create policy profiles_insert_authenticated
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- update policies
drop policy if exists profiles_update_anon on public.profiles;
create policy profiles_update_anon
  on public.profiles
  for update
  to anon
  using (false)
  with check (false);

drop policy if exists profiles_update_authenticated on public.profiles;
create policy profiles_update_authenticated
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id or coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
  with check (auth.uid() = user_id or coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin');

-- delete policies (none allowed)
drop policy if exists profiles_delete_anon on public.profiles;
create policy profiles_delete_anon
  on public.profiles
  for delete
  to anon
  using (false);

drop policy if exists profiles_delete_authenticated on public.profiles;
create policy profiles_delete_authenticated
  on public.profiles
  for delete
  to authenticated
  using (false);

-- --------------------------------------------------------------------------
-- 3) roasteries policies
-- --------------------------------------------------------------------------
-- select
drop policy if exists roasteries_select_anon on public.roasteries;
create policy roasteries_select_anon
  on public.roasteries
  for select
  to anon
  using (true);

drop policy if exists roasteries_select_authenticated on public.roasteries;
create policy roasteries_select_authenticated
  on public.roasteries
  for select
  to authenticated
  using (true);

-- insert (authenticated only)
drop policy if exists roasteries_insert_anon on public.roasteries;
create policy roasteries_insert_anon
  on public.roasteries
  for insert
  to anon
  with check (false);

drop policy if exists roasteries_insert_authenticated on public.roasteries;
create policy roasteries_insert_authenticated
  on public.roasteries
  for insert
  to authenticated
  with check (true);

-- update/delete (not allowed in mvp)
drop policy if exists roasteries_update_anon on public.roasteries;
create policy roasteries_update_anon
  on public.roasteries
  for update
  to anon
  using (false)
  with check (false);

drop policy if exists roasteries_update_authenticated on public.roasteries;
create policy roasteries_update_authenticated
  on public.roasteries
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists roasteries_delete_anon on public.roasteries;
create policy roasteries_delete_anon
  on public.roasteries
  for delete
  to anon
  using (false);

drop policy if exists roasteries_delete_authenticated on public.roasteries;
create policy roasteries_delete_authenticated
  on public.roasteries
  for delete
  to authenticated
  using (false);

-- --------------------------------------------------------------------------
-- 4) coffees policies
-- --------------------------------------------------------------------------
-- select
drop policy if exists coffees_select_anon on public.coffees;
create policy coffees_select_anon
  on public.coffees
  for select
  to anon
  using (true);

drop policy if exists coffees_select_authenticated on public.coffees;
create policy coffees_select_authenticated
  on public.coffees
  for select
  to authenticated
  using (true);

-- insert (authenticated only)
drop policy if exists coffees_insert_anon on public.coffees;
create policy coffees_insert_anon
  on public.coffees
  for insert
  to anon
  with check (false);

drop policy if exists coffees_insert_authenticated on public.coffees;
create policy coffees_insert_authenticated
  on public.coffees
  for insert
  to authenticated
  with check (auth.uid() = created_by);

-- update/delete (not allowed in mvp)
drop policy if exists coffees_update_anon on public.coffees;
create policy coffees_update_anon
  on public.coffees
  for update
  to anon
  using (false)
  with check (false);

drop policy if exists coffees_update_authenticated on public.coffees;
create policy coffees_update_authenticated
  on public.coffees
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists coffees_delete_anon on public.coffees;
create policy coffees_delete_anon
  on public.coffees
  for delete
  to anon
  using (false);

drop policy if exists coffees_delete_authenticated on public.coffees;
create policy coffees_delete_authenticated
  on public.coffees
  for delete
  to authenticated
  using (auth.uid() = created_by);

-- --------------------------------------------------------------------------
-- 5) ratings policies
-- --------------------------------------------------------------------------
-- select: only owner or admin (no anon access)
drop policy if exists ratings_select_anon on public.ratings;
create policy ratings_select_anon
  on public.ratings
  for select
  to anon
  using (false);

drop policy if exists ratings_select_authenticated_owner on public.ratings;
create policy ratings_select_authenticated_owner
  on public.ratings
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists ratings_select_authenticated_admin on public.ratings;
create policy ratings_select_authenticated_admin
  on public.ratings
  for select
  to authenticated
  using (coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin');

-- insert: only owner (authenticated)
drop policy if exists ratings_insert_anon on public.ratings;
create policy ratings_insert_anon
  on public.ratings
  for insert
  to anon
  with check (false);

drop policy if exists ratings_insert_authenticated on public.ratings;
create policy ratings_insert_authenticated
  on public.ratings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- update: only owner (authenticated)
drop policy if exists ratings_update_anon on public.ratings;
create policy ratings_update_anon
  on public.ratings
  for update
  to anon
  using (false)
  with check (false);

drop policy if exists ratings_update_authenticated on public.ratings;
create policy ratings_update_authenticated
  on public.ratings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- delete: not allowed (except via cascade on auth.users)
drop policy if exists ratings_delete_anon on public.ratings;
create policy ratings_delete_anon
  on public.ratings
  for delete
  to anon
  using (false);

drop policy if exists ratings_delete_authenticated on public.ratings;
create policy ratings_delete_authenticated
  on public.ratings
  for delete
  to authenticated
  using (false);

commit;
