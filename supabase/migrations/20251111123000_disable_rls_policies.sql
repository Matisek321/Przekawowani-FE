-- ============================================================================
-- migration: disable RLS and remove policies (profiles, roasteries, coffees, ratings)
-- timestamp (utc): 2025-11-11 12:30:00
-- purpose:
--   - drop previously created row level security policies
--   - disable row level security on affected tables
-- ============================================================================

begin;

-- profiles
alter table if exists public.profiles disable row level security;
drop policy if exists profiles_select_anon on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_insert_anon on public.profiles;
drop policy if exists profiles_insert_authenticated on public.profiles;
drop policy if exists profiles_update_anon on public.profiles;
drop policy if exists profiles_update_authenticated on public.profiles;
drop policy if exists profiles_delete_anon on public.profiles;
drop policy if exists profiles_delete_authenticated on public.profiles;

-- roasteries
alter table if exists public.roasteries disable row level security;
drop policy if exists roasteries_select_anon on public.roasteries;
drop policy if exists roasteries_select_authenticated on public.roasteries;
drop policy if exists roasteries_insert_anon on public.roasteries;
drop policy if exists roasteries_insert_authenticated on public.roasteries;
drop policy if exists roasteries_update_anon on public.roasteries;
drop policy if exists roasteries_update_authenticated on public.roasteries;
drop policy if exists roasteries_delete_anon on public.roasteries;
drop policy if exists roasteries_delete_authenticated on public.roasteries;

-- coffees
alter table if exists public.coffees disable row level security;
drop policy if exists coffees_select_anon on public.coffees;
drop policy if exists coffees_select_authenticated on public.coffees;
drop policy if exists coffees_insert_anon on public.coffees;
drop policy if exists coffees_insert_authenticated on public.coffees;
drop policy if exists coffees_update_anon on public.coffees;
drop policy if exists coffees_update_authenticated on public.coffees;
drop policy if exists coffees_delete_anon on public.coffees;
drop policy if exists coffees_delete_authenticated on public.coffees;

-- ratings
alter table if exists public.ratings disable row level security;
drop policy if exists ratings_select_anon on public.ratings;
drop policy if exists ratings_select_authenticated_owner on public.ratings;
drop policy if exists ratings_select_authenticated_admin on public.ratings;
drop policy if exists ratings_insert_anon on public.ratings;
drop policy if exists ratings_insert_authenticated on public.ratings;
drop policy if exists ratings_update_anon on public.ratings;
drop policy if exists ratings_update_authenticated on public.ratings;
drop policy if exists ratings_delete_anon on public.ratings;
drop policy if exists ratings_delete_authenticated on public.ratings;

commit;


