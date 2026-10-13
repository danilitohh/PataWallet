-- AI email classification is separate from OAuth mailbox-read consent and is opt-in per connection.
alter table public.mail_connections
  add column ai_classification_consent_at timestamptz,
  add column ai_classification_consent_version text,
  add constraint mail_connections_ai_classification_consent_check check (
    (ai_classification_consent_at is null and ai_classification_consent_version is null)
    or (ai_classification_consent_at is not null and ai_classification_consent_version is not null
      and ai_classification_consent_version = 'bank-email-classification-v1')
  );

-- A later user-started scan may enrich an existing pending OAuth notice after AI consent.
-- It never changes forwarded messages, resolved notices, or already-classified candidates.
create or replace function public.server_commit_mail_page(p_user uuid,p_provider text,p_generation uuid,p_lease uuid,p_events jsonb,p_cursor jsonb,p_until timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  item public.mail_connections%rowtype;
  entry jsonb;
  event_id uuid;
  added integer:=0;
  updated_candidates integer:=0;
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
    if p_provider in ('gmail','outlook')
      and entry->'candidate'->'ai_classification'->>'status' in ('suggested','needs_review') then
      update public.bank_email_events as prior set candidate=prior.candidate || (entry->'candidate')
        where prior.user_id=p_user
          and (prior.dedupe_key=entry->>'dedupe_key' or prior.provider_id=(entry->>'provider_id')::uuid)
          and prior.ingestion_source=p_provider and prior.status='pending'
          and prior.candidate->'ai_classification' is null
        returning prior.id into event_id;
      if event_id is not null then updated_candidates:=updated_candidates+1; continue; end if;
    end if;
    if exists(select 1 from public.bank_email_events where user_id=p_user and dedupe_key=entry->>'dedupe_key')
      or exists(select 1 from public.bank_email_events where provider_id=(entry->>'provider_id')::uuid) then
      continue;
    end if;
    if (select count(*) from public.bank_email_events where user_id=p_user and received_at>now()-interval '1 day') >= 200 then
      raise exception using errcode='PT429',message='Límite diario de correos alcanzado.';
    end if;
    insert into public.bank_email_events(user_id,provider_id,dedupe_key,bank,candidate,ingestion_source)
      values(p_user,(entry->>'provider_id')::uuid,entry->>'dedupe_key',entry->>'bank',entry->'candidate',p_provider)
      on conflict do nothing returning id into event_id;
    if event_id is not null then
      added:=added+1;
      insert into public.push_outbox (user_id,event_key,event_kind,payload)
        values(p_user,'mail-review:' || event_id::text,'review',jsonb_build_object('route','/ajustes/correos-bancarios'))
        on conflict (user_id,event_key) do nothing;
    end if;
  end loop;
  update public.mail_connections set cursor=p_cursor,last_sync_at=case when p_cursor is null then p_until else last_sync_at end,
    sync_lease=null,lease_until=null where user_id=p_user and provider=p_provider;
  return jsonb_build_object('added',added,'updated_candidates',updated_candidates,'has_more',p_cursor is not null);
end; $$;

revoke all on function public.server_commit_mail_page(uuid,text,uuid,uuid,jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.server_commit_mail_page(uuid,text,uuid,uuid,jsonb,jsonb,timestamptz) to service_role;
