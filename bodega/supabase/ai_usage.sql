-- Applied as migration ai_usage_quota. Server-only quota for the "ask" Edge Function.
create table if not exists public.ai_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default ((now() at time zone 'utc')::date),
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));

-- New count, null when this user is over p_limit, -1 when the whole site is over p_global_limit.
create or replace function public.ai_take_quota(p_user uuid, p_limit integer, p_global_limit integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'utc')::date; v_count integer;
begin
  if (select coalesce(sum(requests), 0) from public.ai_usage where day = v_today) >= p_global_limit then
    return -1;
  end if;
  insert into public.ai_usage as u (user_id, day, requests) values (p_user, v_today, 1)
  on conflict (user_id, day) do update set requests = u.requests + 1 where u.requests < p_limit
  returning u.requests into v_count;
  return v_count;
end; $$;

create or replace function public.ai_refund_quota(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.ai_usage set requests = greatest(requests - 1, 0)
   where user_id = p_user and day = (now() at time zone 'utc')::date;
$$;

revoke all on function public.ai_take_quota(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.ai_refund_quota(uuid) from public, anon, authenticated;
grant execute on function public.ai_take_quota(uuid, integer, integer) to service_role;
grant execute on function public.ai_refund_quota(uuid) to service_role;
