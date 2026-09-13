import { z } from 'zod'
import { assertBodySize, assertTrustedOrigin, allowMethod, json } from '../../server/api-lib/http.js'
import { adminClient, authenticatedUser } from '../../server/api-lib/supabase-server.js'
import { randomSecret, sha256 } from '../../server/api-lib/shortcut-contract.js'

const MAX_MINOR = 999_999_999_999
const emailSchema = z.string().trim().toLowerCase().email().max(254)
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('invite'), email: emailSchema }).strict(),
  z.object({ action: z.literal('accept_invite'), token: z.string().min(40).max(200) }).strict(),
  z.object({ action: z.literal('share_account'), couple_id: z.string().uuid(), account_id: z.string().min(1).max(180) }).strict(),
  z.object({ action: z.literal('unshare_account'), couple_id: z.string().uuid(), account_id: z.string().min(1).max(180) }).strict(),
  z.object({ action: z.literal('create_change_request'), couple_id: z.string().uuid(), owner_user_id: z.string().uuid(), account_id: z.string().min(1).max(180), change_type: z.enum(['account_update', 'account_adjustment']), payload: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0) }).strict(),
  z.object({ action: z.literal('review_change_request'), request_id: z.string().uuid(), decision: z.enum(['approve', 'reject']) }).strict(),
])

function apiError(error) {
  const status = Number(error?.status) || (error?.code === '23505' ? 409 : 500)
  return { status, message: status >= 500 ? 'La integración de parejas no está disponible.' : error.message || 'No pudimos completar la acción.' }
}

function ensure(result) {
  if (result.error) throw result.error
  return result.data
}

function publicError(message, status = 400) {
  throw Object.assign(new Error(message), { status })
}

async function membership(admin, coupleId, userId) {
  const rows = ensure(await admin.from('couple_members').select('couple_id,user_id,role,status').eq('couple_id', coupleId).eq('user_id', userId).eq('status', 'active').limit(1))
  return rows[0] || null
}

async function ownedAccount(admin, userId, accountId) {
  const rows = ensure(await admin.from('accounts').select('id,user_id,name,kind,subtype,currency,archived,version,debt_monthly_payment_minor,updated_at').eq('user_id', userId).eq('id', accountId).limit(1))
  return rows[0] || null
}

async function createInvitation(admin, user, email) {
  if (email === String(user.email || '').trim().toLowerCase()) publicError('No puedes invitarte a ti mismo.')
  const existing = ensure(await admin.from('couple_members').select('couple_id').eq('user_id', user.id).eq('status', 'active'))
  if (existing.length) publicError('Ya tienes una cuenta en pareja activa.', 409)
  const pending = ensure(await admin.from('couple_invitations').select('id').eq('invitee_email', email).eq('status', 'pending').gt('expires_at', new Date().toISOString()).limit(1))
  if (pending.length) publicError('Ya existe una invitación pendiente para ese correo.', 409)
  const couple = ensure(await admin.from('couple_spaces').insert({ created_by: user.id, status: 'pending' }).select('id').single())
  ensure(await admin.from('couple_members').insert({ couple_id: couple.id, user_id: user.id, role: 'owner', status: 'active' }))
  const token = randomSecret()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString()
  ensure(await admin.from('couple_invitations').insert({ couple_id: couple.id, inviter_id: user.id, invitee_email: email, token_hash: sha256(token), expires_at: expiresAt }))
  const origin = process.env.APP_ORIGIN?.replace(/\/$/, '')
  return { couple_id: couple.id, invitee_email: email, expires_at: expiresAt, invite_url: origin ? `${origin}/parejas?invite=${encodeURIComponent(token)}` : null }
}

async function acceptInvitation(admin, user, token) {
  const rows = ensure(await admin.from('couple_invitations').select('id,couple_id,invitee_email,status,expires_at').eq('token_hash', sha256(token)).eq('status', 'pending').limit(1))
  const invitation = rows[0]
  if (!invitation || new Date(invitation.expires_at).getTime() <= Date.now()) publicError('La invitación no existe o ya expiró.', 404)
  if (String(user.email || '').trim().toLowerCase() !== invitation.invitee_email) publicError('Inicia sesión con el correo al que se envió la invitación.', 403)
  const current = ensure(await admin.from('couple_members').select('couple_id').eq('user_id', user.id).eq('status', 'active'))
  if (current.length) publicError('Ya tienes una cuenta en pareja activa.', 409)
  ensure(await admin.from('couple_members').insert({ couple_id: invitation.couple_id, user_id: user.id, role: 'member', status: 'active' }))
  ensure(await admin.from('couple_spaces').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', invitation.couple_id))
  ensure(await admin.from('couple_invitations').update({ status: 'accepted', accepted_by: user.id, accepted_at: new Date().toISOString() }).eq('id', invitation.id))
  return { couple_id: invitation.couple_id }
}

async function getOverview(admin, user) {
  const members = ensure(await admin.from('couple_members').select('couple_id,user_id,role,status,joined_at').eq('user_id', user.id).eq('status', 'active'))
  const coupleIds = members.map((item) => item.couple_id)
  const [spaces, allMembers, shared, requests, outgoing, incoming] = await Promise.all([
    coupleIds.length ? admin.from('couple_spaces').select('id,status,created_by,created_at,updated_at').in('id', coupleIds) : { data: [], error: null },
    coupleIds.length ? admin.from('couple_members').select('couple_id,user_id,role,status,joined_at').in('couple_id', coupleIds).eq('status', 'active') : { data: [], error: null },
    coupleIds.length ? admin.from('couple_shared_accounts').select('couple_id,owner_user_id,account_id,shared_at,revoked_at').in('couple_id', coupleIds).is('revoked_at', null) : { data: [], error: null },
    coupleIds.length ? admin.from('couple_change_requests').select('id,couple_id,proposer_id,owner_user_id,account_id,change_type,payload,expected_version,status,reviewer_id,applied_transaction_id,created_at,reviewed_at').in('couple_id', coupleIds).order('created_at', { ascending: false }).limit(100) : { data: [], error: null },
    admin.from('couple_invitations').select('id,couple_id,invitee_email,status,expires_at,created_at').eq('inviter_id', user.id).order('created_at', { ascending: false }).limit(20),
    user.email ? admin.from('couple_invitations').select('id,couple_id,inviter_id,invitee_email,status,expires_at,created_at').eq('invitee_email', String(user.email).toLowerCase()).eq('status', 'pending').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }) : { data: [], error: null },
  ])
  ;[spaces, allMembers, shared, requests, outgoing, incoming].forEach(ensure)
  const accountKeys = [...new Set(shared.data.map((row) => JSON.stringify([row.owner_user_id, row.account_id])))]
  const accountRows = []
  for (const key of accountKeys) {
    const [ownerId, accountId] = JSON.parse(key)
    const account = await ownedAccount(admin, ownerId, accountId)
    if (account) accountRows.push(account)
  }
  const ledgerByOwner = new Map()
  await Promise.all([...new Set(accountRows.map((row) => row.user_id))].map(async (ownerId) => {
    const accountIds = accountRows.filter((row) => row.user_id === ownerId).map((row) => row.id)
    const entries = ensure(await admin.from('ledger_entries').select('account_id,delta_minor').eq('user_id', ownerId).in('account_id', accountIds))
    const balances = new Map()
    entries.forEach((entry) => balances.set(entry.account_id, (balances.get(entry.account_id) || 0) + Number(entry.delta_minor || 0)))
    ledgerByOwner.set(ownerId, balances)
  }))
  const accountMap = new Map(accountRows.map((row) => [JSON.stringify([row.user_id, row.id]), { ...row, balance_minor: ledgerByOwner.get(row.user_id)?.get(row.id) || 0 }]))
  const sharedAccounts = shared.data.map((row) => ({ ...row, account: accountMap.get(JSON.stringify([row.owner_user_id, row.account_id])) || null, owner_label: row.owner_user_id === user.id ? 'Tú' : 'Tu pareja' })).filter((row) => row.account)
  const accountName = new Map(sharedAccounts.map((row) => [JSON.stringify([row.owner_user_id, row.account_id]), row.account.name]))
  return {
    couples: spaces.data.map((space) => ({ ...space, role: members.find((item) => item.couple_id === space.id)?.role || 'member', members: allMembers.data.filter((item) => item.couple_id === space.id).map((item) => ({ ...item, label: item.user_id === user.id ? 'Tú' : 'Tu pareja' })), shared_accounts: sharedAccounts.filter((item) => item.couple_id === space.id), requests: requests.data.filter((item) => item.couple_id === space.id).map((item) => ({ ...item, account_name: accountName.get(JSON.stringify([item.owner_user_id, item.account_id])) || 'Cuenta' })) })),
    outgoing_invitations: outgoing.data,
    incoming_invitations: incoming.data,
  }
}

async function createChangeRequest(admin, user, input) {
  if (!await membership(admin, input.couple_id, user.id)) publicError('No perteneces a este espacio compartido.', 403)
  const shared = ensure(await admin.from('couple_shared_accounts').select('owner_user_id').eq('couple_id', input.couple_id).eq('owner_user_id', input.owner_user_id).eq('account_id', input.account_id).is('revoked_at', null).limit(1))
  const row = shared[0]
  if (!row) publicError('La cuenta no está compartida.', 404)
  const account = await ownedAccount(admin, row.owner_user_id, input.account_id)
  if (!account) publicError('La cuenta ya no existe.', 404)
  let payload = input.payload
  if (input.change_type === 'account_update') {
    const allowed = ['name', 'debt_monthly_payment_minor']
    if (Object.keys(payload).some((key) => !allowed.includes(key))) publicError('El cambio contiene campos no permitidos.')
    if (payload.name !== undefined && (typeof payload.name !== 'string' || payload.name.trim().length < 1 || payload.name.length > 100)) publicError('El nombre de la cuenta no es válido.')
    if (payload.debt_monthly_payment_minor !== undefined && payload.debt_monthly_payment_minor !== null && (!Number.isSafeInteger(payload.debt_monthly_payment_minor) || payload.debt_monthly_payment_minor < 1 || payload.debt_monthly_payment_minor > MAX_MINOR || account.kind !== 'liability')) publicError('El pago mensual solo aplica a una deuda y debe ser válido.')
    if (!Object.keys(payload).length) publicError('Indica al menos un cambio.')
  } else {
    if (!Number.isSafeInteger(payload.amount_minor) || payload.amount_minor < 1 || payload.amount_minor > MAX_MINOR || !['increase', 'decrease'].includes(payload.direction)) publicError('El ajuste debe tener un monto y una dirección válidos.')
    payload = { amount_minor: payload.amount_minor, direction: payload.direction, note: typeof payload.note === 'string' ? payload.note.trim().slice(0, 160) : '' }
  }
  return ensure(await admin.from('couple_change_requests').insert({ couple_id: input.couple_id, proposer_id: user.id, owner_user_id: row.owner_user_id, account_id: input.account_id, change_type: input.change_type, payload, expected_version: input.change_type === 'account_update' ? account.version : null }).select('*').single())
}

async function handleAction(admin, user, input) {
  if (input.action === 'invite') return createInvitation(admin, user, input.email)
  if (input.action === 'accept_invite') return acceptInvitation(admin, user, input.token)
  if (input.action === 'share_account' || input.action === 'unshare_account') {
    if (!await membership(admin, input.couple_id, user.id)) publicError('No perteneces a este espacio compartido.', 403)
    const account = await ownedAccount(admin, user.id, input.account_id)
    if (!account) publicError('Solo puedes compartir tus propias cuentas.', 403)
    if (input.action === 'share_account') return ensure(await admin.from('couple_shared_accounts').upsert({ couple_id: input.couple_id, owner_user_id: user.id, account_id: input.account_id, revoked_at: null }, { onConflict: 'couple_id,owner_user_id,account_id' }).select('*').single())
    return ensure(await admin.from('couple_shared_accounts').update({ revoked_at: new Date().toISOString() }).eq('couple_id', input.couple_id).eq('owner_user_id', user.id).eq('account_id', input.account_id))
  }
  if (input.action === 'create_change_request') return createChangeRequest(admin, user, input)
  const result = await admin.rpc('review_couple_change_request', { p_request_id: input.request_id, p_reviewer_id: user.id, p_decision: input.decision })
  return ensure(result)
}

export default async function handler(req, res) {
  if (!allowMethod(req, res, ['GET', 'POST'])) return
  try {
    assertTrustedOrigin(req)
    const user = await authenticatedUser(req)
    const admin = adminClient()
    if (req.method === 'GET') return json(res, 200, await getOverview(admin, user))
    assertBodySize(req, 8_000)
    const parsed = actionSchema.safeParse(req.body)
    if (!parsed.success) return json(res, 400, { error: 'La acción de parejas no es válida.' })
    return json(res, 200, { result: await handleAction(admin, user, parsed.data) })
  } catch (error) {
    const safe = apiError(error)
    return json(res, safe.status, { error: safe.message })
  }
}
