import { Check, Undo2, X } from 'lucide-react'
import { motion } from 'motion/react'
import { PetScene } from '../../components/PetScene.jsx'

export function Toast({ toast, close }) {
  return (
    <motion.div className="toast" role="status" aria-live="polite" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
      <span><Check /> {toast.message}</span>
      {toast.undo && <button onClick={async () => { await toast.undo(); close() }}><Undo2 /> Deshacer</button>}
      <button className="icon-button icon-button--small" aria-label="Cerrar aviso" onClick={close}><X /></button>
    </motion.div>
  )
}

export function LoadingScreen() {
  return <main className="loading" aria-label="Cargando PataWallet" aria-busy="true"><span className="sr-only" role="status">Cargando PataWallet</span><div className="skeleton skeleton--title" /><div className="skeleton skeleton--hero" /><div className="skeleton" /></main>
}

export function StateMessage({ illustration, title, body, action, actionLabel }) {
  return <section className="state-message">{illustration && <PetScene name={illustration} />}<h2>{title}</h2><p>{body}</p>{action && <button className="button button--primary" onClick={action}>{actionLabel}</button>}</section>
}
