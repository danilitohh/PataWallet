export const WALLET_CARDS = [
  {
    id: 'macaws',
    name: 'Guacamayas',
    description: 'Turquesa y oro tropical',
    image: '/assets/wallet-cards/macaws.png',
    alt: 'Dos guacamayas sobre una tarjeta turquesa y dorada de PataWallet.',
  },
  {
    id: 'cats',
    name: 'Gatos',
    description: 'Violeta iridiscente',
    image: '/assets/wallet-cards/cats.png',
    alt: 'Tres gatos sobre una tarjeta violeta de PataWallet.',
  },
  {
    id: 'dogs',
    name: 'Perros',
    description: 'Cobre y huellas',
    image: '/assets/wallet-cards/dogs.png',
    alt: 'Tres perros sobre una tarjeta cobriza de PataWallet.',
  },
  {
    id: 'rabbits',
    name: 'Conejos',
    description: 'Lavanda y destellos',
    image: '/assets/wallet-cards/rabbits.png',
    alt: 'Tres conejos sobre una tarjeta lila de PataWallet.',
  },
  {
    id: 'otters',
    name: 'Nutrias',
    description: 'Dorado, azul y agua',
    image: '/assets/wallet-cards/otters.png',
    alt: 'Dos nutrias sobre una tarjeta dorada y azul de PataWallet.',
  },
]

// Cada portada define una paleta compartida para toda la aplicación, además de su arte.
export const WALLET_CARD_THEMES = {
  macaws: { bg: '#0b1725', surface: '#132839', surfaceMuted: '#1c3546', border: '#355567', accent: '#5bd6ce', secondary: '#edbd70', onAccent: '#102326' },
  cats: { bg: '#111125', surface: '#1c1c35', surfaceMuted: '#2b2948', border: '#4d476d', accent: '#c6a4ff', secondary: '#eda2db', onAccent: '#21152d' },
  dogs: { bg: '#18121c', surface: '#261d29', surfaceMuted: '#3a2c38', border: '#594558', accent: '#f0a15f', secondary: '#75b8e5', onAccent: '#2b190f' },
  rabbits: { bg: '#191321', surface: '#272034', surfaceMuted: '#3c2d47', border: '#5b4b69', accent: '#efc4f1', secondary: '#f0c98c', onAccent: '#2a172c' },
  otters: { bg: '#111a24', surface: '#1d2a36', surfaceMuted: '#2b3b47', border: '#4c5c68', accent: '#e7c280', secondary: '#61b8dc', onAccent: '#2d2614' },
}

const defaultWalletTheme = WALLET_CARD_THEMES.cats

export function walletCardThemeVariables(cardStyle, { lightSurface = false } = {}) {
  const theme = WALLET_CARD_THEMES[cardStyle] || defaultWalletTheme
  const surface = lightSurface ? '#fafafa' : theme.surface
  const surfaceMuted = lightSurface ? '#e5e5e8' : theme.surfaceMuted
  const accent = lightSurface ? `color-mix(in srgb, ${theme.accent} 68%, #202027)` : theme.accent
  const secondary = lightSurface ? `color-mix(in srgb, ${theme.secondary} 68%, #202027)` : theme.secondary
  const border = lightSurface
    ? `color-mix(in srgb, ${theme.accent} 18%, #d9d9dd)`
    : theme.border
  const accentSoft = `color-mix(in srgb, ${accent} 15%, ${surface})`
  const accentSoftLight = `color-mix(in srgb, ${theme.accent} 12%, #ffffff)`

  return {
    '--bg': lightSurface ? '#ededee' : theme.bg,
    '--surface': surface,
    '--surface-muted': surfaceMuted,
    '--border': border,
    '--text': lightSurface ? '#202027' : '#f6f3ff',
    '--text-2': lightSurface ? '#666872' : '#b9bde0',
    '--accent': accent,
    '--accent-deep': lightSurface
      ? `color-mix(in srgb, ${theme.accent} 55%, #ffffff)`
      : `color-mix(in srgb, ${theme.accent} 43%, ${theme.bg})`,
    '--accent-secondary': secondary,
    '--accent-soft': lightSurface ? accentSoftLight : accentSoft,
    '--accent-soft-light': accentSoftLight,
    '--primary': theme.accent,
    '--on-primary': theme.onAccent,
    '--focus': theme.accent,
    '--coral': secondary,
    '--warm': secondary,
    '--success': lightSurface ? '#187653' : '#92e0c4',
    '--success-soft': lightSurface ? '#e5f3eb' : '#193b3c',
    '--danger': lightSurface ? '#b83d58' : '#ffadbd',
    '--sky': `color-mix(in srgb, ${theme.secondary} 28%, ${surface})`,
    '--peach': `color-mix(in srgb, ${theme.accent} 18%, ${surface})`,
    '--button-fill': `linear-gradient(130deg, ${theme.accent}, ${theme.secondary})`,
    '--button-shadow': `0 7px 22px color-mix(in srgb, ${theme.accent} 25%, transparent)`,
    '--theme-glow': `color-mix(in srgb, ${theme.accent} ${lightSurface ? 7 : 18}%, transparent)`,
    '--panel-fill': lightSurface
      ? `linear-gradient(145deg, color-mix(in srgb, #ffffff 94%, ${theme.accent}), color-mix(in srgb, #f6f6f7 96%, ${theme.secondary}))`
      : `linear-gradient(145deg, color-mix(in srgb, ${surface} 91%, ${theme.accent}), color-mix(in srgb, ${surface} 94%, ${theme.secondary}))`,
    '--glass-panel': lightSurface
      ? `linear-gradient(145deg, color-mix(in srgb, #ffffff 93%, ${theme.accent}), color-mix(in srgb, #f8f8f9 96%, ${theme.secondary}))`
      : `linear-gradient(135deg, color-mix(in srgb, ${surfaceMuted} 72%, ${theme.accent}), color-mix(in srgb, ${surface} 94%, ${theme.secondary}) 68%, color-mix(in srgb, ${surface} 88%, ${theme.accent}))`,
    '--glass-edge': `1px solid color-mix(in srgb, ${theme.accent} ${lightSurface ? 35 : 32}%, ${border})`,
    '--glass-shadow': lightSurface
      ? `inset 0 1px 1px #ffffffa8, 0 9px 26px color-mix(in srgb, ${theme.accent} 10%, #20212a0c)`
      : `inset 0 1px 1px color-mix(in srgb, ${theme.accent} 13%, #ffffff22), 0 12px 30px color-mix(in srgb, ${theme.accent} 8%, #020817)`,
    '--shadow': lightSurface
      ? `0 12px 36px color-mix(in srgb, ${theme.accent} 7%, #20212a16)`
      : `0 12px 36px color-mix(in srgb, ${theme.accent} 8%, #02061530)`,
  }
}

export function walletCardThemeById(cardStyle) {
  return WALLET_CARD_THEMES[cardStyle] || defaultWalletTheme
}

const cardIds = new Set(WALLET_CARDS.map(({ id }) => id))
const preferencePrefix = 'patawallet:wallet-card:'

export function isWalletCardStyle(value) {
  return cardIds.has(value)
}

export function walletCardById(value) {
  return WALLET_CARDS.find(({ id }) => id === value) || null
}

function getStorage(storage) {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function readWalletCardStyle(ownerId, storage) {
  if (!ownerId) return null
  try {
    const value = getStorage(storage)?.getItem(`${preferencePrefix}${ownerId}`)
    return isWalletCardStyle(value) ? value : null
  } catch {
    return null
  }
}

export function saveWalletCardStyle(ownerId, value, storage) {
  if (!ownerId || !isWalletCardStyle(value)) throw new Error('Elige uno de los diseños disponibles.')
  try {
    const target = getStorage(storage)
    if (!target) throw new Error('El almacenamiento no está disponible.')
    target.setItem(`${preferencePrefix}${ownerId}`, value)
    return value
  } catch {
    throw new Error('No pudimos guardar tu elección en este dispositivo. Revisa el almacenamiento del navegador e inténtalo de nuevo.')
  }
}
