import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCircle2, RefreshCw } from 'lucide-react'
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
    {isDemo || !user?.id ? <section className="integration-card notifications-inbox__empty"><NightIcon icon={Bell} className="integration-icon" tone="sky" /><p>Los avisos de correo bancario aparecerán aquí cuando uses tu cuenta.</p></section> : <section className="integration-card" aria-busy={loading}>
      <div className="section-heading"><div><h2>Por revisar</h2><p>{data.events.length} {data.events.length === 1 ? 'aviso pendiente' : 'avisos pendientes'}</p></div><button type="button" className="icon-button--small" aria-label="Actualizar avisos" disabled={loading} onClick={refresh}><RefreshCw /></button></div>
      {error && <div className="notifications-inbox__error" role="alert"><p>{error}</p><button type="button" className="button button--secondary" onClick={refresh}>Reintentar</button></div>}
      {!error && loading && <p role="status">Cargando avisos…</p>}
      {!error && !loading && !data.events.length && <div className="empty-inline"><CheckCircle2 aria-hidden="true" /><span>No tienes movimientos pendientes por revisar.</span></div>}
      <div className="notifications-inbox__list">{data.events.map((item) => <details className="calm-details notifications-inbox__item" key={item.id}>
        <summary><span className="notifications-inbox__icon"><Bell aria-hidden="true" /></span><span className="notifications-inbox__summary"><strong>{item.candidate.counterparty || item.bank}</strong><small>{item.bank} · {item.candidate.direction === 'incoming' ? 'Recibiste dinero' : item.candidate.direction === 'outgoing' ? 'Enviaste dinero' : 'Movimiento por verificar'}</small></span><span className="notifications-inbox__amount">{item.candidate.amount_minor ? formatMinor(item.candidate.amount_minor, 'COP', settings.hiddenAmounts) : 'Monto por confirmar'}</span></summary>
        <p className="notifications-inbox__date">{item.candidate.occurred_at ? new Date(item.candidate.occurred_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : 'Fecha por confirmar'}</p>
        <BankEmailReview item={item} accounts={accounts} categories={categories} transactions={transactions} hidden={settings.hiddenAmounts} resolve={resolve} />
      </details>)}</div>
      {!error && data.events.length > 0 && <div className="notification-actions"><button type="button" className="button button--secondary" disabled={!page || loading} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page + 1}</span><button type="button" className="button button--secondary" disabled={!data.has_more || loading} onClick={() => setPage(page + 1)}>Siguiente</button></div>}
    </section>}
  </div>
}
