-- ============================================================================
-- migration: create core schema for przekawowani mvp
-- timestamp (utc): 2025-11-11 12:00:00
-- purpose:
--   - create base tables: profiles, roasteries, coffees, ratings
--   - enable required extensions (unaccent, pgcrypto)
--   - add generated normalization columns for uniqueness (lower+trim+unaccent_pl)
--   - add indexes and unique constraints
--   - create triggers for business rules and denormalized aggregates
--   - create public view with aggregates
--   - enable row level security and define granular policies for anon/authenticated
-- notes:
--   - all sql is lowercase
--   - destructive commands are not used in this initial migration
--   - for rls, policies are split per role (anon vs authenticated) and action
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- 0) extensions
-- --------------------------------------------------------------------------
-- unaccent is required for normalizing text for uniqueness and search.
create extension if not exists unaccent;

-- pgcrypto provides gen_random_uuid() used for primary keys.
create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- 1) tables
-- --------------------------------------------------------------------------

-- helper: immutable diacritic folding for Polish characters
-- we cannot use contrib/unaccent (STABLE) in generated columns; define IMMUTABLE mapper
create or replace function public.unaccent_pl(input text)
returns text
language sql
immutable
parallel safe
as $$
  select translate(input, 'ĄĆĘŁŃÓŚŹŻąćęłńóśźż', 'ACELNOSZZacelnoszz');
$$;

-- 1.1 profiles
-- stores public-facing profile data tied 1:1 to auth.users
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text null,
  normalized_display_name text generated always as (lower(trim(public.unaccent_pl(display_name)))) stored,
  created_at timestamptz not null default now(),
  constraint display_name_chars check (display_name ~ '^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż .-]{1,32}$'),
  constraint display_name_unique unique (normalized_display_name)
);

-- 1.2 roasteries
-- coffee roasters; uniqueness by normalized name+city
create table if not exists public.roasteries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text generated always as (lower(trim(public.unaccent_pl(name)))) stored,
  city text not null,
  normalized_city text generated always as (lower(trim(public.unaccent_pl(city)))) stored,
  created_at timestamptz not null default now(),
  constraint roasteries_unique_name_city unique (normalized_name, normalized_city)
);

-- 1.3 coffees
-- coffees belong to exactly one roastery; keep denormalized aggregates
create table if not exists public.coffees (
  id uuid primary key default gen_random_uuid(),
  roastery_id uuid not null references public.roasteries (id) on delete restrict,
  name text not null,
  normalized_name text generated always as (lower(trim(public.unaccent_pl(name)))) stored,
  avg_main numeric(3,2) null default null,
  ratings_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint coffees_unique_roastery_name unique (roastery_id, normalized_name)
);

-- 1.4 ratings
-- one rating per user per coffee; scales stored as smallint x2 (2..10)
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  coffee_id uuid not null references public.coffees (id) on delete cascade,
  main smallint not null check (main between 2 and 10),
  strength smallint not null check (strength between 2 and 10),
  acidity smallint not null check (acidity between 2 and 10),
  aftertaste smallint not null check (aftertaste between 2 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_rating_per_user_coffee unique (user_id, coffee_id)
);

-- --------------------------------------------------------------------------
-- 2) indexes
-- --------------------------------------------------------------------------
-- profiles
create unique index if not exists profiles_normalized_display_name_key
  on public.profiles (normalized_display_name);

-- roasteries
create unique index if not exists roasteries_unique_normalized_name_city
  on public.roasteries (normalized_name, normalized_city);
create index if not exists roasteries_normalized_name_idx
  on public.roasteries (normalized_name);
create index if not exists roasteries_normalized_city_idx
  on public.roasteries (normalized_city);

-- coffees
create unique index if not exists coffees_unique_roastery_normalized_name
  on public.coffees (roastery_id, normalized_name);
create index if not exists coffees_roastery_id_idx
  on public.coffees (roastery_id);
create index if not exists coffees_ranking_global_idx
  on public.coffees (avg_main desc nulls last, ratings_count desc, id desc);
create index if not exists coffees_ranking_per_roastery_idx
  on public.coffees (roastery_id, avg_main desc nulls last, ratings_count desc, id desc);

-- ratings
create unique index if not exists ratings_unique_user_coffee
  on public.ratings (user_id, coffee_id);
create index if not exists ratings_coffee_id_idx
  on public.ratings (coffee_id);
create index if not exists ratings_user_id_idx
  on public.ratings (user_id);

-- --------------------------------------------------------------------------
-- 3) helper functions and triggers
-- --------------------------------------------------------------------------
-- 3.1 prevent display_name updates after initial set
create or replace function public.fn_prevent_display_name_update()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'update' then
    if new.display_name is distinct from old.display_name and old.display_name is not null then
      raise exception 'display_name cannot be changed once set';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_prevent_display_name_update on public.profiles;
create trigger trg_profiles_prevent_display_name_update
before update on public.profiles
for each row
execute function public.fn_prevent_display_name_update();

-- 3.2 updated_at maintenance for ratings
create or replace function public.fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_ratings_set_updated_at on public.ratings;
create trigger trg_ratings_set_updated_at
before update on public.ratings
for each row
execute function public.fn_set_updated_at();

-- 3.3 refresh denormalized aggregates on coffees after rating changes
-- security definer ensures updates to coffees succeed regardless of rls
create or replace function public.fn_refresh_coffee_aggregates(p_coffee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_avg_main numeric;
begin
  select count(*)::int, avg(main)::numeric
    into v_count, v_avg_main
  from public.ratings
  where coffee_id = p_coffee_id;

  update public.coffees c
     set ratings_count = coalesce(v_count, 0),
         avg_main = case when coalesce(v_count, 0) > 0
                         then round((coalesce(v_avg_main, 0) / 2.0)::numeric, 2)
                         else null end
   where c.id = p_coffee_id;
end;
$$;

-- ensure owner is a superuser (postgres) in supabase migrations by default
comment on function public.fn_refresh_coffee_aggregates(uuid) is
  'recomputes coffees.ratings_count and coffees.avg_main from ratings.main (×2 scale)';

create or replace function public.fn_trigger_refresh_coffee_aggregates()
returns trigger
language plpgsql
as $$
begin
  perform public.fn_refresh_coffee_aggregates(
    case when tg_op = 'insert' then new.coffee_id
         when tg_op = 'update' then new.coffee_id
         when tg_op = 'delete' then old.coffee_id
    end
  );
  return null;
end;
$$;

drop trigger if exists trg_ratings_refresh_coffee_aggregates_ins on public.ratings;
drop trigger if exists trg_ratings_refresh_coffee_aggregates_upd on public.ratings;
drop trigger if exists trg_ratings_refresh_coffee_aggregates_del on public.ratings;

create trigger trg_ratings_refresh_coffee_aggregates_ins
after insert on public.ratings
for each row
execute function public.fn_trigger_refresh_coffee_aggregates();

create trigger trg_ratings_refresh_coffee_aggregates_upd
after update on public.ratings
for each row
execute function public.fn_trigger_refresh_coffee_aggregates();

create trigger trg_ratings_refresh_coffee_aggregates_del
after delete on public.ratings
for each row
execute function public.fn_trigger_refresh_coffee_aggregates();

-- --------------------------------------------------------------------------
-- 4) public view for aggregates (no rls on views; relies on base table policies)
-- --------------------------------------------------------------------------
create or replace view public.coffee_aggregates as
select
  c.id as coffee_id,
  c.roastery_id,
  c.name,
  c.avg_main,
  c.ratings_count,
  (c.ratings_count < 3) as small_sample,
  c.created_at
from public.coffees c;

comment on view public.coffee_aggregates is
  'public view exposing denormalized aggregates for coffees; small_sample when ratings_count < 3';

-- --------------------------------------------------------------------------
-- 5) row level security and policies
-- --------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.roasteries enable row level security;
alter table public.coffees enable row level security;
alter table public.ratings enable row level security;

-- 5.1 profiles policies
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

-- 5.2 roasteries policies
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

-- 5.3 coffees policies
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
  with check (true);

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
  using (false);

-- 5.4 ratings policies
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


