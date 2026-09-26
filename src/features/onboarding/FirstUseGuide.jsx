import { useRef, useState } from 'react'
import { Check, CircleHelp, Home, ListOrdered, Plus, WalletCards } from 'lucide-react'
import { motion } from 'motion/react'
import { NightIcon } from '../../shared/components/NightIcon.jsx'
import { useModalBehavior } from '../../shared/hooks/useModalBehavior.js'

const STEPS = [
  { icon: Home, tone: 'mint', eyebrow: '1 · Inicio', title: 'Aquí ves tu dinero real.', body: 'El saldo muestra solo lo registrado en tus cuentas. Si ves “Aún sin cuenta”, simplemente agrega la cuenta donde tienes tu dinero hoy.' },
  { icon: WalletCards, tone: 'sky', eyebrow: '2 · Cuentas', title: 'Empieza por lo que tienes hoy.', body: 'En Cuentas agregas efectivo, banco o billetera y su saldo actual. También registras deudas y gastos fijos. El saldo inicial no es un ingreso nuevo.' },
  { icon: Plus, tone: 'violet', eyebrow: '3 · Registrar', title: 'El botón + guarda lo que pasó.', body: 'Elige “Hice una compra”, “Recibí dinero” o “Pagué una deuda”. Para tu sueldo, usa “Recibí dinero” solo cuando llegue a una cuenta.' },
  { icon: ListOrdered, tone: 'rose', eyebrow: '4 · Organizar', title: 'Actividad recuerda; Plan te ayuda a decidir.', body: 'Actividad conserva cada movimiento. En Plan defines presupuesto, metas y compras futuras; planear no mueve dinero de tus cuentas.' },
]

// Explica la diferencia entre saldo, movimientos y planificación sin obligar a registrar información.
export function FirstUseGuide({ onFinish }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const dialogRef = useRef(null)
  const current = STEPS[step]
  const Icon = current.icon

  const finish = async () => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const completed = await onFinish()
      if (!completed) savingRef.current = false
    } finally {
      setSaving(false)
    }
  }

  useModalBehavior(dialogRef, finish)

  return <motion.div className="guide-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.section ref={dialogRef} className="first-use-guide" role="dialog" aria-modal="true" aria-labelledby="guide-title" tabIndex="-1" initial={{ opacity: 0, y: 22, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: .98 }} transition={{ duration: .22, ease: [0.16, 1, 0.3, 1] }}>
      <header>
        <span className="first-use-guide__count">{step + 1} de {STEPS.length}</span>
        <button type="button" className="first-use-guide__later" onClick={finish} disabled={saving}>Ahora no</button>
      </header>
      <div className="first-use-guide__progress" role="progressbar" aria-label="Progreso de la guía" aria-valuemin="1" aria-valuemax={STEPS.length} aria-valuenow={step + 1}><span style={{ '--guide-progress': `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      <div className="first-use-guide__icon"><NightIcon icon={Icon} tone={current.tone} /></div>
      <p className="eyebrow">{current.eyebrow}</p>
      <h2 id="guide-title">{current.title}</h2>
      <p className="first-use-guide__body">{current.body}</p>
      <footer>
        {step > 0 ? <button type="button" className="button button--quiet" onClick={() => setStep((value) => value - 1)} disabled={saving}>Atrás</button> : <span />}
        {step === STEPS.length - 1
          ? <button type="button" className="button button--primary" onClick={finish} disabled={saving}><Check aria-hidden="true" /> {saving ? 'Guardando…' : 'Empezar a usar PataWallet'}</button>
          : <button type="button" className="button button--primary" onClick={() => setStep((value) => value + 1)} disabled={saving}>Siguiente</button>}
      </footer>
      <p className="first-use-guide__help"><CircleHelp aria-hidden="true" /> Puedes volver a esta guía desde Ajustes.</p>
    </motion.section>
  </motion.div>
}
