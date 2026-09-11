import { assertBodySize, assertTrustedOrigin, allowMethod, json } from '../../_lib/http.js'
import { reviewSchema } from '../../_lib/shortcut-contract.js'
import { shortcutError } from '../../_lib/shortcut-server.js'
import { adminClient, authenticatedUser } from '../../_lib/supabase-server.js'

export default async function handler(req,res){
  if(!allowMethod(req,res,['POST'])) return
  try{
    assertTrustedOrigin(req); assertBodySize(req,3_000); const user=await authenticatedUser(req); const parsed=reviewSchema.safeParse(req.body)
    if(!parsed.success) return json(res,400,{error:'Resolución inválida o incompleta.'})
    const value=parsed.data; const {data,error}=await adminClient().rpc('server_resolve_shortcut_event',{
      p_user_id:user.id,p_incoming_id:req.query.id,p_expected_version:value.expected_version,p_action:value.action,
      p_account_id:value.account_id||null,p_category_id:value.category_id||null,p_amount_minor:value.amount_minor?Number(value.amount_minor):null,
      p_occurred_at:value.occurred_at||null,p_transaction_id:value.transaction_id||null,p_create_rule:value.create_rule,
    })
    if(error) throw error; return json(res,200,data)
  }catch(error){const safe=shortcutError(error); return json(res,safe.status,{error:safe.message})}
}
