import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, CheckCircle2, ChevronDown, RefreshCw } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { formatMinor } from '../../domain/money.js'
import { bankEmailRequest, resolveBankEmail } from '../../services/bank-email/bankEmailClient.js'
import { NightIcon } from '../../shared/components/NightIcon.jsx'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { BankEmailReview } from '../bank-email/BankEmailReview.jsx'
import './notifications-inbox.css'

// Presents pending bank-email alerts without mixing them with connection settings.
export function NotificationsInboxPage() {
  const app = useApp()
  return <NotificationsInbox key={app.user?.id || 'demo'} app={app} />
}

function NotificationsInbox({ app }) {
  const location = useLocation()
  const reviewId = new URLSearchParams(location.search).get('review')
  const { isDemo, user, accounts, categories, transactions, settings, actions, notify } = app
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
  // Opens and brings the exact pending event from a push link into view after the inbox loads.
  useEffect(() => {
    if (!loading && data.events.some((item) => item.id === reviewId)) {
      document.getElementById(`bank-review-${reviewId}`)?.scrollIntoView({ block: 'center' })
    }
  }, [data.events, loading, reviewId])
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  // Resolving an alert updates its pending badge and then syncs confirmed ledger changes.
  const resolve = async (...args) => {
    await resolveBankEmail(...args)
    await refresh()
    try {
      await actions.retrySync()
    } catch {
      notify('Decisión guardada. Reintenta la sincronización para actualizar tus saldos.')
      return
    }
    notify('Decisión guardada')
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
      <div className="notifications-inbox__list">{data.events.map((item) => <details className="calm-details notifications-inbox__item" id={`bank-review-${item.id}`} key={item.id} open={item.id === reviewId}>
        <summary>
          <span className="notifications-inbox__icon"><Bell aria-hidden="true" /></span>
          <span className="notifications-inbox__summary">
            <strong>{item.candidate.counterparty || item.bank}</strong>
            <small>{item.bank} <span aria-hidden="true">·</span> {item.candidate.direction === 'incoming' ? 'Recibiste dinero' : item.candidate.direction === 'outgoing' ? 'Enviaste dinero' : 'Movimiento por verificar'}</small>
          </span>
          <span className="notifications-inbox__trailing">
            <span className="notifications-inbox__amount">{item.candidate.amount_minor ? formatMinor(item.candidate.amount_minor, 'COP', settings.hiddenAmounts) : 'Monto por confirmar'}</span>
            <ChevronDown className="notifications-inbox__chevron" aria-hidden="true" />
          </span>
        </summary>
        <p className="notifications-inbox__date">{item.candidate.occurred_at ? new Date(item.candidate.occurred_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : 'Fecha por confirmar'}</p>
        <BankEmailReview item={item} accounts={accounts} categories={categories} transactions={transactions} hidden={settings.hiddenAmounts} resolve={resolve} />
      </details>)}</div>
      {!error && (page > 0 || data.has_more) && <nav className="notifications-inbox__pagination" aria-label="Paginación de avisos">
        <button type="button" className="button button--secondary" disabled={!page || loading} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>Página {page + 1}</span>
        <button type="button" className="button button--secondary" disabled={!data.has_more || loading} onClick={() => setPage(page + 1)}>Siguiente</button>
      </nav>}
    </section>}
  </div>
}
