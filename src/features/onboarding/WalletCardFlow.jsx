import { useState } from 'react'
import { ChevronLeft, ChevronRight, PawPrint } from 'lucide-react'
import { WALLET_CARDS, walletCardById } from './walletCardModel.js'

export function WalletCardPicker({ currentStyle, required = false, onSelect, onCancel }) {
  const [selected, setSelected] = useState(walletCardById(currentStyle)?.id || WALLET_CARDS[0].id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const card = walletCardById(selected) || WALLET_CARDS[0]
  const index = WALLET_CARDS.findIndex(({ id }) => id === card.id)

  const move = (offset) => {
    const next = (index + offset + WALLET_CARDS.length) % WALLET_CARDS.length
    setSelected(WALLET_CARDS[next].id)
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
        <p className="wallet-card-picker__intro">Escoge la portada que te acompañará al abrir PataWallet. Puedes cambiarla después.</p>

        <div className="wallet-card-picker__carousel" aria-live="polite">
          <button className="wallet-card-picker__arrow" type="button" onClick={() => move(-1)} aria-label="Ver diseño anterior" disabled={busy}><ChevronLeft aria-hidden="true" /></button>
          <div className="wallet-card-picker__art">
            <img key={card.id} src={card.image} alt={card.alt} width="640" height="800" fetchPriority="high" decoding="async" />
          </div>
          <button className="wallet-card-picker__arrow" type="button" onClick={() => move(1)} aria-label="Ver diseño siguiente" disabled={busy}><ChevronRight aria-hidden="true" /></button>
        </div>

        <div className="wallet-card-picker__selected"><strong>{card.name}</strong><span>{card.description}</span><small>{index + 1} de {WALLET_CARDS.length}</small></div>
        <div className="wallet-card-picker__choices" role="group" aria-label="Diseños de tarjeta">
          {WALLET_CARDS.map((option) => (
            <button key={option.id} type="button" aria-pressed={selected === option.id} onClick={() => setSelected(option.id)} disabled={busy}>
              <span className={`wallet-card-picker__swatch wallet-card-picker__swatch--${option.id}`} aria-hidden="true" />
              <span>{option.name}</span>
            </button>
          ))}
        </div>

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
          <img src={card.image} alt={card.alt} width="640" height="800" fetchPriority="high" decoding="async" />
        </button>
        <p className="wallet-entry__hint">Toca la tarjeta para abrir</p>
        <button className="wallet-card-flow__cancel" type="button" onClick={onChange}>Cambiar diseño</button>
      </section>
    </main>
  )
}
