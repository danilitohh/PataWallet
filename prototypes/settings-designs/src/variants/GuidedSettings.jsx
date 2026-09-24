import { useState } from 'react'
import { Bell, Bot, ChevronDown, CircleDollarSign, Eye, EyeOff, Handshake, Moon, Smartphone, UserRound } from 'lucide-react'
import { CurrencyValue, InstallDisclosure, MotionSelect, PreviewLink, PreviewSwitch, SettingsIcon } from '../SettingsPreviewComponents.jsx'
import './guided-settings.css'

// Define los temas que aparecen en el índice y en el acordeón de ajustes.
const chapters = [
  { id: 'look', title: 'Tu experiencia', subtitle: 'Apariencia y privacidad', icon: Moon },
  { id: 'install', title: 'Acceso rápido', subtitle: 'Instala la aplicación', icon: Smartphone },
  { id: 'connect', title: 'Herramientas', subtitle: 'Avisos y asistencia', icon: Bell },
  { id: 'data', title: 'Tu información', subtitle: 'Moneda y datos locales', icon: CircleDollarSign },
]

// Da una guía breve por capítulos y deja expandir solo el grupo que la persona necesita.
export default function GuidedSettings({ preferences, onPreferenceChange, onNotify }) {
  const [openChapter, setOpenChapter] = useState('look')

  // Enfoca el capítulo elegido y pliega cualquier otro para reducir ruido en móvil.
  const toggleChapter = (chapterId) => setOpenChapter((current) => current === chapterId ? '' : chapterId)

  return (
    <div className="guided-settings">
      <div className="guided-welcome"><div><h2>Dejemos todo a tu gusto</h2><p>Abre un tema para revisar sus opciones. Estos controles son una demostración y no guardan cambios.</p></div><span><UserRound size={17} aria-hidden="true" />Danilo</span></div>

      <nav className="guided-chapters" aria-label="Temas de Ajustes">
        {chapters.map(({ id, title, subtitle, icon: Icon }) => (
          <button key={id} type="button" className={`guided-chapter-link${openChapter === id ? ' is-active' : ''}`} onClick={() => toggleChapter(id)} aria-expanded={openChapter === id} aria-controls={`guided-panel-${id}`}>
            <span className="guided-chapter-link__icon"><Icon size={16} aria-hidden="true" /></span>
            <span><strong>{title}</strong><small>{subtitle}</small></span>
          </button>
        ))}
      </nav>

      <div className="guided-panels">
        <section className={`guided-section${openChapter === 'look' ? ' is-open' : ''}`} id="guided-panel-look">
          <button className="guided-section__trigger" type="button" aria-expanded={openChapter === 'look'} onClick={() => toggleChapter('look')}>
            <SettingsIcon icon={Moon} tone="violet" /><span><strong>Tu experiencia</strong><small>Tema oscuro, montos y movimiento</small></span><ChevronDown size={18} aria-hidden="true" />
          </button>
          {openChapter === 'look' && <div className="guided-section__content">
            <div className="guided-fixed-theme"><span className="guided-theme-dot" /><div><strong>Modo nocturno</strong><small>El tema oscuro está siempre activo</small></div><span>Activo</span></div>
            <div className="guided-setting-row"><SettingsIcon icon={preferences.hideAmounts ? EyeOff : Eye} tone="sky" /><div><strong>Ocultar montos</strong><small>Privacidad visual en pantalla</small></div><PreviewSwitch checked={preferences.hideAmounts} label="Ocultar montos" onChange={(value) => onPreferenceChange('hideAmounts', value)} /></div>
            <div className="guided-setting-row"><SettingsIcon icon={CircleDollarSign} tone="mint" /><div><strong>Movimiento</strong><small>Respeta la preferencia de tu dispositivo</small></div><MotionSelect value={preferences.motion} onChange={(value) => onPreferenceChange('motion', value)} /></div>
          </div>}
        </section>

        <section className={`guided-section${openChapter === 'install' ? ' is-open' : ''}`} id="guided-panel-install">
          <button className="guided-section__trigger" type="button" aria-expanded={openChapter === 'install'} onClick={() => toggleChapter('install')}>
            <SettingsIcon icon={Smartphone} tone="peach" /><span><strong>Acceso rápido</strong><small>Agrega PataWallet a tu pantalla de inicio</small></span><ChevronDown size={18} aria-hidden="true" />
          </button>
          {openChapter === 'install' && <div className="guided-section__content guided-install"><p>Abre PataWallet como una app desde el inicio de tu teléfono.</p><InstallDisclosure onNotify={onNotify} /></div>}
        </section>

        <section className={`guided-section${openChapter === 'connect' ? ' is-open' : ''}`} id="guided-panel-connect">
          <button className="guided-section__trigger" type="button" aria-expanded={openChapter === 'connect'} onClick={() => toggleChapter('connect')}>
            <SettingsIcon icon={Bell} tone="rose" /><span><strong>Herramientas</strong><small>Notificaciones, automatización y ayuda</small></span><ChevronDown size={18} aria-hidden="true" />
          </button>
          {openChapter === 'connect' && <div className="guided-section__content guided-links">
            <PreviewLink icon={Bell} tone="rose" title="Notificaciones" detail="Recordatorios y avisos" onNotify={onNotify} />
            <PreviewLink icon={Smartphone} tone="sky" title="Automatización" detail="Atajos y movimientos" onNotify={onNotify} />
            <PreviewLink icon={Bot} tone="violet" title="Asistente PataWallet" detail="Preguntas y resúmenes de solo lectura" onNotify={onNotify} />
            <PreviewLink icon={Handshake} tone="peach" title="Cuentas en pareja" detail="Disponible al iniciar sesión" onNotify={onNotify} action="Ver" />
          </div>}
        </section>

        <section className={`guided-section${openChapter === 'data' ? ' is-open' : ''}`} id="guided-panel-data">
          <button className="guided-section__trigger" type="button" aria-expanded={openChapter === 'data'} onClick={() => toggleChapter('data')}>
            <SettingsIcon icon={CircleDollarSign} tone="gold" /><span><strong>Tu información</strong><small>Moneda y datos de ejemplo</small></span><ChevronDown size={18} aria-hidden="true" />
          </button>
          {openChapter === 'data' && <div className="guided-section__content guided-data"><div><SettingsIcon icon={CircleDollarSign} tone="gold" /><span><strong>Moneda principal</strong><small>Para presupuestos y movimientos</small></span><CurrencyValue /></div><button type="button" onClick={() => onNotify('En la cuenta real, aquí puedes restaurar la información de ejemplo.')}>Restaurar datos de ejemplo</button></div>}
        </section>
      </div>
    </div>
  )
}
