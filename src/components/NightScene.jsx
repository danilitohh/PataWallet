// Escena complementaria estática; la interfaz y las cifras siempre siguen siendo HTML.
export function NightScene({ hero = false, className = '' }) {
  return <picture className={`night-scene ${className}`} aria-hidden="true">
    <source media="(max-width: 520px)" srcSet="/assets/illustrations/night-companions-480.webp" />
    <source media="(max-width: 1000px)" srcSet="/assets/illustrations/night-companions-800.webp" />
    <img src="/assets/illustrations/night-companions-1122.webp" width="1122" height="748" alt="" loading={hero ? 'eager' : 'lazy'} decoding="async" fetchPriority={hero ? 'high' : 'auto'} />
  </picture>
}
