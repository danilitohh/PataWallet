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
