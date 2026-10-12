import { assertMinor, safeAdd } from '../../domain/money.js'

const TRACKED_TYPES = new Set(['income', 'expense', 'refund'])
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
})

function localDateParts(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  const parts = Object.fromEntries(dateFormatter.formatToParts(date).map(({ type, value: part }) => [type, part]))
  return { month: `${parts.year}-${parts.month}`, day: Number(parts.day) }
}

function monthOffset(month, offset) {
  const [year, number] = month.split('-').map(Number)
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7)
}

function daysInMonth(month) {
  const [year, number] = month.split('-').map(Number)
  return new Date(Date.UTC(year, number, 0)).getUTCDate()
}

function summarize(rows) {
  return rows.reduce((total, row) => {
    const amount = assertMinor(row.amount_minor)
    if (row.type === 'income') {
      total.incomeMinor = safeAdd(total.incomeMinor, amount)
      total.incomeCount += 1
    } else if (row.type === 'expense') {
      total.purchasesMinor = safeAdd(total.purchasesMinor, amount)
      total.expenseCount += 1
    } else {
      total.refundsMinor = safeAdd(total.refundsMinor, amount)
      total.refundCount += 1
    }
    return total
  }, { incomeMinor: 0, purchasesMinor: 0, refundsMinor: 0, expenseCount: 0, refundCount: 0, incomeCount: 0 })
}

function netExpenses(summary) {
  return safeAdd(summary.purchasesMinor, -summary.refundsMinor)
}

function monthRows(rows, month, throughDay) {
  return rows.filter((row) => row.date.month === month && row.date.day <= throughDay)
}

// Derives each display value from persisted movements; the month-end estimate only extrapolates recorded net spending.
export function buildMetrics({ transactions = [], categories = [], month, today }) {
  const dayOfMonth = Number(today.slice(8, 10))
  const currentRows = transactions.flatMap((transaction) => {
    if (transaction.status === 'void' || !TRACKED_TYPES.has(transaction.type)) return []
    const date = localDateParts(transaction.occurred_at)
    return date ? [{ ...transaction, date }] : []
  })

  const thisMonthRows = monthRows(currentRows, month, dayOfMonth)
  const current = summarize(thisMonthRows)
  const expenseMinor = netExpenses(current)
  const priorMonth = monthOffset(month, -1)
  const priorDay = Math.min(dayOfMonth, daysInMonth(priorMonth))
  const priorSamePeriod = summarize(monthRows(currentRows, priorMonth, priorDay))
  const priorExpenseMinor = netExpenses(priorSamePeriod)
  const changeMinor = safeAdd(expenseMinor, -priorExpenseMinor)
  const comparisonPercent = priorExpenseMinor > 0 ? Math.round((changeMinor / priorExpenseMinor) * 100) : null

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const categoryTotals = new Map()
  for (const row of thisMonthRows) {
    if (row.type !== 'expense' && row.type !== 'refund') continue
    const id = row.category_id || 'uncategorized'
    const name = categoryNames.get(row.category_id) || 'Sin categoría'
    const currentTotal = categoryTotals.get(id) || { id, name, amountMinor: 0, movementCount: 0 }
    currentTotal.amountMinor = safeAdd(currentTotal.amountMinor, row.type === 'refund' ? -assertMinor(row.amount_minor) : assertMinor(row.amount_minor))
    currentTotal.movementCount += 1
    categoryTotals.set(id, currentTotal)
  }
  const topCategories = [...categoryTotals.values()]
    .filter((category) => category.amountMinor > 0)
    .sort((left, right) => right.amountMinor - left.amountMinor)
    .slice(0, 5)
    .map((category) => ({
      ...category,
      sharePercent: expenseMinor > 0 ? Math.round((category.amountMinor / expenseMinor) * 100) : 0,
    }))

  const months = Array.from({ length: 6 }, (_, index) => monthOffset(month, index - 5)).map((key) => {
    const cutoff = key === month ? dayOfMonth : daysInMonth(key)
    const period = summarize(monthRows(currentRows, key, cutoff))
    return { month: key, expenseMinor: netExpenses(period), incomeMinor: period.incomeMinor }
  })

  const totalDays = daysInMonth(month)
  const hasSpendData = current.expenseCount + current.refundCount > 0
  const projectionMinor = hasSpendData && expenseMinor >= 0 && dayOfMonth > 0
    ? Math.round((expenseMinor / dayOfMonth) * totalDays)
    : null

  return {
    incomeMinor: current.incomeMinor,
    expenseMinor,
    netFlowMinor: safeAdd(current.incomeMinor, -expenseMinor),
    dailyAverageMinor: hasSpendData && expenseMinor >= 0 ? Math.round(expenseMinor / dayOfMonth) : null,
    projectionMinor,
    hasSpendData,
    hasActivity: thisMonthRows.length > 0,
    daysRemaining: Math.max(0, totalDays - dayOfMonth),
    totalDays,
    comparisonPercent,
    comparisonDirection: changeMinor > 0 ? 'increase' : changeMinor < 0 ? 'decrease' : 'same',
    comparisonAvailable: priorExpenseMinor > 0,
    topCategories,
    months,
  }
}
