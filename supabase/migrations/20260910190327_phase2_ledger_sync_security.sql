-- PataWallet phase 2: atomic ledger writes, optimistic concurrency and
-- idempotent browser retries. Apply only after 20260910190000.

create schema if not exists private;

alter table public.accounts add column if not exists version integer not null default 1 check (version > 0);
alter table public.accounts add column if not exists updated_at timestamptz not null default now();
alter table public.categories add column if not exists version integer not null default 1 check (version > 0);
alter table public.categories add column if not exists updated_at timestamptz not null default now();
alter table public.transactions add column if not exists direction text check (direction is null or direction in ('increase', 'decrease'));
alter table public.budgets add column if not exists version integer not null default 1 check (version > 0);
alter table public.budgets add column if not exists updated_at timestamptz not null default now();
alter table public.goals add column if not exists version integer not null default 1 check (version > 0);
alter table public.goals add column if not exists updated_at timestamptz not null default now();
alter table public.goal_allocations add column if not exists version integer not null default 1 check (version > 0);
alter table public.goal_allocations add column if not exists updated_at timestamptz not null default now();
alter table public.user_settings add column if not exists version integer not null default 1 check (version > 0);

alter table public.accounts
  add constraint accounts_kind_subtype_consistent
  check (
    (kind = 'asset' and subtype in ('bank', 'cash'))
    or (kind = 'liability' and subtype = 'credit_card')
  ) not valid;
alter table public.accounts validate constraint accounts_kind_subtype_consistent;

alter table public.user_settings
  add constraint user_settings_value_shape
  check (
    (key in ('entered', 'hiddenAmounts') and jsonb_typeof(value) = 'boolean')
    or (key = 'theme' and value in ('"system"'::jsonb, '"light"'::jsonb, '"dark"'::jsonb))
    or (key = 'motion' and value in ('"system"'::jsonb, '"soft"'::jsonb, '"off"'::jsonb))
  ) not valid;
alter table public.user_settings validate constraint user_settings_value_shape;

alter table public.transactions add constraint transactions_phase2_amount_range check (amount_minor <= 999999999999) not valid;
alter table public.transactions validate constraint transactions_phase2_amount_range;
alter table public.budgets add constraint budgets_phase2_amount_range check (limit_minor <= 999999999999) not valid;
alter table public.budgets validate constraint budgets_phase2_amount_range;
alter table public.goals add constraint goals_phase2_amount_range check (target_minor <= 999999999999) not valid;
alter table public.goals validate constraint goals_phase2_amount_range;
alter table public.goal_allocations add constraint allocations_phase2_amount_range check (amount_minor <= 999999999999) not valid;
alter table public.goal_allocations validate constraint allocations_phase2_amount_range;

create table if not exists public.ledger_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id text not null,
  account_id text not null,
  entry_index smallint not null check (entry_index between 0 and 1),
  delta_minor bigint not null check (delta_minor <> 0 and abs(delta_minor) <= 999999999999),
  created_at timestamptz not null default now(),
  unique (user_id, transaction_id, entry_index),
  foreign key (user_id, transaction_id) references public.transactions(user_id, id) on delete cascade,
  foreign key (user_id, account_id) references public.accounts(user_id, id)
);

create table if not exists private.transaction_mutation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  request_hash text not null,
  transaction_id text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);

create table if not exists private.allocation_mutation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  request_hash text not null,
  allocation_id text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);

create index if not exists accounts_user_id_idx on public.accounts (user_id);
create index if not exists categories_user_id_idx on public.categories (user_id);
create index if not exists budgets_user_id_idx on public.budgets (user_id);
create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists goal_allocations_user_account_idx on public.goal_allocations (user_id, account_id);
create index if not exists ledger_entries_user_transaction_idx on public.ledger_entries (user_id, transaction_id);
create index if not exists ledger_entries_user_account_idx on public.ledger_entries (user_id, account_id);
create index if not exists mutation_receipts_created_idx on private.transaction_mutation_receipts (created_at);
create index if not exists allocation_receipts_created_idx on private.allocation_mutation_receipts (created_at);

alter table public.ledger_entries enable row level security;

create policy "ledger_entries_select_own"
on public.ledger_entries for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function private.rebuild_transaction_ledger(p_user_id uuid, p_transaction_id text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  tx public.transactions%rowtype;
  from_kind text;
  to_kind text;
begin
  delete from public.ledger_entries
  where user_id = p_user_id and transaction_id = p_transaction_id;

  select * into tx
  from public.transactions
  where user_id = p_user_id and id = p_transaction_id;

  if not found or tx.status = 'void' then
    return;
  end if;

  if tx.from_account_id is not null then
    select kind into from_kind from public.accounts
    where user_id = p_user_id and id = tx.from_account_id;
  end if;
  if tx.to_account_id is not null then
    select kind into to_kind from public.accounts
    where user_id = p_user_id and id = tx.to_account_id;
  end if;

  if tx.type in ('opening', 'income') then
    insert into public.ledger_entries (user_id, transaction_id, account_id, entry_index, delta_minor)
    values (p_user_id, tx.id, tx.to_account_id, 0, tx.amount_minor);
  elsif tx.type = 'expense' then
    insert into public.ledger_entries (user_id, transaction_id, account_id, entry_index, delta_minor)
    values (p_user_id, tx.id, tx.from_account_id, 0, case when from_kind = 'liability' then tx.amount_minor else -tx.amount_minor end);
  elsif tx.type = 'transfer' then
    insert into public.ledger_entries (user_id, transaction_id, account_id, entry_index, delta_minor)
    values
      (p_user_id, tx.id, tx.from_account_id, 0, -tx.amount_minor),
      (p_user_id, tx.id, tx.to_account_id, 1, tx.amount_minor);
  elsif tx.type = 'card_payment' then
    insert into public.ledger_entries (user_id, transaction_id, account_id, entry_index, delta_minor)
    values
      (p_user_id, tx.id, tx.from_account_id, 0, -tx.amount_minor),
      (p_user_id, tx.id, tx.to_account_id, 1, -tx.amount_minor);
  elsif tx.type = 'refund' then
    insert into public.ledger_entries (user_id, transaction_id, account_id, entry_index, delta_minor)
    values (
      p_user_id,
      tx.id,
      coalesce(tx.to_account_id, tx.from_account_id),
      0,
      case when coalesce(to_kind, from_kind) = 'liability' then -tx.amount_minor else tx.amount_minor end
    );
  elsif tx.type = 'adjustment' then
    insert into public.ledger_entries (user_id, transaction_id, account_id, entry_index, delta_minor)
    values (
      p_user_id,
      tx.id,
      coalesce(tx.to_account_id, tx.from_account_id),
      0,
      case when tx.direction = 'decrease' then -tx.amount_minor else tx.amount_minor end
    );
  end if;
end;
$$;

create or replace function private.apply_transaction_mutation(
  p_operation_id uuid,
  p_action text,
  p_payload jsonb,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_digest text := md5(p_action || ':' || coalesce(p_payload::text, 'null') || ':' || coalesce(p_expected_version::text, 'null'));
  prior private.transaction_mutation_receipts%rowtype;
  current_tx public.transactions%rowtype;
  saved_tx public.transactions%rowtype;
  tx_id text := p_payload->>'id';
  tx_type text := p_payload->>'type';
  amount_value bigint;
  from_id text := nullif(p_payload->>'from_account_id', '');
  to_id text := nullif(p_payload->>'to_account_id', '');
  category_value text := nullif(p_payload->>'category_id', '');
  from_kind text;
  to_kind text;
  category_type text;
  result_value jsonb;
begin
  if caller_id is null then
    raise exception using errcode = 'PT401', message = 'Sesión vencida o ausente.';
  end if;
  if p_operation_id is null or p_action is null or p_action not in ('save', 'void', 'restore') or tx_id is null or tx_id = '' or char_length(tx_id) > 180 then
    raise exception using errcode = '22023', message = 'Operación de movimiento inválida.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text || ':' || p_operation_id::text, 0));

  select * into prior
  from private.transaction_mutation_receipts
  where user_id = caller_id and operation_id = p_operation_id;
  if found then
    if prior.request_hash <> request_digest then
      raise exception using errcode = 'PT409', message = 'El identificador de reintento ya fue usado con datos diferentes.';
    end if;
    return prior.result;
  end if;

  if p_action in ('void', 'restore') then
    select * into current_tx from public.transactions
    where user_id = caller_id and id = tx_id
    for update;
    if not found then
      raise exception using errcode = 'PT404', message = 'Movimiento no encontrado.';
    end if;
    if p_expected_version is null or current_tx.version <> p_expected_version then
      raise exception using errcode = 'PT409', message = 'El movimiento cambió en otro dispositivo.';
    end if;
    update public.transactions
    set status = case when p_action = 'void' then 'void' else 'recorded' end,
        version = version + 1,
        updated_at = now()
    where user_id = caller_id and id = tx_id
    returning * into saved_tx;
  elsif p_action = 'save' then
    if tx_type not in ('opening', 'income', 'expense', 'transfer', 'card_payment', 'adjustment', 'refund') then
      raise exception using errcode = '22023', message = 'Tipo de movimiento inválido.';
    end if;
    amount_value := (p_payload->>'amount_minor')::bigint;
    if amount_value <= 0 or amount_value > 999999999999 then
      raise exception using errcode = '22003', message = 'Monto fuera del rango permitido.';
    end if;
    if coalesce(p_payload->>'currency', 'COP') <> 'COP' then
      raise exception using errcode = '22023', message = 'La moneda no coincide con el perfil.';
    end if;
    if coalesce(nullif(p_payload->>'source', ''), 'manual') = 'demo' then
      raise exception using errcode = '22023', message = 'Los movimientos de demostración no se sincronizan con cuentas reales.';
    end if;

    if from_id is not null then
      select kind into from_kind from public.accounts where user_id = caller_id and id = from_id;
      if not found then raise exception using errcode = '23503', message = 'La cuenta de origen no pertenece al usuario.'; end if;
    end if;
    if to_id is not null then
      select kind into to_kind from public.accounts where user_id = caller_id and id = to_id;
      if not found then raise exception using errcode = '23503', message = 'La cuenta de destino no pertenece al usuario.'; end if;
    end if;
    if category_value is not null then
      select type into category_type from public.categories where user_id = caller_id and id = category_value;
      if not found then raise exception using errcode = '23503', message = 'La categoría no pertenece al usuario.'; end if;
    end if;

    if tx_type = 'opening' and (from_id is not null or to_id is null) then raise exception using errcode = '23514', message = 'La apertura requiere una cuenta destino.'; end if;
    if tx_type = 'income' and (from_id is not null or to_kind is distinct from 'asset' or category_value is null or category_type is distinct from 'income') then raise exception using errcode = '23514', message = 'El ingreso requiere activo y categoría de ingreso.'; end if;
    if tx_type = 'expense' and (from_id is null or to_id is not null or category_value is null or category_type is distinct from 'expense') then raise exception using errcode = '23514', message = 'El gasto requiere cuenta y categoría de gasto.'; end if;
    if tx_type = 'transfer' and (from_kind <> 'asset' or to_kind <> 'asset' or from_id = to_id) then raise exception using errcode = '23514', message = 'La transferencia requiere dos activos propios diferentes.'; end if;
    if tx_type = 'card_payment' and (from_kind <> 'asset' or to_kind <> 'liability' or from_id = to_id) then raise exception using errcode = '23514', message = 'El pago requiere un activo y una tarjeta propios.'; end if;
    if tx_type in ('opening', 'transfer', 'card_payment', 'adjustment') and category_value is not null then raise exception using errcode = '23514', message = 'Este movimiento no utiliza categoría.'; end if;
    if tx_type = 'refund' and ((from_id is null) = (to_id is null) or category_value is null or category_type is distinct from 'expense') then raise exception using errcode = '23514', message = 'El reembolso requiere una cuenta propia y categoría de gasto.'; end if;
    if tx_type = 'adjustment' and ((from_id is null) = (to_id is null) or nullif(p_payload->>'direction', '') is null) then raise exception using errcode = '23514', message = 'El ajuste requiere una cuenta y dirección explícita.'; end if;

    select * into current_tx from public.transactions
    where user_id = caller_id and id = tx_id
    for update;

    if found then
      if p_expected_version is null or current_tx.version <> p_expected_version then
        raise exception using errcode = 'PT409', message = 'El movimiento cambió en otro dispositivo.';
      end if;
      update public.transactions set
        type = tx_type,
        amount_minor = amount_value,
        currency = 'COP',
        occurred_at = (p_payload->>'occurred_at')::timestamptz,
        from_account_id = from_id,
        to_account_id = to_id,
        category_id = category_value,
        merchant_name = nullif(p_payload->>'merchant_name', ''),
        note = coalesce(p_payload->>'note', ''),
        source = coalesce(nullif(p_payload->>'source', ''), current_tx.source),
        status = 'recorded',
        direction = nullif(p_payload->>'direction', ''),
        version = current_tx.version + 1,
        updated_at = now()
      where user_id = caller_id and id = tx_id
      returning * into saved_tx;
    else
      if p_expected_version is not null then
        raise exception using errcode = 'PT409', message = 'El movimiento esperado ya no existe.';
      end if;
      insert into public.transactions (
        id, user_id, type, amount_minor, currency, occurred_at, from_account_id,
        to_account_id, category_id, merchant_name, note, source, status, direction, version
      ) values (
        tx_id, caller_id, tx_type, amount_value, 'COP', (p_payload->>'occurred_at')::timestamptz,
        from_id, to_id, category_value, nullif(p_payload->>'merchant_name', ''),
        coalesce(p_payload->>'note', ''), coalesce(nullif(p_payload->>'source', ''), 'manual'),
        'recorded', nullif(p_payload->>'direction', ''), 1
      ) returning * into saved_tx;
    end if;
  end if;

  perform private.rebuild_transaction_ledger(caller_id, tx_id);
  result_value := jsonb_build_object('transaction', to_jsonb(saved_tx), 'operation_id', p_operation_id);
  insert into private.transaction_mutation_receipts (user_id, operation_id, request_hash, transaction_id, result)
  values (caller_id, p_operation_id, request_digest, tx_id, result_value);
  return result_value;
end;
$$;

create or replace function public.mutate_transaction(
  p_operation_id uuid,
  p_action text,
  p_payload jsonb,
  p_expected_version integer default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.apply_transaction_mutation(p_operation_id, p_action, p_payload, p_expected_version);
$$;

create or replace function private.apply_goal_allocation(
  p_operation_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_digest text := md5(coalesce(p_payload::text, 'null'));
  prior private.allocation_mutation_receipts%rowtype;
  allocation_id text := p_payload->>'id';
  goal_id_value text := p_payload->>'goal_id';
  account_id_value text := p_payload->>'account_id';
  amount_value bigint := (p_payload->>'amount_minor')::bigint;
  account_kind text;
  goal_target bigint;
  account_balance bigint;
  already_reserved bigint;
  goal_reserved bigint;
  saved_allocation public.goal_allocations%rowtype;
  saved_goal public.goals%rowtype;
  result_value jsonb;
begin
  if caller_id is null then raise exception using errcode = 'PT401', message = 'Sesión vencida o ausente.'; end if;
  if p_operation_id is null
     or allocation_id is null or allocation_id = '' or char_length(allocation_id) > 180
     or goal_id_value is null or goal_id_value = '' or char_length(goal_id_value) > 180
     or account_id_value is null or account_id_value = '' or char_length(account_id_value) > 180 then
    raise exception using errcode = '22023', message = 'Reserva inválida.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text || ':' || p_operation_id::text, 0));

  select * into prior from private.allocation_mutation_receipts
  where user_id = caller_id and operation_id = p_operation_id;
  if found then
    if prior.request_hash <> request_digest then
      raise exception using errcode = 'PT409', message = 'El identificador de reintento ya fue usado con datos diferentes.';
    end if;
    return prior.result;
  end if;

  if amount_value <= 0 or amount_value > 999999999999 then
    raise exception using errcode = '22003', message = 'Monto de reserva fuera del rango permitido.';
  end if;

  select kind into account_kind from public.accounts
  where user_id = caller_id and id = account_id_value
  for update;
  if not found or account_kind <> 'asset' then
    raise exception using errcode = '23503', message = 'La reserva requiere un activo propio.';
  end if;

  select target_minor into goal_target from public.goals
  where user_id = caller_id and id = goal_id_value
  for update;
  if not found then raise exception using errcode = '23503', message = 'La meta no pertenece al usuario.'; end if;

  select coalesce(sum(delta_minor), 0) into account_balance
  from public.ledger_entries
  where user_id = caller_id and account_id = account_id_value;
  select coalesce(sum(amount_minor), 0) into already_reserved
  from public.goal_allocations
  where user_id = caller_id and account_id = account_id_value;
  if already_reserved + amount_value > account_balance then
    raise exception using errcode = '23514', message = 'La reserva no está cubierta por el saldo registrado.';
  end if;
  select coalesce(sum(amount_minor), 0) into goal_reserved
  from public.goal_allocations
  where user_id = caller_id and goal_id = goal_id_value;
  if goal_reserved + amount_value > goal_target then
    raise exception using errcode = '23514', message = 'La reserva supera el objetivo pendiente de la meta.';
  end if;

  insert into public.goal_allocations (id, user_id, goal_id, account_id, amount_minor, allocated_on, version)
  values (allocation_id, caller_id, goal_id_value, account_id_value, amount_value, (p_payload->>'allocated_on')::date, 1)
  returning * into saved_allocation;

  update public.goals
  set completed_seen = completed_seen or (
        select coalesce(sum(amount_minor), 0) >= goal_target
        from public.goal_allocations where user_id = caller_id and goal_id = goal_id_value
      ),
      version = version + 1,
      updated_at = now()
  where user_id = caller_id and id = goal_id_value
  returning * into saved_goal;

  result_value := jsonb_build_object('allocation', to_jsonb(saved_allocation), 'goal', to_jsonb(saved_goal), 'operation_id', p_operation_id);
  insert into private.allocation_mutation_receipts (user_id, operation_id, request_hash, allocation_id, result)
  values (caller_id, p_operation_id, request_digest, allocation_id, result_value);
  return result_value;
end;
$$;

create or replace function public.add_goal_allocation(p_operation_id uuid, p_payload jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.apply_goal_allocation(p_operation_id, p_payload);
$$;

revoke all on public.ledger_entries from anon;
revoke insert, update, delete on public.transactions from authenticated;
revoke insert, update, delete on public.ledger_entries from authenticated;
revoke insert, update, delete on public.goal_allocations from authenticated;
revoke delete on public.profiles, public.accounts, public.categories, public.budgets, public.user_settings from authenticated;
revoke update on public.goals from authenticated;
grant select on public.transactions, public.ledger_entries to authenticated;
grant select on public.goal_allocations to authenticated;

revoke all on schema private from public, anon;
revoke all on private.transaction_mutation_receipts from public, anon, authenticated;
revoke all on private.allocation_mutation_receipts from public, anon, authenticated;
revoke all on function private.apply_transaction_mutation(uuid, text, jsonb, integer) from public, anon;
revoke all on function private.rebuild_transaction_ledger(uuid, text) from public, anon, authenticated;
revoke all on function private.apply_goal_allocation(uuid, jsonb) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.apply_transaction_mutation(uuid, text, jsonb, integer) to authenticated;
grant execute on function private.apply_goal_allocation(uuid, jsonb) to authenticated;

revoke all on function public.mutate_transaction(uuid, text, jsonb, integer) from public, anon;
grant execute on function public.mutate_transaction(uuid, text, jsonb, integer) to authenticated;
revoke all on function public.add_goal_allocation(uuid, jsonb) from public, anon;
grant execute on function public.add_goal_allocation(uuid, jsonb) to authenticated;

-- Backfill ledger entries for existing active movements using the same rules.
do $$
declare
  row_value record;
begin
  for row_value in select user_id, id from public.transactions order by user_id, id loop
    perform private.rebuild_transaction_ledger(row_value.user_id, row_value.id);
  end loop;
end $$;
