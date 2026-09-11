import { assertTrustedOrigin, allowMethod, json } from '../_lib/http.js'
import { templateMetadata } from '../_lib/shortcut-contract.js'
import { shortcutError } from '../_lib/shortcut-server.js'
import { adminClient, authenticatedUser } from '../_lib/supabase-server.js'

export default async function handler(req, res) {
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
    const failure = [devices,mappings,rules,events].find((item) => item.error)
    if (failure) throw failure.error
    return json(res, 200, { template: templateMetadata(), devices: devices.data, mappings: mappings.data, rules: rules.data, events: events.data })
  } catch (error) { const safe = shortcutError(error); return json(res, safe.status, { error: safe.message }) }
}
