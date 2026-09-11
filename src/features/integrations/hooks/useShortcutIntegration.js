import { useCallback, useEffect, useState } from 'react'
import { createPairingTicket, declareShortcutAutomation, deleteCardMapping, deleteCategoryRule, pendingTemplate, readShortcutStatus, resolveShortcutEvent, revokeShortcutDevice, saveCardMapping, saveCategoryRule } from '../../../services/shortcuts/shortcutClient.js'

export function useShortcutIntegration(isDemo) {
  const [state,setState]=useState({template:pendingTemplate,devices:[],mappings:[],rules:[],events:[],loading:!isDemo,error:''})
  const refresh=useCallback(async()=>{
    if(isDemo) return
    setState((current)=>({...current,loading:true,error:''}))
    try{const data=await readShortcutStatus();setState({...data,loading:false,error:''})}
    catch(error){setState((current)=>({...current,loading:false,error:error.message}))}
  },[isDemo])
  useEffect(()=>{refresh()},[refresh])
  const run=useCallback(async(operation)=>{await operation();await refresh()},[refresh])
  return { ...state, refresh,
    pair:(label)=>createPairingTicket(label),
    revoke:(id)=>run(()=>revokeShortcutDevice(id)),
    declareAutomation:(id,declared)=>run(()=>declareShortcutAutomation(id,declared)),
    saveMapping:(value)=>run(()=>saveCardMapping(value)), deleteMapping:(id)=>run(()=>deleteCardMapping(id)),
    saveRule:(value)=>run(()=>saveCategoryRule(value)), deleteRule:(id)=>run(()=>deleteCategoryRule(id)),
    resolve:(id,value)=>run(()=>resolveShortcutEvent(id,value)),
  }
}
