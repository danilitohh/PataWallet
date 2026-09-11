-- PataWallet phase 3: per-installation Web Push preferences, durable outbox
-- and distributed test throttling. Apply only after both phase 2 migrations.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 20 and 2048 and endpoint like 'https://%'),
  p256dh text not null check (char_length(p256dh) between 20 and 512),
  auth_key text not null check (char_length(auth_key) between 8 and 256),
  expiration_time timestamptz,
  notify_movements boolean not null default true,
  notify_budgets boolean not null default true,
  notify_review boolean not null default false,
  show_sensitive_details boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz,
  unique (user_id, id)
);

create table if not exists public.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null check (char_length(event_key) between 8 and 180),
  event_kind text not null check (event_kind in ('movement', 'budget', 'review')),
  payload jsonb not null default '{}'::jsonb check (pg_column_size(payload) <= 4096),
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed', 'expired')),
  attempts smallint not null default 0 check (attempts between 0 and 8),
  next_attempt_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (user_id, event_key)
);

create table if not exists public.push_deliveries (
  outbox_id bigint not null references public.push_outbox(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null check (status in ('accepted', 'transient', 'permanent', 'configuration', 'skipped')),
  attempts smallint not null default 1 check (attempts between 1 and 8),
  provider_status integer,
  updated_at timestamptz not null default now(),
  primary key (outbox_id, subscription_id)
);

create table if not exists public.push_test_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  next_allowed_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_active_idx on public.push_subscriptions (user_id, active);
create index if not exists push_outbox_due_idx on public.push_outbox (status, next_attempt_at) where status in ('pending', 'failed', 'processing');
create index if not exists push_outbox_user_created_idx on public.push_outbox (user_id, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.push_outbox enable row level security;
alter table public.push_deliveries enable row level security;
alter table public.push_test_limits enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions
for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.push_subscriptions, public.push_outbox, public.push_deliveries, public.push_test_limits from anon, authenticated;
grant select on public.push_subscriptions to authenticated;

create or replace function public.reserve_push_test_slot(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_limit timestamptz;
begin
  if p_user_id is null then return false; end if;
  insert into public.push_test_limits (user_id, next_allowed_at)
  values (p_user_id, now() + interval '60 seconds')
  on conflict (user_id) do nothing
  returning next_allowed_at into current_limit;
  if found then return true; end if;
  update public.push_test_limits
  set next_allowed_at = now() + interval '60 seconds', updated_at = now()
  where user_id = p_user_id and next_allowed_at <= now()
  returning next_allowed_at into current_limit;
  return found;
end;
$$;

revoke all on function public.reserve_push_test_slot(uuid) from public, anon, authenticated;
grant execute on function public.reserve_push_test_slot(uuid) to service_role;

create or replace function public.claim_push_outbox(p_limit integer default 20)
returns setof public.push_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select id from public.push_outbox
    where status in ('pending', 'failed', 'processing') and next_attempt_at <= now() and expires_at > now() and attempts < 5
    order by created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 50)
  )
  update public.push_outbox item
  set status = 'processing', attempts = item.attempts + 1, next_attempt_at = now() + interval '5 minutes'
  from due
  where item.id = due.id
  returning item.*;
end;
$$;

revoke all on function public.claim_push_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_push_outbox(integer) to service_role;

create or replace function private.enqueue_transaction_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_timezone text := 'America/Bogota';
  month_value text;
  budget_limit bigint;
  spent_value bigint;
  threshold_value integer;
begin
  if current_setting('patawallet.skip_movement_push', true) = 'true' then return null; end if;
  if new.status <> 'recorded' or new.type not in ('expense', 'refund') then return null; end if;
  select timezone into profile_timezone from public.profiles where id = new.user_id;
  month_value := to_char(new.occurred_at at time zone coalesce(profile_timezone, 'America/Bogota'), 'YYYY-MM');

  insert into public.push_outbox (user_id, event_key, event_kind, payload)
  values (new.user_id, 'movement:' || new.id || ':v' || new.version::text, 'movement', jsonb_build_object('transaction_id', new.id))
  on conflict (user_id, event_key) do nothing;

  select limit_minor into budget_limit from public.budgets where user_id = new.user_id and month = month_value;
  if budget_limit is null then return null; end if;
  select coalesce(sum(case when type = 'expense' then amount_minor when type = 'refund' then -amount_minor else 0 end), 0)
  into spent_value from public.transactions
  where user_id = new.user_id and status = 'recorded'
    and to_char(occurred_at at time zone coalesce(profile_timezone, 'America/Bogota'), 'YYYY-MM') = month_value;
  threshold_value := case when spent_value >= budget_limit then 100 when spent_value * 100 >= budget_limit * 80 then 80 else null end;
  if threshold_value is not null then
    insert into public.push_outbox (user_id, event_key, event_kind, payload)
    values (new.user_id, 'budget:' || month_value || ':' || threshold_value::text, 'budget', jsonb_build_object('month', month_value, 'threshold', threshold_value))
    on conflict (user_id, event_key) do nothing;
  end if;
  return null;
end;
$$;

revoke all on function private.enqueue_transaction_push() from public, anon, authenticated;
drop trigger if exists transactions_enqueue_push on public.transactions;
create constraint trigger transactions_enqueue_push
after insert or update of status, version on public.transactions
deferrable initially deferred
for each row execute function private.enqueue_transaction_push();

-- Tables intentionally remain writable only by the server's service role.
-- The browser can only read its own subscription metadata through RLS.
