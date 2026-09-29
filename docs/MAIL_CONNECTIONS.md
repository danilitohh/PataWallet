# Conexión de Gmail y Outlook

Estado al 28 de septiembre de 2026: **migraciones de bandeja y conexiones aplicadas en Supabase `gzsuhlkvaiinphlcqelt`; aplicación publicada; Gmail sigue desactivado y no hay buzones conectados**. Las credenciales permanecen sin cambios.

## Alcance y límites de esta entrega

- `/ajustes/correos-bancarios` permite seleccionar bancos, consentir la lectura, autorizar Gmail u Outlook/Hotmail, buscar avisos y desconectar. El permiso del proveedor abarca el buzón, no únicamente los bancos; la aplicación aplica el filtro de remitentes seleccionados. No se solicitan permisos para enviar, modificar o eliminar mensajes.
- Primera búsqueda: últimos siete días. Las siguientes retoman el último intervalo completado con cinco minutos de solapamiento; cada página conserva sus límites de tiempo hasta terminar. Son búsquedas **bajo demanda**, no lectura en segundo plano con la app cerrada.
- Lulo, Bancolombia y Nequi comparten el parser y la bandeja del [reenvío selectivo](BANK_EMAIL_FORWARDING.md). No hace falta Resend para OAuth, pero sí las tablas compartidas. Reenvío y conexión directa pueden coexistir.
- Todos los avisos quedan pendientes. La persona confirma gasto, ingreso, transferencia propia u otro tipo admitido. No se utiliza IA ni se infiere titularidad de cuentas por un nombre. Los correos no alteran saldos al importarlos.
- Una conexión por proveedor y usuario. Cambiar cuenta o bancos requiere desconectar y volver a autorizar. Yahoo queda pendiente de acceso aprobado por su proveedor, no aparece como funcional.
- Hasta 20 mensajes por búsqueda, al menos 30 segundos entre intentos, bloqueo de concurrencia de cinco minutos y 200 avisos nuevos por usuario en 24 horas, compartidos con el reenvío. El proveedor puede imponer otros límites.
- Un mismo Message-ID se deduplica entre entradas. Dos avisos con identificadores distintos no se fusionan automáticamente: la revisión permite vincularlos a un movimiento existente. Si el reenvío cambia el identificador, no se garantiza deduplicación entre canales.
- Un mensaje eliminado durante la lectura, demasiado grande o incompatible puede detener la página. Se conserva el cursor y se muestra error; puede requerir intervención técnica. No se avanza silenciosamente perdiendo avisos.

## Activación del operador (requiere autorización)

1. Elegir el proyecto y origen HTTPS definitivos. Revisar privacidad, tratamiento de datos y los requisitos de los proveedores antes de solicitar permisos públicos. El acceso al correo es independiente del inicio de sesión Google de PataWallet; se recomienda un cliente OAuth dedicado.
2. Las migraciones `supabase/migrations/20260927200000_bank_email_inbox.sql` y `supabase/migrations/20260928010000_mail_connections.sql` ya fueron aplicadas en el proyecto confirmado. `mail_connections` solo es accesible desde servidor; el navegador recibe metadatos seguros, nunca tokens.
3. Guardar en el gestor de secretos del servidor `APP_ORIGIN`, configuración Supabase existente y `MAIL_TOKEN_KEY`: 32 bytes aleatorios criptográficos codificados en base64. Conservar la clave cifrada y restringida; perderla requiere reconectar los buzones. No rotarla sin un plan de recifrado o reconexión. Ninguna de estas claves lleva prefijo `VITE_` ni debe pegarse en el chat.
4. Registrar y configurar Google y/o Microsoft como se indica abajo. Completar `MAIL_GOOGLE_CLIENT_ID`, `MAIL_GOOGLE_CLIENT_SECRET`, `MAIL_MICROSOFT_CLIENT_ID` y `MAIL_MICROSOFT_CLIENT_SECRET`. Mantener ambos indicadores `*_ENABLED=false` hasta preparar un piloto autorizado.
5. El proyecto quedó publicado en Vercel con 10 funciones serverless, dentro del límite Hobby. Las rutas de retorno se reescriben en `vercel.json` hacia `/api/mail`; comprobar que preserven `state` y `code` y no caigan en la SPA. Una búsqueda realiza hasta 22 solicitudes externas secuenciales, cada una con 10 segundos de límite: medir la duración y configurar un límite de función suficiente, siempre inferior al bloqueo de cinco minutos. La compilación Vite no prueba por sí sola las funciones desplegadas.
6. Publicar solo con autorización y activar el proveedor elegido en un entorno de prueba HTTPS. Comprobar consentimiento, cancelación, expiración, reconexión, aislamiento entre dos usuarios, búsqueda real y desconexión. Las cookies `Secure` impiden certificar OAuth mediante un servidor HTTP local sin más configuración.

### Google / Gmail

Crear una aplicación web OAuth en Google Cloud, habilitar Gmail API y configurar la pantalla de consentimiento con los datos reales del responsable. Registrar esta URI exacta, sustituyendo el origen por `APP_ORIGIN`:

```text
https://<origen-real>/api/mail/callback/gmail
```

Solicitar `https://www.googleapis.com/auth/gmail.readonly`. El código pide acceso offline, consentimiento y PKCE S256, canjea el código en servidor y obtiene la identidad desde el perfil de Gmail. Usar usuarios de prueba durante el piloto; probar también la caducidad de permisos de una aplicación en pruebas. Consultar la [guía OAuth de servidor](https://developers.google.com/identity/protocols/oauth2/web-server).

`gmail.readonly` es un permiso restringido. Antes de lanzamiento público se deben resolver la verificación correspondiente y la evaluación de seguridad que resulte aplicable al tratamiento en servidor; no se dan por aprobadas ni gratuitas. Fuentes: [permisos Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes), [verificación de permisos restringidos](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).

### Microsoft / Outlook y Hotmail

Registrar una aplicación confidencial de plataforma **Web**, no SPA, en Microsoft Entra. Para el endpoint `common` usado aquí, seleccionar cuentas organizacionales y personales. Configurar permisos delegados `Mail.Read`, `User.Read` y `offline_access`, sin permisos de aplicación sobre todos los buzones. Las organizaciones pueden exigir consentimiento administrativo. Registrar:

```text
https://<origen-real>/api/mail/callback/outlook
```

La URI registrada no lleva parámetros: las cuentas personales de Microsoft no los admiten. La reescritura interna añade la operación/proveedor sin cambiar la URI registrada. Fuentes: [restricciones de retorno](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url), [flujo de código con PKCE](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow), [permiso Mail.Read](https://learn.microsoft.com/en-us/graph/permissions-reference#mailread).

### Detección automática y notificaciones

La conexión de Gmail puede recibir un aviso de Gmail mediante Google Cloud Pub/Sub. El aviso no contiene el correo: PataWallet usa el refresh token cifrado del usuario para ejecutar la búsqueda incremental existente, extraer monto, banco, comercio y fecha, y guardar un candidato pendiente. La función no crea asientos ni modifica saldos.

Para activar esta parte en el servidor:

1. En el mismo proyecto de Google Cloud que tiene Gmail API, crea un tema Pub/Sub y concede al agente de servicio de Gmail permiso para publicar en él.
2. Crea una suscripción push al tema con esta URL: `https://pata-wallet.vercel.app/api/mail?operation=gmail-push`.
3. Configura autenticación OIDC en la suscripción con una cuenta de servicio dedicada. La audiencia debe coincidir exactamente con `MAIL_GOOGLE_PUSH_AUDIENCE`; el correo de esa cuenta va en `MAIL_GOOGLE_PUSH_SERVICE_ACCOUNT`.
4. Guarda `MAIL_GOOGLE_PUBSUB_TOPIC` con formato `projects/<proyecto>/topics/<tema>`, aplica la migración `20260928120000_mail_automation_push.sql` y despliega.
5. En PataWallet, activa las notificaciones y la preferencia «Movimientos por revisar». En iPhone, instala la PWA desde Safari para recibir Web Push.

El cron diario `/api/mail/renew-watches` renueva la vigilancia de Gmail antes de que expire. Gmail recomienda renovar al menos cada siete días y la implementación usa una renovación diaria. Si el push falla, la búsqueda manual sigue siendo el respaldo. El `historyId` se conserva para la vigilancia; la primera versión reutiliza la búsqueda incremental acotada para mantener un solo parser y límites conocidos.

### Yahoo

No se implementó ni se anunció conexión activa. Resolver primero la autorización para acceso al correo y sus condiciones; no sustituirla solicitando la contraseña personal. Consultar [acceso para desarrolladores](https://senders.yahooinc.com/developer/developer-access/). El reenvío sigue como alternativa cuando la cuenta/proveedor lo permita.

## Seguridad y privacidad

- Estado de un uso con expiración, cookie HttpOnly/Secure/SameSite=Lax y PKCE enlazan el intento con su navegador y propietario. El destino se obtiene de `APP_ORIGIN`, nunca de Host ni de un parámetro libre. La identidad del buzón se consulta al proveedor; no se acepta un `id_token` sin verificar.
- Solo se persiste el refresh token, cifrado con AES-256-GCM y datos autenticados de propietario/proveedor/generación. El access token vive durante la solicitud. La generación y bloqueo impiden que un callback o búsqueda antigua revivan una conexión eliminada.
- Se siguen únicamente endpoints fijos; `@odata.nextLink` se restringe a HTTPS, host y ruta Graph autorizados antes de enviar Bearer. Respuestas y MIME tienen límites. No se descargan adjuntos ni cargan imágenes/enlaces del correo.
- Los avisos son datos no confiables. El remitente visible no demuestra autenticidad bancaria. La lectura filtra por él, pero no autoriza movimientos ni ejecuta instrucciones del mensaje.
- PataWallet guarda candidatos extraídos y trazabilidad, no cuerpos completos ni adjuntos. El cuerpo sí se procesa temporalmente en servidor. No se envía a la IA. Revisar retención de candidatos, respaldos, logs y accesos antes de lanzamiento público.
- No registrar cuerpos, códigos, cookies, tokens ni parámetros de callback en observabilidad. Configurar redacción de query strings en la infraestructura; el código no los imprime. `no-store` y `no-referrer` acompañan el callback.
- Desconectar borra credenciales activas locales e invalida búsquedas pendientes, conservando movimientos. **No revoca remotamente el consentimiento**: la interfaz pide retirarlo también en la cuenta Google/Microsoft. Una solicitud externa ya iniciada puede terminar; su guardado queda invalidado.
- Quedan pendientes políticas de privacidad/términos adaptadas, responsable y jurisdicciones, retención/borrado, acuerdos con proveedores y revisión jurídica. La solicitud de consentimiento técnica no sustituye estos requisitos. No se certifica cumplimiento legal.

## Pruebas y operación

```sh
npm run lint
npm test
npm run build
npx playwright test tests/e2e/bank-email.spec.js --workers=2
node scripts/test-bank-email-db.mjs
```

Pruebas de transporte con datos sintéticos, cifrado/PKCE, callback, límites de proveedores, rotación y revocación; PostgreSQL 17 real efímero verifica RLS, estado de un uso, concurrencia, rollback de páginas, deduplicación y ausencia de efectos financieros al recibir. El script Docker no abre puertos, usa volúmenes ni toca Supabase remoto; elimina su contenedor al terminar.

Playwright usa componentes reales y servicios simulados en 390×844, 375×812 y 1440×900. No sustituye prueba de OAuth real, sesión de producción, iPhone físico o lectura offline. Entorno usado: Node 26.7.0; falta repetir con el Node 22.x declarado por el proyecto. Resultados finales en [estado de implementación](IMPLEMENTATION_STATUS.md).

Para detener la lectura, desactivar `MAIL_GOOGLE_ENABLED` y/o `MAIL_MICROSOFT_ENABLED`; la desconexión local sigue disponible aunque el proveedor esté desactivado. Retirar credenciales y consentimiento cuando corresponda. No borrar tablas ni movimientos como rollback automático. Revisar políticas de copias de seguridad para el ciclo completo de borrado.

La sincronización automática requiere configurar Pub/Sub, Web Push, cron y la migración indicados arriba; no se considera activa solo por conectar Gmail. IA y conciliación automática siguen siendo fases posteriores.
