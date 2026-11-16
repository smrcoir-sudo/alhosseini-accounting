-- Time-limited logins for the Hesabati demo site (hesabati-demo.vercel.app).
-- Admins of the main app issue username/password pairs valid for 1 day / 1 week;
-- the demo's edge middleware checks them through the two anon-callable functions below.
create table if not exists public.demo_access(
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  pass_hash text not null,
  note text default '',
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  last_login timestamptz,
  logins int not null default 0,
  fails int not null default 0,
  last_fail timestamptz
);
create table if not exists public.demo_sessions(
  token text primary key,
  username text not null references public.demo_access(username) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.demo_access enable row level security;
alter table public.demo_sessions enable row level security;
drop policy if exists demo_access_admin_read on public.demo_access;
create policy demo_access_admin_read on public.demo_access for select to authenticated using (public.is_admin());
-- no direct write policies: all writes go through the functions below

create or replace function public.demo_create(p_user text, p_pass text, p_days int, p_note text default '')
returns json language plpgsql security definer set search_path = public, extensions as $$
declare u text := lower(trim(p_user)); e timestamptz;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if u !~ '^[a-z0-9._-]{3,32}$' then raise exception 'invalid_username'; end if;
  if length(coalesce(p_pass,'')) < 8 then raise exception 'weak_password'; end if;
  if p_days not between 1 and 31 then raise exception 'invalid_days'; end if;
  e := now() + make_interval(days => p_days);
  insert into public.demo_access(username, pass_hash, note, expires_at)
  values (u, crypt(p_pass, gen_salt('bf', 8)), coalesce(p_note,''), e)
  on conflict (username) do update set pass_hash = excluded.pass_hash, note = excluded.note, expires_at = excluded.expires_at,
    revoked = false, fails = 0, created_at = now(), created_by = auth.uid();
  delete from public.demo_sessions where username = u;
  return json_build_object('username', u, 'expires_at', e);
end $$;

create or replace function public.demo_revoke(p_user text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.demo_access set revoked = true where username = lower(trim(p_user));
  delete from public.demo_sessions where username = lower(trim(p_user));
end $$;

create or replace function public.demo_delete(p_user text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.demo_access where username = lower(trim(p_user));
end $$;

-- called by the demo site's middleware (anon)
create or replace function public.demo_login(p_user text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r public.demo_access; t text;
begin
  select * into r from public.demo_access where username = lower(trim(p_user));
  if not found then perform pg_sleep(0.3); return json_build_object('ok', false, 'err', 'bad'); end if;
  if r.fails >= 10 and r.last_fail > now() - interval '15 minutes' then return json_build_object('ok', false, 'err', 'locked'); end if;
  if r.pass_hash <> crypt(coalesce(p_pass,''), r.pass_hash) then
    update public.demo_access set fails = case when last_fail > now() - interval '15 minutes' then fails + 1 else 1 end, last_fail = now() where id = r.id;
    return json_build_object('ok', false, 'err', 'bad');
  end if;
  if r.revoked then return json_build_object('ok', false, 'err', 'revoked'); end if;
  if r.expires_at <= now() then return json_build_object('ok', false, 'err', 'expired'); end if;
  t := encode(gen_random_bytes(24), 'hex');
  insert into public.demo_sessions(token, username, expires_at) values (t, r.username, r.expires_at);
  update public.demo_access set last_login = now(), logins = logins + 1, fails = 0 where id = r.id;
  delete from public.demo_sessions where expires_at < now();
  return json_build_object('ok', true, 'token', t, 'username', r.username, 'note', r.note, 'expires_at', r.expires_at);
end $$;

create or replace function public.demo_check(p_token text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.demo_sessions s join public.demo_access a on a.username = s.username
    where s.token = p_token and s.expires_at > now() and a.expires_at > now() and not a.revoked)
$$;

revoke all on function public.demo_create(text,text,int,text), public.demo_revoke(text), public.demo_delete(text), public.demo_login(text,text), public.demo_check(text) from public;
grant execute on function public.demo_create(text,text,int,text), public.demo_revoke(text), public.demo_delete(text) to authenticated;
grant execute on function public.demo_login(text,text), public.demo_check(text) to anon, authenticated;
