// Shared server-only HTTP helpers. This file is not a Vercel route.
export function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').setHeader('Cache-Control', 'no-store').json(body)
}

export function allowMethod(req, res, methods) {
  if (methods.includes(req.method)) return true
  res.setHeader('Allow', methods.join(', '))
  json(res, 405, { error: 'Método no permitido.' })
  return false
}

export function assertTrustedOrigin(req) {
  const allowed = process.env.APP_ORIGIN?.replace(/\/$/, '')
  const origin = req.headers.origin?.replace(/\/$/, '')
  if (allowed && origin && origin !== allowed) {
    const error = new Error('Origen no permitido.')
    error.status = 403
    throw error
  }
}

export function assertBodySize(req, limit) {
  const declared = Number(req.headers['content-length'] || 0)
  const measured = req.body === undefined ? 0 : Buffer.byteLength(JSON.stringify(req.body), 'utf8')
  if ((Number.isFinite(declared) && declared > limit) || measured > limit) {
    throw Object.assign(new Error('La solicitud es demasiado grande.'), { status: 413 })
  }
}

export function safeError(error) {
  const status = Number(error?.status) || 500
  return { status, message: status >= 500 ? 'El servicio de notificaciones no está disponible.' : error.message }
}
