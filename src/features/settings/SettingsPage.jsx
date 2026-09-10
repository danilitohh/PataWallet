import { Bell, CircleDollarSign, Eye, EyeOff, Menu, Moon, Smartphone, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext.jsx'
import { db, resetDemo } from '../../data/db.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { SettingLink, SettingRow, Switch } from './components/SettingsControls.jsx'

export function SettingsPage() {
  const { settings, notify } = useApp()
  const navigate = useNavigate()
  const setSetting = (key, value) => db.settings.put({ key, value })

  return (
    <div className="route-stack">
      <PageHeader title="Ajustes" subtitle="Preferencias de esta demo local." />
      <section className="settings-group">
        <h2>Apariencia</h2>
        <SettingRow icon={settings.theme === 'dark' ? Moon : Sun} title="Tema" detail="Claro, noche o sistema"><select value={settings.theme || 'system'} onChange={(event) => setSetting('theme', event.target.value)}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Noche</option></select></SettingRow>
        <SettingRow icon={settings.hiddenAmounts ? EyeOff : Eye} title="Ocultar montos" detail="Privacidad visual, no autenticación"><Switch checked={Boolean(settings.hiddenAmounts)} label="Ocultar montos" onChange={(value) => setSetting('hiddenAmounts', value)} /></SettingRow>
        <SettingRow icon={Menu} title="Movimiento" detail="Respeta Reducir movimiento"><select value={settings.motion || 'system'} onChange={(event) => setSetting('motion', event.target.value)}><option value="system">Sistema</option><option value="soft">Suave</option><option value="off">Desactivado</option></select></SettingRow>
      </section>
      <section className="settings-group"><h2>Integraciones</h2><SettingLink icon={Bell} title="Notificaciones" detail="Pendiente de configurar" to="/ajustes/notificaciones" /><SettingLink icon={Smartphone} title="Automatización" detail="Plantilla pendiente de publicar" to="/ajustes/automatizacion" /></section>
      <section className="settings-group"><h2>Datos de demostración</h2><SettingRow icon={CircleDollarSign} title="Moneda" detail="Una moneda activa en esta fase"><strong>COP</strong></SettingRow><button className="button button--danger" onClick={async () => { await resetDemo(); await db.settings.put({ key: 'entered', value: true }); notify('Datos de ejemplo restaurados'); navigate('/') }}>Restaurar datos de ejemplo</button></section>
    </div>
  )
}
