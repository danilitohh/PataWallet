import ExcelJS from 'exceljs'
import { safeAdd } from '../../domain/money.js'
import { transactionDeltas } from '../../domain/finance.js'

const movementLabels = {
  opening: 'Saldo inicial', income: 'Ingreso', expense: 'Gasto', transfer: 'Transferencia',
  card_payment: 'Pago de deuda', adjustment: 'Ajuste', refund: 'Reembolso',
}
const sourceLabels = { manual: 'Registro manual', shortcut: 'Atajo', import: 'Importación', demo: 'Demostración' }
const statusLabels = { recorded: 'Registrado', pending: 'Pendiente', void: 'Anulado' }
const amountFormat = '#,##0.##;[Red]-#,##0.##'
const headerFill = 'FF193047'
const accentFill = 'FFE8D8F1'
const mutedFill = 'FFF1F3F6'

function bogotaParts(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value))
  return Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value: part }) => [type, part]))
}

function yearOf(value) { return bogotaParts(value).year }
function monthOf(value) { const { year, month } = bogotaParts(value); return `${year}-${month}` }

function excelDate(value) {
  const { year, month, day, hour, minute } = bogotaParts(value)
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)))
}

function safeText(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return /^\s*[=+\-@]/.test(text) ? `'${text}` : text
}

function add(total, amount) { return safeAdd(total, Number(amount) || 0) }
function recordedInYear(transactions, year) {
  return transactions.filter((row) => row.status === 'recorded' && row.source !== 'demo' && yearOf(row.occurred_at) === String(year))
}

function sheetTitle(sheet, title, lastColumn) {
  sheet.mergeCells(1, 1, 1, lastColumn)
  const cell = sheet.getCell(1, 1)
  cell.value = title
  cell.font = { name: 'Aptos', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFill } }
  cell.alignment = { vertical: 'middle' }
  sheet.getRow(1).height = 30
}

function section(sheet, row, title, lastColumn) {
  sheet.mergeCells(row, 1, row, lastColumn)
  const cell = sheet.getCell(row, 1)
  cell.value = title
  cell.font = { name: 'Aptos', bold: true, color: { argb: 'FF193047' } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentFill } }
  return row
}

function header(sheet, row, labels) {
  labels.forEach((label, index) => {
    const cell = sheet.getCell(row, index + 1)
    cell.value = label
    cell.font = { name: 'Aptos', bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFill } }
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
  sheet.getRow(row).height = 30
}

function formatAmountColumns(sheet, rows, columns) {
  for (let row = rows[0]; row <= rows[1]; row += 1) {
    for (const column of columns) sheet.getCell(row, column).numFmt = amountFormat
  }
}

function setBody(sheet, startRow, endRow, endColumn) {
  for (let row = startRow; row <= endRow; row += 1) {
    sheet.getRow(row).height = 20
    for (let column = 1; column <= endColumn; column += 1) {
      const cell = sheet.getCell(row, column)
      cell.font = { name: 'Aptos', size: 10, color: { argb: 'FF252936' } }
      cell.alignment = { vertical: 'top', wrapText: column !== 1 }
      if (row % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mutedFill } }
    }
  }
}

function currencyTotals(transactions) {
  const totals = new Map()
  for (const row of transactions) {
    const current = totals.get(row.currency) || { income: 0, expenses: 0, refunds: 0, count: 0 }
    if (row.type === 'income') current.income = add(current.income, row.amount_minor)
    if (row.type === 'expense') current.expenses = add(current.expenses, row.amount_minor)
    if (row.type === 'refund') current.refunds = add(current.refunds, row.amount_minor)
    if (['income', 'expense', 'refund'].includes(row.type)) current.count += 1
    totals.set(row.currency, current)
  }
  return totals
}

function balancesAtYearEnd(data, year) {
  const accountsById = Object.fromEntries(data.accounts.map((account) => [account.id, account]))
  const balances = new Map()
  for (const transaction of data.transactions) {
    if (transaction.status !== 'recorded' || transaction.source === 'demo') continue
    const parts = bogotaParts(transaction.occurred_at)
    const date = `${parts.year}-${parts.month}-${parts.day}`
    if (date > `${year}-12-31`) continue
    try {
      for (const { accountId, delta } of transactionDeltas(transaction, accountsById)) {
        balances.set(accountId, safeAdd(balances.get(accountId) || 0, delta))
      }
    } catch {
      // Un movimiento con una relación incompleta no permite reconstruir el saldo de esa cuenta.
    }
  }
  return data.accounts
    .filter((account) => balances.has(account.id))
    .map((account) => ({ account, balance: balances.get(account.id) }))
    .sort((a, b) => (a.account.kind === b.account.kind ? a.account.name.localeCompare(b.account.name, 'es') : a.account.kind.localeCompare(b.account.kind)))
}

function makeMovementSheet(workbook, data, year) {
  const sheet = workbook.addWorksheet('Movimientos', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
    properties: { tabColor: { argb: 'FF49C9C1' } },
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  sheetTitle(sheet, `Movimientos registrados · año ${year}`, 12)
  sheet.mergeCells('A2:L2')
  sheet.getCell('A2').value = 'Fechas y horas en America/Bogota. Los importes se muestran en unidades de la moneda, no en centavos.'
  sheet.getCell('A2').font = { name: 'Aptos', italic: true, color: { argb: 'FF5D6470' } }
  sheet.mergeCells('A3:L3')
  sheet.getCell('A3').value = 'Se incluyen movimientos registrados, pendientes y anulados; revisa la columna Estado antes de usar los totales.'
  sheet.getCell('A3').font = { name: 'Aptos', italic: true, color: { argb: 'FF5D6470' } }
  const labels = ['Fecha y hora', 'Movimiento', 'Valor', 'Moneda', 'Cuenta de salida', 'Cuenta de entrada', 'Categoría', 'Comercio o persona', 'Nota', 'Origen', 'Estado', 'Efecto del ajuste']
  header(sheet, 4, labels)

  const accounts = new Map(data.accounts.map((row) => [row.id, row.name]))
  const categories = new Map(data.categories.map((row) => [row.id, row.name]))
  const rows = [...data.transactions]
    .filter((row) => yearOf(row.occurred_at) === String(year))
    .sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))
  rows.forEach((row, index) => {
    const number = index + 5
    const values = [
      excelDate(row.occurred_at), movementLabels[row.type] || 'Otro movimiento', Number(row.amount_minor) / 100,
      row.currency, accounts.get(row.from_account_id) || '', accounts.get(row.to_account_id) || '',
      categories.get(row.category_id) || '', row.merchant_name || '', row.note || '',
      sourceLabels[row.source] || 'Otro origen', statusLabels[row.status] || 'Estado desconocido',
      row.type === 'adjustment' ? (row.direction === 'decrease' ? 'Disminuye el saldo' : 'Aumenta el saldo') : '',
    ]
    values.forEach((value, column) => { sheet.getCell(number, column + 1).value = typeof value === 'string' ? safeText(value) : value })
    sheet.getCell(number, 1).numFmt = 'dd/mm/yyyy hh:mm'
    sheet.getCell(number, 3).numFmt = amountFormat
  })
  const widths = [20, 21, 17, 10, 24, 24, 22, 28, 36, 20, 16, 22]
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width })
  if (rows.length) {
    setBody(sheet, 5, rows.length + 4, 12)
    for (let row = 5; row <= rows.length + 4; row += 1) sheet.getCell(row, 3).numFmt = amountFormat
    sheet.autoFilter = { from: 'A4', to: `L${rows.length + 4}` }
  } else {
    sheet.mergeCells('A5:L5')
    sheet.getCell('A5').value = `No hay movimientos en PataWallet para ${year}.`
    sheet.getCell('A5').font = { name: 'Aptos', italic: true, color: { argb: 'FF5D6470' } }
  }
  return sheet
}

function makeAccountantSheet(workbook, data, year) {
  const sheet = workbook.addWorksheet('Resumen contador', {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: 'FFB58BC5' } },
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  sheetTitle(sheet, `Preparación para contador · año gravable ${year}`, 7)
  sheet.mergeCells('A2:G2')
  sheet.getCell('A2').value = 'Resumen informativo de movimientos registrados en PataWallet. No es una declaración de renta ni determina qué ingresos son gravables o qué gastos son deducibles.'
  sheet.getCell('A2').font = { name: 'Aptos', italic: true, color: { argb: 'FF5D6470' } }
  sheet.getCell('A2').alignment = { wrapText: true }
  sheet.getRow(2).height = 32
  sheet.getCell('A3').value = 'Año gravable'
  sheet.getCell('B3').value = Number(year)
  sheet.getCell('D3').value = 'Generado'
  sheet.getCell('E3').value = new Date()
  sheet.getCell('E3').numFmt = 'dd/mm/yyyy hh:mm'

  const yearRows = recordedInYear(data.transactions, year)
  const currencies = [...new Set(yearRows.map((row) => row.currency))]
  const baseCurrency = data.settingsRows?.find((row) => row.key === 'currency')?.value || 'COP'
  if (!currencies.length) currencies.push(baseCurrency)
  const totals = currencyTotals(yearRows)

  let row = 5
  section(sheet, row, 'Totales anuales por moneda', 7)
  row += 1
  header(sheet, row, ['Moneda', 'Ingresos registrados', 'Gastos brutos registrados', 'Reembolsos', 'Gastos netos registrados', 'Movimientos incluidos', 'Pendientes por revisar'])
  row += 1
  for (const currency of currencies) {
    const total = totals.get(currency) || { income: 0, expenses: 0, refunds: 0, count: 0 }
    const netExpenses = safeAdd(total.expenses, -total.refunds)
    const pending = data.transactions.filter((item) => item.status === 'pending' && item.source !== 'demo' && item.currency === currency && yearOf(item.occurred_at) === String(year)).length
    sheet.addRow([currency, total.income / 100, total.expenses / 100, total.refunds / 100, netExpenses / 100, total.count, pending])
    row += 1
  }
  setBody(sheet, 7, row - 1, 7)
  formatAmountColumns(sheet, [7, row - 1], [2, 3, 4, 5])
  const demoCount = data.transactions.filter((item) => item.source === 'demo' && yearOf(item.occurred_at) === String(year)).length
  sheet.getCell(row + 1, 1).value = `Los totales consideran movimientos Registrados y excluyen datos marcados como Demostración (${demoCount}). Los gastos netos restan reembolsos; no clasifican conceptos para impuestos.`
  sheet.mergeCells(row + 1, 1, row + 1, 7)
  sheet.getCell(row + 1, 1).font = { name: 'Aptos', italic: true, color: { argb: 'FF5D6470' } }
  sheet.getCell(row + 1, 1).alignment = { wrapText: true }
  row += 3

  section(sheet, row, 'Saldos registrados al 31 de diciembre', 7)
  row += 1
  header(sheet, row, ['Cuenta', 'Clase', 'Tipo de cuenta', 'Moneda', 'Saldo según movimientos', 'Estado', 'Fecha de corte'])
  row += 1
  const accountTypeLabels = { bank: 'Cuenta bancaria', cash: 'Efectivo', credit_card: 'Tarjeta de crédito', investment_loan: 'Crédito de inversión', private_loan: 'Deuda personal' }
  const yearEndBalances = balancesAtYearEnd(data, year)
  if (yearEndBalances.length) {
    for (const { account, balance } of yearEndBalances) {
      sheet.addRow([safeText(account.name), account.kind === 'liability' ? 'Deuda registrada' : 'Activo registrado', accountTypeLabels[account.subtype] || 'Cuenta', account.currency, balance / 100, account.archived ? 'Archivada' : 'Activa', `31/12/${year}`])
      row += 1
    }
    setBody(sheet, row - yearEndBalances.length, row - 1, 7)
    formatAmountColumns(sheet, [row - yearEndBalances.length, row - 1], [5])
  } else {
    sheet.mergeCells(row, 1, row, 7)
    sheet.getCell(row, 1).value = `No hay saldos de cuenta reconstruibles desde movimientos registrados hasta el cierre de ${year}.`
    row += 1
  }
  sheet.getCell(row + 1, 1).value = 'Reconstrucción basada solo en movimientos Registrados guardados, sin demostraciones. Valida estos saldos con extractos, certificados y demás soportes; no representan por sí solos el valor patrimonial fiscal.'
  sheet.mergeCells(row + 1, 1, row + 1, 7)
  sheet.getCell(row + 1, 1).font = { name: 'Aptos', italic: true, color: { argb: 'FF5D6470' } }
  sheet.getCell(row + 1, 1).alignment = { wrapText: true }
  row += 3

  section(sheet, row, 'Resumen mensual por moneda', 7)
  row += 1
  header(sheet, row, ['Mes', 'Moneda', 'Ingresos registrados', 'Gastos brutos', 'Reembolsos', 'Gastos netos', 'Flujo registrado¹'])
  row += 1
  const monthly = new Map()
  for (const item of yearRows) {
    const key = `${monthOf(item.occurred_at)}|${item.currency}`
    const current = monthly.get(key) || { income: 0, expenses: 0, refunds: 0 }
    if (item.type === 'income') current.income = add(current.income, item.amount_minor)
    if (item.type === 'expense') current.expenses = add(current.expenses, item.amount_minor)
    if (item.type === 'refund') current.refunds = add(current.refunds, item.amount_minor)
    monthly.set(key, current)
  }
  const monthFmt = new Intl.DateTimeFormat('es-CO', { month: 'long', timeZone: 'UTC' })
  for (let month = 1; month <= 12; month += 1) {
    const date = new Date(Date.UTC(Number(year), month - 1, 1))
    const monthLabel = `${monthFmt.format(date)} ${year}`
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    for (const currency of currencies) {
      const total = monthly.get(`${monthKey}|${currency}`) || { income: 0, expenses: 0, refunds: 0 }
      const netExpenses = safeAdd(total.expenses, -total.refunds)
      const cashFlow = safeAdd(total.income, -netExpenses)
      sheet.addRow([monthLabel, currency, total.income / 100, total.expenses / 100, total.refunds / 100, netExpenses / 100, cashFlow / 100])
      row += 1
    }
  }
  setBody(sheet, row - 12 * currencies.length, row - 1, 7)
  formatAmountColumns(sheet, [row - 12 * currencies.length, row - 1], [3, 4, 5, 6, 7])
  sheet.getCell(row + 1, 1).value = '¹ Ingresos menos gastos netos registrados. Transferencias, saldos iniciales, pagos de deuda y ajustes quedan fuera para evitar contarlos como ingreso/gasto.'
  sheet.mergeCells(row + 1, 1, row + 1, 7)
  sheet.getCell(row + 1, 1).font = { name: 'Aptos', italic: true, color: { argb: 'FF5D6470' } }
  sheet.getCell(row + 1, 1).alignment = { wrapText: true }
  row += 3

  section(sheet, row, 'Resumen por categoría de PataWallet', 7)
  row += 1
  header(sheet, row, ['Categoría', 'Moneda', 'Ingresos registrados', 'Gastos brutos', 'Reembolsos', 'Gastos netos', 'Clasificación fiscal'])
  row += 1
  const categories = new Map(data.categories.map((item) => [item.id, item.name]))
  const byCategory = new Map()
  for (const item of yearRows) {
    if (!['income', 'expense', 'refund'].includes(item.type)) continue
    const name = item.category_id ? (categories.get(item.category_id) || 'Sin categoría') : 'Sin categoría'
    const key = `${item.currency}|${name}`
    const current = byCategory.get(key) || { name, currency: item.currency, income: 0, expenses: 0, refunds: 0 }
    if (item.type === 'income') current.income = add(current.income, item.amount_minor)
    if (item.type === 'expense') current.expenses = add(current.expenses, item.amount_minor)
    if (item.type === 'refund') current.refunds = add(current.refunds, item.amount_minor)
    byCategory.set(key, current)
  }
  const categoryRows = [...byCategory.values()].sort((a, b) => a.currency.localeCompare(b.currency) || a.name.localeCompare(b.name, 'es'))
  if (categoryRows.length) {
    for (const item of categoryRows) {
      const netExpenses = safeAdd(item.expenses, -item.refunds)
      sheet.addRow([safeText(item.name), item.currency, item.income / 100, item.expenses / 100, item.refunds / 100, netExpenses / 100, 'Pendiente de validar por el contador'])
      row += 1
    }
    setBody(sheet, row - categoryRows.length, row - 1, 7)
    formatAmountColumns(sheet, [row - categoryRows.length, row - 1], [3, 4, 5, 6])
  } else {
    sheet.mergeCells(row, 1, row, 7)
    sheet.getCell(row, 1).value = `No hay ingresos, gastos o reembolsos registrados en ${year}.`
    row += 1
  }
  sheet.getCell(row + 1, 1).value = 'Las categorías son etiquetas personales del registro. No implican aceptación como costo, deducción, renta exenta o ingreso gravable.'
  sheet.mergeCells(row + 1, 1, row + 1, 7)
  sheet.getCell(row + 1, 1).font = { name: 'Aptos', italic: true, color: { argb: 'FF5D6470' } }
  sheet.getCell(row + 1, 1).alignment = { wrapText: true }
  row += 3

  section(sheet, row, 'Movimientos registrados excluidos de ingresos y gastos', 7)
  row += 1
  header(sheet, row, ['Movimiento', 'Moneda', 'Cantidad', 'Valor registrado', 'Criterio del resumen', '', ''])
  row += 1
  const excludedLabels = { opening: 'Saldo inicial', transfer: 'Transferencia', card_payment: 'Pago de deuda', adjustment: 'Ajuste' }
  for (const [type, label] of Object.entries(excludedLabels)) {
    const relevant = yearRows.filter((item) => item.type === type)
    for (const currency of currencies) {
      const items = relevant.filter((item) => item.currency === currency)
      const value = items.reduce((sum, item) => add(sum, item.amount_minor), 0)
      sheet.addRow([label, currency, items.length, value / 100, type === 'transfer' ? 'Movimiento entre cuentas' : type === 'card_payment' ? 'El gasto ya se registra en la compra' : 'No se cuenta como ingreso o gasto mensual', '', ''])
      row += 1
    }
  }
  setBody(sheet, row - 4 * currencies.length, row - 1, 7)
  formatAmountColumns(sheet, [row - 4 * currencies.length, row - 1], [4])
  const pendingCount = data.transactions.filter((item) => item.status === 'pending' && item.source !== 'demo' && yearOf(item.occurred_at) === String(year)).length
  const voidCount = data.transactions.filter((item) => item.status === 'void' && item.source !== 'demo' && yearOf(item.occurred_at) === String(year)).length
  sheet.getCell(row + 1, 1).value = `Pendientes por revisar: ${pendingCount}. Anulados excluidos de totales: ${voidCount}.`
  sheet.mergeCells(row + 1, 1, row + 1, 7)
  sheet.getCell(row + 1, 1).font = { name: 'Aptos', bold: true, color: { argb: 'FF5D6470' } }
  row += 3

  section(sheet, row, 'Soportes para reunir y validar con el contador', 7)
  row += 1
  header(sheet, row, ['Documento o dato', 'Para qué revisarlo', 'Estado', '', '', '', ''])
  row += 1
  const checklist = [
    ['RUT actualizado', 'Identificación y responsabilidades tributarias del contribuyente.'],
    ['Certificados de ingresos y retenciones', 'Empleadores, clientes, pagadores, fondos, bancos, inversiones y sociedades, según aplique.'],
    ['Saldos de cuentas, inversiones y deudas al 31 de diciembre', 'Solicitar certificados o extractos a cada entidad; PataWallet no certifica saldos fiscales de cierre.'],
    ['Soportes de bienes y derechos', 'Documentos de propiedad y valor fiscal de inmuebles, vehículos, inversiones y otros activos, si aplica.'],
    ['Facturas y soportes de pagos/costos', 'El contador valida relación con la actividad y requisitos legales; la categoría de PataWallet no prueba deducibilidad.'],
    ['Certificados de beneficios y deducciones', 'Dependientes, aportes, intereses u otros conceptos solo si aplican y con soporte válido.'],
    ['Información exógena DIAN y diferencias', 'Comparar lo reportado por terceros con la realidad económica y los documentos propios.'],
  ]
  for (const [document, purpose] of checklist) {
    sheet.addRow([document, purpose, 'Por reunir / revisar', '', '', '', ''])
    row += 1
  }
  setBody(sheet, row - checklist.length, row - 1, 7)
  const guideRow = row + 1
  sheet.mergeCells(guideRow, 1, guideRow, 7)
  sheet.getCell(guideRow, 1).value = { text: 'Referencias oficiales DIAN · Guía de documentos soporte de renta personas naturales AG 2025', hyperlink: 'https://micrositios.dian.gov.co/renta-personas-naturales-ag-2025/como-hacer-su-declaracion/' }
  sheet.getCell(guideRow, 1).font = { name: 'Aptos', color: { argb: 'FF1A65A8' }, underline: true }
  sheet.mergeCells(guideRow + 1, 1, guideRow + 1, 7)
  sheet.getCell(guideRow + 1, 1).value = { text: 'Formulario 210 para personas naturales residentes · año gravable 2025', hyperlink: 'https://www.dian.gov.co/atencionciudadano/formulariosinstructivos/Formularios/2025/Formulario_210_2025.pdf' }
  sheet.getCell(guideRow + 1, 1).font = { name: 'Aptos', color: { argb: 'FF1A65A8' }, underline: true }
  sheet.mergeCells(guideRow + 2, 1, guideRow + 2, 7)
  sheet.getCell(guideRow + 2, 1).value = 'La DIAN indica que los soportes pueden variar según el caso y deben respaldar la realidad económica. Este archivo organiza datos de PataWallet; el contador debe contrastarlos con certificados y documentos fuente y consultar la guía del año que corresponda.'
  sheet.getCell(guideRow + 2, 1).font = { name: 'Aptos', italic: true, color: { argb: 'FF5D6470' } }
  sheet.getCell(guideRow + 2, 1).alignment = { wrapText: true }
  sheet.getRow(guideRow + 2).height = 34

  const widths = [34, 46, 22, 19, 21, 21, 32]
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width })
  sheet.getColumn(1).width = 34
  sheet.pageSetup.printArea = `A1:G${guideRow + 2}`
  return sheet
}

export async function createAccountantWorkbook(data, year) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PataWallet'
  workbook.subject = `Movimientos registrados en PataWallet para el año ${year}`
  workbook.title = `PataWallet · resumen para contador · ${year}`
  workbook.created = new Date()
  workbook.views = [{ x: 0, y: 0, width: 14000, height: 10000, firstSheet: 0, activeTab: 1 }]
  makeMovementSheet(workbook, data, year)
  makeAccountantSheet(workbook, data, year)
  return workbook.xlsx.writeBuffer()
}
