import { Smartphone } from 'lucide-react'
import { IntegrationsHeader } from './components/IntegrationsHeader.jsx'

export function AutomationPage() {
  return (
    <div className="route-stack">
      <IntegrationsHeader title="Automatización" subtitle="Captura compatible mediante Atajos, separada de esta PWA." />
      <section className="integration-card">
        <span className="integration-icon"><Smartphone /></span>
        <p className="status-label">Plantilla pendiente de publicar</p>
        <h2>La integración aún no está disponible</h2>
        <p>No existe un enlace iCloud, backend ni vinculación real. La app no puede leer Wallet directamente.</p>
        <ol className="steps"><li><span>1</span><div><strong>Añadir la plantilla</strong><p>Se habilitará cuando exista un enlace real y versionado.</p></div></li><li><span>2</span><div><strong>Vincular esta cuenta</strong><p>Usará un ticket temporal, nunca un token permanente en la URL.</p></div></li><li><span>3</span><div><strong>Crear la automatización personal</strong><p>Se completa en Atajos y requiere una tarjeta compatible.</p></div></li><li><span>4</span><div><strong>Validar una compra normal</strong><p>Una prueba de conexión no crea gastos ni demuestra una compra.</p></div></li></ol>
        <button className="button button--disabled" disabled>Añadir atajo</button>
      </section>
    </div>
  )
}
