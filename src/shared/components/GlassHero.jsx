import { useId } from 'react'
import { NightIcon } from './NightIcon.jsx'

// Superficie vectorial decorativa: los textos, importes y controles siguen siendo HTML accesible.
export function GlassHero({ children, className = '', ...props }) {
  const id = useId()
  return <section className={`glass-hero ${className}`} {...props}>
    <svg className="glass-hero__art" viewBox="0 0 600 240" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c3b9ff" /><stop offset=".45" stopColor="#a59aff" /><stop offset="1" stopColor="#8a85ee" /></linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f1e8ff" /><stop offset="1" stopColor="#9e9bed" /></linearGradient>
        <linearGradient id={`${id}-fold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e3d5ff" stopOpacity=".85" /><stop offset=".65" stopColor="#c1b4ff" stopOpacity=".3" /><stop offset="1" stopColor="#8c81ed" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M58 35 C190 43 290 20 410 9 C539 -6 586 11 594 77 L598 186 Q601 230 552 233 C401 239 156 239 45 229 Q1 226 3 177 L9 90 Q13 35 58 35Z" fill={`url(#${id}-fill)`} stroke={`url(#${id}-edge)`} strokeWidth="1.5" />
      <path d="M302 236 C399 203 450 132 525 75 C566 43 589 63 591 97 C594 165 527 225 467 236Z" fill={`url(#${id}-fold)`} />
    </svg>
    <div className="glass-hero__content">{children}</div>
  </section>
}

// Reutiliza la acción existente con un objetivo táctil amplio y una etiqueta siempre visible.
export function OrbAction({ icon, children, className = '', onClick, ...props }) {
  return <button type="button" className={`glass-action ${className}`} onClick={(event) => { event.currentTarget.focus(); onClick?.(event) }} {...props}>
    <NightIcon icon={icon} variant="orb" /><span>{children}</span>
  </button>
}
