import { Smartphone } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { IntegrationsHeader } from './components/IntegrationsHeader.jsx'
import { ShortcutManagement } from './components/ShortcutManagement.jsx'
import { ShortcutReviewList } from './components/ShortcutReviewList.jsx'
import { ShortcutSetup } from './components/ShortcutSetup.jsx'
import { useShortcutIntegration } from './hooks/useShortcutIntegration.js'

export function AutomationPage() {
  const { isDemo, accounts, categories, transactions, notify } = useApp()
  const integration = useShortcutIntegration(isDemo)
  const review = integration.events.filter((item) => ['recorded_needs_category', 'needs_review', 'duplicate', 'conflict'].includes(item.result_status) && !item.resolved_at)
  return <div className="route-stack">
    <IntegrationsHeader title="Automatización" subtitle="Compras compatibles mediante Atajos, con revisión y permisos separados de esta PWA." />
    <section className="integration-card shortcut-hero">
      <span className="integration-icon"><Smartphone /></span>
      <p className={`status-label ${integration.template.availability === 'available' ? 'status-label--active' : ''}`}>{integration.template.availability === 'available' ? 'Plantilla disponible' : 'Plantilla pendiente de publicar'}</p>
      <h2>{integration.template.shortcutName}</h2>
      <p>El atajo preparado recibirá únicamente los campos disponibles en una automatización de Transacción. No lee Wallet directamente ni importa historial.</p>
      {integration.error && <p className="push-result push-result--failed" role="alert">{integration.error} La migración o configuración del servidor puede seguir pendiente.</p>}
    </section>
    <ShortcutSetup integration={integration} isDemo={isDemo} notify={notify} />
    {!isDemo && <ShortcutManagement integration={integration} accounts={accounts} categories={categories} notify={notify} />}
    {!isDemo && <section className="shortcut-section"><div className="section-heading"><div><h2>Por revisar</h2><p>{review.length} eventos requieren una decisión tuya.</p></div></div><ShortcutReviewList items={review} accounts={accounts} categories={categories} transactions={transactions} onResolve={integration.resolve} notify={notify} /></section>}
  </div>
}
