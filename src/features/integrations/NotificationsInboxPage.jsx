import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCircle2, ChevronRight, RefreshCw, Trash2 } from 'lucide-react'
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

  const dismissMovement = async (item) => {
    try {
      await resolveBankEmail(item.id, 'dismiss')
      setData((current) => ({ ...current, events: current.events.filter((event) => event.id !== item.id) }))
      window.dispatchEvent(new Event('patawallet:notifications-changed'))
      notify('Aviso descartado. No se creó ningún movimiento ni cambiaron tus saldos.')
      return true
    } catch (issue) {
      notify(issue.message || 'No se pudo descartar el aviso. Vuelve a intentarlo.')
      return false
    }
  }

  return <div className="route-stack notifications-inbox">
    <PageHeader title="Notificaciones" subtitle="Revisa cada aviso antes de registrarlo. Desliza a la izquierda para descartarlo; tus saldos no cambian sin confirmación." />
    {isDemo || !user?.id ? <section className="notifications-inbox__empty"><NightIcon icon={Bell} className="integration-icon" tone="sky" /><div><h2>Tu bandeja está lista</h2><p>Cuando PataWallet detecte un movimiento en tus correos bancarios, aparecerá aquí para que decidas qué hacer.</p></div></section> : <section className="notifications-inbox__feed" aria-busy={loading}>
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
      <div className="notifications-inbox__list">{data.events.map((item) => <SwipeNotification key={item.id} item={item} hiddenAmounts={settings.hiddenAmounts} onOpen={() => openMovement(item)} onDismiss={() => dismissMovement(item)} />)}</div>
      {!error && (page > 0 || data.has_more) && <nav className="notifications-inbox__pagination" aria-label="Paginación de avisos">
        <button type="button" className="button button--secondary" disabled={!page || loading} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>Página {page + 1}</span>
        <button type="button" className="button button--secondary" disabled={!data.has_more || loading} onClick={() => setPage(page + 1)}>Siguiente</button>
      </nav>}
    </section>}
  </div>
}

const DISMISS_REVEAL_WIDTH = 96
const DISMISS_THRESHOLD = 132

function SwipeNotification({ item, hiddenAmounts, onOpen, onDismiss }) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const swipe = useRef(null)
  const suppressClick = useRef(false)
  const name = item.candidate.counterparty || item.bank
  const amount = Number(item.candidate.amount_minor)

  const discard = async () => {
    if (busy) return
    setBusy(true)
    const discarded = await onDismiss()
    if (!discarded) {
      setBusy(false)
      setOffset(0)
    }
  }

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' || busy || event.target.closest('.notifications-inbox__dismiss')) return
    swipe.current = { x: event.clientX, y: event.clientY, offset, horizontal: false }
  }

  const onPointerMove = (event) => {
    const gesture = swipe.current
    if (!gesture || busy) return
    const deltaX = event.clientX - gesture.x
    const deltaY = event.clientY - gesture.y
    if (!gesture.horizontal) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8) return
      if (Math.abs(deltaY) >= Math.abs(deltaX)) {
        swipe.current = null
        return
      }
      gesture.horizontal = true
      setDragging(true)
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }
    event.preventDefault()
    setOffset(Math.max(-DISMISS_REVEAL_WIDTH, Math.min(0, gesture.offset + deltaX)))
  }

  const onPointerUp = async (event) => {
    const gesture = swipe.current
    swipe.current = null
    setDragging(false)
    if (!gesture?.horizontal) return
    suppressClick.current = true
    window.setTimeout(() => { suppressClick.current = false }, 0)
    const projectedOffset = gesture.offset + event.clientX - gesture.x
    if (projectedOffset <= -DISMISS_THRESHOLD) {
      setOffset(-DISMISS_REVEAL_WIDTH)
      await discard()
      return
    }
    setOffset(projectedOffset <= -42 ? -DISMISS_REVEAL_WIDTH : 0)
  }

  const onPointerCancel = () => {
    const gesture = swipe.current
    swipe.current = null
    setDragging(false)
    if (gesture?.horizontal) setOffset(offset <= -42 ? -DISMISS_REVEAL_WIDTH : 0)
  }

  return <div className={`notifications-inbox__swipe${offset < 0 ? ' is-revealed' : ''}${dragging ? ' is-dragging' : ''}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onKeyDown={(event) => { if (event.key === 'Escape') setOffset(0) }}>
    <button type="button" className="notifications-inbox__item" style={{ '--notification-swipe-offset': `${offset}px` }} onClick={(event) => {
      if (suppressClick.current) { event.preventDefault(); return }
      if (offset < 0) { setOffset(0); return }
      onOpen()
    }} aria-label={`Abrir registro de movimiento de ${name}`}>
      <span className="notifications-inbox__icon"><Bell aria-hidden="true" /></span>
      <span className="notifications-inbox__summary">
        <strong>{name}</strong>
        <small>{item.bank} <span aria-hidden="true">·</span> {directionLabel(item)}</small>
        <small className="notifications-inbox__date">{formatEventDate(item.candidate.occurred_at)}</small>
      </span>
      <span className="notifications-inbox__trailing">
        <span className="notifications-inbox__amount">{Number.isSafeInteger(amount) && amount > 0 ? formatMinor(amount, 'COP', hiddenAmounts) : 'Monto por confirmar'}</span>
        <ChevronRight className="notifications-inbox__chevron" aria-hidden="true" />
      </span>
    </button>
    <button type="button" className="notifications-inbox__dismiss" aria-label={`Descartar aviso de ${name}`} disabled={busy} onFocus={() => setOffset(-DISMISS_REVEAL_WIDTH)} onClick={discard}>
      <Trash2 aria-hidden="true" /><span>{busy ? 'Quitando…' : 'Eliminar'}</span>
    </button>
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
