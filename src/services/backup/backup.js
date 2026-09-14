import { assertMinor } from '../../domain/money.js'
import { readDebtSchedule } from '../../domain/debtSchedule.js'
import { readFixedExpenses } from '../../domain/financialSetup.js'
import { readIncomeSources } from '../../features/settings/model/incomeSources.js'
import { z } from 'zod'

export const BACKUP_FORMAT = 'patawallet-backup'
export const BACKUP_VERSION = 1

const collections = {
  accounts: 'id',
  categories: 'id',
  transactions: 'id',
  budgets: 'month',
  goals: 'id',
  allocations: 'id',
  settingsRows: 'key',
  plannedPurchases: 'id',
}

const id = z.string().min(1).max(180)
const minor = z.number().int().positive().max(999_999_999_999)
const currency = z.literal('COP')
const backupDataSchema = z.object({
  accounts: z.array(z.object({
    id, name: z.string().min(2).max(80), kind: z.enum(['asset', 'liability']), subtype: z.enum(['bank', 'cash', 'credit_card', 'investment_loan', 'private_loan']), currency, archived: z.boolean(),
    debt_installments_total: z.number().int().min(1).max(600).nullable().optional(),
    debt_installments_paid: z.number().int().min(0).max(600).optional(),
    debt_installment_amount_minor: minor.nullable().optional(),
    debt_payment_frequency: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']).nullable().optional(),
    debt_monthly_payment_minor: minor.nullable().optional(),
  }).strict()).max(100000),
  categories: z.array(z.object({ id, name: z.string().min(2).max(50), type: z.enum(['income', 'expense']) }).strict()).max(100000),
  transactions: z.array(z.object({
    id, type: z.enum(['opening', 'income', 'expense', 'transfer', 'card_payment', 'adjustment', 'refund']), amount_minor: minor, currency,
    occurred_at: z.string().min(20).max(40), from_account_id: id.nullable().optional(), to_account_id: id.nullable().optional(), category_id: id.nullable().optional(),
    merchant_name: z.string().max(120).nullable().optional(), note: z.string().max(500), source: z.enum(['manual', 'shortcut', 'import', 'demo']),
    status: z.enum(['recorded', 'pending', 'void']), direction: z.enum(['increase', 'decrease']).nullable().optional(),
  }).strict()).max(100000),
  budgets: z.array(z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), limit_minor: minor, currency: currency.optional() }).strict()).max(100000),
  goals: z.array(z.object({ id, name: z.string().min(2).max(80), target_minor: minor, currency, completed_seen: z.boolean() }).strict()).max(100000),
  allocations: z.array(z.object({ id, goal_id: id, account_id: id, amount_minor: minor, allocated_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict()).max(100000),
  settingsRows: z.array(z.object({ key: z.enum(['entered', 'theme', 'hiddenAmounts', 'motion', 'monthlySalaryMinor', 'payFrequency', 'financialOnboardingComplete', 'fixedExpenses', 'nextPayDate', 'incomeSources']), value: z.unknown() }).strict()).max(20),
  plannedPurchases: z.array(z.object({ id, name: z.string().min(2).max(80), amount_minor: minor, currency, target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), category_id: id.nullable().optional(), note: z.string().max(240), status: z.enum(['planned', 'purchased', 'cancelled']) }).strict()).max(100000).optional().default([]),
}).strict()

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  owner_id: z.string().uuid(),
  exported_at: z.string().min(20).max(40),
  currency,
  data: backupDataSchema,
}).strict()

function withoutServerFields(row) {
  const { user_id, created_at, updated_at, version, _sync_state, ...copy } = row
  void user_id; void created_at; void updated_at; void version; void _sync_state
  return copy
}

export function createBackup(data, ownerId) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    owner_id: ownerId,
    exported_at: new Date().toISOString(),
    currency: 'COP',
    data: Object.fromEntries(Object.keys(collections).map((name) => [name, (data[name] || []).map(withoutServerFields)])),
  }
}

export function parseBackup(text, expectedOwnerId) {
  let parsed
  try { parsed = JSON.parse(text) } catch { throw new Error('El archivo no contiene JSON válido.') }
  if (parsed?.format !== BACKUP_FORMAT || parsed?.version !== BACKUP_VERSION) throw new Error('El formato o la versión del respaldo no es compatible.')
  if (parsed.owner_id !== expectedOwnerId) throw new Error('Este respaldo pertenece a otra cuenta. No se mezclaron los datos.')
  const checked = backupSchema.safeParse(parsed)
  if (!checked.success) throw new Error(`El respaldo contiene datos inválidos: ${checked.error.issues[0]?.path.join('.') || 'estructura'}.`)
  parsed = checked.data
  for (const row of parsed.data.transactions) assertMinor(row.amount_minor)
  for (const row of parsed.data.budgets) assertMinor(row.limit_minor)
  for (const row of parsed.data.goals) assertMinor(row.target_minor)
  for (const row of parsed.data.allocations) assertMinor(row.amount_minor)
  for (const row of parsed.data.plannedPurchases) assertMinor(row.amount_minor)
  for (const row of parsed.data.accounts) {
    if (row.debt_installments_total !== undefined && row.debt_installments_total !== null) assertDebtSchedule(row)
    if (row.debt_installment_amount_minor !== undefined && row.debt_installment_amount_minor !== null) assertMinor(row.debt_installment_amount_minor)
    if (row.debt_monthly_payment_minor !== undefined && row.debt_monthly_payment_minor !== null) assertMinor(row.debt_monthly_payment_minor)
  }
  for (const row of parsed.data.settingsRows) {
    if (row.key === 'monthlySalaryMinor' && row.value !== null) assertMinor(row.value)
    if (row.key === 'payFrequency' && row.value !== null && !['weekly', 'biweekly', 'semimonthly', 'monthly'].includes(row.value)) throw new Error('La frecuencia de pago del respaldo no es válida.')
    if (row.key === 'financialOnboardingComplete' && typeof row.value !== 'boolean') throw new Error('El estado del onboarding del respaldo no es válido.')
    if (row.key === 'fixedExpenses' && (!Array.isArray(row.value) || readFixedExpenses(row.value).length !== row.value.length)) throw new Error('Los gastos fijos del respaldo no son válidos.')
    if (row.key === 'nextPayDate' && row.value !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(row.value))) throw new Error('La fecha de pago del respaldo no es válida.')
    if (row.key === 'incomeSources' && (!Array.isArray(row.value) || row.value.length > 50 || readIncomeSources(row.value, parsed.data.accounts).length !== row.value.length)) throw new Error('Las fuentes de ingreso del respaldo no son válidas.')
  }
  return parsed
}

// Comprueba la relación entre cuotas totales, pagadas, importe y frecuencia al importar datos.
function assertDebtSchedule(account) {
  if (account.kind !== 'liability' || !readDebtSchedule(account)) throw new Error(`El plan de cuotas de ${account.id} no es válido.`)
}

function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, ordered(value[key])]))
  return value
}

function canonical(row) {
  return JSON.stringify(ordered(withoutServerFields(row)))
}

function validateRelationships(data) {
  const accounts = new Map(data.accounts.map((row) => [row.id, row]))
  const categories = new Map(data.categories.map((row) => [row.id, row]))
  const goals = new Set(data.goals.map((row) => row.id))
  for (const row of data.accounts) {
    const validSubtype = row.kind === 'asset' ? ['bank', 'cash'].includes(row.subtype) : ['credit_card', 'investment_loan', 'private_loan'].includes(row.subtype)
    if (!validSubtype) throw new Error(`La cuenta ${row.id} combina un tipo y subtipo incompatibles.`)
    const hasScheduleData = (row.debt_installments_total !== undefined && row.debt_installments_total !== null) || (row.debt_installments_paid || 0) > 0 || (row.debt_installment_amount_minor !== undefined && row.debt_installment_amount_minor !== null) || (row.debt_payment_frequency !== undefined && row.debt_payment_frequency !== null)
    if (row.debt_monthly_payment_minor !== undefined && row.debt_monthly_payment_minor !== null && row.kind !== 'liability') throw new Error(`El pago mensual de ${row.id} requiere una deuda.`)
    if (hasScheduleData && !readDebtSchedule(row)) throw new Error(`El plan de cuotas de ${row.id} no es válido.`)
    if (row.kind === 'asset' && hasScheduleData) throw new Error(`La cuenta de activo ${row.id} no puede tener cuotas.`)
  }
  for (const row of data.transactions) {
    if (row.source === 'demo') throw new Error('Un respaldo de demostración no se puede mezclar con una cuenta real.')
    const from = row.from_account_id ? accounts.get(row.from_account_id) : null
    const to = row.to_account_id ? accounts.get(row.to_account_id) : null
    const category = row.category_id ? categories.get(row.category_id) : null
    if (row.from_account_id && !from) throw new Error(`El movimiento ${row.id} referencia una cuenta de origen inexistente.`)
    if (row.to_account_id && !to) throw new Error(`El movimiento ${row.id} referencia una cuenta de destino inexistente.`)
    if (row.category_id && !category) throw new Error(`El movimiento ${row.id} referencia una categoría inexistente.`)
  }
  for (const row of data.allocations) {
    if (!goals.has(row.goal_id)) throw new Error(`La reserva ${row.id} referencia una meta inexistente.`)
    if (accounts.get(row.account_id)?.kind !== 'asset') throw new Error(`La reserva ${row.id} requiere una cuenta de activo existente.`)
  }
  for (const row of data.plannedPurchases) {
    if (row.category_id && categories.get(row.category_id)?.type !== 'expense') throw new Error(`La compra prevista ${row.id} requiere una categoría de gasto propia.`)
  }
}

export function planBackupMerge(current, backup) {
  const additions = {}
  const conflicts = []
  for (const [name, key] of Object.entries(collections)) {
    const existing = new Map((current[name] || []).map((row) => [String(row[key]), row]))
    const seen = new Set()
    additions[name] = []
    for (const row of backup.data[name]) {
      const id = String(row[key] ?? '')
      if (!id) throw new Error(`Hay un registro sin identificador en ${name}.`)
      if (seen.has(id)) throw new Error(`El respaldo repite el identificador ${id} en ${name}.`)
      seen.add(id)
      const previous = existing.get(id)
      if (!previous) additions[name].push(row)
      else if (canonical(previous) !== canonical(row)) conflicts.push({ collection: name, id })
    }
  }
  validateRelationships(Object.fromEntries(Object.keys(collections).map((name) => [name, [...(current[name] || []), ...additions[name]]])))
  return { additions, conflicts, addedCount: Object.values(additions).reduce((sum, rows) => sum + rows.length, 0) }
}

function safeCsvCell(value) {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function transactionsCsv(data) {
  const accounts = new Map(data.accounts.map((row) => [row.id, row.name]))
  const categories = new Map(data.categories.map((row) => [row.id, row.name]))
  const columns = ['id', 'fecha', 'tipo', 'monto_unidades_menores', 'moneda', 'cuenta_origen', 'cuenta_destino', 'categoria', 'comercio', 'nota', 'estado']
  const rows = data.transactions.map((row) => [
    row.id,
    row.occurred_at,
    row.type,
    row.amount_minor,
    row.currency,
    accounts.get(row.from_account_id) || '',
    accounts.get(row.to_account_id) || '',
    categories.get(row.category_id) || '',
    row.merchant_name || '',
    row.note || '',
    row.status,
  ])
  return `\uFEFF${[columns, ...rows].map((row) => row.map(safeCsvCell).join(',')).join('\r\n')}`
}
