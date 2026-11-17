-- Daily usage counter for the «دستیار» assistant edge function (rate limiting).
create table if not exists public.ai_usage(who text not null, day date not null default (now() at time zone 'Asia/Baghdad')::date, n int not null default 0, primary key(who, day));
alter table public.ai_usage enable row level security;
create or replace function public.ai_bump(p_who text) returns int language sql security definer set search_path = public as $$
  insert into public.ai_usage(who, day, n) values (p_who, (now() at time zone 'Asia/Baghdad')::date, 1)
  on conflict (who, day) do update set n = public.ai_usage.n + 1 returning n
$$;
revoke all on function public.ai_bump(text) from public, anon, authenticated;
grant execute on function public.ai_bump(text) to service_role;
