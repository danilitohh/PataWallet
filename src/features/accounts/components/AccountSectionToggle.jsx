import { useEffect, useState } from 'react'
import { CalendarCheck, ChevronDown, HandCoins } from 'lucide-react'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'

// Mantiene sincronizado el estado abierto cuando la navegación llega con un ancla profunda.
export function useAccountSectionExpansion(sectionId) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === `#${sectionId}`) setExpanded(true)
    }
    openFromHash()
    window.addEventListener('hashchange', openFromHash)
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [sectionId])

  return [expanded, setExpanded]
}

// Renderiza el botón común para abrir o cerrar una sección relacionada con Cuentas.
export function AccountSectionToggle({ sectionId, title, description, summary, expanded, onToggle }) {
  const contentId = `${sectionId}-content`
  const Icon = sectionId === 'ingresos' ? HandCoins : CalendarCheck
  return <div className="account-section-toggle-row">
    <div>
      <h2><button type="button" className="account-section-toggle" aria-expanded={expanded} aria-controls={contentId} onClick={onToggle}><NightIcon icon={Icon} className="account-section-toggle__icon" tone={sectionId === 'ingresos' ? 'mint' : 'peach'} /><span>{title}</span><ChevronDown aria-hidden="true" /></button></h2>
      <p>{description}</p>
    </div>
    <span className="account-section-toggle__summary">{summary}</span>
  </div>
}
