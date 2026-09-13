import { PawPrint } from 'lucide-react'
import { PetScene } from '../../components/PetScene.jsx'
import { useApp } from '../../app/AppContext.jsx'

export function WelcomePage() {
  const { actions } = useApp()
  return (
    <main className="welcome">
      <div className="wordmark welcome__brand"><PawPrint aria-hidden="true" /> PataWallet</div>
      <section className="welcome__intro">
        <p className="eyebrow">Tu espacio financiero</p>
        <h1>Organiza tu dinero con buena compañía.</h1>
        <p>Entiende tus cuentas, cuida tu presupuesto y avanza hacia tus metas con calma.</p>
      </section>
      <div className="welcome__art"><PetScene name="welcome" hero /></div>
      <section className="welcome__actions">
        <button className="button button--primary button--wide" onClick={() => actions.setSetting('entered', true)}>Configurar mi espacio</button>
        <button className="button button--secondary button--wide" onClick={() => actions.completeDemoSetup?.()}>Probar con datos de ejemplo</button>
        <p className="demo-note">Puedes configurar tus datos ahora o explorar datos ficticios guardados solo en este navegador.</p>
      </section>
    </main>
  )
}
