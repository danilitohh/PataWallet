-- Automatización de correo: conserva el cursor de Gmail Watch y avisa sin crear asientos.
-- El usuario debe revisar cada candidato desde la bandeja antes de modificar saldos.
alter table public.mail_connections
  add column if not exists gmail_watch_history_id text check (char_length(gmail_watch_history_id) <= 80),
  add column if not exists gmail_watch_expiration_at timestamptz;

create index if not exists mail_connections_gmail_mailbox_idx
  on public.mail_connections (provider, mailbox)
  where provider = 'gmail' and status = 'connected';

-- Reemplaza la página de ingesta para encolar una notificación idempotente por correo nuevo.
create or replace function public.server_commit_mail_page(p_user uuid,p_provider text,p_generation uuid,p_lease uuid,p_events jsonb,p_cursor jsonb,p_until timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.mail_connections%rowtype; entry jsonb; event_id uuid; added integer:=0;
begin
  select * into item from public.mail_connections where user_id=p_user and provider=p_provider and generation=p_generation
    and status='connected' and sync_lease=p_lease and lease_until>now() for update;
  if not found then raise exception using errcode='PT409',message='La conexión cambió. No se guardó esta búsqueda.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bank-email-ingest:' || p_user::text,0));
  if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>20 then
    raise exception using errcode='22023',message='Página inválida.';
  end if;
  for entry in select value from jsonb_array_elements(p_events) loop
    event_id := null;
    if (select count(*) from public.bank_email_events where user_id=p_user and received_at>now()-interval '1 day') >= 200 then
      raise exception using errcode='PT429',message='Límite diario de correos alcanzado.';
    end if;
    insert into public.bank_email_events(user_id,provider_id,dedupe_key,bank,candidate,ingestion_source)
      values(p_user,(entry->>'provider_id')::uuid,entry->>'dedupe_key',entry->>'bank',entry->'candidate',p_provider)
      on conflict do nothing returning id into event_id;
    if event_id is not null then
      added := added + 1;
      insert into public.push_outbox (user_id, event_key, event_kind, payload)
        values (p_user, 'mail-review:' || event_id::text, 'review', jsonb_build_object('route','/ajustes/correos-bancarios'))
        on conflict (user_id, event_key) do nothing;
    end if;
  end loop;
  update public.mail_connections set cursor=p_cursor,last_sync_at=case when p_cursor is null then p_until else last_sync_at end,
    sync_lease=null,lease_until=null where user_id=p_user and provider=p_provider;
  return jsonb_build_object('added',added,'has_more',p_cursor is not null);
end; $$;

-- Reemplaza la ingesta de reenvío para que ambos canales produzcan el mismo aviso.
create or replace function public.server_receive_bank_email(p_address text, p_provider_id uuid, p_dedupe_key text, p_bank text, p_candidate jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare inbox public.bank_email_addresses%rowtype; event_id uuid;
begin
  select * into inbox from public.bank_email_addresses where address = p_address and enabled for update;
  if not found then return jsonb_build_object('status','ignored'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bank-email-ingest:' || inbox.user_id::text,0));
  if exists(select 1 from public.bank_email_events where provider_id = p_provider_id or (user_id = inbox.user_id and dedupe_key = p_dedupe_key)) then
    return jsonb_build_object('status','duplicate');
  end if;
  if (select count(*) from public.bank_email_events where user_id = inbox.user_id and received_at > now() - interval '1 day') >= 200 then
    raise exception using errcode = 'PT429', message = 'Límite diario de correos alcanzado.';
  end if;
  insert into public.bank_email_events(user_id,provider_id,dedupe_key,bank,candidate)
    values(inbox.user_id,p_provider_id,p_dedupe_key,p_bank,p_candidate)
    on conflict do nothing returning id into event_id;
  if event_id is null then return jsonb_build_object('status','duplicate'); end if;
  insert into public.push_outbox (user_id, event_key, event_kind, payload)
    values (inbox.user_id, 'mail-review:' || event_id::text, 'review', jsonb_build_object('route','/ajustes/correos-bancarios'))
    on conflict (user_id, event_key) do nothing;
  update public.bank_email_addresses set last_received_at = now() where user_id = inbox.user_id;
  return jsonb_build_object('status','pending');
end; $$;

revoke all on function public.server_commit_mail_page(uuid,text,uuid,uuid,jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.server_commit_mail_page(uuid,text,uuid,uuid,jsonb,jsonb,timestamptz) to service_role;
revoke all on function public.server_receive_bank_email(text,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.server_receive_bank_email(text,uuid,text,text,jsonb) to service_role;
