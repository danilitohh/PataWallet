import { useRef, useState } from 'react'
import { DatabaseBackup, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { createBackup, parseBackup, planBackupMerge, transactionsCsv } from '../../../services/backup/backup.js'

function downloadFile(name, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export function DataTransfer({ data, user, actions, notify }) {
  const input = useRef(null)
  const [error, setError] = useState('')
  const stamp = new Date().toISOString().slice(0, 10)
  const backup = () => {
    downloadFile(`patawallet-respaldo-${stamp}.json`, 'application/json', JSON.stringify(createBackup(data, user.id), null, 2))
    notify('Respaldo JSON descargado')
  }
  const csv = () => {
    downloadFile(`patawallet-movimientos-${stamp}.csv`, 'text/csv;charset=utf-8', transactionsCsv(data))
    notify('CSV descargado')
  }
  const restore = async (event) => {
    setError('')
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('El respaldo supera el límite de 10 MB.')
      const parsed = parseBackup(await file.text(), user.id)
      const plan = planBackupMerge(data, parsed)
      if (plan.conflicts.length) throw new Error(`Hay ${plan.conflicts.length} registro${plan.conflicts.length === 1 ? '' : 's'} con el mismo identificador y contenido diferente. No se cambió nada.`)
      if (!plan.addedCount) { notify('El respaldo ya estaba presente'); return }
      if (!confirm(`Se agregarán ${plan.addedCount} registros sin reemplazar los existentes. ¿Continuar?`)) return
      await actions.importBackup(plan.additions)
      notify('Respaldo restaurado y puesto en sincronización')
    } catch (issue) {
      setError(issue.message)
    }
  }
  return <div className="data-transfer">
    <div className="data-transfer__heading"><DatabaseBackup /><div><h3>Copia y restauración</h3><p>El JSON incluye relaciones completas. El CSV es solo una exportación de movimientos.</p></div></div>
    <div className="data-transfer__actions">
      <button className="button button--secondary" onClick={csv}><FileSpreadsheet /> Exportar CSV</button>
      <button className="button button--secondary" onClick={backup}><Download /> Descargar respaldo</button>
      <button className="button button--secondary" onClick={() => input.current?.click()}><Upload /> Restaurar JSON</button>
      <input ref={input} className="visually-hidden" type="file" accept="application/json,.json" onChange={restore} />
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <p className="helper">La restauración valida propietario y versión, y se detiene ante conflictos. No depende de una copia automática del proveedor.</p>
  </div>
}

