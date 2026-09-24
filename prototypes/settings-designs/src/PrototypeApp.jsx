import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Activity, CalendarHeart, House, PawPrint, Settings2, WalletCards } from 'lucide-react'
import QuietSettings from './variants/QuietSettings.jsx'
import TaskSettings from './variants/TaskSettings.jsx'
import GuidedSettings from './variants/GuidedSettings.jsx'
import { SettingsIcon } from './SettingsPreviewComponents.jsx'

// Conserva el orden mostrado en el selector y en los atajos de teclado.
const variants = [
  { name: 'Serena', Component: QuietSettings },
  { name: 'Panel', Component: TaskSettings },
  { name: 'Guiada', Component: GuidedSettings },
]

// Da contexto de aplicación sin habilitar navegación fuera de esta exploración aislada.
const navigation = [
  { label: 'Inicio', icon: House },
  { label: 'Actividad', icon: Activity },
  { label: 'Plan', icon: CalendarHeart },
  { label: 'Cuentas', icon: WalletCards },
  { label: 'Ajustes', icon: Settings2, active: true },
]

// Lee el diseño inicial de la URL para que una variante se pueda compartir y recargar.
function readInitialVariant() {
  const requested = Number(new URLSearchParams(window.location.search).get('v'))
  return Number.isInteger(requested) && requested >= 1 && requested <= variants.length ? requested - 1 : 0
}

// Renderiza tres propuestas aisladas con una sola fuente de estado demo y controles comprobables.
export default function PrototypeApp() {
  const [activeIndex, setActiveIndex] = useState(readInitialVariant)
  const [preferences, setPreferences] = useState({ hideAmounts: false, motion: 'system' })
  const [toast, setToast] = useState('')
  const pickerRef = useRef(null)
  const itemRefs = useRef([])
  const highlightRef = useRef(null)
  const toastTimerRef = useRef(null)
  const { Component } = variants[activeIndex]

  // Actualiza solo la preferencia ficticia que eligió la persona dentro del prototipo.
  const changePreference = useCallback((key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }))
  }, [])

  // Muestra una confirmación accesible y cancela el temporizador anterior si se repite una acción.
  const notify = useCallback((message) => {
    setToast(message)
    window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2800)
  }, [])

  // Alinea el indicador del selector con la opción activa sin animar el primer render.
  useLayoutEffect(() => {
    const item = itemRefs.current[activeIndex]
    const highlight = highlightRef.current
    if (!item || !highlight) return undefined

    const positionHighlight = () => {
      const itemRect = item.getBoundingClientRect()
      const pickerRect = pickerRef.current.getBoundingClientRect()
      highlight.style.width = `${itemRect.width}px`
      highlight.style.transform = `translateX(${itemRect.left - pickerRect.left - 4}px)`
    }

    positionHighlight()
    const observer = new ResizeObserver(positionHighlight)
    observer.observe(pickerRef.current)
    window.requestAnimationFrame(() => pickerRef.current?.setAttribute('data-ready', ''))
    return () => observer.disconnect()
  }, [activeIndex])

  // Persiste la selección visual en la URL sin navegar ni modificar el historial de la app.
  const selectVariant = useCallback((index) => {
    if (index < 0 || index >= variants.length) return
    setActiveIndex(index)
    const url = new URL(window.location.href)
    url.searchParams.set('v', String(index + 1))
    window.history.replaceState(null, '', url)
  }, [])

  // Permite comparar las propuestas con teclado, respetando campos editables y teclas modificadoras.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      const isEditable = target instanceof HTMLElement && (
        target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      )
      if (isEditable || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return

      if (/^[1-3]$/.test(event.key)) selectVariant(Number(event.key) - 1)
      else if (event.key === 'ArrowRight') selectVariant((activeIndex + 1) % variants.length)
      else if (event.key === 'ArrowLeft') selectVariant((activeIndex - 1 + variants.length) % variants.length)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, selectVariant])

  // Libera el temporizador del mensaje cuando se cierra esta vista previa.
  useEffect(() => () => window.clearTimeout(toastTimerRef.current), [])

  return (
    <div className="settings-prototype">
      <nav className="prototype-rail" aria-label="Navegación de ejemplo">
        <a className="prototype-brand" href="#contenido" aria-label="PataWallet, vista de Ajustes">
          <span className="prototype-brand__mark"><PawPrint size={20} aria-hidden="true" /></span>
          <span>PataWallet<small>finanzas con calma</small></span>
        </a>
        <span className="prototype-rail__label">TU ESPACIO</span>
        {navigation.map(({ label, icon: Icon, active }) => (
          <button
            className={`prototype-nav-item${active ? ' is-active' : ''}`}
            key={label}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => active || notify(`${label}: navegación desactivada en esta vista previa.`)}
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />{label}
          </button>
        ))}
        <div className="prototype-rail__footnote">Vista previa local<br />Cambios solo visuales</div>
      </nav>

      <main className="prototype-main" id="contenido">
        <header className="prototype-header">
          <div>
            <h1>Ajustes</h1>
            <p>Tu espacio, a tu manera.</p>
          </div>
          <span className="prototype-preview-badge"><span aria-hidden="true" />Datos ficticios</span>
        </header>

        <section className="prototype-content" aria-label={`Diseño ${variants[activeIndex].name}`}>
          <Component preferences={preferences} onPreferenceChange={changePreference} onNotify={notify} />
        </section>
      </main>

      <nav className="prototype-dock" aria-label="Navegación de ejemplo">
        {navigation.map(({ label, icon: Icon, active }) => (
          <button
            className={`prototype-dock__item${active ? ' is-active' : ''}`}
            key={label}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => active || notify(`${label}: navegación desactivada en esta vista previa.`)}
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
          </button>
        ))}
      </nav>

      <nav className="proto-picker" aria-label="Diseños de Ajustes" data-position="top" ref={pickerRef}>
        <span className="proto-picker-highlight" aria-hidden="true" ref={highlightRef} />
        {variants.map(({ name }, index) => (
          <button
            className="proto-picker-item"
            data-active={activeIndex === index ? '' : undefined}
            aria-current={activeIndex === index ? 'true' : undefined}
            key={name}
            ref={(element) => { itemRefs.current[index] = element }}
            type="button"
            onClick={() => selectVariant(index)}
          >
            {name}
          </button>
        ))}
      </nav>

      {toast && <div className="prototype-toast" role="status" aria-live="polite"><SettingsIcon icon={Activity} tone="mint" />{toast}</div>}
    </div>
  )
}
