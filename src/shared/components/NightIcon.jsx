// Renderiza un icono Lucide dentro de una insignia visual propia de PataWallet.
export function NightIcon({ icon: Icon, tone = 'violet', variant = 'tile', className = '', ...props }) {
  return <span className={`night-icon night-icon--${variant} night-icon--${tone} ${className}`.trim()} {...props}><span className="night-icon__halo" aria-hidden="true" /><span className="night-icon__spark" aria-hidden="true" /><Icon className="night-icon__glyph" aria-hidden="true" /></span>
}
