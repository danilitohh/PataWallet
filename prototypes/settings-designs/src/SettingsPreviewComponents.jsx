import { useState } from 'react'
import { Check, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { NightIcon } from '../../../src/shared/components/NightIcon.jsx'

// Aplica los iconos volumétricos compartidos por PataWallet sin alterar su componente original.
export function SettingsIcon({ icon: Icon, tone = 'violet', className = '' }) {
  return <NightIcon icon={Icon} tone={tone} className={`settings-preview-icon ${className}`.trim()} />
}

// Mantiene alineados el nombre, la explicación y el control de cada preferencia.
export function SettingsRow({ icon, tone, title, detail, children, className = '' }) {
  return (
    <div className={`settings-preview-row ${className}`.trim()}>
      <SettingsIcon icon={icon} tone={tone} />
      <div className="settings-preview-row__copy">
        <h3>{title}</h3>
        <p>{detail}</p>
      </div>
      <div className="settings-preview-row__control">{children}</div>
    </div>
  )
}

// Expone el estado de privacidad con el patrón accesible de un switch nativo.
export function PreviewSwitch({ checked, label, onChange }) {
  return (
    <button
      className="preview-switch"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="preview-switch__thumb" aria-hidden="true" />
    </button>
  )
}

// Reutiliza la preferencia de movimiento y permite probar sus tres estados.
export function MotionSelect({ value, onChange }) {
  return (
    <label className="preview-select-wrap">
      <span className="visually-hidden">Nivel de movimiento</span>
      <select aria-label="Nivel de movimiento" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="system">Sistema</option>
        <option value="soft">Suave</option>
        <option value="off">Desactivado</option>
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </label>
  )
}

// Abre instrucciones reales de instalación sin fingir que la vista previa instala la PWA.
export function InstallDisclosure({ onNotify, compact = false }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`install-disclosure${compact ? ' install-disclosure--compact' : ''}`}>
      <button
        className="text-action"
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((wasOpen) => !wasOpen)
          onNotify(open ? 'Se ocultaron los pasos de instalación.' : 'La instalación se completa desde el menú del navegador.')
        }}
      >
        {open ? 'Ocultar pasos' : 'Ver cómo instalar'}
        <ChevronRight size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="install-steps">
          <p><strong>iPhone o iPad</strong><span>En Safari, toca Compartir y elige “Agregar a pantalla de inicio”.</span></p>
          <p><strong>Android</strong><span>En Chrome, abre el menú y elige “Instalar aplicación” o “Agregar a pantalla de inicio”.</span></p>
          <small>Esta exploración no dispara el diálogo de instalación.</small>
        </div>
      )}
    </div>
  )
}

// Presenta un acceso como control útil y explica el límite de navegación de este prototipo aislado.
export function PreviewLink({ icon, tone = 'sky', title, detail, onNotify, action = 'Abrir sección' }) {
  return (
    <button className="preview-link" type="button" onClick={() => onNotify(`${title}: la pantalla real sigue en la aplicación.`)}>
      <SettingsIcon icon={icon} tone={tone} />
      <span className="preview-link__copy"><strong>{title}</strong><small>{detail}</small></span>
      <span className="preview-link__action">{action}<ExternalLink size={13} aria-hidden="true" /></span>
    </button>
  )
}

// Hace visibles los estados de disponibilidad y confirma cuándo una función está activa.
export function StatusPill({ children, tone = 'mint' }) {
  return <span className={`status-pill status-pill--${tone}`}><span aria-hidden="true" />{children}</span>
}

// Distingue la moneda fija de una preferencia editable en esta fase del producto.
export function CurrencyValue() {
  return <span className="currency-value"><Check size={13} aria-hidden="true" />COP</span>
}
