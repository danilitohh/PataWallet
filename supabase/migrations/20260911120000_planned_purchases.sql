-- PataWallet: próximas compras. No crea movimientos ni afecta saldos/presupuestos.
create table if not exists public.planned_purchases (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  amount_minor bigint not null check (amount_minor > 0 and amount_minor <= 999999999999),
  currency text not null default 'COP' check (currency = 'COP'),
  target_date date not null,
  category_id text,
  note text not null default '' check (char_length(note) <= 240),
  status text not null default 'planned' check (status in ('planned', 'purchased', 'cancelled')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, id), foreign key (user_id, category_id) references public.categories(user_id, id)
);
create index if not exists planned_purchases_user_date_idx on public.planned_purchases (user_id, target_date, status);
alter table public.planned_purchases enable row level security;
drop policy if exists "planned_purchases_own_rows" on public.planned_purchases;
create policy "planned_purchases_own_rows" on public.planned_purchases for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.planned_purchases from public, anon;
grant select, insert, update, delete on public.planned_purchases to authenticated;
