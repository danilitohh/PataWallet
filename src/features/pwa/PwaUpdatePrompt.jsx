import { useRegisterSW } from 'virtual:pwa-register/react'
import { Download, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { watchPwaUpdateChecks } from './updateChecks.js'

export function PwaUpdatePrompt() {
  const stopUpdateChecks = useRef(null)
  const onRegisteredSW = useCallback((_scriptUrl, registration) => {
    stopUpdateChecks.current?.()
    stopUpdateChecks.current = watchPwaUpdateChecks(registration)
  }, [])
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({ onRegisteredSW })
  const [blocked, setBlocked] = useState(false)

  useEffect(() => () => stopUpdateChecks.current?.(), [])

  if (!needRefresh) return null

  const update = () => {
    const openForm = document.querySelector('[role="dialog"] form')
    if (openForm) {
      setBlocked(true)
      openForm.querySelector('input, select, button')?.focus()
      return
    }
    updateServiceWorker(true)
  }

  return (
    <aside className="pwa-update" role="status" aria-live="polite">
      <Download aria-hidden="true" />
      <div><strong>Nueva versión disponible</strong><p>{blocked ? 'Termina o cierra el formulario antes de actualizar.' : 'Tus datos financieros locales no se borrarán.'}</p></div>
      <button className="button button--quiet" onClick={update}>Actualizar</button>
      <button className="icon-button icon-button--small" aria-label="Más tarde" onClick={() => setNeedRefresh(false)}><X /></button>
    </aside>
  )
}
