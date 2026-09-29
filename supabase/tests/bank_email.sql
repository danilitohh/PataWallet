-- Datos ficticios y aserciones de integración; ejecutar solo en la DB efímera del script.
insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.accounts(id,user_id,name,kind,subtype) values
 ('a-nequi','00000000-0000-4000-8000-000000000001','Nequi ejemplo','asset','bank'),
 ('a-lulo','00000000-0000-4000-8000-000000000001','Lulo ejemplo','asset','bank'),
 ('b-bank','00000000-0000-4000-8000-000000000002','Otra persona','asset','bank');
insert into public.bank_email_addresses(user_id,address) values
 ('00000000-0000-4000-8000-000000000001','private-a@example.invalid'),
 ('00000000-0000-4000-8000-000000000002','private-b@example.invalid');

select public.server_receive_bank_email('private-a@example.invalid','10000000-0000-4000-8000-000000000001',repeat('1',64),'nequi','{"amount_minor":70675000}');
select public.server_receive_bank_email('private-a@example.invalid','10000000-0000-4000-8000-000000000001',repeat('1',64),'nequi','{"amount_minor":70675000}');
select public.server_receive_bank_email('private-a@example.invalid','10000000-0000-4000-8000-000000000002',repeat('1',64),'nequi','{"amount_minor":70675000}');
select public.server_receive_bank_email('private-a@example.invalid','10000000-0000-4000-8000-000000000003',repeat('2',64),'lulo','{"amount_minor":70675000}');
do $$begin
 if (select count(*) from public.bank_email_events) <> 2 then raise exception 'Deduplicación falló'; end if;
 if exists(select 1 from public.transactions) then raise exception 'Recepción alteró dinero'; end if;
end$$;

-- A no puede registrar en la cuenta de B ni llamar el ingreso reservado al servidor.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
do $$declare event_id uuid;
begin
 select id into event_id from public.bank_email_events where dedupe_key = repeat('1',64);
 begin
   perform public.resolve_bank_email(event_id,'record','{"type":"transfer","amount_minor":70675000,"currency":"COP","occurred_at":"2026-04-30T01:33:00Z","from_account_id":"a-nequi","to_account_id":"b-bank"}');
   raise exception 'Se permitió cuenta ajena';
 exception when foreign_key_violation then null; end;
 begin
   perform public.server_receive_bank_email('private-b@example.invalid','10000000-0000-4000-8000-000000000009',repeat('9',64),'nequi','{}');
   raise exception 'Cliente pudo simular webhook';
 exception when insufficient_privilege then null; end;
 perform public.resolve_bank_email(event_id,'record','{"type":"transfer","amount_minor":70675000,"currency":"COP","occurred_at":"2026-04-30T01:33:00Z","from_account_id":"a-nequi","to_account_id":"a-lulo"}');
 -- La misma confirmación tras perder la respuesta no genera otro asiento.
 perform public.resolve_bank_email(event_id,'record','{"type":"transfer","amount_minor":70675000,"currency":"COP","occurred_at":"2026-04-30T01:33:00Z","from_account_id":"a-nequi","to_account_id":"a-lulo"}');
 if (select count(*) from public.transactions) <> 1 then raise exception 'Se duplicó la transferencia'; end if;
 if (select sum(delta_minor) from public.ledger_entries) <> 0 then raise exception 'Transferencia cambió patrimonio'; end if;
 if (select count(*) from public.ledger_entries) <> 2 then raise exception 'Transferencia incompleta'; end if;
 if exists(select 1 from public.transactions where type in ('expense','income')) then raise exception 'Ingreso/gasto falso'; end if;
 if not exists(select 1 from public.ledger_entries where account_id='a-nequi' and delta_minor=-70675000) then raise exception 'Débito incorrecto'; end if;
 if not exists(select 1 from public.ledger_entries where account_id='a-lulo' and delta_minor=70675000) then raise exception 'Crédito incorrecto'; end if;
 select id into event_id from public.bank_email_events where dedupe_key = repeat('2',64);
 begin
   perform public.resolve_bank_email(event_id,'record','{"type":"transfer","amount_minor":70675000,"currency":"COP","occurred_at":"2026-04-30T01:33:00Z","from_account_id":"a-nequi","to_account_id":"a-lulo"}');
   raise exception 'No detectó similar';
 exception when sqlstate 'PT409' then null; end;
 perform public.resolve_bank_email(event_id,'link','{}',(select id from public.transactions limit 1));
 if (select count(*) from public.transactions) <> 1 then raise exception 'El segundo aviso duplicó dinero'; end if;
end$$;

-- B no puede leer direcciones/correos de A ni resolverlos conociendo un ID.
reset role;
select set_config('test.event_id',(select id::text from public.bank_email_events limit 1),false);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
do $$begin
 if exists(select 1 from public.bank_email_events) then raise exception 'RLS correos falló'; end if;
 if (select count(*) from public.bank_email_addresses) <> 1 then raise exception 'RLS direcciones falló'; end if;
 begin
   perform public.resolve_bank_email(current_setting('test.event_id')::uuid,'dismiss');
   raise exception 'Se permitió resolver correo ajeno';
 exception when sqlstate 'PT404' then null; end;
 begin
   update public.bank_email_addresses set enabled = false;
   raise exception 'Se permitió mutación directa';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
update public.bank_email_addresses set enabled=false where address='private-a@example.invalid';
do $$begin
 if public.server_receive_bank_email('private-a@example.invalid','10000000-0000-4000-8000-000000000004',repeat('3',64),'lulo','{}')->>'status' <> 'ignored' then raise exception 'Revocación falló'; end if;
end$$;
