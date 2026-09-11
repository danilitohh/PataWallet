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
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !ref.current) return
      const focusable = [...ref.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hidden && element.getClientRects().length)
      if (!focusable.length) {
        event.preventDefault()
        ref.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
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
