-- Fix: ensure trigger function uses TG_OP safely (normalized)
-- This migration updates only the trigger function definition.

create or replace function public.fn_trigger_refresh_coffee_aggregates()
returns trigger
language plpgsql
as $$
begin
  perform public.fn_refresh_coffee_aggregates(
    case when lower(tg_op) = 'insert' then new.coffee_id
         when lower(tg_op) = 'update' then new.coffee_id
         when lower(tg_op) = 'delete' then old.coffee_id
    end
  );
  return null;
end;
$$;

