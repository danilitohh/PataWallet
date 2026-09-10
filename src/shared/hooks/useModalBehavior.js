import { useEffect, useRef } from 'react'

export function useModalBehavior(ref, close) {
  const opener = useRef(document.activeElement)
  const closeRef = useRef(close)

  useEffect(() => {
    closeRef.current = close
  }, [close])

  useEffect(() => {
    const shell = document.querySelector('.app-shell')
    const previousOverflow = document.body.style.overflow
    const previousOpener = opener.current
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeRef.current()
    }

    shell?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      shell?.removeAttribute('inert')
      document.body.style.overflow = previousOverflow
      previousOpener?.focus?.()
    }
  }, [ref])
}
