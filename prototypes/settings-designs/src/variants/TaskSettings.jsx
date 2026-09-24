import { Bell, Bot, CircleDollarSign, Eye, EyeOff, Smartphone } from 'lucide-react'
import { CurrencyValue, InstallDisclosure, MotionSelect, PreviewLink, PreviewSwitch, SettingsIcon, SettingsRow, StatusPill } from '../SettingsPreviewComponents.jsx'
import './task-settings.css'

// Ordena los ajustes por intención para que la persona elija una tarea, no una categoría técnica.
export default function TaskSettings({ preferences, onPreferenceChange, onNotify }) {
  return (
    <div className="task-settings">
      <section className="task-account-strip">
        <div className="task-account-strip__identity"><span className="task-avatar">D</span><span><strong>Danilo</strong><small>Tu espacio personal</small></span></div>
        <StatusPill>Cuenta de ejemplo</StatusPill>
      </section>

      <div className="task-grid">
        <section className="task-panel task-panel--preferences" aria-labelledby="task-experience">
          <div className="task-panel__heading"><div><h2 id="task-experience">Hazlo a tu manera</h2><p>Elige cómo se siente tu app.</p></div><SettingsIcon icon={Eye} tone="violet" /></div>
          <div className="task-panel__body">
            <SettingsRow icon={preferences.hideAmounts ? EyeOff : Eye} tone="sky" title="Privacidad de montos" detail="Oculta cifras en pantalla">
              <PreviewSwitch checked={preferences.hideAmounts} label="Ocultar montos" onChange={(value) => onPreferenceChange('hideAmounts', value)} />
            </SettingsRow>
            <SettingsRow icon={CircleDollarSign} tone="mint" title="Movimiento" detail="Según tu sensibilidad">
              <MotionSelect value={preferences.motion} onChange={(value) => onPreferenceChange('motion', value)} />
            </SettingsRow>
            <div className="task-theme-note"><span aria-hidden="true" /><span><strong>Noche, siempre</strong><small>El tema oscuro es parte de PataWallet.</small></span><b>Activo</b></div>
          </div>
        </section>

        <section className="task-install-panel" aria-labelledby="task-install">
          <SettingsIcon icon={Smartphone} tone="peach" />
          <div><h2 id="task-install">Que te quede a mano</h2><p>Agrega PataWallet al inicio de tu teléfono para abrirlo como una app.</p></div>
          <InstallDisclosure onNotify={onNotify} />
        </section>

        <section className="task-links-panel" aria-labelledby="task-tools">
          <div className="task-section-heading"><h2 id="task-tools">Conecta tus herramientas</h2><p>Atajos y avisos para tu día a día</p></div>
          <div className="task-links-panel__links">
            <PreviewLink icon={Bell} tone="rose" title="Notificaciones" detail="Configura tus recordatorios" onNotify={onNotify} />
            <PreviewLink icon={Smartphone} tone="sky" title="Automatización" detail="Atajos y movimientos" onNotify={onNotify} />
          </div>
        </section>

        <section className="task-assistant-panel" aria-labelledby="task-assistant">
          <div className="task-assistant-panel__top"><SettingsIcon icon={Bot} tone="violet" /><span>UN POCO DE AYUDA</span></div>
          <h2 id="task-assistant">¿Una pregunta sobre tu dinero?</h2>
          <p>El asistente puede ayudarte a entender tus números, sin hacer cambios por ti.</p>
          <PreviewLink icon={Bot} tone="violet" title="Asistente PataWallet" detail="Solo lectura" onNotify={onNotify} action="Conocer" />
        </section>

        <section className="task-data-line" aria-label="Moneda de la cuenta">
          <div><SettingsIcon icon={CircleDollarSign} tone="gold" /><span><strong>Tu moneda</strong><small>Para presupuestos y movimientos</small></span></div>
          <CurrencyValue />
          <button type="button" onClick={() => onNotify('La moneda activa de esta cuenta es COP.')}>Ver datos</button>
        </section>
      </div>
    </div>
  )
}
