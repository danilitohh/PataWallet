import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from 'react'

// Calcula el tamaño de cada acceso a partir de la proximidad del puntero al centro del icono.
function DockItem({ children, className = '', href, onClick, mouseX, spring, distance, magnification, baseItemSize, label, active = false }) {
  const ref = useRef(null)
  const isHovered = useMotionValue(0)
  const DockElement = href ? motion.a : motion.div
  const mouseDistance = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return distance
    return value - (rect.left + rect.width / 2)
  })
  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize])
  const size = useSpring(targetSize, spring)

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick?.(event)
    }
  }

  const handleClick = (event) => {
    if (href) event.preventDefault()
    onClick?.(event)
  }

  return (
    <DockElement
      ref={ref}
      style={{ width: size, height: size, '--dock-base-size': `${baseItemSize}px` }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={handleClick}
      className={`dock-item ${active ? 'dock-item--active' : ''} ${className}`.trim()}
      href={href}
      tabIndex={href ? undefined : 0}
      role={href ? undefined : 'button'}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onKeyDown={href ? undefined : handleKeyDown}
    >
      {Children.map(children, (child) => isValidElement(child) ? cloneElement(child, { isHovered }) : child)}
    </DockElement>
  )
}

// Muestra la etiqueta únicamente durante hover o foco para mantener el dock compacto.
function DockLabel({ children, className = '', isHovered }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isHovered) return undefined
    return isHovered.on('change', (latest) => setIsVisible(latest === 1))
  }, [isHovered])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={`dock-label ${className}`.trim()}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Mantiene el glifo separado del contenedor para que el efecto de escala no deforme su lectura.
function DockIcon({ children, className = '' }) {
  return <div className={`dock-icon ${className}`.trim()}>{children}</div>
}

// Dock magnético basado en proximidad, adaptado a la navegación de PataWallet y a sus preferencias de movimiento.
export default function Dock({
  items = [],
  className = '',
  spring = { mass: 0.16, stiffness: 220, damping: 18 },
  magnification = 66,
  distance = 160,
  panelHeight = 70,
  dockHeight = 112,
  baseItemSize = 48,
}) {
  const mouseX = useMotionValue(Infinity)
  const isHovered = useMotionValue(0)
  const maxHeight = useMemo(() => Math.max(dockHeight, magnification + magnification / 2 + 4), [magnification, dockHeight])
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight])
  const height = useSpring(heightRow, spring)

  return (
    <motion.div className="dock-outer" style={{ height, scrollbarWidth: 'none' }}>
      <motion.div
        onMouseMove={({ clientX }) => {
          isHovered.set(1)
          mouseX.set(clientX)
        }}
        onMouseLeave={() => {
          isHovered.set(0)
          mouseX.set(Infinity)
        }}
        className={`dock-panel ${className}`.trim()}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Navegación de PataWallet"
      >
        {items.map((item) => (
          <DockItem
            key={item.key || item.label}
            href={item.href}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            label={item.label}
            active={item.active}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  )
}
