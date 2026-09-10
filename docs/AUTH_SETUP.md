# Configuración de autenticación

La aplicación ya integra Supabase Auth con correo/contraseña, recuperación de contraseña, sesión persistente, cierre de sesión y OAuth de Google. La clave `sb_publishable_...` es pública y se usa únicamente en el cliente; ninguna clave `sb_secret_...` debe entrar en Vite, Git o el navegador.

## 1. Crear y actualizar las tablas privadas

Aplica, en orden, `supabase/migrations/20260910190000_auth_and_user_data.sql` y `supabase/migrations/20260910190327_phase2_ledger_sync_security.sql` al proyecto correcto (`gzsuhlkvaiinphlcqelt`) desde el SQL Editor o desde una CLI enlazada explícitamente. La primera crea el espacio privado; la segunda añade asientos y escrituras atómicas/idempotentes.

No se aplicó automáticamente desde Codex porque la conexión disponible correspondía a otro proyecto. Esto evita modificar una base ajena por accidente.

## 2. Variables del frontend

Copia `.env.example` a `.env.local` y configura:

```ini
VITE_SUPABASE_URL=https://gzsuhlkvaiinphlcqelt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_GOOGLE_AUTH_ENABLED=false
```

El archivo `.env.local` está ignorado por Git. Reinicia Vite después de modificarlo.

## 3. Correo y contraseñas

En Supabase, revisa **Authentication → URL Configuration**:

- Site URL de producción: `https://pata-wallet.vercel.app`
- Redirect URL de producción exacta: `https://pata-wallet.vercel.app`
- Redirect URL de producción para rutas: `https://pata-wallet.vercel.app/**`
- Desarrollo local: `http://127.0.0.1:4173/**` y `http://localhost:4173/**`

La confirmación por correo puede permanecer activa. Cuando está activa, la app explica al usuario que debe confirmar su registro antes de entrar. Para entrega pública, configura un SMTP autorizado en Supabase y verifica remitente, límites, rebotes y plantillas; no se asume que el correo predeterminado sea adecuado para producción ni que permita personalización en todos los planes.

## 4. Google

El proveedor de Google ya fue configurado y el retorno real a PataWallet fue comprobado manualmente.

1. En Google Cloud crea/configura un cliente OAuth web.
2. Usa como URI de redirección autorizada: `https://gzsuhlkvaiinphlcqelt.supabase.co/auth/v1/callback`.
3. Copia el Client ID y Client Secret en **Supabase → Authentication → Providers → Google** y habilita el proveedor.
4. Conserva en Supabase las URLs de retorno de la sección anterior.
5. Usa `VITE_GOOGLE_AUTH_ENABLED=true` y reinicia la app.

El secreto OAuth de Google solo se guarda en Supabase; nunca en `.env.local` de Vite.

Referencias oficiales: [Supabase Auth con Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirecciones OAuth](https://supabase.com/docs/guides/auth/redirect-urls) y [React con Supabase](https://supabase.com/docs/guides/getting-started/tutorials/with-react).

## 5. Sesiones vencidas y cambios locales

Supabase conserva y renueva la sesión con su cliente oficial. Si la sesión deja de ser válida, la aplicación vuelve al acceso sin eliminar la cola local. Al entrar otra vez con la misma cuenta se reintenta; otra cuenta usa una base IndexedDB diferente. El cierre de sesión pide confirmación cuando hay cambios pendientes.

Consulta `docs/DATA_SECURITY_AND_RECOVERY.md` para sincronización, copias y prueba de aislamiento.
