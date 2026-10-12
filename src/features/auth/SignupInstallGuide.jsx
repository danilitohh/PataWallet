import { useState, useSyncExternalStore } from 'react'
import { Check, Download, ExternalLink, Monitor, Share2, Smartphone } from 'lucide-react'
import { pwaInstallManager } from '../pwa/installManager.js'

const installGuides = {
  iphone: {
    label: 'iPhone / iPad',
    tabLabel: 'iPhone',
    title: 'Safari en iPhone y iPad',
    Icon: Smartphone,
    officialUrl: 'https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27',
    steps: [
      <>Abre PataWallet en <strong>Safari</strong>.</>,
      <>Toca <strong>Compartir</strong> <Share2 aria-hidden="true" /> y elige <strong>Añadir a pantalla de inicio</strong>.</>,
      <>Activa <strong>Abrir como app web</strong> si aparece y toca <strong>Añadir</strong>.</>,
    ],
  },
  android: {
    label: 'Android',
    tabLabel: 'Android',
    title: 'Desde Chrome',
    Icon: Smartphone,
    officialUrl: 'https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=es',
    steps: [
      <>Abre PataWallet en <strong>Chrome</strong>.</>,
      <>Toca el menú <strong>⋮</strong> y elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</>,
      <>Confirma con <strong>Instalar</strong> o <strong>Añadir</strong>.</>,
    ],
  },
  computer: {
    label: 'Computadora',
    tabLabel: 'Computadora',
    title: 'Desde Chrome',
    Icon: Monitor,
    officialUrl: 'https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DDesktop&hl=es',
    steps: [
      <>Abre PataWallet en <strong>Chrome</strong>.</>,
      <>Pulsa el icono <strong>Instalar</strong> junto a la barra de direcciones; si no aparece, abre <strong>el menú ⋮ → Transmitir, guardar y compartir → Instalar página como app</strong>.</>,
      <>Confirma la instalación en el navegador.</>,
    ],
  },
}

function suggestedPlatform() {
  if (typeof navigator === 'undefined') return 'computer'
  const { userAgent = '', platform = '', maxTouchPoints = 0 } = navigator
  if (/iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)) return 'iphone'
  if (/Android/i.test(userAgent)) return 'android'
  return 'computer'
}

export function SignupInstallGuide() {
  const installState = useSyncExternalStore(pwaInstallManager.subscribe, pwaInstallManager.getSnapshot, pwaInstallManager.getSnapshot)
  const [platform, setPlatform] = useState(suggestedPlatform)
  const [installing, setInstalling] = useState(false)
  const [message, setMessage] = useState('')
  const guide = installGuides[platform]

  const install = async () => {
    setInstalling(true)
    setMessage('')
    const result = await pwaInstallManager.prompt()
    setInstalling(false)
    if (result?.outcome === 'accepted') setMessage('Aceptaste la instalación. El navegador terminará de agregar PataWallet.')
    else if (result?.outcome === 'dismissed') setMessage('No se instaló esta vez. Puedes seguir los pasos cuando quieras.')
    else setMessage('No se abrió el aviso. Sigue los pasos de tu dispositivo para agregar PataWallet.')
  }

  return (
    <section className="signup-flow__install-guide" aria-labelledby="signup-install-title">
      <div className="signup-flow__install-heading">
        <span className="signup-flow__shortcut-icon"><Download aria-hidden="true" /></span>
        <div>
          <h2 id="signup-install-title">Agrega PataWallet como app</h2>
          <p>Ábrela desde el inicio de tu dispositivo, sin buscarla en el navegador.</p>
        </div>
        {installState.installed
          ? <span className="signup-flow__install-status"><Check aria-hidden="true" /> Instalada</span>
          : installState.canPrompt && <button className="signup-flow__install-now" type="button" onClick={install} disabled={installing}>{installing ? 'Abriendo…' : 'Instalar ahora'}</button>}
      </div>

      <div className="signup-flow__install-platforms" role="group" aria-label="Elige tu dispositivo">
        {Object.entries(installGuides).map(([id, option]) => {
          const Icon = option.Icon
          return <button key={id} type="button" aria-pressed={platform === id} onClick={() => { setPlatform(id); setMessage('') }}><Icon aria-hidden="true" />{option.tabLabel}</button>
        })}
      </div>

      <div className="signup-flow__install-steps" aria-live="polite">
        <h3>{guide.title}</h3>
        <ol>
          {guide.steps.map((step, index) => <li key={index}><span>{index + 1}</span><p>{step}</p></li>)}
        </ol>
        <a href={guide.officialUrl} target="_blank" rel="noreferrer">Ver pasos oficiales <ExternalLink aria-hidden="true" /></a>
      </div>
      {message && <p className="signup-flow__install-message" role="status">{message}</p>}
    </section>
  )
}
