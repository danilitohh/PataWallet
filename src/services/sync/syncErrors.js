export class SyncConflictError extends Error {
  constructor(message, details = null) {
    super(message)
    this.name = 'SyncConflictError'
    this.details = details
  }
}

export function isSessionError(error) {
  return error?.status === 401 || error?.code === 'PT401' || /session|jwt|token/i.test(error?.message || '')
}

