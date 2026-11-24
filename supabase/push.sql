-- Daruma: Push-Mitteilungen (Stufe 2b)
-- 1) Pro Gerät eine „Adresse“ fürs Zustellen von Mitteilungen.
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  keys jsonb not null,
  settings jsonb not null default '{}'::jsonb,
  last_sent date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "eigene Geräte" on public.push_subs;
create policy "eigene Geräte" on public.push_subs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.push_subs to authenticated;
revoke all on public.push_subs from anon;

-- 2) Der Schlüssel, mit dem Daruma seine Mitteilungen unterschreibt.
--    Wird beim ersten Aufruf automatisch erzeugt. Niemand außer dem Server kommt dran.
create table if not exists public.push_keys (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_jwk jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.push_keys enable row level security;
revoke all on public.push_keys from anon, authenticated;
