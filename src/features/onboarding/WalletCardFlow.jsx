import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, PawPrint } from 'lucide-react'
import { WALLET_CARDS, walletCardById } from './walletCardModel.js'

export function WalletCardPicker({ currentStyle, required = false, onSelect, onCancel }) {
  const [selected, setSelected] = useState(walletCardById(currentStyle)?.id || WALLET_CARDS[0].id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const swipeStartX = useRef(null)
  const card = walletCardById(selected) || WALLET_CARDS[0]
  const index = WALLET_CARDS.findIndex(({ id }) => id === card.id)

  const move = (offset) => {
    const next = (index + offset + WALLET_CARDS.length) % WALLET_CARDS.length
    setSelected(WALLET_CARDS[next].id)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      move(event.key === 'ArrowRight' ? 1 : -1)
    }
  }

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    swipeStartX.current = event.clientX
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerUp = (event) => {
    if (swipeStartX.current === null) return
    const distance = event.clientX - swipeStartX.current
    swipeStartX.current = null
    if (Math.abs(distance) >= 44) move(distance < 0 ? 1 : -1)
  }

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await onSelect(card.id)
    } catch (issue) {
      setError(issue.message || 'No pudimos guardar la tarjeta. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="wallet-card-flow" data-card-style={card.id}>
      <header className="wallet-card-flow__brand"><PawPrint aria-hidden="true" /><span>PataWallet</span></header>
      <section className="wallet-card-picker" aria-labelledby="wallet-card-title">
        <p className="wallet-card-flow__eyebrow">Tu billetera, a tu manera</p>
        <h1 id="wallet-card-title">Elige tu tarjeta</h1>
        <p className="wallet-card-picker__intro">Desliza la tarjeta o usa las flechas para ver las cinco portadas. Puedes cambiarla después.</p>

        <div className="wallet-card-picker__carousel" role="group" aria-label="Diseños de tarjeta">
          <button className="wallet-card-picker__arrow" type="button" onClick={() => move(-1)} aria-label="Ver diseño anterior" disabled={busy}><ChevronLeft aria-hidden="true" /></button>
          <div
            className="wallet-card-picker__art"
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`Tarjeta ${card.name}, ${index + 1} de ${WALLET_CARDS.length}`}
            aria-live="polite"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => { swipeStartX.current = null }}
          >
            {WALLET_CARDS.map((option, optionIndex) => {
              const relativeIndex = ((optionIndex - index + WALLET_CARDS.length + Math.floor(WALLET_CARDS.length / 2)) % WALLET_CARDS.length) - Math.floor(WALLET_CARDS.length / 2)
              const position = relativeIndex === 0 ? 'current' : relativeIndex === 1 ? 'next' : relativeIndex === -1 ? 'previous' : relativeIndex > 0 ? 'far-next' : 'far-previous'
              const isCurrent = position === 'current'

              return (
                <div className={`wallet-card-picker__card wallet-card-picker__card--${position}`} key={option.id} aria-hidden={!isCurrent}>
                  <img src={option.image} alt={isCurrent ? option.alt : ''} width="640" height="800" fetchPriority={isCurrent ? 'high' : 'auto'} decoding="async" draggable="false" />
                </div>
              )
            })}
          </div>
          <button className="wallet-card-picker__arrow" type="button" onClick={() => move(1)} aria-label="Ver diseño siguiente" disabled={busy}><ChevronRight aria-hidden="true" /></button>
        </div>

        <div className="wallet-card-picker__selected"><strong>{card.name}</strong><span>{card.description}</span><small>{index + 1} de {WALLET_CARDS.length}</small></div>

        {error && <p className="wallet-card-flow__error" role="alert">{error}</p>}
        <div className="wallet-card-flow__actions">
          <button className="button button--primary button--wide" type="button" onClick={save} disabled={busy}>
            {busy ? 'Guardando…' : 'Usar esta tarjeta'}
          </button>
          {!required && <button className="wallet-card-flow__cancel" type="button" onClick={onCancel} disabled={busy}>Cancelar</button>}
        </div>
        <p className="wallet-card-flow__note">Es una portada visual de tu app; no es una tarjeta de pago.</p>
      </section>
    </main>
  )
}

export function WalletEntry({ cardStyle, onOpen, onChange }) {
  const card = walletCardById(cardStyle) || WALLET_CARDS[0]

  return (
    <main className="wallet-card-flow wallet-entry" data-card-style={card.id}>
      <header className="wallet-card-flow__brand"><PawPrint aria-hidden="true" /><span>PataWallet</span></header>
      <section className="wallet-entry__content" aria-labelledby="wallet-entry-title">
        <p className="wallet-card-flow__eyebrow">Tu espacio financiero</p>
        <h1 id="wallet-entry-title">Tu billetera está lista</h1>
        <button className="wallet-entry__card" type="button" onClick={onOpen} aria-label={`Abrir PataWallet con la tarjeta ${card.name}`}>
          <img src={card.image} alt={card.alt} width="640" height="800" fetchPriority="high" decoding="async" draggable="false" />
        </button>
        <p className="wallet-entry__hint">Toca la tarjeta para abrir</p>
        <button className="wallet-card-flow__cancel" type="button" onClick={onChange}>Cambiar diseño</button>
      </section>
    </main>
  )
}
