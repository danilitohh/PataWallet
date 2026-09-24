import { Bell, Bot, CircleDollarSign, Eye, EyeOff, Handshake, Moon, Smartphone, UserRound } from 'lucide-react'
import { CurrencyValue, InstallDisclosure, MotionSelect, PreviewLink, PreviewSwitch, SettingsIcon, SettingsRow, StatusPill } from '../SettingsPreviewComponents.jsx'
import './quiet-settings.css'

// Presenta los ajustes como una lista familiar y tranquila, pensada para encontrar cada opción rápido.
export default function QuietSettings({ preferences, onPreferenceChange, onNotify }) {
  return (
    <div className="quiet-settings">
      <section className="quiet-account" aria-label="Cuenta activa">
        <SettingsIcon icon={UserRound} tone="violet" />
        <div><strong>Danilo</strong><span>Demo local · COP</span></div>
        <StatusPill tone="sky">Vista de ejemplo</StatusPill>
      </section>

      <section className="quiet-group" aria-labelledby="quiet-appearance">
        <div className="quiet-group__heading"><h2 id="quiet-appearance">Apariencia y privacidad</h2><p>Un espacio cómodo para ti</p></div>
        <SettingsRow icon={Moon} tone="violet" title="Modo nocturno" detail="El tema oscuro está siempre activo"><span className="quiet-static">Siempre activo</span></SettingsRow>
        <SettingsRow icon={preferences.hideAmounts ? EyeOff : Eye} tone="sky" title="Ocultar montos" detail="Privacidad visual en pantalla">
          <PreviewSwitch checked={preferences.hideAmounts} label="Ocultar montos" onChange={(value) => onPreferenceChange('hideAmounts', value)} />
        </SettingsRow>
        <SettingsRow icon={CircleDollarSign} tone="mint" title="Movimiento" detail="Respeta la preferencia de tu dispositivo">
          <MotionSelect value={preferences.motion} onChange={(value) => onPreferenceChange('motion', value)} />
        </SettingsRow>
      </section>

      <section className="quiet-group" aria-labelledby="quiet-app">
        <div className="quiet-group__heading"><h2 id="quiet-app">Aplicación</h2><p>Lleva PataWallet a tu inicio</p></div>
        <SettingsRow icon={Smartphone} tone="peach" title="Instalar PataWallet" detail="Accede más rápido desde tu teléfono">
          <InstallDisclosure onNotify={onNotify} compact />
        </SettingsRow>
      </section>

      <section className="quiet-group" aria-labelledby="quiet-services">
        <div className="quiet-group__heading"><h2 id="quiet-services">Servicios</h2><p>Herramientas que te acompañan</p></div>
        <PreviewLink icon={Bell} tone="rose" title="Notificaciones" detail="Recordatorios y avisos" onNotify={onNotify} />
        <PreviewLink icon={Smartphone} tone="sky" title="Automatización" detail="Atajos y registro de movimientos" onNotify={onNotify} />
        <PreviewLink icon={Bot} tone="violet" title="Asistente PataWallet" detail="Preguntas y resúmenes de solo lectura" onNotify={onNotify} />
        <PreviewLink icon={Handshake} tone="peach" title="Cuentas en pareja" detail="Comparte cuentas o deudas" onNotify={onNotify} action="Disponible al iniciar sesión" />
      </section>

      <section className="quiet-group quiet-group--last" aria-labelledby="quiet-data">
        <div className="quiet-group__heading"><h2 id="quiet-data">Tus datos</h2><p>Información de esta cuenta de ejemplo</p></div>
        <SettingsRow icon={CircleDollarSign} tone="gold" title="Moneda principal" detail="La moneda que usa tu presupuesto"><CurrencyValue /></SettingsRow>
        <button className="quiet-reset" type="button" onClick={() => onNotify('En la cuenta real, aquí puedes restaurar la información de ejemplo.')}>Restaurar datos de ejemplo</button>
      </section>
    </div>
  )
}
