import { describe, expect, it } from 'vitest'
import { isWalletCardStyle, readWalletCardStyle, saveWalletCardStyle, walletCardById, WALLET_CARDS } from './walletCardModel.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  }
}

describe('preferencia local de tarjeta', () => {
  it('guarda una opción válida separada por espacio de usuario', () => {
    const storage = memoryStorage()
    expect(saveWalletCardStyle('user-a', 'cats', storage)).toBe('cats')
    expect(readWalletCardStyle('user-a', storage)).toBe('cats')
    expect(readWalletCardStyle('user-b', storage)).toBeNull()
  })

  it('ignora opciones antiguas o desconocidas y entrega los datos de las cinco portadas', () => {
    const storage = memoryStorage()
    storage.setItem('patawallet:wallet-card:user-a', 'night')
    expect(readWalletCardStyle('user-a', storage)).toBeNull()
    expect(WALLET_CARDS).toHaveLength(5)
    expect(isWalletCardStyle('dogs')).toBe(true)
    expect(walletCardById('macaws').image).toBe('/assets/wallet-cards/macaws.png')
    expect(walletCardById('unknown')).toBeNull()
    expect(() => saveWalletCardStyle('user-a', 'unknown', storage)).toThrow('Elige uno de los diseños disponibles.')
  })

})
