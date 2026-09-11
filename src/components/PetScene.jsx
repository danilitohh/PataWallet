import { motion, useReducedMotion } from 'motion/react'

const scenes = {
  welcome: { file: 'welcome-family', alt: 'Un perro y un grupo de gatos descansan juntos junto a una libreta y una alcancía.' },
  budget: { file: 'budget-calm', alt: 'Un gato revisa una libreta de presupuesto mientras otro descansa al fondo.' },
  empty: { file: 'empty-state-friends', alt: 'Un gato se asoma desde una caja acompañado de un perro y objetos de ahorro.' },
  success: { file: 'success-friends', alt: 'Un gato y un perro celebran junto a una alcancía y un recibo de confirmación.' },
}

export function PetScene({ name, hero = false }) {
  const reduce = useReducedMotion()
  const scene = scenes[name]
  return (
    <motion.picture
      className={`pet-scene ${hero ? 'pet-scene--hero' : ''}`}
      initial={reduce ? false : { opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.45 }}
    >
      <source media="(max-width: 520px)" srcSet={`/assets/illustrations/${scene.file}-480.webp`} />
      <source media="(max-width: 900px)" srcSet={`/assets/illustrations/${scene.file}-800.webp`} />
      <img src={`/assets/illustrations/${scene.file}-1122.webp`} width="1122" height="1402" alt={scene.alt} loading={hero ? 'eager' : 'lazy'} decoding="async" fetchPriority={hero ? 'high' : 'auto'} />
    </motion.picture>
  )
}
