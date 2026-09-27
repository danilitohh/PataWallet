import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useModalBehavior } from '../../shared/hooks/useModalBehavior.js'
import { MovementSheet } from '../transactions/components/MovementSheet.jsx'
import { getGuideSteps, GUIDE_TOURS } from './guideSteps.js'
import { useGuideAnchor } from './useGuideAnchor.js'

// Navega por la app real; el velo y el formulario de vista previa impiden cambios financieros.
export function FirstUseGuide({ onFinish, tour = 'general' }) {
  const [index, setIndex] = useState(0)
  const steps = useMemo(() => getGuideSteps(tour), [tour])
  const current = steps[index]
  const location = useLocation()
  const navigate = useNavigate()
  const origin = useRef(location.pathname + location.search + location.hash)
  const originState = useRef(location.state)
  const dialogRef = useRef(null)
  const spotlightRef = useRef(null)
  const closing = useRef(false)

  // No llena el historial con los pasos; al terminar vuelve a la sección de origen.
  useEffect(() => {
    navigate(current.path, { replace: true })
  }, [current.path, navigate])

  const finish = () => {
    if (closing.current) return
    closing.current = true
    navigate(origin.current, { replace: true, state: { ...originState.current, guideFocus: tour } })
    onFinish()
  }
  useModalBehavior(dialogRef, finish)
  useGuideAnchor(current, location.pathname, dialogRef, spotlightRef)

  return <>
    {current.flow && <MovementSheet key={current.id} initialFlow={current.flow} preview onClose={() => {}} />}
    <div className="guide-overlay" role="presentation">
      <div ref={spotlightRef} className="guide-spotlight" hidden aria-hidden="true" />
      <section ref={dialogRef} className="first-use-guide" role="dialog" aria-modal="true" aria-labelledby="guide-title" aria-describedby="guide-description" tabIndex="-1" data-step={current.id}>
        <header><span className="first-use-guide__count">{index + 1} de {steps.length}</span><button type="button" className="first-use-guide__later" onClick={finish}>Saltar recorrido</button></header>
        <p className="eyebrow">{GUIDE_TOURS[tour]?.label || GUIDE_TOURS.general.label}</p>
        <div aria-live="polite" aria-atomic="true">
          <h2 id="guide-title">{current.title}</h2>
          <p id="guide-description" className="first-use-guide__body">{current.body}</p>
        </div>
        <p className="first-use-guide__missing" role="status">Este control no está visible en esta vista. Puedes continuar o salir del recorrido.</p>
        <footer><button type="button" className="button button--quiet" onClick={() => setIndex((value) => value - 1)} disabled={index === 0}>Atrás</button><button type="button" className="button button--primary" onClick={index === steps.length - 1 ? finish : () => setIndex((value) => value + 1)}>{index === steps.length - 1 ? 'Terminar' : 'Siguiente'}</button></footer>
        <p className="first-use-guide__help">Solo explicación: no se guardan pagos ni se activa ningún servicio.</p>
      </section>
    </div>
  </>
}
