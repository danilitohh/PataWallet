import { useState, useSyncExternalStore } from 'react'
import { Check, Download } from 'lucide-react'
import { NightIcon } from '../../shared/components/NightIcon.jsx'
import { pwaInstallManager } from './installManager.js'
import './pwa-install.css'

/** Presenta instalación nativa cuando existe y pasos manuales en el resto de navegadores. */
export function PwaInstallControl() {
  const installState = useSyncExternalStore(pwaInstallManager.subscribe, pwaInstallManager.getSnapshot, pwaInstallManager.getSnapshot)
  const [guideOpen, setGuideOpen] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [message, setMessage] = useState('')
  const appleMobile = isAppleMobileDevice()

  // Usa el diálogo del sistema solo si el navegador ofrece el evento y el usuario pulsa el botón.
  const handleInstall = async () => {
    setMessage('')
    if (!installState.canPrompt) {
      setGuideOpen((open) => !open)
      return
    }

    setGuideOpen(false)
    setInstalling(true)
    const result = await pwaInstallManager.prompt()
    setInstalling(false)

    if (result?.outcome === 'accepted') {
      setMessage('Confirmaste la instalación. El dispositivo terminará de agregar PataWallet.')
      return
    }
    if (result?.outcome === 'dismissed') {
      setMessage('No se instaló esta vez. Puedes volver a intentarlo desde el menú del navegador.')
      setGuideOpen(true)
      return
    }

    setMessage('No pudimos abrir el aviso de instalación. Puedes seguir los pasos de tu navegador.')
    setGuideOpen(true)
  }

  return (
    <section className="settings-group pwa-install" aria-labelledby="pwa-install-title">
      <h2 id="pwa-install-title">Aplicación</h2>
      <div className="setting-row pwa-install__row">
        <NightIcon icon={installState.installed ? Check : Download} className="setting-row__icon" tone="violet" />
        <div>
          <h3>{installState.installed ? 'PataWallet está instalada' : 'Instalar PataWallet'}</h3>
          <p>{installState.installed ? 'Puedes abrirla desde el inicio de tu dispositivo.' : 'Agrégala a tu dispositivo para abrirla como una app.'}</p>
        </div>
        {installState.installed
          ? <span className="pwa-install__badge">Instalada</span>
          : <button
              type="button"
              className="compact-action pwa-install__action"
              onClick={handleInstall}
              disabled={installing}
              aria-expanded={!installState.canPrompt ? guideOpen : undefined}
              aria-controls={!installState.canPrompt ? 'pwa-install-guide' : undefined}
            >
              {installing ? 'Abriendo…' : installState.canPrompt ? 'Instalar' : guideOpen ? 'Ocultar pasos' : 'Ver pasos'}
            </button>}
      </div>
      {message && <p className="pwa-install__message" role="status">{message}</p>}
      {!installState.installed && <div className="pwa-install__guide" id="pwa-install-guide" hidden={!guideOpen}>
        <p>{appleMobile
          ? 'En iPhone o iPad, Safari requiere completar este paso desde su menú; una página no puede confirmar la instalación por ti.'
          : 'Este navegador no mostró el aviso automático. Usa su menú para agregar PataWallet al dispositivo.'}</p>
        <ol>
          {appleMobile ? <>
            <li>Abre PataWallet en Safari.</li>
            <li>Toca <strong>Compartir</strong> y elige <strong>Añadir a pantalla de inicio</strong>.</li>
            <li>Activa <strong>Abrir como app web</strong> y toca <strong>Añadir</strong>.</li>
          </> : <>
            <li>Abre el menú de tu navegador.</li>
            <li>Elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</li>
            <li>Confirma la instalación en el aviso del dispositivo.</li>
          </>}
        </ol>
      </div>}
    </section>
  )
}

// Identifica iPhone/iPad —incluido iPadOS en modo escritorio— para mostrar la guía de Safari.
function isAppleMobileDevice() {
  const { userAgent = '', platform = '', maxTouchPoints = 0 } = navigator
  return /iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}
