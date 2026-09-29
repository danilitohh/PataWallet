import { assertBodySize, assertTrustedOrigin, allowMethod, json } from '../server/api-lib/http.js'
import { canonicalEventHash, mappingSchema, normalizeLabel, normalizeShortcutEvent, pairSchema, pairingTicketSchema, reviewSchema, randomSecret, sha256, shortcutEventSchema, templateMetadata } from '../server/api-lib/shortcut-contract.js'
import { authorizedShortcut, shortcutError } from '../server/api-lib/shortcut-server.js'
import { categoryRuleHandler } from '../server/api-lib/shortcut-rules.js'
import { classifyMerchantCategory } from '../server/api-lib/shortcut-category-ai.js'
import { adminClient, authenticatedUser } from '../server/api-lib/supabase-server.js'

// Unifica las rutas de Atajos para respetar el límite de funciones del plan Hobby.
export default async function handler(req, res) {
  const operation = String(req.query?.operation || '')
  if (operation === 'status') return statusHandler(req, res)
  if (operation === 'pair' || operation === 'create-ticket') return operation === 'create-ticket' ? createPairingTicketHandler(req, res) : pairHandler(req, res)
  if (operation === 'mappings') return mappingsHandler(req, res)
  if (operation === 'rules') return categoryRuleHandler(req, res)
  if (operation === 'events') return eventsHandler(req, res)
  if (operation === 'device') return deviceHandler(req, res)
  if (operation === 'review') return reviewHandler(req, res)
  return json(res, 404, { error: 'Ruta de Atajos no encontrada.' })
}

// Devuelve el estado privado de los dispositivos y reglas del usuario autenticado.
async function statusHandler(req, res) {
  if (!allowMethod(req, res, ['GET'])) return
  try {
    assertTrustedOrigin(req)
    const user = await authenticatedUser(req); const admin = adminClient()
    const [devices, mappings, rules, events] = await Promise.all([
      admin.from('device_links').select('id,label,status,template_version,linked_at,last_test_at,last_event_at,automation_declared_at,revoked_at,token_expires_at').eq('user_id', user.id).order('linked_at', { ascending: false }),
      admin.from('card_mappings').select('id,card_alias,account_id,active,version,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }),
      admin.from('category_rules').select('id,merchant_pattern,category_id,priority,active,version,updated_at').eq('user_id', user.id).order('priority'),
      admin.from('incoming_events').select('id,event_id,occurred_at,received_at,amount_minor,currency,merchant_name,card_alias,result_status,review_reasons,transaction_id,possible_duplicate_of,possible_duplicate_transaction_id,version,resolved_at').eq('user_id', user.id).order('received_at', { ascending: false }).limit(50),
    ])
    const failure = [devices, mappings, rules, events].find((item) => item.error)
    if (failure) throw failure.error
    return json(res, 200, { template: templateMetadata(), categoryAiAvailable: categoryAiConfigured(), devices: devices.data, mappings: mappings.data, rules: rules.data, events: events.data })
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}

// Expone solo el estado de configuración, nunca la clave ni los valores de autenticación.
function categoryAiConfigured() {
  const verifier = process.env.OPENAI_CATEGORY_MODEL?.trim() || 'gpt-4o-mini'
  const arbiter = process.env.OPENAI_CATEGORY_REVIEW_MODEL?.trim() || 'gpt-5-mini'
  return Boolean(process.env.GEMINI_API_KEY?.trim() && process.env.OPENAI_API_KEY?.trim() && verifier !== arbiter)
}

// Consume un ticket de vinculación emitido por la pantalla de Atajos.
async function pairHandler(req, res) {
  if (!allowMethod(req, res, ['POST'])) return
  try {
    assertBodySize(req, 2_000)
    const parsed = pairSchema.safeParse(req.body)
    if (!parsed.success) return json(res, 400, { error: 'Código o versión inválidos.' })
    const template = templateMetadata()
    if (template.availability !== 'available') return json(res, 409, { error: 'La plantilla todavía no está habilitada.' })
    if (parsed.data.template_version !== template.templateVersion) return json(res, 409, { error: 'La versión de la plantilla no coincide.' })
    const token = randomSecret()
    const tokenExpiresAt = new Date(Date.now() + 180 * 24 * 60 * 60_000).toISOString()
    const { data, error } = await adminClient().rpc('server_consume_pairing_ticket', {
      p_ticket_hash: sha256(parsed.data.ticket), p_token_hash: sha256(token),
      p_token_expires_at: tokenExpiresAt, p_template_version: template.templateVersion,
    })
    if (error) throw error
    return json(res, 201, { device_id: data.device_id, token, expires_at: data.expires_at, api_origin: process.env.APP_ORIGIN.replace(/\/$/, '') })
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}

// Crea un ticket de cinco minutos para vincular un nuevo dispositivo.
async function createPairingTicketHandler(req, res) {
  if (!allowMethod(req, res, ['POST'])) return
  try {
    assertTrustedOrigin(req); assertBodySize(req, 2_000)
    const user = await authenticatedUser(req)
    const parsed = pairingTicketSchema.safeParse(req.body || {})
    if (!parsed.success) return json(res, 400, { error: 'Nombre de dispositivo inválido.' })
    const template = templateMetadata()
    if (template.availability !== 'available') return json(res, 409, { error: 'La plantilla aún no está publicada y verificada.' })
    const ticket = randomSecret(); const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString()
    const { error } = await adminClient().rpc('server_create_pairing_ticket', { p_user_id: user.id, p_ticket_hash: sha256(ticket), p_label: parsed.data.label, p_expires_at: expiresAt })
    if (error) throw error
    const input = encodeURIComponent(JSON.stringify({ mode: 'pair', ticket }))
    const runUrl = `shortcuts://run-shortcut?name=${encodeURIComponent(template.shortcutName)}&input=text&text=${input}`
    return json(res, 201, { ticket, expiresAt, runUrl })
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}

// Guarda o elimina un mapeo de tarjeta para el usuario autenticado.
async function mappingsHandler(req, res) {
  if (!allowMethod(req, res, ['POST', 'DELETE'])) return
  try {
    assertTrustedOrigin(req); assertBodySize(req, 2_000); const user = await authenticatedUser(req); const admin = adminClient()
    if (req.method === 'DELETE') {
      const id = String(req.body?.id || '')
      const { error } = await admin.from('card_mappings').delete().eq('id', id).eq('user_id', user.id); if (error) throw error
      return json(res, 200, { deleted: true })
    }
    const parsed = mappingSchema.safeParse(req.body); if (!parsed.success) return json(res, 400, { error: 'Mapeo inválido.' })
    const { data: account, error: accountError } = await admin.from('accounts').select('id').eq('id', parsed.data.account_id).eq('user_id', user.id).eq('archived', false).maybeSingle()
    if (accountError) throw accountError; if (!account) return json(res, 400, { error: 'La cuenta no pertenece al usuario o está archivada.' })
    const row = { user_id: user.id, card_alias: parsed.data.card_alias, normalized_alias: normalizeLabel(parsed.data.card_alias), account_id: parsed.data.account_id, active: true, updated_at: new Date().toISOString() }
    const { data, error } = await admin.from('card_mappings').upsert(row, { onConflict: 'user_id,normalized_alias' }).select('id,card_alias,account_id,active,version,updated_at').single()
    if (error) throw error; return json(res, 200, { mapping: data })
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}

// Recibe eventos firmados desde una automatización vinculada.
async function eventsHandler(req, res) {
  if (!allowMethod(req, res, ['POST'])) return
  try {
    assertBodySize(req, 8_000)
    const structurallyValid = shortcutEventSchema.safeParse(req.body)
    if (!structurallyValid.success) return json(res, 400, { error: 'El evento no cumple el contrato de PataWallet.' })
    const event = normalizeShortcutEvent(structurallyValid.data)
    const { admin, authorization } = await authorizedShortcut(req, 'event')
    await saveAgreedCategoryRule(admin, authorization.user_id, event)
    const { data, error } = await admin.rpc('server_ingest_shortcut_event', {
      p_user_id: authorization.user_id, p_device_id: authorization.device_id, p_event_id: event.event_id, p_request_hash: canonicalEventHash(event),
      p_occurred_at: event.occurred_at, p_amount_minor: event.amount_minor, p_currency: event.currency, p_merchant_name: event.merchant_name,
      p_normalized_merchant: event.normalized_merchant, p_card_alias: event.card_alias, p_normalized_card_alias: event.normalized_card_alias, p_review_reasons: event.review_reasons,
    })
    if (error) throw error
    return json(res, data.status === 'conflict' ? 409 : 200, { ...data, financial_effect: Boolean(data.transaction_id) })
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}

// Recuerda una regla exacta solo cuando dos modelos acuerdan; cualquier fallo conserva el flujo actual.
async function saveAgreedCategoryRule(admin, userId, event) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey || !event.normalized_merchant || !event.card_alias || !event.amount_minor || event.currency !== 'COP' || !event.occurred_at) return
    const [{ data: prior }, { data: mapping }, { data: rules }, { data: categoryRows }] = await Promise.all([
      admin.from('incoming_events').select('id').eq('user_id', userId).eq('event_id', event.event_id).maybeSingle(),
      admin.from('card_mappings').select('id').eq('user_id', userId).eq('normalized_alias', event.normalized_card_alias).eq('active', true).maybeSingle(),
      admin.from('category_rules').select('id').eq('user_id', userId).eq('active', true).eq('normalized_pattern', event.normalized_merchant).limit(1),
      admin.from('categories').select('id,name').eq('user_id', userId).eq('type', 'expense').neq('name', 'Sin categoría'),
    ])
    if (prior || !mapping || rules?.length || !categoryRows?.length) return
    const names = [...new Set(categoryRows.map((category) => category.name))]
    const name = await classifyMerchantCategory({
      geminiApiKey: process.env.GEMINI_API_KEY?.trim(),
      openAiApiKey: apiKey,
      geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
      verifierModel: process.env.OPENAI_CATEGORY_MODEL?.trim() || 'gpt-4o-mini',
      arbiterModel: process.env.OPENAI_CATEGORY_REVIEW_MODEL?.trim() || 'gpt-5-mini',
      merchant: event.merchant_name,
      categories: names,
    })
    const category = categoryRows.find((item) => item.name === name)
    if (!category) return
    await admin.from('category_rules').upsert({
      user_id: userId, merchant_pattern: event.merchant_name, normalized_pattern: event.normalized_merchant,
      category_id: category.id, priority: 100, active: true, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,match_type,normalized_pattern', ignoreDuplicates: true })
  } catch {
    // ponytail: no IA is a safe fallback; the existing review flow handles uncategorized events.
  }
}

// Declara o revoca una automatización de un dispositivo propio.
async function deviceHandler(req, res) {
  if (!allowMethod(req, res, ['DELETE', 'POST'])) return
  try {
    assertTrustedOrigin(req); assertBodySize(req, 1_000); const user = await authenticatedUser(req)
    if (req.method === 'POST') {
      if (typeof req.body?.automation_declared !== 'boolean') return json(res, 400, { error: 'Declaración de automatización inválida.' })
      const { data, error } = await adminClient().from('device_links').update({ automation_declared_at: req.body.automation_declared ? new Date().toISOString() : null }).eq('id', req.query.id).eq('user_id', user.id).in('status', ['active', 'incomplete']).select('id,automation_declared_at').maybeSingle()
      if (error) throw error; if (!data) return json(res, 404, { error: 'Vinculación no encontrada.' })
      return json(res, 200, { device: data, message: 'Estado declarado por el usuario; PataWallet no puede verificar la automatización de iOS.' })
    }
    const { data, error } = await adminClient().from('device_links').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', req.query.id).eq('user_id', user.id).in('status', ['active', 'incomplete']).select('id').maybeSingle()
    if (error) throw error; if (!data) return json(res, 404, { error: 'Vinculación no encontrada o ya revocada.' })
    return json(res, 200, { revoked: true, message: 'Acceso revocado. Desactiva también la automatización en Atajos.' })
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}

// Resuelve un evento pendiente sin permitir cambios entre usuarios.
async function reviewHandler(req, res) {
  if (!allowMethod(req, res, ['POST'])) return
  try {
    assertTrustedOrigin(req); assertBodySize(req, 3_000); const user = await authenticatedUser(req); const parsed = reviewSchema.safeParse(req.body)
    if (!parsed.success) return json(res, 400, { error: 'Resolución inválida o incompleta.' })
    const value = parsed.data; const admin = adminClient()
    if (value.remember_card_mapping) {
      const { data: item, error: itemError } = await admin.from('incoming_events').select('card_alias,normalized_card_alias').eq('id', req.query.id).eq('user_id', user.id).maybeSingle()
      if (itemError) throw itemError
      if (!item?.card_alias || !item.normalized_card_alias) return json(res, 400, { error: 'Este evento no incluye un alias de tarjeta que se pueda recordar.' })
      const { data: account, error: accountError } = await admin.from('accounts').select('id').eq('id', value.account_id).eq('user_id', user.id).eq('archived', false).maybeSingle()
      if (accountError) throw accountError
      if (!account) return json(res, 400, { error: 'La cuenta no pertenece al usuario o está archivada.' })
      const { error } = await admin.from('card_mappings').upsert({ user_id: user.id, card_alias: item.card_alias, normalized_alias: item.normalized_card_alias, account_id: value.account_id, active: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id,normalized_alias' })
      if (error) throw error
    }
    const { data, error } = await admin.rpc('server_resolve_shortcut_event', {
      p_user_id: user.id, p_incoming_id: req.query.id, p_expected_version: value.expected_version, p_action: value.action,
      p_account_id: value.account_id || null, p_category_id: value.category_id || null, p_amount_minor: value.amount_minor ? Number(value.amount_minor) : null,
      p_occurred_at: value.occurred_at || null, p_transaction_id: value.transaction_id || null, p_create_rule: value.create_rule,
    })
    if (error) throw error; return json(res, 200, data)
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}
