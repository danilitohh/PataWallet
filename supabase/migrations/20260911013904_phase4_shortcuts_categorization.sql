-- PataWallet phase 4: limited Shortcuts credentials, deterministic intake,
-- review inbox and category rules. Apply only after the phase 2 and 3 migrations.

create table public.device_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'iPhone' check (char_length(label) between 1 and 60),
  token_hash text not null unique check (char_length(token_hash) = 64),
  token_expires_at timestamptz not null,
  template_version text not null check (char_length(template_version) between 1 and 30),
  status text not null default 'active' check (status in ('active', 'revoked', 'incomplete')),
  linked_at timestamptz not null default now(),
  last_test_at timestamptz,
  last_event_at timestamptz,
  automation_declared_at timestamptz,
  revoked_at timestamptz,
  unique (user_id, id)
);

create table private.pairing_tickets (
  ticket_hash text primary key check (char_length(ticket_hash) = 64),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table private.shortcut_rate_limits (
  device_id uuid not null references public.device_links(id) on delete cascade,
  action text not null check (action in ('test', 'event')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 120),
  primary key (device_id, action)
);

create table public.card_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_alias text not null check (char_length(card_alias) between 1 and 80),
  normalized_alias text not null check (char_length(normalized_alias) between 1 and 80),
  account_id text not null,
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_alias),
  foreign key (user_id, account_id) references public.accounts(user_id, id)
);

create table public.category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_type text not null default 'merchant_exact' check (match_type = 'merchant_exact'),
  merchant_pattern text not null check (char_length(merchant_pattern) between 1 and 120),
  normalized_pattern text not null check (char_length(normalized_pattern) between 1 and 120),
  category_id text not null,
  priority smallint not null default 100 check (priority between 1 and 1000),
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_type, normalized_pattern),
  foreign key (user_id, category_id) references public.categories(user_id, id)
);

create table public.incoming_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  event_id uuid not null,
  schema_version integer not null check (schema_version = 1),
  request_hash text not null check (char_length(request_hash) = 64),
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  amount_minor bigint check (amount_minor is null or (amount_minor > 0 and amount_minor <= 999999999999)),
  currency text check (currency is null or char_length(currency) = 3),
  merchant_name text check (merchant_name is null or char_length(merchant_name) <= 120),
  normalized_merchant text check (normalized_merchant is null or char_length(normalized_merchant) <= 120),
  card_alias text check (card_alias is null or char_length(card_alias) <= 80),
  normalized_card_alias text check (normalized_card_alias is null or char_length(normalized_card_alias) <= 80),
  source text not null check (source = 'ios_shortcuts'),
  mode text not null check (mode = 'capture'),
  result_status text not null check (result_status in ('recorded', 'recorded_needs_category', 'needs_review', 'duplicate', 'conflict')),
  review_reasons text[] not null default '{}',
  transaction_id text,
  possible_duplicate_of uuid,
  possible_duplicate_transaction_id text,
  version integer not null default 1 check (version > 0),
  resolved_at timestamptz,
  unique (user_id, event_id),
  unique (user_id, id),
  foreign key (user_id, device_id) references public.device_links(user_id, id),
  foreign key (user_id, transaction_id) references public.transactions(user_id, id),
  foreign key (user_id, possible_duplicate_of) references public.incoming_events(user_id, id),
  foreign key (user_id, possible_duplicate_transaction_id) references public.transactions(user_id, id)
);

create index device_links_user_status_idx on public.device_links (user_id, status);
create index pairing_tickets_expiry_idx on private.pairing_tickets (expires_at) where consumed_at is null;
create index card_mappings_user_account_idx on public.card_mappings (user_id, account_id);
create index category_rules_user_active_idx on public.category_rules (user_id, active, priority, created_at);
create index incoming_events_user_received_idx on public.incoming_events (user_id, received_at desc);
create index incoming_events_user_review_idx on public.incoming_events (user_id, result_status, received_at desc)
  where result_status in ('recorded_needs_category', 'needs_review', 'duplicate', 'conflict');

alter table public.device_links enable row level security;
alter table public.card_mappings enable row level security;
alter table public.category_rules enable row level security;
alter table public.incoming_events enable row level security;
alter table private.pairing_tickets enable row level security;
alter table private.shortcut_rate_limits enable row level security;

create policy device_links_select_own on public.device_links for select to authenticated
  using ((select auth.uid()) = user_id);
create policy card_mappings_select_own on public.card_mappings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy category_rules_select_own on public.category_rules for select to authenticated
  using ((select auth.uid()) = user_id);
create policy incoming_events_select_own on public.incoming_events for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.device_links, public.card_mappings, public.category_rules, public.incoming_events from anon, authenticated;
grant select on public.device_links, public.card_mappings, public.category_rules, public.incoming_events to authenticated;
revoke all on private.pairing_tickets, private.shortcut_rate_limits from public, anon, authenticated;

create or replace function public.server_create_pairing_ticket(
  p_user_id uuid, p_ticket_hash text, p_label text, p_expires_at timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user_id is null or p_ticket_hash !~ '^[0-9a-f]{64}$' or p_expires_at <= now()
     or p_expires_at > now() + interval '5 minutes 10 seconds' then
    raise exception using errcode = '22023', message = 'Ticket de vinculación inválido.';
  end if;
  insert into private.pairing_tickets(ticket_hash, user_id, label, expires_at)
  values (p_ticket_hash, p_user_id, p_label, p_expires_at);
end; $$;

create or replace function public.server_consume_pairing_ticket(
  p_ticket_hash text, p_token_hash text, p_token_expires_at timestamptz, p_template_version text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare ticket private.pairing_tickets%rowtype; link public.device_links%rowtype;
begin
  update private.pairing_tickets set consumed_at = now()
  where ticket_hash = p_ticket_hash and consumed_at is null and expires_at > now()
  returning * into ticket;
  if not found then raise exception using errcode = 'PT410', message = 'El código venció o ya fue utilizado.'; end if;
  insert into public.device_links(user_id, label, token_hash, token_expires_at, template_version, status)
  values(ticket.user_id, ticket.label, p_token_hash, p_token_expires_at, p_template_version, 'incomplete')
  returning * into link;
  return jsonb_build_object('device_id', link.id, 'user_id', link.user_id, 'expires_at', link.token_expires_at);
end; $$;

create or replace function public.server_authorize_shortcut(
  p_token_hash text, p_action text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare link public.device_links%rowtype; limit_count integer := case when p_action = 'test' then 6 else 60 end; current_count integer;
begin
  select * into link from public.device_links
  where token_hash = p_token_hash and revoked_at is null and token_expires_at > now()
    and (status = 'active' or (status = 'incomplete' and p_action = 'test'));
  if not found then raise exception using errcode = 'PT401', message = 'Vinculación inválida, vencida o revocada.'; end if;
  insert into private.shortcut_rate_limits(device_id, action, window_started_at, request_count)
  values(link.id, p_action, date_trunc('minute', now()), 1)
  on conflict(device_id, action) do update set
    window_started_at = case when private.shortcut_rate_limits.window_started_at < date_trunc('minute', now()) then date_trunc('minute', now()) else private.shortcut_rate_limits.window_started_at end,
    request_count = case when private.shortcut_rate_limits.window_started_at < date_trunc('minute', now()) then 1 else private.shortcut_rate_limits.request_count + 1 end
  returning request_count into current_count;
  if current_count > limit_count then raise exception using errcode = 'PT429', message = 'Demasiados intentos; espera un minuto.'; end if;
  return jsonb_build_object('device_id', link.id, 'user_id', link.user_id, 'template_version', link.template_version);
end; $$;

create or replace function public.server_record_shortcut_test(p_device_id uuid, p_user_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare tested_at timestamptz;
begin
  update public.device_links set last_test_at = now(), status = 'active'
  where id = p_device_id and user_id = p_user_id and status in ('active', 'incomplete')
  returning last_test_at into tested_at;
  if not found then raise exception using errcode = 'PT401', message = 'Vinculación inactiva.'; end if;
  return tested_at;
end; $$;

create or replace function public.server_ingest_shortcut_event(
  p_user_id uuid, p_device_id uuid, p_event_id uuid, p_request_hash text,
  p_occurred_at timestamptz, p_amount_minor bigint, p_currency text,
  p_merchant_name text, p_normalized_merchant text,
  p_card_alias text, p_normalized_card_alias text, p_review_reasons text[]
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare prior public.incoming_events%rowtype; mapping public.card_mappings%rowtype; rule public.category_rules%rowtype;
  similar_event public.incoming_events%rowtype; similar_tx public.transactions%rowtype; event_row public.incoming_events%rowtype; tx public.transactions%rowtype;
  category_value text; tx_id text; status_value text; reasons text[] := coalesce(p_review_reasons, '{}'); similar_found boolean := false;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text || ':' || p_event_id::text, 0));
  select * into prior from public.incoming_events where user_id = p_user_id and event_id = p_event_id;
  if found then
    if prior.request_hash <> p_request_hash then
      return jsonb_build_object('status', 'conflict', 'event_id', prior.event_id, 'incoming_id', prior.id, 'transaction_id', prior.transaction_id);
    end if;
    return jsonb_build_object('status', prior.result_status, 'event_id', prior.event_id, 'incoming_id', prior.id, 'transaction_id', prior.transaction_id, 'idempotent', true);
  end if;
  select * into mapping from public.card_mappings
  where user_id = p_user_id and normalized_alias = p_normalized_card_alias and active order by updated_at desc limit 1;
  if not found then reasons := array_append(reasons, 'card_not_mapped'); end if;
  if p_amount_minor is null then reasons := array_append(reasons, 'amount_missing_or_ambiguous'); end if;
  if p_currency is distinct from 'COP' then reasons := array_append(reasons, 'currency_missing_or_unsupported'); end if;
  if p_occurred_at is null then reasons := array_append(reasons, 'date_missing_or_invalid'); end if;
  if p_normalized_merchant is null or p_normalized_merchant = '' then reasons := array_append(reasons, 'merchant_missing'); end if;
  select coalesce(array_agg(distinct reason order by reason), '{}'::text[]) into reasons from unnest(reasons) as reason;

  if cardinality(reasons) = 0 then
    select * into similar_event from public.incoming_events
    where user_id = p_user_id and event_id <> p_event_id and transaction_id is not null
      and amount_minor = p_amount_minor and normalized_merchant is not distinct from p_normalized_merchant
      and occurred_at between p_occurred_at - interval '2 minutes' and p_occurred_at + interval '2 minutes'
    order by received_at desc limit 1;
    similar_found := found;
    if not similar_found then
      select * into similar_tx from public.transactions
      where user_id = p_user_id and status = 'recorded' and type = 'expense'
        and amount_minor = p_amount_minor and lower(trim(coalesce(merchant_name, ''))) = coalesce(p_normalized_merchant, '')
        and occurred_at between p_occurred_at - interval '2 minutes' and p_occurred_at + interval '2 minutes'
      order by occurred_at desc limit 1;
      similar_found := found;
    end if;
  end if;
  if similar_found then
    status_value := 'duplicate';
    reasons := array_append(reasons, 'possible_duplicate');
  elsif cardinality(reasons) > 0 then
    status_value := 'needs_review';
  else
    select * into rule from public.category_rules
    where user_id = p_user_id and active and match_type = 'merchant_exact' and normalized_pattern = p_normalized_merchant
    order by priority, created_at limit 1;
    if found then category_value := rule.category_id; status_value := 'recorded';
    else
      category_value := p_user_id::text || ':expense-uncategorized';
      insert into public.categories(id, user_id, name, type)
      values(category_value, p_user_id, 'Sin categoría', 'expense') on conflict(id) do nothing;
      status_value := 'recorded_needs_category';
      reasons := array_append(reasons, 'category_missing');
    end if;
    tx_id := 'shortcut-' || p_event_id::text;
    insert into public.transactions(id, user_id, type, amount_minor, currency, occurred_at, from_account_id, category_id, merchant_name, note, source, status)
    values(tx_id, p_user_id, 'expense', p_amount_minor, 'COP', p_occurred_at, mapping.account_id, category_value, p_merchant_name, '', 'shortcut', 'recorded')
    returning * into tx;
    perform private.rebuild_transaction_ledger(p_user_id, tx_id);
  end if;
  insert into public.incoming_events(user_id, device_id, event_id, schema_version, request_hash, occurred_at, amount_minor, currency,
    merchant_name, normalized_merchant, card_alias, normalized_card_alias, source, mode, result_status, review_reasons,
    transaction_id, possible_duplicate_of, possible_duplicate_transaction_id)
  values(p_user_id, p_device_id, p_event_id, 1, p_request_hash, p_occurred_at, p_amount_minor, p_currency,
    p_merchant_name, p_normalized_merchant, p_card_alias, p_normalized_card_alias, 'ios_shortcuts', 'capture', status_value, reasons,
    tx_id, similar_event.id, similar_tx.id)
  returning * into event_row;
  update public.device_links set last_event_at = now() where id = p_device_id and user_id = p_user_id;
  if status_value in ('needs_review', 'duplicate', 'recorded_needs_category') then
    insert into public.push_outbox(user_id, event_key, event_kind, payload)
    values(p_user_id, 'review:' || p_event_id::text, 'review', jsonb_build_object('incoming_event_id', event_row.id))
    on conflict(user_id, event_key) do nothing;
  end if;
  return jsonb_build_object('status', status_value, 'event_id', p_event_id, 'incoming_id', event_row.id, 'transaction_id', tx_id, 'idempotent', false);
end; $$;

create or replace function public.server_resolve_shortcut_event(
  p_user_id uuid, p_incoming_id uuid, p_expected_version integer, p_action text,
  p_account_id text, p_category_id text, p_amount_minor bigint, p_occurred_at timestamptz,
  p_transaction_id text, p_create_rule boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare item public.incoming_events%rowtype; category_type text; account_kind text; linked public.transactions%rowtype; tx_id text;
begin
  select * into item from public.incoming_events where id = p_incoming_id and user_id = p_user_id for update;
  if not found then raise exception using errcode = 'PT404', message = 'Evento no encontrado.'; end if;
  if item.version <> p_expected_version or item.resolved_at is not null then raise exception using errcode = 'PT409', message = 'Este evento ya cambió o fue resuelto.'; end if;
  if p_action = 'associate' then
    select * into linked from public.transactions where user_id = p_user_id and id = p_transaction_id and status = 'recorded';
    if not found then raise exception using errcode = '23503', message = 'El movimiento no pertenece al usuario.'; end if;
    update public.incoming_events set transaction_id = linked.id, result_status = 'recorded', review_reasons = '{}', resolved_at = now(), version = version + 1
    where id = item.id returning * into item;
  elsif p_action = 'record' then
    select kind into account_kind from public.accounts where user_id = p_user_id and id = p_account_id and not archived;
    if not found then raise exception using errcode = '23503', message = 'La cuenta no pertenece al usuario o está archivada.'; end if;
    select type into category_type from public.categories where user_id = p_user_id and id = p_category_id;
    if not found or category_type <> 'expense' then raise exception using errcode = '23503', message = 'La categoría de gasto no pertenece al usuario.'; end if;
    if coalesce(p_amount_minor, item.amount_minor) is null or coalesce(p_occurred_at, item.occurred_at) is null or item.currency is distinct from 'COP' then
      raise exception using errcode = '22023', message = 'Completa monto, moneda COP y fecha antes de registrar.';
    end if;
    tx_id := 'shortcut-' || item.event_id::text;
    insert into public.transactions(id,user_id,type,amount_minor,currency,occurred_at,from_account_id,category_id,merchant_name,note,source,status)
    values(tx_id,p_user_id,'expense',coalesce(p_amount_minor,item.amount_minor),'COP',coalesce(p_occurred_at,item.occurred_at),p_account_id,p_category_id,item.merchant_name,'','shortcut','recorded');
    perform private.rebuild_transaction_ledger(p_user_id, tx_id);
    update public.incoming_events set transaction_id = tx_id, amount_minor = coalesce(p_amount_minor, amount_minor), occurred_at = coalesce(p_occurred_at, occurred_at), currency = 'COP',
      result_status = 'recorded', review_reasons = '{}', resolved_at = now(), version = version + 1 where id = item.id returning * into item;
    if p_create_rule and item.normalized_merchant is not null then
      insert into public.category_rules(user_id, merchant_pattern, normalized_pattern, category_id)
      values(p_user_id, item.merchant_name, item.normalized_merchant, p_category_id)
      on conflict(user_id, match_type, normalized_pattern) do update set category_id = excluded.category_id, active = true,
        version = public.category_rules.version + 1, updated_at = now();
    end if;
  elsif p_action = 'categorize' then
    select type into category_type from public.categories where user_id = p_user_id and id = p_category_id;
    if not found or category_type <> 'expense' then raise exception using errcode = '23503', message = 'La categoría no pertenece al usuario.'; end if;
    perform pg_catalog.set_config('patawallet.skip_movement_push', 'true', true);
    update public.transactions set category_id = p_category_id, version = version + 1, updated_at = now()
    where user_id = p_user_id and id = item.transaction_id and source = 'shortcut';
    if not found then raise exception using errcode = 'PT404', message = 'Movimiento automático no encontrado.'; end if;
    update public.incoming_events set result_status='recorded', review_reasons='{}', resolved_at=now(), version=version+1 where id=item.id returning * into item;
    if p_create_rule and item.normalized_merchant is not null then
      insert into public.category_rules(user_id, merchant_pattern, normalized_pattern, category_id)
      values(p_user_id, item.merchant_name, item.normalized_merchant, p_category_id)
      on conflict(user_id, match_type, normalized_pattern) do update set category_id=excluded.category_id, active=true,
        version=public.category_rules.version+1, updated_at=now();
    end if;
  else raise exception using errcode = '22023', message = 'Acción de revisión inválida.';
  end if;
  return jsonb_build_object('status', item.result_status, 'incoming_id', item.id, 'transaction_id', item.transaction_id, 'version', item.version);
end; $$;

-- Every privileged function is reachable only by the server-held role. Each
-- still validates explicit ownership because service_role bypasses RLS.
revoke all on function public.server_create_pairing_ticket(uuid,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.server_consume_pairing_ticket(text,text,timestamptz,text) from public, anon, authenticated;
revoke all on function public.server_authorize_shortcut(text,text) from public, anon, authenticated;
revoke all on function public.server_record_shortcut_test(uuid,uuid) from public, anon, authenticated;
revoke all on function public.server_ingest_shortcut_event(uuid,uuid,uuid,text,timestamptz,bigint,text,text,text,text,text,text[]) from public, anon, authenticated;
revoke all on function public.server_resolve_shortcut_event(uuid,uuid,integer,text,text,text,bigint,timestamptz,text,boolean) from public, anon, authenticated;
grant execute on function public.server_create_pairing_ticket(uuid,text,text,timestamptz) to service_role;
grant execute on function public.server_consume_pairing_ticket(text,text,timestamptz,text) to service_role;
grant execute on function public.server_authorize_shortcut(text,text) to service_role;
grant execute on function public.server_record_shortcut_test(uuid,uuid) to service_role;
grant execute on function public.server_ingest_shortcut_event(uuid,uuid,uuid,text,timestamptz,bigint,text,text,text,text,text,text[]) to service_role;
grant execute on function public.server_resolve_shortcut_event(uuid,uuid,integer,text,text,text,bigint,timestamptz,text,boolean) to service_role;
