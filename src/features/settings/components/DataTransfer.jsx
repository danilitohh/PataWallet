import { useRef, useState } from 'react'
import { DatabaseBackup, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { createBackup, defaultExportTaxYear, exportTaxYears, parseBackup, planBackupMerge, transactionsCsv } from '../../../services/backup/backup.js'

function downloadFile(name, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function DataTransfer({ data, user, actions, notify }) {
  const input = useRef(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const years = exportTaxYears(data)
  const [taxYear, setTaxYear] = useState(() => defaultExportTaxYear())
  const stamp = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const backup = () => {
    downloadFile(`patawallet-respaldo-${stamp}.json`, 'application/json', JSON.stringify(createBackup(data, user.id), null, 2))
    notify('Respaldo JSON descargado')
  }
  const csv = () => {
    downloadFile(`patawallet-movimientos-${stamp}.csv`, 'text/csv;charset=utf-8', transactionsCsv(data))
    notify('CSV descargado')
  }
  const accountantExcel = async () => {
    setError('')
    setExporting(true)
    try {
      const { createAccountantWorkbook } = await import('../../../services/backup/accountantWorkbook.js')
      const workbook = await createAccountantWorkbook(data, taxYear)
      downloadFile(`patawallet-contador-${taxYear}-${stamp}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', workbook)
      notify(`Excel del año ${taxYear} descargado`)
    } catch (issue) {
      setError(`No se pudo crear el Excel: ${issue.message}`)
    } finally {
      setExporting(false)
    }
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
    <div className="data-transfer__heading"><DatabaseBackup /><div><h3>Copia, exportación y restauración</h3><p>El CSV organiza todos tus movimientos. El Excel tiene el detalle y un resumen para el contador en dos hojas. El JSON conserva relaciones completas.</p></div></div>
    <div className="data-transfer__year">
      <label htmlFor="accountant-export-year">Año gravable del resumen</label>
      <select id="accountant-export-year" value={taxYear} onChange={(event) => setTaxYear(Number(event.target.value))}>
        {years.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
      <p>La hoja del contador organiza los datos guardados en PataWallet; no reemplaza certificados ni determina valores fiscales.</p>
    </div>
    <div className="data-transfer__actions">
      <button className="button button--secondary" onClick={csv}><FileSpreadsheet /> Exportar CSV</button>
      <button className="button button--secondary" onClick={accountantExcel} disabled={exporting}><FileSpreadsheet /> {exporting ? 'Preparando Excel…' : 'Excel para contador'}</button>
      <button className="button button--secondary" onClick={backup}><Download /> Descargar respaldo</button>
      <button className="button button--secondary" onClick={() => input.current?.click()}><Upload /> Restaurar JSON</button>
      <input ref={input} className="visually-hidden" type="file" accept="application/json,.json" onChange={restore} />
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <p className="helper">La restauración valida propietario y versión, y se detiene ante conflictos. No depende de una copia automática del proveedor.</p>
  </div>
}

