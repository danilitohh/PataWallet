import { motion } from 'motion/react'
import { useApp } from '../../app/AppContext.jsx'

export function Progress({ value, label }) {
  const { reduceMotion } = useApp()
  const safe = Math.max(0, Math.min(value, 100))

  return (
    <div className="progress-wrap">
      <div className="progress-meta">
        <span>{label}</span>
        <span>{value > 100 ? `${Math.round(value - 100)}% por encima` : ''}</span>
      </div>
      <div className="progress" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(safe)}>
        <motion.span initial={false} animate={{ width: `${safe}%` }} transition={{ duration: reduceMotion ? 0 : 0.4 }} />
      </div>
    </div>
  )
}
