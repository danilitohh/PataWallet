import { CreditCard, ExternalLink, PawPrint, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { normalizeIntegrationSetup } from '../../domain/registration.js'
import shortcutManifest from '../../../shortcuts/template-manifest.json'
import { MailConnections } from '../bank-email/MailConnections.jsx'
import { NotificationsPanel } from '../integrations/NotificationsPage.jsx'

export function IntegrationSetup({ preferences, onFinish, user, isDemo, onImported }) {
  const selected = normalizeIntegrationSetup(preferences)
  if (!selected) return null

  return (
    <main className="integration-onboarding">
      <header className="integration-onboarding__brand"><PawPrint aria-hidden="true" /><strong>PataWallet</strong></header>
      <section className="integration-onboarding__content" aria-labelledby="integration-onboarding-title">
        <p className="integration-onboarding__eyebrow">Configuración opcional</p>
        <h1 id="integration-onboarding-title">Conecta lo que elegiste</h1>
        <p className="integration-onboarding__intro">Estas son las opciones que elegiste. Gmail/Outlook requiere escoger bancos y dar consentimiento; las notificaciones requieren el permiso de este dispositivo.</p>

        <div className="integration-onboarding__list">
          {selected.shortcut && <article className="integration-onboarding__card">
            <span className="integration-onboarding__icon"><CreditCard aria-hidden="true" /></span>
            <div className="integration-onboarding__details">
              <h2>Pagos con tarjeta</h2>
              <p>Añade la plantilla de PataWallet, vincula tu iPhone y crea la automatización personal en Atajos.</p>
              <div className="integration-onboarding__actions">
                <a className="button button--secondary" href={shortcutManifest.shortcutIcloudUrl} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" /> Añadir atajo</a>
                <a className="integration-onboarding__text-link" href="/assets/integrations/tutorial-patawallet-paso-a-paso.mp4" target="_blank" rel="noopener noreferrer"><Play aria-hidden="true" /> Ver video</a>
                <Link className="integration-onboarding__text-link" to="/ajustes/automatizacion">Abrir configuración</Link>
              </div>
            </div>
          </article>}

          {selected.bankEmail && <MailConnections isDemo={isDemo} onImported={onImported} />}

          {selected.notifications && <div className="integration-onboarding__notification-panel"><NotificationsPanel user={user} isDemo={isDemo} /></div>}
        </div>
      </section>

      <footer className="integration-onboarding__footer">
        <button className="button button--primary" type="button" onClick={onFinish}>Continuar a PataWallet</button>
        <p>Si lo prefieres, podrás conectar o desactivar cada opción desde Ajustes.</p>
      </footer>
    </main>
  )
}
