# Configuración de autenticación

La aplicación ya integra Supabase Auth con correo/contraseña, recuperación de contraseña, sesión persistente, cierre de sesión y OAuth de Google. La clave `sb_publishable_...` es pública y se usa únicamente en el cliente; ninguna clave `sb_secret_...` debe entrar en Vite, Git o el navegador.

## 1. Crear las tablas privadas

Aplica `supabase/migrations/20260910190000_auth_and_user_data.sql` al proyecto correcto (`gzsuhlkvaiinphlcqelt`) desde el SQL Editor o desde una CLI de Supabase enlazada explícitamente a ese proyecto. La migración crea restricciones entre recursos del mismo usuario, activa RLS y niega acceso anónimo.

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

- Site URL local: `http://127.0.0.1:4173`
- Redirect URL local: `http://127.0.0.1:4173/**`
- Añade también el dominio real cuando exista; no lo inventes antes del despliegue.

La confirmación por correo puede permanecer activa. Cuando está activa, la app explica al usuario que debe confirmar su registro antes de entrar.

## 4. Google

El proyecto respondió actualmente `Unsupported provider: provider is not enabled`, por lo que la app muestra Google como pendiente.

1. En Google Cloud crea/configura un cliente OAuth web.
2. Usa como URI de redirección autorizada: `https://gzsuhlkvaiinphlcqelt.supabase.co/auth/v1/callback`.
3. Copia el Client ID y Client Secret en **Supabase → Authentication → Providers → Google** y habilita el proveedor.
4. Conserva en Supabase las URLs de retorno de la sección anterior.
5. Cambia `VITE_GOOGLE_AUTH_ENABLED=true` y reinicia la app.

El secreto OAuth de Google solo se guarda en Supabase; nunca en `.env.local` de Vite.

Referencias oficiales: [Supabase Auth con Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirecciones OAuth](https://supabase.com/docs/guides/auth/redirect-urls) y [React con Supabase](https://supabase.com/docs/guides/getting-started/tutorials/with-react).
