# PWA y Web Push

## Qué está implementado

PataWallet usa un único service worker generado con `vite-plugin-pwa` en modo `injectManifest`. El worker precarga el shell y las variantes pequeñas necesarias, no guarda respuestas de Supabase/Auth ni `/api/*` en Cache Storage y siempre presenta una notificación visible cuando recibe un push válido. Las rutas abiertas desde un aviso están limitadas a páginas internas conocidas.

Las suscripciones pertenecen al usuario autenticado y a la instalación del navegador. El servidor determina el propietario desde el token de Supabase, valida el destino Push y almacena endpoint y claves únicamente en PostgreSQL. Por defecto el payload no contiene monto, comercio ni cuenta. “Mostrar detalles” es una decisión por instalación y se aplica en el servidor.

Una respuesta `202` de `/api/push/test` significa solamente que el servicio Push aceptó el envío. No demuestra que el iPhone lo mostró o que la persona lo abrió.

## Variables

Copiar `.env.example` a `.env.local` para desarrollo. No confirmar ese archivo ni compartir valores en chats o capturas.

- Cliente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_VAPID_PUBLIC_KEY`.
- Servidor: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `APP_ORIGIN`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.
- `VITE_VAPID_PUBLIC_KEY` y `VAPID_PUBLIC_KEY` contienen la misma clave pública. La clave privada jamás usa prefijo `VITE_`.
- `VAPID_SUBJECT` debe ser un contacto válido, por ejemplo `mailto:responsable@dominio.example`.

Generar el par VAPID en una terminal privada con `npx web-push generate-vapid-keys --json`. Guardar la pública y privada directamente en el gestor de variables del entorno; no pegarlas en el repositorio ni en logs. Rotar las claves exige volver a suscribir cada instalación.

## Base de datos y servidor

Aplicar, primero en una rama o proyecto aislado y en orden:

1. `20260910190000_auth_and_user_data.sql`
2. `20260910190327_phase2_ledger_sync_security.sql`
3. `20260910210000_phase3_web_push.sql`

La tercera migración crea suscripciones, outbox, entregas y limitación distribuida de pruebas. RLS está activa; el navegador solo puede leer su propia metadata y no puede escribir directamente. Las mutaciones pasan por funciones Node autenticadas. El endpoint `/api/push/process` requiere `Authorization: Bearer <CRON_SECRET>` y procesa como máximo 20 eventos con reintentos limitados y espera progresiva. Debe invocarlo un programador de servidor autorizado. No se configuró ninguno en este trabajo: frecuencia, límites y posible costo dependen del plan real y deben verificarse antes de activarlo.

Los movimientos se confirman primero en la transacción de Fase 2. Un trigger diferido crea después un evento estable `movement:<id>:v<version>`; las alertas de presupuesto se deduplican por mes y umbral (80 % y 100 %). Transferencias, aperturas y pagos de tarjeta no generan esas alertas. Los reembolsos reducen el gasto calculado. Un fallo Push no revierte el movimiento.

## Instalar y probar en iPhone

Usar datos ficticios y un origen HTTPS estable autorizado.

1. Abrir el sitio en Safari, usar Compartir → Añadir a pantalla de inicio y abrir PataWallet desde el icono.
2. Iniciar sesión y abrir Ajustes → Notificaciones.
3. Pulsar Activar notificaciones y aceptar la solicitud del sistema. La app nunca la solicita al cargar.
4. Con la app en segundo plano y luego cerrada, pulsar Enviar notificación de prueba.
5. Registrar por separado: solicitud creada, proveedor aceptó, aviso visible y pulsación abrió la ruta correcta.
6. Repetir con permiso denegado, Concentración activo, pantalla bloqueada, detalles desactivados/activados y sesión vencida.
7. Desactivar desde la app; después revocar también desde los ajustes del sistema y volver a abrir para reconciliar.
8. Cerrar sesión e iniciar con otra cuenta. La suscripción anterior debe quedar anulada y nunca reasignarse silenciosamente.

## Botón para instalar desde Ajustes

En Ajustes → Aplicación, el botón de instalación usa `beforeinstallprompt` cuando el navegador lo ofrece y solo abre el aviso nativo después de que la persona lo pulsa. Si el aviso no está disponible, muestra los pasos manuales del dispositivo; en iPhone/iPad explica Compartir → Añadir a pantalla de inicio → Abrir como app web → Añadir. El evento `appinstalled` y el modo independiente actualizan el estado visible.

La web no puede omitir la confirmación del sistema ni pulsar por el usuario los controles de Safari. El navegador puede no ofrecer `beforeinstallprompt` si no se cumplen sus criterios o si ya está instalada; por eso siempre se conserva una guía manual. La comprobación automatizada simula el evento para verificar el flujo, pero no sustituye una instalación real en Android o iPhone.

Si la revocación al servidor falla sin conexión, la suscripción del navegador se elimina localmente y la interfaz lo advierte. Eso no retira una notificación que ya llegó.

## Actualizaciones y modo offline

La app muestra “Nueva versión disponible” y ofrece Actualizar o Más tarde. Nunca aplica una actualización automáticamente. Si hay un formulario modal abierto, Actualizar enfoca el formulario y se aplaza; el caché antiguo puede limpiarse sin tocar IndexedDB ni su cola financiera.

Para comprobar dos builds localmente, servir un primer `dist` por HTTPS, abrirlo e instalar su worker; generar después otro build con un cambio visible, reemplazar el contenido servido sin cambiar el origen, volver a la app y esperar la comprobación del worker. Verificar que el aviso aparece, que Más tarde no recarga y que Actualizar queda aplazado mientras un movimiento está abierto. Esta prueba todavía debe repetirse en el origen autorizado y en iPhone.

La PWA puede abrir el shell ya cargado sin red. La sincronización sigue siendo explícita y ocurre con la app activa o al volver a abrirla; Web Push no se usa como sincronización silenciosa.

## Límites honestos

No se desplegó, no se aplicó la migración remota, no se configuró un programador y no se envió una notificación real desde este equipo. El soporte del navegador se detecta por capacidades y contexto de instalación, no por una promesa basada en versión. La entrega del proveedor y cualquier costo de hosting, correo o programación deben verificarse con los planes contratados. Wallet y Atajos permanecen fuera de esta fase.
