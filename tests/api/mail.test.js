import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { challenge, seal, unseal, contextFor, oauthCookie } from '../../server/mail/security.js'
import { providerConfig, providerAvailable, authorizationUrl, listBankMessages, gmailText, readBankMessage, startGmailWatch, tokenRequest } from '../../server/mail/providers.js'
import { gmailPushNotification } from '../../server/mail/pubsub.js'
import { completeConnection, syncConnection, disconnectConnection } from '../../server/mail/connection.js'
import handler from '../../api/mail.js'

// Credenciales y buzón ficticios: estas pruebas no contactan proveedores ni cuentas reales.
beforeEach(() => {
  vi.stubEnv('APP_ORIGIN', 'https://app.example.invalid')
  vi.stubEnv('MAIL_TOKEN_KEY', Buffer.alloc(32, 7).toString('base64'))
  for (const prefix of ['MAIL_GOOGLE', 'MAIL_MICROSOFT']) {
    vi.stubEnv(`${prefix}_ENABLED`, 'true'); vi.stubEnv(`${prefix}_CLIENT_ID`, 'client'); vi.stubEnv(`${prefix}_CLIENT_SECRET`, 'not-a-real-secret')
  }
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('OAuth de correo y fronteras de proveedores', () => {
  it('cifra con nonce aleatorio, autentica el contenido y lo liga al propietario', () => {
    const value = { refresh_token: 'secret-token' }; const cipher = seal(value, 'owner:gmail:generation')
    expect(cipher).not.toContain('secret-token')
    expect(cipher).not.toBe(seal(value, 'owner:gmail:generation'))
    expect(unseal(cipher, 'owner:gmail:generation')).toEqual(value)
    expect(() => unseal(cipher, 'other:gmail:generation')).toThrow()
    const parts = cipher.split('.'); parts[1] = Buffer.alloc(16).toString('base64url')
    expect(() => unseal(parts.join('.'), 'owner:gmail:generation')).toThrow()
  })

  it('genera PKCE S256 y autorización de lectura sin secretos ni redirect arbitrario', () => {
    expect(challenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
    for (const provider of ['gmail', 'outlook']) {
      const url = new URL(authorizationUrl(providerConfig(provider), 'state', 'verifier'))
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
      const redirect = new URL(url.searchParams.get('redirect_uri'))
      expect(redirect.href).toBe(`https://app.example.invalid/api/mail/callback/${provider}`)
      expect(redirect.search).toBe('')
      const routes = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')).rewrites
      expect(routes).toContainEqual({ source: redirect.pathname, destination: `/api/mail?operation=callback&provider=${provider}` })
      expect(url.toString()).not.toContain('not-a-real-secret')
      expect(url.searchParams.get('scope')).not.toMatch(/modify|readwrite|send/i)
      expect(oauthCookie(provider, 'opaque')).toContain('HttpOnly; Secure; SameSite=Lax')
    }
    vi.stubEnv('APP_ORIGIN', 'https://app.example.invalid/evil')
    expect(providerAvailable('gmail')).toBe(false)
    expect(providerAvailable('yahoo')).toBe(false)
  })

  it('rechaza callback sin cookie/estado antes de tocar servidor y devuelve solo una ruta interna', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    const res = { status(value) { this.code = value; return this }, headers: {}, setHeader(key, value) { this.headers[key] = value; return this }, end() {} }
    await handler({ method: 'GET', query: { operation: 'callback', provider: 'gmail', state: 'a'.repeat(43), code: 'sensitive-code' }, headers: {} }, res)
    expect(res.code).toBe(303)
    expect(res.headers.Location).toBe('/ajustes/correos-bancarios?mail=error')
    expect(JSON.stringify(res.headers)).not.toContain('sensitive-code')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('no canjea un código cuando la base rechaza estado, cookie, expiración o replay', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    await expect(completeConnection({ rpc: async () => ({ error: new Error('Invalid state') }) }, 'gmail', 'state', 'cookie', 'code')).rejects.toThrow('Invalid state')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('canjea con PKCE y guarda solo refresh cifrado para el propietario y generación originales', async () => {
    const attempt = { user_id: 'owner', provider: 'gmail', generation: 'generation' }
    attempt.verifier_cipher = seal('pkce-verifier', contextFor(attempt))
    const update = vi.fn(); const guards = []
    const query = { eq: (key, value) => { guards.push([key, value]); return query }, select: () => query, maybeSingle: async () => ({ data: { provider: 'gmail' } }) }
    const admin = { rpc: async () => ({ data: attempt }), from: () => ({ update: (value) => { update(value); return query } }) }
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'access-only-in-memory', token_type: 'Bearer', refresh_token: 'refresh' }))
      .mockResolvedValueOnce(Response.json({ emailAddress: 'mailbox@example.invalid' }))
    vi.stubGlobal('fetch', fetch)
    expect(await completeConnection(admin, 'gmail', 'state', 'cookie', 'code')).toBe('connected')
    expect(new URLSearchParams(fetch.mock.calls[0][1].body).get('code_verifier')).toBe('pkce-verifier')
    expect(guards).toEqual([['user_id', 'owner'], ['provider', 'gmail'], ['generation', 'generation'], ['status', 'pending']])
    const stored = update.mock.calls[0][0]
    expect(stored).toMatchObject({ status: 'connected', mailbox: 'mailbox@example.invalid' })
    expect(unseal(stored.token_cipher, contextFor(attempt))).toEqual({ refresh_token: 'refresh' })
    expect(JSON.stringify(stored)).not.toContain('access-only-in-memory')
    // Una desconexión concurrente no se convierte en éxito aunque ya se haya canjeado el código.
    query.maybeSingle = async () => ({ data: null })
    fetch.mockResolvedValueOnce(Response.json({ access_token: 'access', token_type: 'Bearer', refresh_token: 'refresh' }))
      .mockResolvedValueOnce(Response.json({ emailAddress: 'mailbox@example.invalid' }))
    await expect(completeConnection(admin, 'gmail', 'state', 'cookie', 'code')).rejects.toThrow('La conexión cambió')
  })

  it('descarta tokens sin permisos mínimos y clasifica invalid_grant sin filtrar detalles', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ token_type: 'Bearer', access_token: 'secret', scope: 'openid' }))
      .mockResolvedValueOnce(Response.json({ error: 'invalid_grant', error_description: 'private information' }, { status: 400 })))
    await expect(tokenRequest(providerConfig('gmail'), { code: 'code' })).rejects.toThrow('Faltan permisos')
    await expect(tokenRequest(providerConfig('gmail'), { code: 'code' })).rejects.toMatchObject({ reconnect: true, message: 'El proveedor no pudo completar la solicitud.' })
  })

  it('filtra por bancos/fecha, conserva paginación y bloquea nextLink externos', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ messages: [{ id: 'one' }], nextPageToken: 'next-page' }))
      .mockResolvedValueOnce(Response.json({ value: [{ id: 'two' }] }))
    vi.stubGlobal('fetch', fetch)
    const cursor = { since: '2026-09-20T00:00:00.000Z', until: '2026-09-27T00:00:00.000Z', next: null }
    expect(await listBankMessages('gmail', 'token', ['nequi'], cursor)).toEqual({ ids: ['one'], next: 'next-page' })
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get('q')).toContain('from:somos@nequi.com.co')
    await listBankMessages('outlook', 'token', ['lulo'], cursor)
    expect(new URL(fetch.mock.calls[1][0]).searchParams.get('$filter')).toContain("from/emailAddress/address eq 'notificaciones@lulobank.com'")
    for (const next of ['https://evil.invalid/steal', 'https://graph.microsoft.com:444/v1.0/me/messages', 'https://graph.microsoft.com/v1.0/users']) {
      await expect(listBankMessages('outlook', 'token', ['nequi'], { ...cursor, next })).rejects.toThrow('Paginación inválida')
    }
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('registra la vigilancia de Gmail en el tema configurado y valida el aviso recibido', async () => {
    vi.stubEnv('MAIL_GOOGLE_PUBSUB_TOPIC', 'projects/patawallet/topics/gmail-events')
    const fetch = vi.fn().mockResolvedValue(Response.json({ historyId: '12345', expiration: '1790640000000' }))
    vi.stubGlobal('fetch', fetch)
    await expect(startGmailWatch(providerConfig('gmail'), 'access')).resolves.toEqual({ historyId: '12345', expiration: '1790640000000' })
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ topicName: 'projects/patawallet/topics/gmail-events', labelIds: ['INBOX'], labelFilterAction: 'include' })
    const payload = { message: { data: Buffer.from(JSON.stringify({ emailAddress: 'mailbox@example.invalid', historyId: '12345' })).toString('base64') } }
    expect(gmailPushNotification(payload)).toMatchObject({ emailAddress: 'mailbox@example.invalid', historyId: '12345' })
  })

  it('extrae MIME inline sin adjuntos ni doble texto de alternativas y limita profundidad', () => {
    const part = (mimeType, text) => ({ mimeType, body: { data: Buffer.from(text).toString('base64url') } })
    expect(gmailText({ parts: [part('text/plain', 'Pago $8.500'), part('text/html', '<p>Pago $8.500</p>'), { ...part('text/plain', 'adjunto privado'), filename: 'private.txt' }] })).toBe('Pago $8.500')
    let tree = part('text/plain', 'too deep'); for (let i = 0; i < 14; i++) tree = { parts: [tree] }
    expect(() => gmailText(tree)).toThrow('Correo demasiado complejo')
  })

  it('no procesa un remitente ajeno aunque el resultado de búsqueda lo incluya', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ from: { emailAddress: { address: 'other@example.invalid' } }, subject: 'hola', body: { content: 'private body' } })))
    expect(await readBankMessage('outlook', 'token', 'id', ['nequi'])).toBeNull()
  })
})

describe('sincronización bajo demanda', () => {
  // Dobles mínimos de transporte: la atomicidad y permisos se prueban además en PostgreSQL real.
  function adminFor(row) {
    const updates = []
    const rpc = vi.fn(async (name) => ({ data: name === 'server_claim_mail_sync' ? row : { added: 1, has_more: false }, error: null }))
    const admin = { rpc, from: () => ({ update: (value) => {
      updates.push(value)
      const query = { eq: () => query, select: () => query, maybeSingle: async () => ({ data: { provider: row.provider } }), then: (resolve) => Promise.resolve({ error: null }).then(resolve) }
      return query
    } }) }
    return { admin, updates, rpc }
  }

  it('renueva tokens y guarda candidatos sin afectar saldos ni revelar contenido completo', async () => {
    const row = { user_id: 'owner', provider: 'outlook', generation: 'generation', mailbox_id: 'mailbox', banks: ['nequi'], cursor: null, last_sync_at: null }
    row.token_cipher = seal({ refresh_token: 'old' }, contextFor(row))
    const { admin, updates, rpc } = adminFor(row)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'access', token_type: 'Bearer', refresh_token: 'new' }))
      .mockResolvedValueOnce(Response.json({ value: [{ id: 'id' }] }))
      .mockResolvedValueOnce(Response.json({ from: { emailAddress: { address: 'somos@nequi.com.co' } }, subject: 'Pago exitoso', internetMessageId: '<shared-message-id>', body: { contentType: 'text', content: 'Hiciste un pago en LULO BANK S A por $706.750 Fecha: El 29 de abril de 2026 Hora: 8:33 p. m.' } })))
    expect(await syncConnection(admin, 'owner', 'outlook')).toEqual({ added: 1, has_more: false })
    expect(unseal(updates[0].token_cipher, contextFor(row))).toEqual({ refresh_token: 'new' })
    const saved = rpc.mock.calls.find(([name]) => name === 'server_commit_mail_page')[1]
    expect(saved.p_events[0].candidate).toMatchObject({ amount_minor: 70675000, transaction_type: null })
    expect(saved.p_events[0].candidate).not.toHaveProperty('text')
    expect(saved.p_cursor).toBeNull()
  })

  it('un error del proveedor conserva cursor, libera lease y exige reconectar si revocaron acceso', async () => {
    const row = { user_id: 'owner', provider: 'gmail', generation: 'generation' }
    row.token_cipher = seal({ refresh_token: 'old' }, contextFor(row))
    const { admin, updates, rpc } = adminFor(row)
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'invalid_grant' }, { status: 400 })))
    await expect(syncConnection(admin, 'owner', 'gmail')).rejects.toMatchObject({ reconnect: true })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(updates[0]).toEqual({ status: 'reauthorize', token_cipher: null, sync_lease: null, lease_until: null })
  })

  it('desconectar elimina credenciales y estado sin llamar APIs con permisos extra', async () => {
    const { admin, updates } = adminFor({ provider: 'gmail' })
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    expect(await disconnectConnection(admin, 'owner', 'gmail')).toMatchObject({ disconnected: true })
    expect(updates[0]).toMatchObject({ token_cipher: null, state_hash: null, cookie_hash: null, sync_lease: null, cursor: null, status: 'disconnected' })
    expect(fetch).not.toHaveBeenCalled()
  })
})
