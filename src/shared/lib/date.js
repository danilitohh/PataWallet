export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
}

export function currentMonth() {
  return today().slice(0, 7)
}
