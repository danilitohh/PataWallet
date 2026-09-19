import { useEffect } from 'react'
import './ambience.css'

// Luz decorativa sin canvas, eventos de puntero ni bucles JavaScript; se pausa fuera de la pestaña.
export function NightAmbience() {
  useEffect(() => {
    const update = () => { document.documentElement.dataset.pageVisible = String(!document.hidden) }
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return <div className="night-ambience" aria-hidden="true"><span /><span /></div>
}
