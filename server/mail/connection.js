import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { parseBankEmail } from '../bank-email/parseBankEmail.js'
import { bankEmailAiAvailable, classifyBankEmailBatch, MAIL_AI_CONSENT_VERSION } from '../api-lib/bank-email-ai.js'
import { authorizationUrl, mailboxIdentity, listBankMessages, providerConfig, readBankMessage, startGmailWatch, tokenRequest } from './providers.js'
import { contextFor, hash, messageUuid, seal, secret, unseal } from './security.js'

// Las operaciones de estado nunca escriben asientos; comparten la bandeja bancaria por revisar.
export async function beginConnection(admin, userId, provider, banks) {
  const config = providerConfig(provider)
  const state = secret(); const cookie = secret(); const verifier = secret(); const generation = randomUUID()
  const { error } = await admin.rpc('server_begin_mail_oauth', {
    p_user: userId, p_provider: provider, p_generation: generation, p_banks: banks, p_state: hash(state), p_cookie: hash(cookie),
    p_verifier: seal(verifier, contextFor({ user_id: userId, provider, generation })),
  })
  if (error) throw error
  return { cookie, url: authorizationUrl(config, state, verifier) }
}

// No se confía en id_token ni parámetros de identidad del callback; la identidad se consulta al proveedor.
export async function completeConnection(admin, provider, state, cookie, code, denied) {
  const config = providerConfig(provider)
  const { data: attempt, error } = await admin.rpc('server_consume_mail_oauth', { p_provider: provider, p_state: hash(state), p_cookie: hash(cookie) })
  if (error) throw error
  if (denied) return 'cancelled'
  const verifier = unseal(attempt.verifier_cipher, contextFor(attempt))
  const token = await tokenRequest(config, { grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: config.redirectUri })
  if (!token.refresh_token) throw new Error('Vuelve a autorizar el acceso al correo.')
  const mailbox = await mailboxIdentity(provider, token.access_token)
  const saved = await admin.from('mail_connections').update({ status: 'connected', mailbox: provider === 'gmail' ? mailbox.address.toLowerCase() : mailbox.address, mailbox_id: mailbox.id,
    token_cipher: seal({ refresh_token: token.refresh_token }, contextFor(attempt)), connected_at: new Date().toISOString(), last_attempt_at: null,
    ai_classification_consent_at: null, ai_classification_consent_version: null,
  }).eq('user_id', attempt.user_id).eq('provider', provider).eq('generation', attempt.generation).eq('status', 'pending').select('provider').maybeSingle()
  if (saved.error || !saved.data) throw new Error('La conexión cambió durante la autorización.')
  if (provider === 'gmail' && process.env.MAIL_GOOGLE_PUBSUB_TOPIC) {
    await persistGmailWatch(admin, { ...attempt, mailbox: mailbox.address.toLowerCase() }, token.access_token, token.refresh_token).catch(() => {})
  }
  return 'connected'
}

// Elimina localmente credenciales; el usuario retira además el consentimiento en el portal del proveedor.
export async function disconnectConnection(admin, userId, provider) {
  const removed = await admin.from('mail_connections').update({ status: 'disconnected', token_cipher: null, mailbox: null, mailbox_id: null,
    state_hash: null, cookie_hash: null, verifier_cipher: null, oauth_expires_at: null, generation: randomUUID(),
    sync_lease: null, lease_until: null, cursor: null, ai_classification_consent_at: null, ai_classification_consent_version: null,
  }).eq('user_id', userId).eq('provider', provider)
  if (removed.error) throw removed.error
  // Microsoft no ofrece revocación individual equivalente sin permisos extra; ambos se retiran desde su portal.
  return { disconnected: true, provider_revocation_required: true }
}

// La sincronización automática es incremental; las búsquedas manuales pueden recuperar la ventana reciente.
export async function syncConnection(admin, userId, provider, { backfill = false } = {}) {
  const config = providerConfig(provider)
  const lease = randomUUID()
  const { data: row, error } = await admin.rpc('server_claim_mail_sync', { p_user: userId, p_provider: provider, p_lease: lease })
  if (error) throw error
  const guard = (values) => admin.from('mail_connections').update(values).eq('user_id', userId).eq('provider', provider).eq('generation', row.generation).eq('sync_lease', lease)
  try {
    const previous = unseal(row.token_cipher, contextFor(row))
    const token = await tokenRequest(config, { grant_type: 'refresh_token', refresh_token: z.string().min(1).max(16000).parse(previous.refresh_token) })
    // Persistir refresh rotado antes de leer correo; comprobar que desconexión no invalidó el lease.
    const refreshedCipher = seal({ refresh_token: token.refresh_token || previous.refresh_token }, contextFor(row))
    const updated = await guard({ token_cipher: refreshedCipher }).select('provider').maybeSingle()
    if (updated.error || !updated.data) throw new Error('La conexión cambió.')
    if (provider === 'gmail' && process.env.MAIL_GOOGLE_PUBSUB_TOPIC && (!row.gmail_watch_expiration_at || Date.parse(row.gmail_watch_expiration_at) < Date.now() + 24 * 3600000)) {
      await persistGmailWatch(admin, row, token.access_token, token.refresh_token || previous.refresh_token, refreshedCipher).catch(() => {})
    }
    // Las búsquedas automáticas siguen siendo incrementales; una búsqueda manual
    // vuelve a revisar treinta días para que una primera conexión no descarte un
    // aviso reciente por la fecha de alta o por retrasos del proveedor. La bandeja deduplica.
    const scanStartedAt = Date.now()
    const since = backfill || !row.last_sync_at ? scanStartedAt - 30 * 86400000 : Date.parse(row.last_sync_at) - 300000
    // Manual searches must start a fresh thirty-day window when an old incremental
    // cursor exists, then preserve only a cursor created by that same backfill.
    const cursor = row.cursor && (!backfill || row.cursor.backfill === true)
      ? row.cursor
      : { since: new Date(since).toISOString(), until: new Date(scanStartedAt).toISOString(), next: null, ...(backfill ? { backfill: true } : {}) }
    const page = await listBankMessages(provider, token.access_token, row.banks, cursor)
    const events = []
    for (const id of page.ids) {
      const message = await readBankMessage(provider, token.access_token, id, row.banks)
      if (!message) continue
      const { messageId, allowUnverifiedBancolombia, ...input } = message
      const candidate = parseBankEmail({ ...input, allowUnverifiedBancolombia })
      if (!candidate.bank) continue
      const identity = `${userId}:${provider}:${row.mailbox_id}:${id}`
      events.push({ provider_id: messageUuid(identity), dedupe_key: hash(messageId || identity), bank: candidate.bank, candidate, _aiInput: { subject: input.subject, text: input.text } })
    }
    const aiEnabled = Boolean(row.ai_classification_consent_at && row.ai_classification_consent_version === MAIL_AI_CONSENT_VERSION && bankEmailAiAvailable())
    let aiAttempted = 0
    if (aiEnabled && events.length) {
      // Existing unresolved OAuth notices can be enriched after the user opts in; forwarded and resolved notices are never sent.
      const existingResult = await admin.from('bank_email_events')
        .select('dedupe_key,status,ingestion_source,candidate')
        .eq('user_id', userId).in('dedupe_key', events.map((event) => event.dedupe_key))
      // Fail closed for AI if the event states cannot be checked; ordinary mail import still continues.
      if (!existingResult.error) {
        const existing = new Map((existingResult.data || []).map((entry) => [entry.dedupe_key, entry]))
        const eligible = []
        for (const event of events) {
          const prior = existing.get(event.dedupe_key)
          if (prior && (prior.status !== 'pending' || prior.ingestion_source !== provider)) continue
          if (prior?.candidate?.ai_classification?.status) event.candidate.ai_classification = prior.candidate.ai_classification
          else eligible.push(event)
        }
        aiAttempted = eligible.length
        const classifications = await classifyBankEmailBatch(eligible.map((event) => ({ ...event._aiInput, bank: event.bank, candidate: event.candidate })))
        for (const result of classifications) {
          const event = eligible[result.index]
          if (event) event.candidate.ai_classification = {
            status: result.suggestion ? 'suggested' : 'needs_review',
            confidence: result.confidence,
            suggestion: result.suggestion,
          }
        }
      }
    }
    const aiClassified = events.filter((event) => event.candidate.ai_classification?.suggestion?.type).length
    const aiAnalyzed = events.filter((event) => event.candidate.ai_classification?.status).length
    // Keep source email text ephemeral; only deterministic extractions and an optional type suggestion are stored.
    const persistedEvents = events.map(({ _aiInput, ...event }) => event)
    const saved = await admin.rpc('server_commit_mail_page', { p_user: userId, p_provider: provider, p_generation: row.generation, p_lease: lease,
      p_events: persistedEvents, p_cursor: page.next ? { ...cursor, next: page.next } : null, p_until: cursor.until })
    if (saved.error) throw saved.error
    return { ...saved.data, searched: page.ids.length, recognized: events.length, aiEnabled, aiAttempted, aiAnalyzed, aiClassified }
  } catch (issue) {
    const reset = await guard({ sync_lease: null, lease_until: null, ...(issue.reconnect ? { status: 'reauthorize', token_cipher: null } : {}) })
    if (reset.error) throw new Error('La búsqueda falló. Espera antes de reintentar.')
    throw issue
  }
}

// Renueva los avisos de Gmail sin leer el buzón; el cron solo mantiene viva la suscripción.
export async function renewGmailWatches(admin) {
  const result = await admin.from('mail_connections')
    .select('user_id,provider,generation,token_cipher')
    .eq('provider', 'gmail').eq('status', 'connected')
  if (result.error) throw result.error
  let renewed = 0; let failed = 0
  for (const row of result.data || []) {
    try {
      const previous = unseal(row.token_cipher, contextFor(row))
      const token = await tokenRequest(providerConfig('gmail'), { grant_type: 'refresh_token', refresh_token: z.string().min(1).max(16000).parse(previous.refresh_token) })
      await persistGmailWatch(admin, row, token.access_token, token.refresh_token || previous.refresh_token)
      renewed += 1
    } catch {
      failed += 1
    }
  }
  return { renewed, failed }
}

// Renueva la vigilancia antes de su vencimiento; un fallo no invalida una conexión que aún permite búsqueda manual.
async function persistGmailWatch(admin, row, accessToken, refreshToken, fallbackCipher = null) {
  const config = providerConfig('gmail')
  const watch = await startGmailWatch(config, accessToken)
  const values = { gmail_watch_history_id: watch.historyId, gmail_watch_expiration_at: new Date(Number(watch.expiration)).toISOString(), token_cipher: fallbackCipher || seal({ refresh_token: z.string().min(1).max(16000).parse(refreshToken) }, contextFor(row)) }
  const query = admin.from('mail_connections').update(values).eq('user_id', row.user_id).eq('provider', 'gmail').eq('generation', row.generation).eq('status', 'connected')
  const result = await query.select('provider').maybeSingle()
  if (result.error || !result.data) throw new Error('La conexión cambió durante la renovación de Gmail.')
  return watch
}
