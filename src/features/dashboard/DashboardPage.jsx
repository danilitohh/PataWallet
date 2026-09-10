import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Eye, EyeOff, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../app/AppContext.jsx'
import { PetScene } from '../../components/PetScene.jsx'
import { calculateSummary } from '../../domain/finance.js'
import { formatMinor } from '../../domain/money.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { Progress } from '../../shared/components/Progress.jsx'
import { currentMonth } from '../../shared/lib/date.js'
import { TransactionList } from '../transactions/components/TransactionList.jsx'

export function DashboardPage() {
  const { accounts, transactions, budgets, settings, setSheet, actions, user } = useApp()
  const [month, setMonth] = useState(currentMonth())
  const summary = calculateSummary(accounts, transactions, month)
  const budget = budgets.find((item) => item.month === month) || budgets[0]
  const remaining = budget ? budget.limit_minor - summary.expenses : 0
  const used = budget?.limit_minor ? (summary.expenses / budget.limit_minor) * 100 : 0
  const recent = transactions.filter((item) => !['opening', 'adjustment'].includes(item.type)).slice(0, 4)
  const hidden = Boolean(settings.hiddenAmounts)

  return (
    <div className="route-stack">
      <PageHeader title={`Hola, ${user?.user_metadata?.display_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Danilo'}`} subtitle="Qué bueno tenerte por aquí." action={<button className="icon-button" aria-label={hidden ? 'Mostrar montos' : 'Ocultar montos'} onClick={() => actions.setSetting('hiddenAmounts', !hidden)}>{hidden ? <EyeOff /> : <Eye />}</button>} />
      <DemoBanner />
      <section className="balance-hero">
        <div className="balance-hero__numbers"><span>Saldo en cuentas</span><strong aria-label={hidden ? 'Monto oculto' : undefined}>{formatMinor(summary.assets, 'COP', hidden)}</strong><small>Dinero registrado en activos</small></div>
        <div className="balance-hero__scene" aria-hidden="true"><PetScene name="welcome" /></div>
      </section>
      <div className="month-row"><label htmlFor="month-home">Mes</label><input id="month-home" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></div>
      <section className="stat-grid" aria-label="Resumen del mes">
        <Stat icon={ArrowDownLeft} label="Ingresos" value={formatMinor(summary.income, 'COP', hidden)} tone="positive" />
        <Stat icon={ArrowUpRight} label="Gastos" value={formatMinor(summary.expenses, 'COP', hidden)} tone="negative" />
        <Stat icon={CreditCard} label="Deuda" value={formatMinor(summary.debt, 'COP', hidden)} />
      </section>
      <section className="feature-panel budget-summary">
        <div className="section-heading"><div><h2>Presupuesto mensual</h2><p>{remaining >= 0 ? `Te quedan ${formatMinor(remaining, 'COP', hidden)}` : `Superaste el presupuesto por ${formatMinor(Math.abs(remaining), 'COP', hidden)}`}</p></div><Link to="/plan">Ver plan</Link></div>
        <Progress value={used} label={`${Math.round(used)}% usado`} />
      </section>
      <section>
        <div className="section-heading"><h2>Últimos movimientos</h2><Link to="/actividad">Ver todos</Link></div>
        <TransactionList items={recent} compact />
      </section>
      <button className="button button--primary desktop-hidden" onClick={() => setSheet('new')}><Plus /> Registrar movimiento</button>
    </div>
  )
}

function DemoBanner() {
  return <div className="demo-banner"><span>Datos de ejemplo</span><p>Guardados solo en este navegador</p></div>
}

function Stat({ icon: Icon, label, value, tone = '' }) {
  return <div className={`stat ${tone}`}><Icon /><span>{label}</span><strong>{value}</strong></div>
}
