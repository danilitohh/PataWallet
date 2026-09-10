-- PataWallet phase 2: authenticated, per-user storage.
-- Apply this migration to project gzsuhlkvaiinphlcqelt, never to a different project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  currency text not null default 'COP' check (currency = 'COP'),
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  kind text not null check (kind in ('asset', 'liability')),
  subtype text not null check (subtype in ('bank', 'cash', 'credit_card')),
  currency text not null default 'COP' check (currency = 'COP'),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create table if not exists public.categories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 50),
  type text not null check (type in ('income', 'expense')),
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('opening', 'income', 'expense', 'transfer', 'card_payment', 'adjustment', 'refund')),
  amount_minor bigint not null check (amount_minor > 0 and amount_minor <= 9000000000000000),
  currency text not null default 'COP' check (currency = 'COP'),
  occurred_at timestamptz not null,
  from_account_id text,
  to_account_id text,
  category_id text,
  merchant_name text check (merchant_name is null or char_length(merchant_name) <= 120),
  note text not null default '' check (char_length(note) <= 500),
  source text not null default 'manual' check (source in ('manual', 'shortcut', 'import', 'demo')),
  status text not null default 'recorded' check (status in ('recorded', 'pending', 'void')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, from_account_id) references public.accounts(user_id, id),
  foreign key (user_id, to_account_id) references public.accounts(user_id, id),
  foreign key (user_id, category_id) references public.categories(user_id, id),
  check (from_account_id is not null or to_account_id is not null),
  check (from_account_id is null or to_account_id is null or from_account_id <> to_account_id)
);

create table if not exists public.budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  limit_minor bigint not null check (limit_minor > 0 and limit_minor <= 9000000000000000),
  currency text not null default 'COP' check (currency = 'COP'),
  created_at timestamptz not null default now(),
  primary key (user_id, month)
);

create table if not exists public.goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  target_minor bigint not null check (target_minor > 0 and target_minor <= 9000000000000000),
  currency text not null default 'COP' check (currency = 'COP'),
  completed_seen boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create table if not exists public.goal_allocations (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id text not null,
  account_id text not null,
  amount_minor bigint not null check (amount_minor > 0 and amount_minor <= 9000000000000000),
  allocated_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, goal_id) references public.goals(user_id, id) on delete cascade,
  foreign key (user_id, account_id) references public.accounts(user_id, id)
);

create table if not exists public.user_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key in ('entered', 'theme', 'hiddenAmounts', 'motion')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists transactions_user_occurred_idx on public.transactions (user_id, occurred_at desc);
create index if not exists transactions_user_from_idx on public.transactions (user_id, from_account_id);
create index if not exists transactions_user_to_idx on public.transactions (user_id, to_account_id);
create index if not exists allocations_user_goal_idx on public.goal_allocations (user_id, goal_id);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.goal_allocations enable row level security;
alter table public.user_settings enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "accounts_own_rows" on public.accounts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categories_own_rows" on public.categories for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "transactions_own_rows" on public.transactions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "budgets_own_rows" on public.budgets for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals_own_rows" on public.goals for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goal_allocations_own_rows" on public.goal_allocations for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_settings_own_rows" on public.user_settings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.profiles, public.accounts, public.categories, public.transactions, public.budgets, public.goals, public.goal_allocations, public.user_settings from anon;
grant select, insert, update, delete on public.profiles, public.accounts, public.categories, public.transactions, public.budgets, public.goals, public.goal_allocations, public.user_settings to authenticated;
