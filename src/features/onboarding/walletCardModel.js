export const WALLET_CARDS = [
  {
    id: 'night',
    name: 'Noche',
    description: 'Azul profundo y lavanda',
    image: '/assets/wallet-cards/card-night.png',
    alt: 'Tarjeta azul noche de PataWallet con un perro y tres gatos asomados por el borde.',
  },
  {
    id: 'ivory',
    name: 'Marfil',
    description: 'Clara y cálida',
    image: '/assets/wallet-cards/card-ivory.png',
    alt: 'Tarjeta marfil de PataWallet con un perro y tres gatos asomados por el borde.',
  },
  {
    id: 'terracotta',
    name: 'Terracota',
    description: 'Tierra y cobre',
    image: '/assets/wallet-cards/card-terracotta.png',
    alt: 'Tarjeta terracota de PataWallet con un perro y tres gatos asomados por el borde.',
  },
]

const cardIds = new Set(WALLET_CARDS.map(({ id }) => id))
const preferencePrefix = 'patawallet:wallet-card:'
const sessionPrefix = 'patawallet:wallet-opened:'

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

function getSessionStorage(storage) {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  return window.sessionStorage
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

export function hasOpenedWallet(ownerId, storage) {
  if (!ownerId) return false
  try {
    return getSessionStorage(storage)?.getItem(`${sessionPrefix}${ownerId}`) === '1'
  } catch {
    return false
  }
}

export function markWalletOpened(ownerId, storage) {
  if (!ownerId) return
  try {
    getSessionStorage(storage)?.setItem(`${sessionPrefix}${ownerId}`, '1')
  } catch {
    // El botón igualmente abre la app; solo se repetirá la portada en esta pestaña.
  }
}
