export function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}
