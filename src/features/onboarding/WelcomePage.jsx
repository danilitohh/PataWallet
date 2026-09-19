import { PawPrint } from 'lucide-react'
import { PetScene } from '../../components/PetScene.jsx'
import { NightScene } from '../../components/NightScene.jsx'
import { useApp } from '../../app/AppContext.jsx'

// Distingue la configuración personal de la exploración con datos ficticios.
export function WelcomePage() {
  const { actions } = useApp()
  return (
    <main className="welcome">
      <div className="wordmark welcome__brand"><PawPrint aria-hidden="true" /> PataWallet</div>
      <section className="welcome__intro">
        <p className="eyebrow">Finanzas en buena compañía</p>
        <h1>Tu dinero,<br />tu paz,<br />tu manada.</h1>
        <p>Un espacio para cuidar tus cuentas y darle lugar a lo que sueñas.</p>
      </section>
      <div className="welcome__art"><NightScene hero /><PetScene name="welcome" hero /></div>
      <section className="welcome__actions">
        <button className="button button--primary button--wide" onClick={() => actions.setSetting('entered', true)}>Configurar mi espacio</button>
        <button className="button button--secondary button--wide" onClick={() => actions.completeDemoSetup?.()}>Probar con datos de ejemplo</button>
        <p className="demo-note">Puedes configurar tus datos ahora o explorar datos ficticios guardados solo en este navegador.</p>
      </section>
    </main>
  )
}
