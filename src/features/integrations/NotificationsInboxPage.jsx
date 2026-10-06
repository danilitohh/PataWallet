import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { formatMinor } from '../../domain/money.js'
import { bankEmailRequest, resolveBankEmail } from '../../services/bank-email/bankEmailClient.js'
import { NightIcon } from '../../shared/components/NightIcon.jsx'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import './notifications-inbox.css'

// Presents pending bank-email alerts without mixing them with connection settings.
export function NotificationsInboxPage() {
  const app = useApp()
  return <NotificationsInbox key={app.user?.id || 'demo'} app={app} />
}

function NotificationsInbox({ app }) {
  const { isDemo, user, settings, actions, notify, setSheet } = app
  const [data, setData] = useState({ events: [], has_more: false })
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState('')

  // Loads only the user's pending alerts; demo data never queries the private inbox.
  const refresh = useCallback(async () => {
    if (isDemo || !user?.id) return
    setLoading(true)
    setError('')
    try {
      setData(await bankEmailRequest('GET', page))
      window.dispatchEvent(new Event('patawallet:notifications-changed'))
    } catch (issue) {
      setError(issue.message)
    } finally {
      setLoading(false)
    }
  }, [isDemo, page, user?.id])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  const openMovement = (item) => {
    const candidate = item.candidate
    const amount = Number(candidate.amount_minor)
    const localDate = bogotaDateTime(candidate.occurred_at)
    setSheet({
      kind: 'prefilled',
      initialFlow: candidate.direction === 'incoming' ? 'income' : 'expense',
      initialValues: {
        transactionId: `bank-email-${item.id}`,
        amountMinor: Number.isSafeInteger(amount) && amount > 0 ? amount : null,
        date: localDate.date,
        time: localDate.time,
        note: candidate.counterparty || '',
      },
      onSaved: async (record) => {
        try {
          // The ledger save completes first; linking the email never creates a second transaction.
          await actions.retrySync()
          await resolveBankEmail(item.id, 'link', {}, record.id)
          await refresh()
        } catch {
          notify('Movimiento guardado, pero el aviso sigue pendiente. Actualiza Notificaciones cuando tengas conexión.')
        }
      },
    })
  }

  return <div className="route-stack notifications-inbox">
    <PageHeader title="Notificaciones" subtitle="Movimientos detectados para revisar. Nada cambia tus saldos hasta que confirmes." />
    {isDemo || !user?.id ? <section className="integration-card notifications-inbox__empty"><NightIcon icon={Bell} className="integration-icon" tone="sky" /><div><h2>Tu bandeja está lista</h2><p>Cuando PataWallet detecte un movimiento en tus correos bancarios, aparecerá aquí para que decidas qué hacer.</p></div></section> : <section className="integration-card notifications-inbox__panel" aria-busy={loading}>
      <div className="notifications-inbox__heading">
        <div className="notifications-inbox__heading-copy">
          <h2>Por revisar <span className="notifications-inbox__count">{data.events.length}</span></h2>
          <p>{data.events.length === 1 ? '1 movimiento necesita tu confirmación' : `${data.events.length} movimientos necesitan tu confirmación`}</p>
        </div>
        <button type="button" className="button button--secondary notifications-inbox__refresh" aria-label="Actualizar avisos" disabled={loading} onClick={refresh}><RefreshCw aria-hidden="true" /><span>Actualizar</span></button>
      </div>
      {error && <div className="notifications-inbox__error" role="alert"><p>{error}</p><button type="button" className="button button--secondary" onClick={refresh}>Reintentar</button></div>}
      {!error && loading && <p role="status">Cargando avisos…</p>}
      {!error && !loading && !data.events.length && <div className="notifications-inbox__zero"><CheckCircle2 aria-hidden="true" /><div><strong>Todo al día</strong><p>Los movimientos detectados en tus correos aparecerán aquí para que los revises.</p></div></div>}
      <div className="notifications-inbox__list">{data.events.map((item) => <button type="button" className="notifications-inbox__item" key={item.id} onClick={() => openMovement(item)} aria-label={`Abrir registro de movimiento de ${item.candidate.counterparty || item.bank}`}>
        <span className="notifications-inbox__icon"><Bell aria-hidden="true" /></span>
        <span className="notifications-inbox__summary">
          <strong>{item.candidate.counterparty || item.bank}</strong>
          <small>{item.bank} <span aria-hidden="true">·</span> {directionLabel(item)}</small>
          <small className="notifications-inbox__date">{formatEventDate(item.candidate.occurred_at)}</small>
        </span>
        <span className="notifications-inbox__trailing">
          <span className="notifications-inbox__amount">{Number.isSafeInteger(Number(item.candidate.amount_minor)) && Number(item.candidate.amount_minor) > 0 ? formatMinor(Number(item.candidate.amount_minor), 'COP', settings.hiddenAmounts) : 'Monto por confirmar'}</span>
          <ChevronRight className="notifications-inbox__chevron" aria-hidden="true" />
        </span>
      </button>)}</div>
      {!error && (page > 0 || data.has_more) && <nav className="notifications-inbox__pagination" aria-label="Paginación de avisos">
        <button type="button" className="button button--secondary" disabled={!page || loading} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>Página {page + 1}</span>
        <button type="button" className="button button--secondary" disabled={!data.has_more || loading} onClick={() => setPage(page + 1)}>Siguiente</button>
      </nav>}
    </section>}
  </div>
}

function directionLabel(item) {
  return item.candidate.direction === 'incoming' ? 'Recibiste dinero' : item.candidate.direction === 'outgoing' ? 'Enviaste dinero' : 'Movimiento por verificar'
}

function formatEventDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Fecha por confirmar'
  return new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })
}

function bogotaDateTime(value) {
  if (!value || Number.isNaN(Date.parse(value))) return { date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()), time: '' }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]))
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` }
}
