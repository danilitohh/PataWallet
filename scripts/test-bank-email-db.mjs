import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { URL } from 'node:url'
import { setTimeout } from 'node:timers/promises'

// PostgreSQL efímero sin puertos ni volúmenes: nunca usa Supabase ni datos reales.
const container = `patawallet-email-test-${randomUUID()}`
function docker(args, input) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 60_000 })
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Docker falló.')
  return result.stdout
}
function sql(value) {
  return docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], value)
}
let created = false
try {
  docker(['run', '--rm', '-d', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine'])
  created = true
  let ready = false
  for (let attempt = 0; attempt < 40; attempt++) {
    if (spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres']).status === 0) { ready = true; break }
    await setTimeout(500)
  }
  if (!ready) throw new Error('PostgreSQL no inició.')
  sql(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon;`)
  for (const file of ['20260910190000_auth_and_user_data.sql', '20260910190327_phase2_ledger_sync_security.sql', '20260926123000_budget_only_expenses.sql', '20260927200000_bank_email_inbox.sql', '20260928010000_mail_connections.sql']) {
    sql(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'))
  }
  process.stdout.write(sql(readFileSync(new URL('../supabase/tests/bank_email.sql', import.meta.url), 'utf8')))
  process.stdout.write(sql(readFileSync(new URL('../supabase/tests/mail_connections.sql', import.meta.url), 'utf8')))
  process.stdout.write('PASS: PostgreSQL real, aislamiento, recepción, revisión y contabilidad.\n')
} finally {
  // Solo se elimina el contenedor creado por esta ejecución, sin volúmenes persistentes.
  if (created) docker(['rm', '-f', container])
}
