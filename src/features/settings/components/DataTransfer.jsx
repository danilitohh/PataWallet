import { useState } from 'react'
import { DatabaseBackup, FileSpreadsheet } from 'lucide-react'
import { defaultExportTaxYear, exportTaxYears, transactionsCsv } from '../../../services/backup/backup.js'

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

export function DataTransfer({ data, notify }) {
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const years = exportTaxYears(data)
  const [taxYear, setTaxYear] = useState(() => defaultExportTaxYear())
  const stamp = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
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
  return <div className="data-transfer">
    <div className="data-transfer__heading"><DatabaseBackup /><div><h3>Exportar datos</h3><p>Descarga tus movimientos en CSV o un Excel con el detalle y un resumen para el contador.</p></div></div>
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
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <p className="helper">Los archivos se generan a partir de la información guardada en PataWallet.</p>
  </div>
}

