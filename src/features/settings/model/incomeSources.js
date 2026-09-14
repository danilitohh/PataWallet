import { assertMinor, parseLocalizedAmount, safeAdd, toInputAmount } from '../../../domain/money.js'

// Clasifica las fuentes que una persona puede asociar a una cuenta de activo.
export const INCOME_SOURCE_TYPES = [
  { value: 'fixed_salary', label: 'Sueldo fijo' },
  { value: 'occasional', label: 'Ingreso extra esporádico' },
]

const sourceTypeValues = new Set(INCOME_SOURCE_TYPES.map((item) => item.value))
const frequencyValues = new Set(['weekly', 'biweekly', 'semimonthly', 'monthly'])
const MAX_INCOME_SOURCES = 50

// Descarta fuentes antiguas o malformadas antes de mostrarlas en la interfaz.
export function readIncomeSources(value, accounts = []) {
  if (!Array.isArray(value)) return []
  const activeAssets = new Set(accounts.filter((account) => account.kind === 'asset' && !account.archived).map((account) => String(account.id)))
  return value.map((source, index) => {
    const id = String(source?.id || `income-${index}`)
    const name = String(source?.name || '').trim().slice(0, 80)
    const type = String(source?.type || '')
    const accountId = String(source?.account_id || '')
    const amount = source?.amount_minor === null || source?.amount_minor === undefined ? null : Number(source.amount_minor)
    const frequency = String(source?.frequency || '')
    const nextPayDate = source?.next_pay_date ? String(source.next_pay_date) : null
    if (!name || !sourceTypeValues.has(type) || !activeAssets.has(accountId)) return null
    if (amount !== null && (!Number.isSafeInteger(amount) || amount <= 0)) return null
    if (type === 'fixed_salary' && (amount === null || !frequencyValues.has(frequency))) return null
    if (type === 'occasional' && amount !== null && !Number.isSafeInteger(amount)) return null
    if (nextPayDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(nextPayDate)) return null
    return {
      id,
      name,
      type,
      account_id: accountId,
      amount_minor: amount,
      frequency: type === 'fixed_salary' ? frequency : null,
      next_pay_date: type === 'fixed_salary' ? nextPayDate : null,
    }
  }).filter(Boolean).slice(0, MAX_INCOME_SOURCES)
}

// Convierte los controles localizados del formulario en datos persistibles y seguros.
export function parseIncomeSources(rows, accounts = []) {
  if (!Array.isArray(rows) || rows.length > MAX_INCOME_SOURCES) throw new Error(`Puedes registrar hasta ${MAX_INCOME_SOURCES} fuentes de ingreso.`)
  const activeAssets = new Set(accounts.filter((account) => account.kind === 'asset' && !account.archived).map((account) => String(account.id)))
  const parsed = []
  for (const row of rows) {
    const rawName = String(row?.name || '').trim()
    const type = String(row?.type || '').trim()
    const accountId = String(row?.accountId || '').trim()
    const amountInput = String(row?.amount ?? '').trim()
    const frequency = String(row?.frequency || '').trim()
    const nextPayDate = String(row?.nextPayDate || '').trim()
    // Una fila nueva conserva el tipo seleccionado por defecto; ignóralo si el resto está vacío.
    if (!rawName && !amountInput && !frequency && !nextPayDate) continue
    const name = rawName || (type === 'fixed_salary' ? 'Salario' : '')
    if (name.length < 2 || name.length > 80) throw new Error('Cada fuente necesita un nombre de 2 a 80 caracteres.')
    if (!sourceTypeValues.has(type)) throw new Error('Elige si es sueldo fijo o ingreso extra esporádico.')
    if (!activeAssets.has(accountId)) throw new Error(`Selecciona una cuenta de destino para ${name}.`)
    let amountMinor = null
    if (amountInput) amountMinor = assertMinor(parseLocalizedAmount(amountInput))
    if (type === 'fixed_salary') {
      if (amountMinor === null) throw new Error(`Indica el monto mensual equivalente de ${name}.`)
      if (!frequencyValues.has(frequency)) throw new Error(`Elige la frecuencia de pago de ${name}.`)
      if (nextPayDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextPayDate)) throw new Error(`La fecha de pago de ${name} no es válida.`)
    } else {
      if (nextPayDate) throw new Error('Los ingresos extras esporádicos no necesitan próximo pago.')
    }
    parsed.push({
      id: String(row.id || `income-${parsed.length}`),
      name,
      type,
      account_id: accountId,
      amount_minor: amountMinor,
      frequency: type === 'fixed_salary' ? frequency : null,
      next_pay_date: type === 'fixed_salary' ? nextPayDate || null : null,
    })
  }
  return parsed
}

// Prepara filas editables desde una lista guardada en el espacio del usuario.
export function incomeSourcesToInput(value, accounts = []) {
  return readIncomeSources(value, accounts).map((source) => ({
    id: source.id,
    name: source.name,
    type: source.type,
    accountId: source.account_id,
    amount: source.amount_minor === null ? '' : toInputAmount(source.amount_minor),
    frequency: source.frequency || '',
    nextPayDate: source.next_pay_date || '',
  }))
}

// Suma únicamente los sueldos fijos, que sí sirven para estimar dinero libre mensual.
export function fixedIncomeSummary(sources = []) {
  const fixed = sources.filter((source) => source.type === 'fixed_salary')
  const salaryMinor = fixed.reduce((total, source) => safeAdd(total, Number(source.amount_minor || 0)), 0)
  return { fixed, salaryMinor: Number.isSafeInteger(salaryMinor) && salaryMinor > 0 ? salaryMinor : null, primary: fixed[0] || null }
}

// Unifica la lista nueva con las claves antiguas para no perder configuraciones existentes.
export function incomeReference(settings = {}, accounts = []) {
  const sources = readIncomeSources(settings.incomeSources, accounts)
  const summary = fixedIncomeSummary(sources)
  if (sources.length) return { sources, ...summary }
  const salary = Number(settings.monthlySalaryMinor)
  if (!Number.isSafeInteger(salary) || salary <= 0) return { sources: [], fixed: [], salaryMinor: null, primary: null }
  return {
    sources: [], fixed: [], salaryMinor: salary,
    primary: { frequency: settings.payFrequency || null, next_pay_date: settings.nextPayDate || null },
  }
}

// Devuelve la etiqueta visible de una fuente sin confiar en textos guardados.
export function incomeSourceTypeLabel(value) {
  return INCOME_SOURCE_TYPES.find((item) => item.value === value)?.label || ''
}
