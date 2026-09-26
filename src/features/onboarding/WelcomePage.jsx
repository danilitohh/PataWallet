import { PawPrint } from 'lucide-react'
import { PetScene } from '../../components/PetScene.jsx'
import { NightScene } from '../../components/NightScene.jsx'
import { useApp } from '../../app/AppContext.jsx'

// Presenta la demo local sin confundir sus datos ficticios con una cuenta personal.
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
        <button className="button button--primary button--wide" onClick={() => actions.completeDemoSetup?.()}>Probar con datos de ejemplo</button>
        <p className="demo-note">Esta demo usa datos ficticios guardados solo en este navegador. Con tu cuenta personal entrarás sin encuesta y agregarás tus datos desde Cuentas.</p>
      </section>
    </main>
  )
}
