import { useRef } from 'react'
import { X } from 'lucide-react'
import { motion } from 'motion/react'
import { useModalBehavior } from '../hooks/useModalBehavior.js'

export function Field({ label, optional, error, children }) {
  return <label className="field"><span>{label}{optional && <small> Opcional</small>}</span>{children}{error && <em id="movement-error" role="alert">{error}</em>}</label>
}

export function SimpleDialog({ title, close, children }) {
  const modalRef = useRef(null)
  useModalBehavior(modalRef, close)

  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <motion.section ref={modalRef} tabIndex="-1" className="dialog" role="dialog" aria-modal="true" aria-label={title} initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .98 }}>
        <header><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="Cerrar"><X /></button></header>
        {children}
      </motion.section>
    </motion.div>
  )
}
