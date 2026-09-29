-- Extiende fixtures sintéticas de bank_email.sql; nunca ejecutar contra datos de producción.
select public.server_begin_mail_oauth('00000000-0000-4000-8000-000000000001','gmail','20000000-0000-4000-8000-000000000001',array['nequi'],repeat('a',64),repeat('b',64),'encrypted-verifier');

-- Cookies/estado incorrectos y caducidad no consumen una autorización válida.
do $$begin
 begin
  perform public.server_consume_mail_oauth('gmail',repeat('a',64),repeat('c',64));
  raise exception 'Cookie ajena aceptada';
 exception when sqlstate 'PT400' then null; end;
 begin
  perform public.server_consume_mail_oauth('outlook',repeat('a',64),repeat('b',64));
  raise exception 'Proveedor mezclado';
 exception when sqlstate 'PT400' then null; end;
 update public.mail_connections set oauth_expires_at=now()-interval '1 minute';
 begin
  perform public.server_consume_mail_oauth('gmail',repeat('a',64),repeat('b',64));
  raise exception 'Estado vencido aceptado';
 exception when sqlstate 'PT400' then null; end;
 update public.mail_connections set oauth_expires_at=now()+interval '1 minute';
 if public.server_consume_mail_oauth('gmail',repeat('a',64),repeat('b',64))->>'user_id' <> '00000000-0000-4000-8000-000000000001' then raise exception 'Propietario incorrecto'; end if;
 begin
  perform public.server_consume_mail_oauth('gmail',repeat('a',64),repeat('b',64));
  raise exception 'Replay aceptado';
 exception when sqlstate 'PT400' then null; end;
end$$;

-- Ningún cliente, ni siquiera propietario, puede leer secretos o usar RPC privilegiadas.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$begin
 begin
  perform * from public.mail_connections;
  raise exception 'Secretos visibles al cliente';
 exception when insufficient_privilege then null; end;
 begin
  perform public.server_claim_mail_sync('00000000-0000-4000-8000-000000000002','gmail','30000000-0000-4000-8000-000000000001');
  raise exception 'Cliente invocó RPC servidor';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
update public.mail_connections set status='connected',token_cipher='encrypted-token',mailbox='example@example.invalid',mailbox_id='mailbox';

-- El lease excluye a una segunda búsqueda y a cambios de vinculación mientras sigue activa.
select public.server_claim_mail_sync('00000000-0000-4000-8000-000000000001','gmail','30000000-0000-4000-8000-000000000001');
do $$begin
 begin
  perform public.server_claim_mail_sync('00000000-0000-4000-8000-000000000001','gmail','30000000-0000-4000-8000-000000000002');
  raise exception 'Doble lease';
 exception when sqlstate 'PT409' then null; end;
 begin
  perform public.server_begin_mail_oauth('00000000-0000-4000-8000-000000000001','gmail','20000000-0000-4000-8000-000000000002',array['nequi'],repeat('d',64),repeat('e',64),'new-verifier');
  raise exception 'Reemplazó conexión activa';
 exception when sqlstate 'PT409' then null; end;
end$$;

-- Un error de una página deshace todas sus inserciones y mantiene el punto de reintento.
do $$begin
 begin
  perform public.server_commit_mail_page('00000000-0000-4000-8000-000000000001','gmail','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
    jsonb_build_array(jsonb_build_object('provider_id','40000000-0000-4000-8000-000000000001','dedupe_key',repeat('4',64),'bank','nequi','candidate','{}'::jsonb),
      jsonb_build_object('provider_id','40000000-0000-4000-8000-000000000002','dedupe_key',repeat('5',64),'bank','unknown','candidate','{}'::jsonb)),null,now());
  raise exception 'Página inválida aceptada';
 exception when check_violation then null; end;
 if (select count(*) from public.bank_email_events) <> 2 then raise exception 'Página parcialmente guardada'; end if;
 if exists(select 1 from public.mail_connections where last_sync_at is not null or sync_lease is null) then raise exception 'Cursor avanzó en error'; end if;
end$$;

-- El mismo Message-ID del reenvío no se añade de nuevo al sincronizar por OAuth.
select public.server_commit_mail_page('00000000-0000-4000-8000-000000000001','gmail','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
 jsonb_build_array(jsonb_build_object('provider_id','40000000-0000-4000-8000-000000000001','dedupe_key',repeat('1',64),'bank','nequi','candidate','{}'::jsonb),
 jsonb_build_object('provider_id','40000000-0000-4000-8000-000000000002','dedupe_key',repeat('6',64),'bank','nequi','candidate','{"amount_minor":10000}'::jsonb)),null,now());
do $$begin
 if (select count(*) from public.bank_email_events) <> 3 then raise exception 'Deduplicación OAuth/reenvío falló'; end if;
 if (select count(*) from public.transactions) <> 1 then raise exception 'OAuth modificó dinero'; end if;
 if (select count(*) from public.ledger_entries) <> 2 then raise exception 'OAuth creó asientos'; end if;
 if not exists(select 1 from public.mail_connections where last_sync_at is not null and sync_lease is null) then raise exception 'Página no completada'; end if;
end$$;

-- La revocación/generación impide que una búsqueda anterior vuelva a insertar correos.
update public.mail_connections set last_attempt_at=now()-interval '1 minute';
select public.server_claim_mail_sync('00000000-0000-4000-8000-000000000001','gmail','30000000-0000-4000-8000-000000000003');
update public.mail_connections set status='disconnected',token_cipher=null,generation='20000000-0000-4000-8000-000000000003',sync_lease=null;
do $$begin
 begin
  perform public.server_commit_mail_page('00000000-0000-4000-8000-000000000001','gmail','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','[]',null,now());
  raise exception 'Búsqueda sobrevivió revocación';
 exception when sqlstate 'PT409' then null; end;
end$$;
