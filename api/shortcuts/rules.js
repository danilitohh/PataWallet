import { assertBodySize, assertTrustedOrigin, allowMethod, json } from '../../server/api-lib/http.js'
import { normalizeLabel, ruleSchema } from '../../server/api-lib/shortcut-contract.js'
import { shortcutError } from '../../server/api-lib/shortcut-server.js'
import { adminClient, authenticatedUser } from '../../server/api-lib/supabase-server.js'

export default async function handler(req,res){
  if(!allowMethod(req,res,['POST','DELETE'])) return
  try{
    assertTrustedOrigin(req); assertBodySize(req,2_000); const user=await authenticatedUser(req); const admin=adminClient()
    if(req.method==='DELETE'){ const {error}=await admin.from('category_rules').delete().eq('id',String(req.body?.id||'')).eq('user_id',user.id); if(error) throw error; return json(res,200,{deleted:true}) }
    const parsed=ruleSchema.safeParse(req.body); if(!parsed.success) return json(res,400,{error:'Regla inválida.'})
    const {data:category,error:categoryError}=await admin.from('categories').select('id,type').eq('id',parsed.data.category_id).eq('user_id',user.id).eq('type','expense').maybeSingle()
    if(categoryError) throw categoryError; if(!category) return json(res,400,{error:'La categoría de gasto no pertenece al usuario.'})
    const row={user_id:user.id,merchant_pattern:parsed.data.merchant_pattern,normalized_pattern:normalizeLabel(parsed.data.merchant_pattern),category_id:parsed.data.category_id,priority:parsed.data.priority,active:true,updated_at:new Date().toISOString()}
    const {data,error}=await admin.from('category_rules').upsert(row,{onConflict:'user_id,match_type,normalized_pattern'}).select('id,merchant_pattern,category_id,priority,active,version,updated_at').single()
    if(error) throw error; return json(res,200,{rule:data})
  }catch(error){const safe=shortcutError(error); return json(res,safe.status,{error:safe.message})}
}
