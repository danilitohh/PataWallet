import { useEffect } from 'react'

// Sigue el control real durante scroll y cambios de tamaño, sin sondeo permanente.
export function useGuideAnchor(step, pathname, panelRef, spotlightRef) {
  useEffect(() => {
    const panel = panelRef.current
    const spotlight = spotlightRef.current
    delete panel.dataset.anchoredStep
    delete panel.dataset.targetFound
    spotlight.hidden = true
    if (pathname !== step.path) return
    let target = null
    let previousScrollMargin = ''
    let frame = 0
    let disposed = false
    const viewport = window.visualViewport

    const place = () => {
      if (disposed) return
      const width = viewport?.width || window.innerWidth
      const height = viewport?.height || window.innerHeight
      const offsetTop = viewport?.offsetTop || 0
      const offsetLeft = viewport?.offsetLeft || 0
      const margin = 16
      panel.style.maxHeight = `${height - margin * 2}px`
      panel.style.width = `${Math.min(368, width - margin * 2)}px`
      let panelHeight = panel.getBoundingClientRect().height
      const rect = target?.getBoundingClientRect()
      const visible = rect && rect.width > 0 && rect.height > 0 && rect.bottom > offsetTop && rect.top < offsetTop + height
      panel.dataset.targetFound = String(Boolean(visible))
      panel.dataset.anchoredStep = step.id
      spotlight.hidden = !visible
      let top = offsetTop + height - panelHeight - margin
      let left = offsetLeft + (width - panel.offsetWidth) / 2
      if (visible) {
        Object.assign(spotlight.style, { left: `${rect.left - 5}px`, top: `${rect.top - 5}px`, width: `${rect.width + 10}px`, height: `${rect.height + 10}px` })
        left = Math.max(offsetLeft + margin, Math.min(rect.left, offsetLeft + width - panel.offsetWidth - margin))
        const below = offsetTop + height - rect.bottom - margin * 2
        const above = rect.top - offsetTop - margin * 2
        const putBelow = below >= panelHeight || (above < panelHeight && below >= above)
        // En móviles cortos la tarjeta se desplaza internamente, sin cubrir el objetivo.
        panel.style.maxHeight = `${Math.max(120, putBelow ? below : above)}px`
        panelHeight = panel.getBoundingClientRect().height
        top = putBelow ? rect.bottom + margin : rect.top - panelHeight - margin
      }
      Object.assign(panel.style, { left: `${left}px`, top: `${Math.max(offsetTop + margin, top)}px` })
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place) }
    const resize = new ResizeObserver(schedule)
    resize.observe(panel)
    const find = () => {
      if (target?.isConnected && target.getBoundingClientRect().width > 0) return
      if (target) {
        target.style.scrollMarginTop = previousScrollMargin
        resize.unobserve(target)
      }
      target = step.target.split(',').flatMap((selector) => [...document.querySelectorAll(selector.trim())]).find((element) => {
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })
      if (!target) { schedule(); return }
      // Desplazamiento instantáneo: el recorrido también respeta movimiento reducido.
      previousScrollMargin = target.style.scrollMarginTop
      target.style.scrollMarginTop = '100px'
      target.scrollIntoView({ block: 'start', behavior: 'instant' })
      resize.observe(target)
      panel.focus({ preventScroll: true })
      schedule()
    }
    const mutations = new MutationObserver(find)
    mutations.observe(document.querySelector('#root'), { childList: true, subtree: true })
    find()
    window.addEventListener('scroll', schedule, true)
    const onResize = () => { find(); schedule() }
    window.addEventListener('resize', onResize)
    viewport?.addEventListener('resize', schedule)
    viewport?.addEventListener('scroll', schedule)
    return () => {
      disposed = true
      if (target) target.style.scrollMarginTop = previousScrollMargin
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', onResize)
      viewport?.removeEventListener('resize', schedule)
      viewport?.removeEventListener('scroll', schedule)
    }
  }, [step, pathname, panelRef, spotlightRef])
}
