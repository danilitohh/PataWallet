import { assertBodySize, assertTrustedOrigin, allowMethod, json } from '../_lib/http.js'
import { mappingSchema, normalizeLabel } from '../_lib/shortcut-contract.js'
import { shortcutError } from '../_lib/shortcut-server.js'
import { adminClient, authenticatedUser } from '../_lib/supabase-server.js'

export default async function handler(req, res) {
  if (!allowMethod(req, res, ['POST','DELETE'])) return
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
    const row = { user_id:user.id, card_alias:parsed.data.card_alias, normalized_alias:normalizeLabel(parsed.data.card_alias), account_id:parsed.data.account_id, active:true, updated_at:new Date().toISOString() }
    const { data, error } = await admin.from('card_mappings').upsert(row, { onConflict:'user_id,normalized_alias' }).select('id,card_alias,account_id,active,version,updated_at').single()
    if (error) throw error; return json(res, 200, { mapping:data })
  } catch (error) { const safe=shortcutError(error); return json(res,safe.status,{error:safe.message}) }
}
