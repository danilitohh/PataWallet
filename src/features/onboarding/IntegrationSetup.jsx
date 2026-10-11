import { Bell, CreditCard, ExternalLink, Mail, PawPrint, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { normalizeIntegrationSetup } from '../../domain/registration.js'
import shortcutManifest from '../../../shortcuts/template-manifest.json'

export function IntegrationSetup({ preferences, onFinish }) {
  const selected = normalizeIntegrationSetup(preferences)
  if (!selected) return null

  return (
    <main className="integration-onboarding">
      <header className="integration-onboarding__brand"><PawPrint aria-hidden="true" /><strong>PataWallet</strong></header>
      <section className="integration-onboarding__content" aria-labelledby="integration-onboarding-title">
        <p className="integration-onboarding__eyebrow">Configuración opcional</p>
        <h1 id="integration-onboarding-title">Conecta lo que elegiste</h1>
        <p className="integration-onboarding__intro">Cada opción se activa por separado y solo con tu permiso. Puedes hacerlas ahora o volver a Ajustes más tarde.</p>

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

          {selected.bankEmail && <article className="integration-onboarding__card">
            <span className="integration-onboarding__icon"><Mail aria-hidden="true" /></span>
            <div className="integration-onboarding__details">
              <h2>Transferencias por correo</h2>
              <p>Conecta Gmail u Outlook, elige tus bancos y autoriza la búsqueda de avisos. PataWallet no pide la contraseña de tu correo.</p>
              <Link className="button button--secondary" to="/ajustes/correos-bancarios"><Mail aria-hidden="true" /> Conectar correo</Link>
            </div>
          </article>}

          {selected.notifications && <article className="integration-onboarding__card">
            <span className="integration-onboarding__icon"><Bell aria-hidden="true" /></span>
            <div className="integration-onboarding__details">
              <h2>Notificaciones</h2>
              <p>Activa los avisos en este dispositivo. En iPhone, instala primero PataWallet en la pantalla de inicio.</p>
              <Link className="button button--secondary" to="/ajustes/notificaciones"><Bell aria-hidden="true" /> Activar notificaciones</Link>
            </div>
          </article>}
        </div>
      </section>

      <footer className="integration-onboarding__footer">
        <button className="button button--primary" type="button" onClick={onFinish}>Continuar a PataWallet</button>
        <p>Puedes volver a estas opciones desde Ajustes.</p>
      </footer>
    </main>
  )
}
