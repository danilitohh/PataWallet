import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChartPie, TrendingUp, Wallet } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { calendarToday } from '../../domain/recurringExpenses.js'
import { formatMinor } from '../../domain/money.js'
import { currentMonth } from '../../shared/lib/date.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { buildMetrics } from './metricsModel.js'

export function MetricsPage() {
  const { transactions, categories, settings, isDemo } = useApp()
  const month = currentMonth()
  const today = calendarToday()
  const metrics = useMemo(() => buildMetrics({ transactions, categories, month, today }), [transactions, categories, month, today])
  const currency = settings.currency || 'COP'
  const hidden = Boolean(settings.hiddenAmounts)
  const money = (amount) => formatMinor(amount, currency, hidden)
  const maxMonthExpense = Math.max(0, ...metrics.months.map((item) => item.expenseMinor))

  return <div className="route-stack metrics-page">
    <PageHeader title="Métricas" subtitle="Tus estadísticas se actualizan con los movimientos que registras." action={isDemo && <span className="calm-demo">Datos de ejemplo</span>} />

    <section className="metrics-period" aria-label="Periodo analizado">
      <CalendarDays aria-hidden="true" />
      <span>{monthLabel(month)}</span>
      <small>al {calendarDateLabel(today)}</small>
    </section>

    <section className="metrics-grid" aria-label="Resumen financiero del mes">
      <MetricCard icon={ArrowDownLeft} label="Ingresos" value={money(metrics.incomeMinor)} />
      <MetricCard icon={ArrowUpRight} label="Gastos netos" value={money(metrics.expenseMinor)} />
      <MetricCard icon={Wallet} label="Flujo neto" value={money(metrics.netFlowMinor)} hint="Ingresos menos gastos registrados" />
      <MetricCard icon={TrendingUp} label="Gasto diario promedio" value={metrics.dailyAverageMinor === null ? '—' : money(metrics.dailyAverageMinor)} hint={metrics.dailyAverageMinor !== null ? 'Promedio del mes hasta hoy' : metrics.hasSpendData ? 'Reembolsos superan gastos' : 'Aún sin gastos registrados'} />
    </section>

    <section className="metrics-panel metrics-projection" aria-labelledby="metrics-projection-title">
      <div className="metrics-panel-heading">
        <div className="metrics-panel-icon"><TrendingUp aria-hidden="true" /></div>
        <div><h2 id="metrics-projection-title">Proyección de gastos</h2><p>Estimación al cierre de {monthLabel(month)}</p></div>
      </div>
      <strong className="metrics-projection-value">{metrics.projectionMinor === null ? 'Aún sin estimación' : money(metrics.projectionMinor)}</strong>
      <p className="metrics-note">{projectionDescription(metrics)}</p>
    </section>

    <section className="metrics-panel" aria-labelledby="metrics-trend-title">
      <div className="metrics-panel-heading metrics-panel-heading--simple"><div><h2 id="metrics-trend-title">Gastos por mes</h2><p>Últimos seis meses · actualizados con tu historial</p></div><ChartPie aria-hidden="true" /></div>
      {metrics.months.some((item) => item.expenseMinor > 0)
        ? <ul className="metrics-trend-list">{metrics.months.map((item) => {
          const width = maxMonthExpense > 0 ? Math.max(item.expenseMinor > 0 ? 4 : 0, (item.expenseMinor / maxMonthExpense) * 100) : 0
          return <li className="metrics-trend-row" key={item.month}>
            <span className="metrics-trend-month">{shortMonthLabel(item.month)}</span>
            <div className="metrics-bar" role="meter" aria-label={`Gastos de ${monthLabel(item.month)}: ${money(item.expenseMinor)}`} aria-valuemin="0" aria-valuemax={maxMonthExpense} aria-valuenow={Math.max(0, item.expenseMinor)}><span style={{ width: `${width}%` }} /></div>
            <strong>{money(item.expenseMinor)}</strong>
          </li>
        })}</ul>
        : <p className="metrics-empty">Cuando registres gastos, aquí verás cómo cambia tu ritmo mes a mes.</p>}
    </section>

    <section className="metrics-panel" aria-labelledby="metrics-category-title">
      <div className="metrics-panel-heading metrics-panel-heading--simple"><div><h2 id="metrics-category-title">En qué se concentra</h2><p>Categorías con más gasto neto este mes</p></div><ChartPie aria-hidden="true" /></div>
      {metrics.topCategories.length
        ? <ul className="metrics-category-list">{metrics.topCategories.map((item) => <li key={item.id}>
          <div className="metrics-category-heading"><strong>{item.name}</strong><span>{money(item.amountMinor)}</span></div>
          <div className="metrics-bar" role="meter" aria-label={`${item.name}: ${item.sharePercent}% del gasto neto`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={item.sharePercent}><span style={{ width: `${item.sharePercent}%` }} /></div>
        </li>)}</ul>
        : <p className="metrics-empty">Aún no hay gastos por categoría para este mes.</p>}
    </section>

    <p className="metrics-disclaimer">La proyección extrapola el gasto neto registrado hasta hoy. No anticipa ingresos futuros ni pagos programados y no representa un saldo bancario.</p>
  </div>
}

function MetricCard({ icon: Icon, label, value, hint }) {
  return <article className="metrics-stat-card">
    <div className="metrics-stat-label"><Icon aria-hidden="true" /><span>{label}</span></div>
    <strong>{value}</strong>
    {hint && <small>{hint}</small>}
  </article>
}

function projectionDescription(metrics) {
  if (!metrics.hasSpendData) return 'Registra gastos para estimar el total con base en tu ritmo de este mes.'
  if (metrics.projectionMinor === null) return 'Los reembolsos registrados superan los gastos; todavía no hay una base útil para proyectar.'
  return `Si mantienes el ritmo actual, faltan ${metrics.daysRemaining} ${metrics.daysRemaining === 1 ? 'día' : 'días'} del mes.`
}

function monthLabel(value) {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-15T12:00:00Z`))
}

function shortMonthLabel(value) {
  return new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' }).format(new Date(`${value}-15T12:00:00Z`)).replace('.', '')
}

function calendarDateLabel(value) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)).replace('.', '')
}
