// Keeps email suggestions aligned with the exact merchant rules used by Shortcuts.
export function normalizeMerchantName(value) {
  return typeof value === 'string'
    ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-CO')
    : ''
}

// Only an exact, active rule whose category still belongs to this movement type can prefill review.
export function suggestMerchantCategory(merchant, rules = [], categories = [], type) {
  const normalized = normalizeMerchantName(merchant)
  if (!normalized) return ''
  const rule = rules.find((entry) => entry.active !== false && entry.normalized_pattern === normalized)
  return categories.find((category) => category.id === rule?.category_id && category.type === type)?.id || ''
}
