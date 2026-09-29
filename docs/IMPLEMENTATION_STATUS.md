# Estado de implementación

## Corrección de Web Push · 28 de septiembre

- Corregido el estado falso «Falta la clave pública VAPID»: el cliente obtiene la clave pública desde `/api/push/config` y la clave privada continúa solo en Vercel. No se rotaron claves, suscripciones ni datos financieros.
- Publicado en `main`; falta probar la solicitud de permiso y el aviso visible en un dispositivo instalado.

## Guía de notificaciones en iPhone · 29 de septiembre

- La explicación para añadir PataWallet a Inicio solo aparece cuando Safari en iPhone detecta que la web aún no está instalada. En equipos compatibles ya instalados, se oculta.
- Se explica el motivo, los tres pasos para instalar y luego conceder permiso, y se enlaza la guía oficial actual de Apple. Se quitó una nota interna de pruebas que no ayudaba al usuario.
- Verificado: lint, build, 181 pruebas unitarias y 4 E2E en 390×844 y 375×812. No se hizo prueba física en iPhone.

Actualizado: 2026-09-29. Fase actual: **ingesta automática Gmail configurada en infraestructura; falta verificar un correo nuevo de banco de extremo a extremo**.

## Diagnóstico de entregas automáticas Gmail · 29 de septiembre

- Vercel registra solicitudes POST de `APIs-Google` a `/api/mail?operation=gmail-push`, con `503` repetidos; la sincronización manual a `/api/bank-email` responde `200`. Las entregas llegan a producción pero el handler falla antes de completar la sincronización.
- El log seguro localizó la falla en `notification_parse`: el `historyId` real llegó como número, aunque el parser solo aceptaba texto. El parser ahora normaliza ambas formas y decodifica Base64URL; los registros técnicos omiten correo, token, cuerpo y texto de error.
- Regresión local con `historyId` numérico y textual en un sobre Base64URL: `tests/api/mail.test.js`. Publicado en `main` (`3941540`, diagnóstico; `d057ea3`, corrección) y despliegue de producción Ready. Los logs posteriores registran una entrega `200` y una entrega concurrente `202`; el handler ya pasó la etapa de parseo. La pantalla de correo muestra detección automática activa y un aviso pendiente. Falta confirmar visualmente la notificación nativa en el iPhone; no se infiere que el aviso pendiente haya sido creado por este reintento.

## Asociación automática de compras por Atajos · 29 de septiembre

- Quitados los formularios manuales para crear mapeos de tarjeta/cuenta y reglas de categoría. Los mapeos existentes se conservan y pueden eliminarse desde la lista.
- Cuando un alias de tarjeta sea nuevo, al revisar el primer evento el usuario elige la cuenta y puede pedir que se recuerde para próximas compras.
- Para comercios nuevos, Gemini y un modelo ligero de OpenAI revisan en paralelo solo el nombre del comercio y los nombres de categorías de gasto del usuario. El tercer modelo de OpenAI solo se llama si discrepan; la regla exacta se guarda solo si hay mayoría con confianza alta. Un desacuerdo final, fallo o timeout conserva el flujo de revisión y `Sin categoría`.
- `OPENAI_API_KEY`, `GEMINI_API_KEY` y los modelos son variables solo de servidor. Las claves pegadas en el chat se consideran expuestas y deben revocarse; producción no se considera habilitada hasta agregar claves nuevas a Vercel. No se hicieron llamadas reales a proveedores ni se enviaron movimientos reales.
- Verificado localmente: lint, build y 178 pruebas unitarias/API. Falta probar clasificación con una clave rotada y un comercio de prueba antes de confirmar el comportamiento en producción.
- Ahorro de tokens: el catálogo de categorías viaja solo en el esquema; Gemini 2.5 Flash usa `thinkingBudget: 0`, GPT-5 usa esfuerzo `minimal` solo en el desempate y Ollama tiene tope de 320 tokens de salida. El contexto del asistente ya no duplica los importes como centavos y formato legible; las cifras formateadas se conservan. Verificado con pruebas simuladas; no se hicieron llamadas reales ni medición de facturación.

## Bandeja de notificaciones · 29 de septiembre

- La campana de la cabecera abre `/notificaciones`, una bandeja centrada en avisos bancarios pendientes; ya no envía al formulario largo de conexión Gmail/reenvío. La revisión reutiliza el flujo actual de Registrar, Ya existe o Descartar; los saldos cambian solo después de confirmar.
- Refinada con la opción A: lista más compacta, contador y avisos expandibles; al abrir uno se puede elegir la decisión y completar el registro. El estado vacío explica qué aparecerá en la bandeja y el estado de demo aclara que requiere una cuenta real conectada.
- `/ajustes/correos-bancarios` conserva la configuración del proveedor. La ruta de bandeja también está permitida para navegación segura desde la PWA.
- Verificado: lint, build, 181 pruebas unitarias y 6 pruebas E2E de la campana y expansión del aviso en 375×812, 390×844 y 1440×900. Falta la verificación del flujo con correo bancario real descrita arriba.

## Tutorial de automatización en video · 29 de septiembre

- Corregido el fallback de navegación del service worker para que no sustituya recursos de `/assets/` por el HTML de la SPA; el MP4 ya abre en el reproductor del navegador.
- Regresión verificada con el service worker real en preview de producción: la pestaña de tutorial carga con tipo `video/mp4`. `npm run test:pwa -- --workers=1`, lint, build y 177 pruebas unitarias pasaron. Pendiente de prueba manual en iPhone.

## Android TWA / APK · 28 de septiembre

- Añadido un wrapper Android TWA en `android/` que abre la PWA existente con `com.patawallet.app`, modo standalone, iconos actuales y notificaciones delegadas al origen web. No modifica la lógica web, financiera, de autenticación ni de correo.
- `npm run android:build` genera una APK firmada localmente y un AAB. La clave queda ignorada por Git; debe respaldarse antes de distribuir actualizaciones.
- Añadido `public/.well-known/assetlinks.json` con la huella de la clave de distribución directa actual. Si Google Play firma la aplicación con otra clave, habrá que agregar también esa huella antes de publicar el AAB.
- Ajustes muestra `Descargar APK` junto a la instalación PWA en navegadores no iOS; la descarga apunta a `public/downloads/patawallet-android.apk` y Android aún requiere confirmar manualmente la instalación.
- Verificado: compilación Android TWA completada; `npm run lint`, `npm test` (175 pruebas), `npm run build` y 5 pruebas E2E dirigidas de instalación pasaron. Falta probar en un dispositivo Android real y no se desplegó la asociación de dominio.
- No incluye un lector nativo de notificaciones bancarias ni acceso al historial de Google Pay; ambas funciones siguen fuera de esta fase.

## Avisos automáticos de correo · 28 de septiembre

- Gmail Pub/Sub dispara la búsqueda incremental, los candidatos quedan pendientes sin alterar saldos y `push_outbox` encola la notificación «Tienes un movimiento por revisar» hacia `/ajustes/correos-bancarios`. El reenvío selectivo usa el mismo aviso.
- Configurados el tema y la suscripción push de Pub/Sub con OIDC y una cuenta de servicio dedicada de privilegio mínimo. Vercel Production tiene `MAIL_GOOGLE_PUBSUB_TOPIC`, `MAIL_GOOGLE_PUSH_AUDIENCE` y `MAIL_GOOGLE_PUSH_SERVICE_ACCOUNT`; el despliegue Ready `B7mspmx324ETDPSVqrwdrYFwhGEV` usa `main` (`3333b30`).
- Las columnas, el índice y las funciones de la migración `20260928120000_mail_automation_push.sql` ya estaban presentes en Supabase y los permisos limitan la ejecución a `service_role`; no se ejecutó SQL duplicado. La versión no figuraba en `schema_migrations`.
- Falta comprobar un correo nuevo Bancolombia/Lulo/Nequi de extremo a extremo y la notificación en un dispositivo. La primera sincronización puede iniciar Gmail Watch si no existe una vigilancia activa; la búsqueda manual sigue disponible. No se simuló un correo real ni se probaron push/eventos en vivo.

## Guía visual de automatización de Wallet · 28 de septiembre

- La pantalla `/ajustes/automatizacion` muestra en el paso de automatización una referencia visual proporcionada por el responsable, con texto alternativo, dimensiones explícitas, carga diferida y una aclaración de que cada usuario debe seleccionar sus propias tarjetas.
- Añadido el video `tutorial-patawallet-paso-a-paso.mp4` (7,9 MB) con un enlace que lo abre en el reproductor del navegador, y una guía accesible con los siete pasos y el mapeo `amount` → Cantidad, `card_alias` → Tarjeta o pase y `merchant_name` → Comercio. El video no se precarga en la PWA; la reproducción offline y en un iPhone físico no se probaron.
- No cambia el atajo compartido, el contrato de eventos ni la selección local de tarjetas de Wallet. Verificado con `npm run lint`, `npm run build` y `npm run test:e2e -- tests/e2e/shortcuts-visual.spec.js` (4 pruebas pasaron, 2 se omitieron según la configuración del proyecto); la prueba nocturna móvil enfocada pasó 1/1. El servidor local entrega el MP4 con tipo `video/mp4`; no se probó en un iPhone físico.

## Conexión de correo Gmail y Outlook · 28 de septiembre

- Primera entrega local en `/ajustes/correos-bancarios`: selección de bancos, consentimiento explícito, autorización OAuth, estado real del proveedor, búsqueda bajo demanda y desconexión. Respeta el diseño cristal existente y comparte parser/bandeja con el reenvío, sin exigir Resend para leer por OAuth. Yahoo se presenta como pendiente, no disponible.
- Inicio de sesión de PataWallet separado del permiso del buzón. Gmail readonly y Microsoft Graph Mail.Read/User.Read/offline_access; el permiso abarca el buzón, mientras la aplicación filtra Lulo/Bancolombia/Nequi. No se envían/borran correos, no se descargan adjuntos ni se envía contenido a IA.
- Estado de un uso, cookie HttpOnly/Secure, PKCE S256, validación de identidad con el proveedor, refresh token cifrado AES-GCM vinculado a usuario/proveedor/generación y ninguna lectura de credenciales desde cliente. Rutas de retorno sin parámetros, requeridas por Outlook personal, con reescrituras explícitas en Vercel.
- Migraciones aditivas `20260927200000_bank_email_inbox.sql` y `20260928010000_mail_connections.sql` aplicadas en Supabase `gzsuhlkvaiinphlcqelt`; funciones exclusivas de servidor, RLS y permisos verificados. La consulta confirmó 0 bandejas, 0 avisos, 0 conexiones, y preservó 28 cuentas, 37 movimientos y 36 asientos. Gmail sigue desactivado y no se conectó un buzón.
- Publicada en Vercel el 28 de septiembre: `pata-wallet.vercel.app` quedó aliasado al despliegue Ready `j6ua2mff9-danilos-projects-5ba356bd.vercel.app`. Para respetar el límite Hobby de 12 funciones, las rutas de Atajos se consolidaron en `api/shortcuts.js` con rewrites equivalentes; quedaron 10 funciones serverless. Verificado: página pública HTTP 200 y ruta protegida de estado HTTP 401 con `Cache-Control: no-store`.
- Siete días iniciales; siguientes intervalos desde la última búsqueda completa con solapamiento de cinco minutos. Veinte mensajes por página, 30 segundos entre intentos y 200 avisos/día compartidos con reenvío. Message-ID evita duplicados entre canales cuando se conserva. Ningún aviso genera asientos sin revisión; una transferencia propia no se clasifica automáticamente como gasto.
- Habilidades api-connector-builder, database-migrations y frontend-patterns orientaron reutilizar contratos, parser, revisión financiera y controles nativos. Sin dependencias nuevas en esta fase; cifrado, PKCE y HTTP usan Node/estándares existentes. Se conserva la implementación local de reenvío anterior.
- Verificado: lint, build y `git diff --check`; **174 pruebas unitarias/API en 34 archivos**; **12 pruebas Playwright** dirigidas en 390×844, 375×812 y 1440×900; PostgreSQL 17 real efímero con ambas migraciones. Incluye consentimiento, configuración pendiente, error recuperable, desconexión, datos privados, deduplicación, callback de un uso, bloqueo, rollback y aislamiento de propietario. No se ejecutó toda la suite histórica de navegador. Capturas de datos sintéticos en `output/playwright/mail-connections-*.png` y `bank-email-*.png`.
- **Publicado, pero no conectado a buzones reales**. Faltan revisiones de proveedores, políticas/retención, flujo real de ambos proveedores e iPhone físico. Entorno local Node 26.7.0 y build remoto correcto; el proyecto declara Node 22.x, pendiente repetir con ese runtime. Gmail permanece desactivado y no se modificaron registros financieros remotos.
- Simplificación anunciada: botón «Buscar correos», no sincronización con la app cerrada. IA, conciliación autónoma y Yahoo son fases posteriores. Activación, seguridad, límites, fuentes oficiales y recuperación en `docs/MAIL_CONNECTIONS.md`; variables de servidor en `.env.example`.

## Correos bancarios por reenvío selectivo · 27 de septiembre

- El usuario eligió reenviar únicamente correos bancarios, sin OAuth ni acceso general a Gmail. Implementados receptor Resend firmado, dirección privada por usuario con consentimiento/revocación y bandeja `/ajustes/correos-bancarios`, accesible desde Ajustes con el diseño cristal existente.
- Extracción determinista de los formatos compartidos de Lulo, Bancolombia y Nequi, con importes enteros y hora de Colombia. Todos quedan por revisar: entrada/salida no se confunde con ingreso/gasto. Nequi → Lulo puede registrarse como transferencia entre cuentas propias; se puede vincular el segundo aviso a un movimiento existente sin duplicarlo.
- SQL aditivo con RLS, ingreso exclusivo del servidor y resolución atómica que reutiliza el registro financiero existente. Huella por Message-ID y proveedor, confirmación idempotente, detección orientativa de movimientos similares y límite de 200 eventos/día por usuario. No se autentica el banco por nombre del remitente ni se confía en el cuerpo para elegir usuario.
- API usa destinatario SMTP `received_for` para los reenvíos, valida bytes originales de Svix antes de consultar y descarga solo texto/HTML limitado del proveedor. No sigue enlaces ni descarga adjuntos. PataWallet guarda datos extraídos, no el cuerpo completo; el proveedor sí recibe el mensaje completo. No se envían correos a IA.
- Las habilidades api-connector-builder y database-migrations orientaron la reutilización de contratos, validaciones y asientos existentes, aislamiento por propietario y migración reversible sin borrar datos. frontend-patterns orientó formularios nativos y componentes compartidos; no se incorporó otra biblioteca de interfaz. Añadido únicamente `html-to-text` 10.0.1 (MIT) para conversión HTML en servidor.
- Verificado: 162 pruebas unitarias/API (33 archivos), lint y build; 6 pruebas Playwright dirigidas en 390×844, 375×812 y 1440×900. Cubren consentimiento, datos sintéticos, confirmación, vacío, error de conexión simulado, montos ocultos, movimiento reducido y navegación. Capturas revisadas en `output/playwright/bank-email-*.png`. No se ejecutó toda la suite histórica de navegador ni se probó offline real en esta ronda.
- PostgreSQL 17 real en Docker efímero: migraciones base relevantes + migración nueva aplicadas; recepción sin efectos financieros, deduplicación, RLS entre dos usuarios, rechazo de cuenta ajena, transferencia con dos asientos compensados, reintento idempotente, vinculación y revocación correctos. Contenedor de prueba eliminado al terminar, sin volúmenes ni datos de usuario.
- Las primeras pruebas corrigieron una duplicación de contexto Router en el montaje aislado y una navegación prematura antes de finalizar la creación de demo. La repetición final pasó completa. Entorno local Node 26.7.0; el proyecto declara 22.x: falta repetir en el runtime de producción.
- **No publicado ni activado**: no se creó cuenta/dominio/servicio de pago, no se cambiaron filtros de Gmail, secretos remotos ni base de producción. Faltan configuración Resend, autorización de migración/despliegue, comprobación de capacidad del plan Vercel (14 archivos API), correo real extremo a extremo, iPhone físico y revisión de privacidad/retención antes de lanzamiento público.
- Simplificación explícita: recepción automática, registro confirmado por la persona; no hay reglas aprendidas, categorización por IA, conciliación automática ni importación de correos antiguos. Guía operativa, límites, fuentes y comandos en `docs/BANK_EMAIL_FORWARDING.md`; variables de servidor en `.env.example`.

## Enlace del atajo corregido en producción · 27 de septiembre

- Con autorización explícita, actualizada únicamente `SHORTCUT_ICLOUD_URL` en Production de Vercel a `https://www.icloud.com/shortcuts/a804ef275939493cafca512894b61c8c`. Se conservan nombre y versión 1.0.0 para no invalidar la plantilla ni las vinculaciones existentes.
- Redesplegada la misma fuente de producción `2b634b3`, sin cambios de código de aplicación, SQL ni datos financieros. Vercel confirmó Ready en `E6AnEModX4DrPTF8rwyfwTD5G7Qr`, asignado a `pata-wallet.vercel.app`; el despliegue anterior `BqYVpnwUPKb8HRZYDbgKDha8kFkM` queda como referencia de recuperación.
- Verificado en la app autenticada tras recargar: «Añadir atajo» apunta exactamente al nuevo enlace. iCloud muestra «PataWallet - Registrar compra». Lint y 7 pruebas del contrato de Atajos correctas; la prueba comprueba que se entrega la URL configurada. Evidencia: `output/playwright/serial-check/shortcut-release.png`.
- La habilidad deployment-patterns orientó la comprobación de entorno, conservación de la versión anterior y verificación posterior del enlace real. El responsable informó que la vinculación corregida funcionó en su iPhone; siguen pendientes importación en un segundo dispositivo y prueba de una compra habitual. No se certificó la ejecución completa de la plantilla ni se modificó `SHORTCUT_MIN_IOS_TESTED`.

## Inicio único y detalle financiero en cristal · 27 de septiembre

- Retirado «Otras vistas de Inicio». Inicio utiliza siempre la vista principal, incluso con una preferencia antigua de Quincena o Actividad, sin reescribir ajustes ni registros. El selector de mes permanece en el resumen.
- «Presupuesto y detalle de mi dinero» conserva su desplegable nativo y adopta cabecera con icono circular, superficie de cristal, tarjetas redondeadas y acentos lavanda. Presupuesto, ingresos, margen, metas, compras y cuentas mantienen sus fórmulas, datos y enlaces existentes.
- Verificado: lint, build, 4 pruebas unitarias de Dashboard y 9 pruebas de navegador (detalle, accesos a movimientos y guía vacía/offline) en 390×844, 375×812 y 1440×900. Tras el ajuste final de espaciado, las tres pruebas de detalle volvieron a pasar. Cubren preferencias antiguas, teclado, privacidad, navegación, ausencia de desbordamiento y registros financieros intactos.
- Capturas revisadas en `output/playwright/serial-check/dashboard-details-*.png`. Sin cambios de backend, dominio, persistencia ni dependencias. No se ejecutó despliegue manual; quedan pendientes comprobación de producción e iPhone físico.

## Cristal lavanda · pantallas y módulos · 27 de septiembre

- Aplicado el lenguaje de las 14 vistas aprobadas: fondo azul noche, superficies orgánicas lavanda, acciones circulares con profundidad, iconos Lucide y paneles de cristal. `GlassHero` comparte únicamente la superficie SVG decorativa; los importes, formularios y navegación siguen siendo HTML accesible. CSS por módulo, sin nuevas dependencias ni imágenes de interfaz incrustadas.
- Incluye Inicio, Actividad, Metas, Presupuesto, Dinero, Deudas, Gastos fijos, Pagos, Parejas, Ajustes, registro de movimientos, Atajos, Notificaciones y Asistente. Móvil conserva cinco destinos y escritorio su barra lateral. Las acciones Compra/Ingreso/Pago de deuda abren el formulario existente; Registrar pago preselecciona la deuda elegida sin guardar nada.
- No se modificaron backend, API, SQL, autenticación, sincronización, persistencia, service worker ni funciones de dominio. Los nuevos resúmenes son de lectura: avance de deuda reutiliza la fórmula de Parejas con abonos existentes; el presupuesto muestra el límite global real y distribución de compras por categoría, no límites inexistentes. Se mantienen confirmación de pagos, permisos de compartir, validación, borradores, errores, calendario, paginación y montos ocultos.
- Las maquetas no sustituyen estados reales: demo, vacío, configuración pendiente y restricciones de IA/Push/Atajos continúan visibles. La confirmación de pago conserva cuenta/categoría requeridas. La checklist conserva sus dos vencimientos y sus controles existentes, sin cambiar las reglas financieras para imitar datos ilustrativos.
- Verificado: lint, build, 31 archivos / 129 pruebas unitarias y API; prueba PWA offline 1/1. La ronda final de navegador pasó 33/33 en 390×844, 375×812 y 1440×900: todas las rutas, accesos directos, pagos, compras, ingresos, modales, pareja simulada, guía, privacidad, borradores y errores. Actividad e integraciones en escritorio: 3 correctas y 1 variante no aplicable omitida. Las pruebas de navegación comparan registros financieros antes/después. No se afirma una ejecución de toda la suite histórica.
- La primera ejecución de navegador detectó un selector antiguo de cabecera de gastos fijos, actualizado a la nueva superficie, y tiempos agotados en secuencias de diálogos WebKit. Los mismos flujos pasaron con menor concurrencia y 60 s de presupuesto por escenario, sin forzar clics ni eliminar comprobaciones.
- Evidencia: `output/playwright/calm-*.png`, `couples-serena-*.png` y `fixed-expenses-*.png`, solo con datos de ejemplo o servicios simulados. Referencias aprobadas externas al código: imágenes `exec-7d3c5cc0`, `exec-abedbd02`, `exec-eb3cc163`, `exec-13aa4ea7`, `exec-da5a2603` y `exec-fc270d0c` generadas en este chat.
- Pendiente: iPhone físico/VoiceOver y comprobación remota tras publicación. Este trabajo no certifica servicios externos ni modifica los bloqueos históricos documentados abajo.
- Comprobación adicional de cierre con animaciones activas: 3/3 en Chromium y WebKit emulado; se conserva como `glass-actions.spec.js`. En el navegador integrado la interacción automatizada no confirmó el cierre, discrepancia pendiente de comprobación manual. Dos recapturas adicionales encontraron bloqueo de archivo `UNKNOWN` al sobrescribir capturas de Actividad en Windows; no son fallos de aserciones funcionales. La repetición móvil pasó y la ronda original de 33 pruebas había pasado completa.

## Calma + editorial · presentación de las seis secciones · 26 de septiembre

- Aplicado el lenguaje visual aprobado en Inicio, Actividad, Plan, Cuentas, Parejas y Ajustes: azul noche, lavanda/rosa, superficies abiertas, filas con separadores, cifras prominentes, iconos coherentes y botones sin profundidad 3D. La habilidad design-system orientó la coherencia compartida; browser-qa, la comprobación visual y funcional. No se añadieron dependencias.
- Navegación inferior de cinco destinos en móvil y barra lateral en escritorio. Registrar movimiento queda como acción explícita en Inicio/Actividad; el asistente sigue disponible en Ajustes. Cuentas tiene rutas `/cuentas`, `/cuentas/deudas`, `/cuentas/gastos-fijos` y `/cuentas/pagos`; Plan conserva metas y presupuesto en `/plan` y `/plan/presupuesto`. Las rutas desconocidas conservan la página 404.
- Los formularios, permisos, validaciones, callbacks financieros y persistencia se reutilizan. No se modificaron backend, API, SQL, servicios, autenticación, sincronización, service worker ni funciones de dominio. Los nuevos resúmenes de lectura reutilizan los vencimientos existentes y suman saldos compartidos ya recibidos mediante el helper entero existente; no generan movimientos ni alteran saldos.
- Se conservan ingresos recibidos, calendario de pago, compras previstas, otras vistas de Inicio, exportación/restauración, errores de sincronización y recorridos por tema bajo opciones desplegables. La checklist y los editores conservan confirmación, paginación, borradores, privacidad y recuperación. La guía apunta a controles reales del nuevo diseño.
- Las imágenes son referencia, no capturas incrustadas: importes, nombres, fechas, porcentajes y estados dependen de registros reales. No se inventaron perfil editable, páginas legales, integración bancaria ni personas para reproducir elementos ilustrativos. La composición se adapta a cada ancho y al número real de cuentas/metas; no se emula la barra de estado de iOS.
- Verificado: lint, build y 129 pruebas unitarias/API. La segunda suite completa de navegador dio 132 correctas, 2 fallidas y 4 variantes no aplicables omitidas. Los dos fallos eran una carrera del test al abrir/cerrar el grupo de recorridos antes de restaurar el foco. Corregida la espera, la repetición dirigida pasó 6/6 (dos veces en cada tamaño): los 134 escenarios aplicables quedaron validados, sin afirmar una tercera pasada completa. La primera pasada también permitió corregir aperturas/cierres redundantes y navegación prematura en los tests, sin retirar comprobaciones de dinero ni cambiar handlers para hacerlos pasar.
- Evidencia visual local: `output/playwright/calm-*.png`, `couples-serena-*.png`, `fixed-expenses-*.png` y `guide-*.png`. Las comprobaciones comparan registros antes/después de navegar, cubren 390×844, 375×812 y 1440×900 y usan únicamente demo o servicios simulados, nunca escrituras financieras remotas.
- Pendiente: verificación en iPhone físico/VoiceOver, sesión remota y comprobación posterior a publicación. No se realizó despliegue manual ni modificación de servicios externos en esta tarea.

## Parejas · Serena · 26 de septiembre

- Aplicada la propuesta 1 aprobada: cabecera compacta con integrantes, deudas y dinero en grupos separados, iconos propios y acceso resumido a solicitudes. En escritorio los grupos aprovechan dos columnas. No se aplicó la propuesta 2 «En equipo».
- «Qué compartimos», «Proponer un cambio» y «Solicitudes» reutilizan SimpleDialog con foco, fondo inerte y cierre por teclado. El patrón de composición de la habilidad frontend-patterns permitió separar el espacio activo de invitaciones/carga sin agregar dependencias ni duplicar controles. Formularios y explicación del porcentaje dejan de ocupar la vista principal permanentemente.
- Se conservan el cálculo de avance, la privacidad de montos, las cuentas propias no archivadas y la aprobación por la otra persona. La revisión muestra el importe propuesto respetando montos ocultos. Se aclara que un ajuste no es un pago de deuda. No se cambió la API, el esquema ni información financiera remota.
- Recargar el resumen no desmonta los formularios. Errores conservan borradores; selección se inicializa desde las cuentas compartidas al abrir; tras un guardado parcial se refresca el estado remoto. Cerrar un diálogo no cancela una petición pendiente ni habilita envíos duplicados.
- Verificado: lint, build, 129 pruebas unitarias/API y seis pruebas Playwright de componentes reales con datos/servicio locales simulados en 390×844, 375×812 y 1440×900. Cubren separación de grupos, porcentajes, cuentas propias, crear propuestas de saldo/cuota, aprobar/rechazar, errores recuperables, foco de Safari emulado, cierre, vacío, montos ocultos y movimiento reducido. Capturas revisadas: `output/playwright/couples-serena-*.png`.
- Las primeras ejecuciones corrigieron la carga duplicada de React en el montaje de pruebas, su estructura de escritorio y el cierre por Escape tras revisiones en WebKit. La ejecución final pasó 6/6. Pendiente: sesión remota autenticada, offline real, VoiceOver e iPhone físico; los dobles de servicio no certifican permisos de producción.

## Avance de deuda en Parejas · 26 de septiembre

- Cada deuda en «Lo que ven juntos» muestra una barra nativa accesible, porcentaje, abonos registrados y saldo pendiente. Los activos no muestran avance; ocultar montos oculta también porcentaje y barra. Sin datos suficientes se muestra «Avance no disponible», nunca un porcentaje inventado.
- Fórmula: abonos registrados / (abonos registrados + saldo pendiente positivo). El saldo a favor no eleva el porcentaje sobre 100; mientras quede deuda no se redondea a 100. No representa el capital original ni pagos anteriores al registro. Compras nuevas cambian el denominador; ajustes y devoluciones no se suman como abonos.
- El servidor calcula abonos desde asientos de `card_payment`, excluye anulados y consulta únicamente cuentas compartidas del propietario autorizado. Pagina el libro para no truncar a 1.000 asientos; devuelve totales, no detalles de transacciones. Sin migración ni escritura de datos financieros.
- Verificado: 129 pruebas unitarias/API, incluyendo pagos, devoluciones, ajustes, anulaciones, límites, paginación y filtros de propietario/cuenta. Tres pruebas de navegador del componente real con fixtures locales en 390×844, 375×812 y 1440×900; capturas revisadas en `output/playwright/couple-progress-*.png`. La habilidad frontend-a11y orientó etiqueta de progreso, semántica nativa y privacidad visual.
- Pendiente: comprobación de la consulta con una sesión remota autenticada e iPhone físico. La consulta de esquema por el conector Supabase fue denegada por permisos; se comprobó la relación contra la migración versionada y el contrato de consulta con dobles de prueba, sin intentar modificar permisos.

## Gastos fijos compactos · 26 de septiembre

- Se reemplazaron los formularios repetidos por una lista de cinco compromisos por página, con nombre, monto, frecuencia y buscador. Agregar o tocar una fila abre un único editor que guarda solo ese gasto, manteniendo el historial de pagos y las categorías existentes.
- Eliminar requiere confirmación explícita y conserva los movimientos registrados; cancelar no persiste el borrador. Un fallo de guardado conserva los campos y ofrece reintento. Se mantiene el límite existente de 50 gastos, sin migraciones ni dependencias nuevas.
- La checklist muestra seis vencimientos por página, con totales calculados sobre todos los pendientes, y conserva la confirmación de pago, los atrasos y el vencimiento actual/siguiente por gasto. La paginación no modifica calendarios, saldos ni cálculos financieros.
- Se reutilizó SimpleDialog y la habilidad frontend-a11y para fondo inerte, campos etiquetados, errores anunciados y retorno del foco, incluyendo botones tocados en Safari. Se respetan montos ocultos y movimiento reducido.
- Verificado: lint, build, 125 pruebas unitarias y 18 E2E dirigidos en 390×844, 375×812 y 1440×900: edición de 30 gastos, búsqueda, paginación, cancelación, eliminación, historial, recuperación de error, offline, privacidad, pago recurrente y recorrido guiado. Se revisaron las capturas locales: `output/playwright/fixed-expenses-*.png`. La primera prueba detectó el retorno del foco en Safari y se corrigió; los flujos largos tienen 60 segundos de margen para WebKit, sin desactivar aserciones.
- No se modificaron datos financieros remotos. Pendiente: iPhone físico, VoiceOver y comprobación de estos cambios con sincronización remota real.

## Guía de primera visita · 26 de septiembre

- La introducción de cuatro tarjetas se reemplazó por un recorrido anclado a controles reales. Navega por Inicio, Cuentas, compras/ingresos/pagos de deuda, gastos fijos y checklist, Actividad, Plan, instalación PWA y Automatización/Atajos. Puede retroceder, saltarse o cerrarse con Escape y vuelve a la ruta de origen.
- Ajustes ofrece el recorrido general y cuatro repasos por tema. El formulario de movimientos se reutiliza en vista previa inerte, sin autofocus ni envíos. No se instalan servicios ni se crean vínculos de Atajos durante el recorrido.
- El fondo queda inerte, el foco se mantiene en la explicación y se restaura al cerrar. El resaltado sigue el control al cambiar tamaño o desplazar la vista; si falta el destino, permite seguir sin bloquear. No añade dependencias.
- Se reutiliza la preferencia booleana histórica de onboarding para marcar que el usuario ya la vio; así no se requiere una migración ni se cambia la base de datos existente. La guía no se abre automáticamente en la demo, que ya identifica sus datos como ficticios, pero también puede verse desde Ajustes.
- Verificado en esta iteración: lint, 125 pruebas unitarias, build y 10 E2E dirigidos: 6 recorridos completos/por tema en 390×844, 375×812 y 1440×900; 3 regresiones de pago fijo, movimientos y foco del formulario; 1 recorrido con demo vacía, montos ocultos, cambio de tamaño, salida offline y control ausente. Se revisaron capturas de instalación y registro; la prueba compara registros financieros antes/después y comprueba que el panel no tape el objetivo. Evidencia en `output/playwright/guide-*.png`.
- La habilidad frontend-a11y orientó el fondo inerte, los nombres accesibles, el anuncio de pasos y la restauración de foco. Pendiente: sesión remota nueva, VoiceOver e iPhone físico; la guía no certifica compatibilidad de Wallet ni entrega de eventos reales.

## Entrada sin encuesta obligatoria · 26 de septiembre

- Se retiró el formulario inicial de tres pasos. Una cuenta nueva llega a Inicio sin declarar sueldo, saldo, deudas ni gastos fijos. El botón de bienvenida de la demo también entra directamente.
- Cuando falta una cuenta con dinero, Inicio ofrece abrir su alta desde Cuentas. Allí se registran el saldo real actual, las deudas y los gastos fijos por separado; no se crea dinero ni se descuenta nada al entrar.
- La preferencia `financialOnboardingComplete` puede permanecer en datos y respaldos antiguos por compatibilidad, pero ya no controla el acceso.
- Verificado localmente: lint, 125 pruebas unitarias, build y recorrido E2E en 390×844, 375×812 y 1440×900 (3/3). Pendiente: verificar con sesión remota y en iPhone físico.

## Saldo real como fuente de verdad · 26 de septiembre

- Versión anterior: el primer acceso pedía cuenta y saldo actual. Ese requisito se retiró en «Entrada sin encuesta obligatoria». Las deudas siguen como pasivos; los pagos fijos se muestran como pendientes y solo reducen la cuenta al confirmarlos.
- Inicio, Plan, evaluación de compras y asistente usan saldos y movimientos registrados. Inicio separa el saldo de cuentas del margen después de pagos pendientes y reservas; la próxima fecha de pago no genera dinero.
- Cuentas → Ingresos muestra solo ingresos efectivamente registrados y permite abrir «Recibí dinero». La frecuencia y fecha futuras son recordatorios opcionales. Crear una cuenta ya no solicita una fuente de sueldo estimado.
- Compras y confirmaciones de gastos fijos nuevos requieren una cuenta o tarjeta concreta. Los gastos antiguos sin origen se conservan sin alterar saldos; se avisa de ello en Inicio. No se migran ni se asocian automáticamente.
- El sueldo de referencia antiguo se conserva en los datos por compatibilidad, pero deja de alimentar los cálculos y se ofrece precargado **solo para que el usuario confirme o corrija su saldo actual**. No se modifica producción ni se inventan movimientos sin esta confirmación.
- Verificado localmente: 125 pruebas unitarias, lint, build y 18 recorridos E2E dirigidos en 390×844, 375×812 y 1440×900. Una corrida paralela de la suite completa se interrumpió tras tiempos de espera de interacción y una expectativa antigua de Plan; la expectativa se actualizó y los flujos financieros dirigidos pasaron en ejecución secuencial. Falta validar con sesión remota e iPhone físico.

## Proyección mensual frente a dinero real · 26 de septiembre

- Inicio aclara que el sueldo declarado y los gastos fijos producen una **estimación mensual**, no el saldo de una cuenta ni pagos efectuados. Si no hay cuenta de dinero, ofrece el enlace a Cuentas; el registro de un abono explica la diferencia y permite crear la cuenta sin perder el formulario.
- Al agregar esa cuenta, el usuario introduce su saldo real actual. No se copia automáticamente la proyección ni se crea un ingreso o gasto ficticio. Los pagos de deuda siguen exigiendo una cuenta real y reducen tanto su saldo como la deuda.
- El dinero libre descuenta los abonos no previstos y solo el exceso sobre la cuota mensual ya reservada. Los pagos anulados no cuentan. Pendiente: validación con datos reales de usuario sin registrar movimientos de prueba.
- Verificado localmente: 124 pruebas unitarias, lint y build. El recorrido de sueldo estimado → sin cuenta → crear cuenta con saldo real → pagar deuda pasó en 390×844, 375×812 y 1440×900, sin desbordamiento horizontal. No se alteraron datos de producción ni se probó en un iPhone físico.

## Registro guiado y pago recurrente en un paso · 26 de septiembre

- «Nuevo movimiento» ofrece **Hice una compra**, **Recibí dinero**, **Pagué una deuda** y **Moví dinero** (en Más opciones). Fecha, hora, nota y comprobante se muestran solo al abrir «Añadir detalles»; los movimientos existentes los muestran al editar. El pago de deuda se guarda como `card_payment`, sin segundo gasto.
- Confirmar un vencimiento en Cuentas o Quincena pide monto real, origen y categoría. El movimiento y la marca se guardan en una sola transacción IndexedDB; en una cuenta real se encolan juntos y se sincronizan como dos operaciones remotas. El identificador del movimiento es estable por vencimiento para evitar duplicados. Los pagos anteriores sin movimiento vinculado conservan su historial.
- «Dinero libre» resta el gasto real y elimina de la estimación el importe previsto del vencimiento vinculado. Si se anula el movimiento, el vencimiento vuelve a aparecer. La categoría elegida se recuerda para los próximos pagos del mismo gasto fijo.
- Verificado localmente: 123 pruebas unitarias, lint y build. E2E dirigido 15/15: nueve recorridos de registro y checklist en 390×844, 375×812 y escritorio, cuatro regresiones de cuentas en 390×844 y dos pruebas de detalles opcionales en 390×844. Se revisó la confirmación en móvil y escritorio; el aviso temporal ya no tapa el diálogo. Falta probar el flujo con sesión remota y en iPhone físico; no se ejecutaron pagos ni se alteraron datos reales.

## Acceso con Google · 26 de septiembre

- Supabase registró inicios de sesión de Google y respuestas `/user` HTTP 200 sin rechazos 4xx ni errores Auth en la hora revisada. El navegador de escritorio mantuvo la sesión en una pestaña nueva; el rebote reportado ocurrió en Safari y la app instalada del iPhone.
- `observeAuth` impide que una consulta inicial de usuario, resuelta tarde o con error, reemplace un evento posterior `SIGNED_IN` o `SIGNED_OUT`. El evento `INITIAL_SESSION` no adelanta el resultado de la validación inicial. La limpieza cancela actualizaciones tras desmontar el proveedor.
- Pruebas unitarias cubren el retorno de Google, un error tardío, cierre de sesión y carga inicial. Lint, build y PWA pasaron. No se usaron credenciales de producción para probar un inicio real ni se pudo reproducir en iPhone físico; esa comprobación sigue pendiente.

## Gasto desde dinero libre · 26 de septiembre

- Gasto inicia en «Dinero libre del mes» y permite guardar sin una cuenta. Se suma a los gastos del mes y reduce la estimación disponible, sin crear asientos ni cambiar saldos bancarios o deudas. El usuario puede elegir una cuenta real si quiere actualizar su saldo.
- La migración `20260926123000_budget_only_expenses.sql` permite ese registro en PostgreSQL; conserva validación de categoría, propiedad, idempotencia y permisos. Se aplicó a Supabase el 26 de septiembre. Para revertirla se necesita primero asociar cada gasto sin cuenta a una cuenta real y luego una migración posterior que restablezca la restricción anterior.
- Antes de migrar, `scripts/backup-patawallet.ps1` creó un respaldo privado de PostgreSQL 17 fuera del repositorio. La restauración aislada de `auth`, `public` y `private` terminó sin errores; coincidieron los conteos de producción (10 usuarios, 26 cuentas, 24 movimientos y 22 asientos). La migración pasó primero en esa copia; un gasto sin cuenta de prueba produjo 0 asientos dentro de una transacción revertida. En Supabase se verificaron la nueva restricción, ambas funciones y los conteos originales; no se crearon movimientos reales de prueba.
- La migración `20260926143000_restrict_couple_review.sql` revocó a `anon` y `authenticated` el permiso de ejecutar la función privilegiada de revisión de pareja. Se probó en la copia y en Supabase (`false/false/true` para `anon`/`authenticated`/`service_role`). Security Advisor pasó de tres advertencias a una: protección contra contraseñas filtradas desactivada, pendiente de configuración aparte. Ambas migraciones se ejecutaron en SQL Editor; este proyecto remoto no tiene tabla `supabase_migrations.schema_migrations`.
- Verificado: 116 pruebas unitarias, lint, build, PWA 1/1 y suite E2E completa 60/60 en 390×844, 375×812 y escritorio. Una ejecución anterior tuvo un tiempo de espera móvil mientras Docker restauraba el respaldo; el caso aislado pasó y la repetición completa sin esa carga pasó 60/60. El commit `881c50e` se publicó en `main` y Vercel lo marcó listo en producción; la URL pública devolvió HTTP 200 con los mismos assets del build local. Tras aceptar el aviso de actualización PWA, el formulario real mostró «Dinero libre del mes» como origen predeterminado. No se guardaron movimientos de prueba en la cuenta real. La prueba en iPhone físico sigue pendiente.

## Cuenta de origen en movimientos · 26 de septiembre

- Al pasar de Gasto con una deuda seleccionada a Transferencia, el origen se ajusta a una cuenta de dinero activa y la deuda queda como destino. Cambiar el origen evita seleccionar la misma cuenta en ambos campos.
- En Transferencia, si faltan cuentas de dinero, el formulario muestra la causa y deshabilita el guardado. «Agregar cuenta» abre el alta, selecciona la cuenta guardada y conserva monto, nota y destino. Ingresos permite también agregar la cuenta receptora.
- En Gasto, las cuentas de dinero propio aparecen antes que las deudas; las tarjetas se distinguen como crédito. El gasto sin cuenta es la opción inicial.
- Se validan las cuentas antes de guardar y se bloquean envíos simultáneos. Los diálogos anidados conservan el borrador y solo el superior responde a Escape.
- Verificado: 114 pruebas unitarias, lint, build y 6/6 regresiones E2E en 390×844, 375×812 y 1440×900. Se comprobaron cancelación, movimiento reducido, persistencia tras recargar y saldos de origen/deuda después del abono; capturas revisadas y sin errores de consola. Prueba física de iPhone y comprobación con usuario remoto pendientes. Los movimientos reales previos no fueron modificados.
- Compra desde sueldo recibido: pasaron 3/3 recorridos E2E adicionales en 390×844, 375×812 y escritorio. Con solo deudas visibles, se agregó una cuenta bancaria desde Gasto, se conservó el monto y la compra redujo su saldo de 200.000 a 150.000. La primera ejecución se detuvo por un selector ambiguo de la prueba; corregido y repetido con éxito.

## Actualización de PWA al volver a la app · 26 de septiembre

- El registro del service worker vuelve a comprobar si hay una versión nueva al registrarse, al regresar a primer plano, al recuperar conexión y cada hora mientras la app está visible y en línea. El aviso continúa siendo manual; no se salta el worker ni se recarga automáticamente.
- Verificación automatizada local: prueba unitaria del ciclo de vida y la limpieza de listeners/temporizador, suite PWA y build. La actualización en iPhone instalado aún requiere prueba física.

## Checklist persistente de pagos · versión inicial del 26 de septiembre

- Cuentas y Quincena muestran hasta dos vencimientos pendientes por cada gasto fijo; los ya pagados no cuentan para ese límite y los atrasos pendientes se conservan.
- En la versión inicial, marcar un pago pedía confirmación y guardaba solo la marca en la checklist; el registro guiado descrito arriba sustituyó ese comportamiento por un movimiento real vinculado.
- Regresiones en `src/domain/recurringExpenses.test.js` y `tests/e2e/app.spec.js` cubren el límite, la cancelación, la confirmación y su persistencia tras guardar y recargar. Verificado: `npm test` (28 archivos, 114 pruebas), `npm run lint`, `npm run build` y E2E dirigido 9/9 en 390×844, 375×812 y 1440×900. Diálogo revisado visualmente en los tres tamaños.

## Ajustes · Serena aplicada · 24 de septiembre

- Se adoptó la propuesta Serena en la ruta real `/ajustes`: grupos abiertos y escaneables, separadores sutiles, iconos Noche con tonos por función y una tarjeta compacta de cuenta. La demo distingue con claridad los datos locales de la cuenta autenticada.
- Se conservaron las preferencias de montos y movimiento, instalación PWA con pasos por plataforma, cuentas en pareja, asistente, notificaciones, automatización, moneda, sincronización, gestión de conflictos y transferencia de datos. El botón flotante del asistente se oculta solo en Ajustes porque allí ya existe el acceso dentro de la lista.
- Al promover Serena se retiró el comparador temporal de Ajustes; las demás exploraciones se mantienen intactas.
- Verificación local: `npm run lint`, `npm run test` (**111/111**), `npm run build`, E2E PWA (**4 pasaron, 2 omitidos intencionalmente**) y preferencias/montos (**3/3**) aprobados. Revisión visual en 390×844, 375×812 y 1440×900, sin overflow horizontal; detector visual sin hallazgos. Probado en demo local, no con una sesión autenticada remota ni en iPhone físico.

## Instalación PWA guiada · 24 de septiembre

- Ajustes → Aplicación ofrece un control común: abre el aviso nativo del navegador cuando `beforeinstallprompt` está disponible y, si no, muestra pasos manuales para Safari o el menú del navegador.
- El evento se captura desde la carga inicial de la SPA para que no se pierda antes de llegar a Ajustes. El estado reconoce el modo independiente y el evento `appinstalled`; no intenta saltarse la confirmación del usuario.
- Verificación: `npm run lint`, `npm test` (**111/111**), `npm run build` y E2E dirigido (**4 pasaron, 2 omitidos intencionalmente**) aprobados. Capturas revisadas a 390×844, 375×812 y 1440×900; consola sin errores. La simulación del evento no equivale a una instalación física; probar el flujo nativo en iPhone y Android sigue pendiente.

## Cuentas · Registro tranquilo · 24 de septiembre

- Cuentas ahora usa un registro compacto con el dinero disponible como cifra principal, deuda y neto como métricas secundarias y paneles independientes para activos y obligaciones.
- Se conservan saldos calculados desde movimientos, privacidad de importes, edición/archivo, planes informativos de deuda, administración de ingresos y gastos fijos, y la checklist manual de vencimientos.
- Los botones contextuales permiten abrir el formulario directamente como cuenta disponible o deuda. Al promover este diseño se retiró únicamente el comparador temporal de Cuentas; la exploración de Inicio se conserva.
- Verificación local: `npm run lint`, `npm test` (**107/107**), `npm run build` y `git diff --check` aprobados; E2E de deuda/legibilidad (**6/6**) y recorrido visual noche en los tres tamaños (**3/3**) aprobados. Revisados 390×844, 375×812 y 1440×900, sin overflow horizontal ni overlays de error. El acceso al asistente se separó de las acciones de Cuentas para evitar solapamientos en pantallas estrechas.

## Plan · Metas primero · 24 de septiembre

- Plan abre con la meta principal y su progreso real; las demás metas quedan en una lista secundaria. El presupuesto actual, el dinero libre estimado y las próximas compras siguen disponibles debajo, con jerarquía adaptada a móvil y escritorio.
- Se conserva el modelo financiero: reservar no mueve dinero; el dinero libre usa ingresos de referencia menos gastos fijos, pagos de deuda y gastos netos registrados; si falta configurar el punto de partida, se indica en vez de inventar una cifra. El presupuesto visible corresponde al mes actual.
- Crear/eliminar metas, reservar, editar el presupuesto y crear/editar/eliminar/evaluar compras previstas mantienen sus acciones y diálogos productivos. Las compras futuras no crean gastos automáticamente.
- Al promover Metas primero, se retiró la vista previa temporal de Plan y se mantuvo intacta la exploración de Inicio.
- Verificación local: `npm run lint`, `npm test` (**107/107**), `npm run build` y `git diff --check` aprobados; E2E enfocado (**7/7**) para el diseño/diálogos en 390×844, 375×812 y 1440×900, más evaluación de compra en 390×844; capturas de los tres tamaños inspeccionadas y consola sin errores en el recorrido visual. No es una prueba con autenticación remota ni con iPhone físico.

## Vistas de Inicio · 23 de septiembre

- Inicio presenta arriba un selector accesible entre **Saldo claro**, **Quincena** y **Actividad**. La preferencia se conserva en la demo local y en cuentas remotas después de aplicar la migración.
- Saldo claro prioriza el dinero libre después de compromisos y gastos registrados; Quincena calcula el próximo pago desde la frecuencia y fecha configuradas y reutiliza la checklist de pagos recurrentes; Actividad resume los gastos por categoría y los movimientos del mes seleccionado.
- Las vistas comparten los mismos datos financieros, privacidad de montos y movimientos; no crean pagos ni cifras ficticias. Si falta la fecha de pago o el punto de partida, se muestra una acción para completarlo.
- Migración `20260924010315_dashboard_home_view_preference.sql` agrega la clave y valida sus tres valores; conserva explícitamente los valores SQL `NULL` opcionales ya admitidos por el esquema. Aplicada al proyecto Supabase de producción el 24 de septiembre de 2026 y verificadas ambas restricciones. La preferencia pendiente se sincronizó; se probaron los cambios entre Quincena y Actividad y Ajustes reportó **Sincronizado**, sin alerta roja.
- Verificación local: `npm run lint`, `npm test` (**111/111**) y `npm run build` aprobados; E2E dirigido de vistas, guardado, reload, checklist y ausencia de overflow (**6/6**) en 390×844, 375×812 y 1440×900; consola sin errores en capturas de revisión. No es una prueba de iPhone físico.

## Actividad · Cronología · 23 de septiembre

- La ruta `/actividad` adopta la composición Cronología: selector mensual, resumen, búsqueda, filtro por cuenta y tipos, y movimientos agrupados del más nuevo al más antiguo. El recorrido previo de movimientos y la bandeja real «Por revisar» se conservan.
- El total visible es **gasto neto del mes** (compras menos reembolsos) y los ingresos se muestran aparte. Aperturas y ajustes no aparecen en la cronología; transferencias y pagos de deuda siguen visibles pero no se suman como gastos. No se lleva a producción el presupuesto ficticio que tenía el prototipo.
- Los totales y movimientos respetan «Ocultar montos». «Datos de ejemplo» aparece solo en la demo. La navegación mensual usa la zona America/Bogota y no permite avanzar más allá del mes actual.
- La exploración independiente de Actividad se retiró al promover la selección; las tres propuestas previas de Inicio permanecen disponibles en su vista previa.
- Verificación local: `npm run lint`, `npm test` (**107/107**) y `npm run build` aprobados; `npx playwright test tests/e2e/activity-timeline.spec.js --workers=1` aprobó **3/3** en 390×844, 375×812 y 1440×900, con comprobación de consola y capturas revisadas en `output/playwright/results/`. No es una prueba con autenticación remota ni con iPhone físico.

## Rediseño Noche con Mascotas · 18 de septiembre

- Nueva dirección visual pedida explícitamente: azul noche, lavanda/rosa, luz cálida, navegación flotante y nueva escena nocturna complementaria. Las cuatro ilustraciones originales se conservan sin alterar.
- Revisión de Inicio, Actividad, Plan, Cuentas, ingresos, gastos fijos/checklist, Ajustes, acceso, onboarding, formularios, Asistente, notificaciones y Atajos. Parejas recibe controles/superficies compartidos; no se verificaron sus operaciones autenticadas reales.
- Estilos nuevos separados por módulo; botones con brillo al interactuar, fondo ambiental CSS pausado en segundo plano y reducido por preferencia. No se añadieron paquetes ni se modificaron cálculos o esquemas de servidor.
- Controles compartidos con profundidad 3D sutil: luz superior, sombra desplazada, elevación al pasar el cursor y hundimiento al pulsar para botones, navegación, iconos de actividad, cuentas, metas y ajustes. El movimiento se desactiva con la preferencia del sistema o “Sin movimiento”.
- Tema oscuro único: la opción Claro/Sistema ya no se muestra y las preferencias antiguas se normalizan a Noche al abrir el espacio; el cambio del sistema operativo no altera la identidad visual.
- Iconografía Noche: se incorporó una capa `NightIcon` reutilizable con insignias SVG de tonos lavanda, cielo, menta, durazno, rosa y dorado, halo suave y variantes ópticas para navegación, estadísticas, cuentas, movimientos, metas, ajustes e integraciones. Los iconos ya no dependen de trazos genéricos aislados y mantienen estados accesibles de foco, pulsación y movimiento reducido.
- Dock móvil: se integró un componente magnético basado en React Bits/Motion con ampliación por proximidad, etiquetas flotantes, enlaces semánticos para las rutas y botón central de Nuevo movimiento. La navegación conserva el estado activo, funciona con teclado y vuelve al tamaño base con movimiento reducido; el menú lateral de escritorio permanece intacto.
- Verificación: `npm run lint` aprobado; `npm run test` **100/100**; suite previa `npm run test:e2e` **58 aprobadas, 2 omitidas** (la captura adicional de Atajos en noche/movimiento reducido solo se ejecuta en mobile-390); nueva suite `night-design.spec.js` **9/9**; `npm run build` aprobado; `npm run test:pwa` **1/1**.
- Profundidad 3D: `night-design.spec.js` pasó **12/12** en mobile-390, mobile-375 y escritorio; la corrida completa posterior pasó **67/72**, con 2 omitidas y 3 fallos preexistentes en capturas de Integraciones que pierden el estado demo al hacer `page.goto()` después de pulsar “Probar con datos de ejemplo”, por lo que regresan a Bienvenida antes de buscar sus encabezados.
- Última verificación de esta iteración: `npm run lint`, `npm run test` (**100/100**), `npm run build`, `npm run test:pwa` (**1/1**), `night-design.spec.js` (**12/12**) y `app.spec.js` (**51/51**) aprobados. El detector visual solo encontró una transición de ancho en el progreso del onboarding; se reemplazó por `transform: scaleX()` para evitar trabajo de layout.
- Verificación del dock: revisión manual a 390×844 y escritorio con tooltip, magnificación, navegación y consola sin errores; `app.spec.js` **51/51**, `night-design.spec.js` **11/12** en la primera corrida por un arranque puntual de WebKit y el caso aislado repetido **1/1**, `npm run test:pwa` **1/1**. El detector visual final no encontró antipatrones (`[]`).
- La primera pasada de E2E detectó enlaces accesibles ambiguos y una navegación de prueba que adelantó el guardado de la demo; la segunda pasada estable aprobó los casos. No se debilitaron las aserciones para ocultar fallos.
- Capturas inspeccionadas a 390×844, 375×812 y 1440×900. Revisión de errores de formulario, vacío, offline, montos ocultos y reducción de movimiento; comprobación de consola y de desbordes en las rutas principales. No equivale a auditoría exhaustiva de contraste ni a prueba de iPhone físico.
- Acceso/registro/recuperación revisados sin enviar datos ni solicitudes reales. No se probó OAuth, IA real, colaboración entre usuarios, Web Push ni Wallet durante esta tarea; conservan sus pendientes anteriores.
- Diseño, procedencia de la nueva imagen, prompt y mapa de módulos: `design/NIGHT_REDESIGN.md`. Capturas reproducibles: `output/playwright/night-*`.
- Para ejecutar localmente: `npm run dev`. Para demo aislada en PowerShell: `$env:VITE_AUTH_DISABLED='true'; npm run dev`. Las preferencias anteriores de tema se normalizan automáticamente al modo nocturno al abrir el espacio. No se desplegó manualmente ni se modificó la base remota.

## Ampliaciones del 11 de septiembre

- Movimientos: hora opcional; sin hora conserva el comportamiento de fecha a mediodía para evitar cambios accidentales de día.
- Comprobantes: JPG/PNG/WebP opcional de hasta 2 MB, con vista previa, cambio y eliminación. Por ahora se guarda de forma privada en IndexedDB, separado por usuario, y la UI lo rotula como **solo en este dispositivo**; falta almacenamiento remoto privado antes de considerarlo respaldo.
- Categorías: creación personalizada desde el formulario de movimiento, respetando el tipo ingreso/gasto y el aislamiento existente.
- Metas: corregido el modal compartido que quedaba dentro de un ancestro `inert`; X, Escape y Guardar vuelven a funcionar.
- Próximas compras: alta, edición y eliminación, sin crear gastos. Compara el estimado con el presupuesto restante y con activos registrados menos reservas.
- Próximas compras: el selector de categoría incluye un botón para crear una nueva categoría de gasto desde el mismo formulario; la categoría queda seleccionada automáticamente y comparte el diálogo protegido contra doble toque con Nuevo movimiento.
- Migración `20260911120000_planned_purchases.sql` aplicada al proyecto remoto autorizado. Verificación SQL: tabla presente, RLS activo, 1 política propia, índice presente, `anon_select = false` y CRUD autenticado habilitado bajo RLS.
- Automatización Apple: el receptor, vinculación y categorización de PataWallet están preparados. La plantilla `PataWallet - Registrar compra` fue construida y publicada por el usuario en iCloud; la automatización personal Wallet quedó configurada para ejecutar inmediatamente y sin aviso previo.
- Enlace publicado: `https://www.icloud.com/shortcuts/12c4f7d2f466425ba3e9379203ab59f5`. El código distingue “publicada” de “probada”: `SHORTCUT_MIN_IOS_TESTED` permanece opcional hasta completar una prueba real.
- Evidencia de iPhone recibida: el activador aparece como **Wallet**, permite escoger tarjetas y conduce a “Cuando use sin contacto…”. La automatización construye un diccionario con `amount`, `merchant_name` y `card_alias` antes de ejecutar la plantilla compartida.
- Inspección de la variable real completada: entrada tipo `Transacción` con propiedades `Tarjeta o pase`, `Comercio`, `Cantidad` y `Nombre`. Fecha y moneda no aparecen; la plantilla añade fecha de ejecución y COP. La vinculación fue confirmada por la notificación de Atajos; falta que la PWA refresque el estado desde servidor, probar conexión y confirmar valores/tipos mediante una compra habitual.
- La pantalla de Automatización refresca el estado al recuperar foco o visibilidad después de volver desde Atajos; el estado activo sigue dependiendo de una lectura autenticada del servidor.
- El Inicio solo muestra la etiqueta de datos locales dentro de la demo; la cuenta real no muestra el banner de demo ni la píldora estable “Sincronizado”. Los estados pendientes, offline y conflicto siguen siendo visibles.
- Metas y próximas compras: cada apertura del formulario conserva un identificador estable, bloquea reenvíos mientras guarda y usa escrituras locales idempotentes; un doble toque no crea filas duplicadas. Cada tarjeta de meta explica que una reserva es una separación interna, no un movimiento bancario.
- El popup de cada reserva incluye la explicación y el ejemplo de saldo/progreso antes de solicitar cuenta y monto.
- Cuentas: la pantalla explica que “dinero disponible” incluye efectivo, bancos y billeteras, mientras “tarjeta de crédito (deuda)” representa lo pendiente con el emisor; también aclara que pagar la tarjeta no duplica el gasto.
- Cuentas: se añadieron subtipos de deuda para préstamos de libre inversión y préstamos con personas o entidades; las restricciones `accounts_subtype_check` y `accounts_kind_subtype_consistent` están instaladas en Supabase.
- Cuentas: cada deuda admite un plan de pago opcional con total de cuotas, cuotas pagadas, valor y frecuencia; es informativo y no genera movimientos automáticos. Se puede editar después desde la cuenta.
- Ingresos: Cuentas permite administrar varias fuentes vinculadas a cuentas de activo, y “Agregar cuenta” ofrece registrar la primera fuente en el mismo formulario. Cada fuente se clasifica como sueldo fijo (monto mensual, frecuencia y próximo pago opcional) o ingreso extra esporádico; los extras no se suman al dinero libre y se registran como movimientos cuando ocurren. Las claves antiguas de salario siguen sincronizadas para compatibilidad. La migración `20260913190000_income_sources.sql` añade la lista validada de fuentes y está aplicada en Supabase; la verificación confirmó las tres restricciones y que `user_settings.value` admite NULL solo donde corresponde.
- Gastos fijos: cada compromiso puede repetirse mensualmente, con cada pago, cada 15 días o cada semana; la próxima fecha ancla el calendario, el total mensual estima todas sus ocurrencias y la checklist permite marcar cada vencimiento como pagado sin crear movimientos automáticos.
- Movimientos: el selector de Gasto, Ingreso y Transferencia muestra una explicación contextual; Transferencia aclara que mueve dinero entre cuentas y no altera ingresos ni gastos.
- PWA móvil: los campos usan al menos 16 px para evitar el zoom automático al enfocarlos; el viewport y los gestos de zoom se bloquean únicamente en modo app instalada, no en la web abierta en Safari.
- Cuentas en móvil: las filas reordenan explícitamente icono, detalle, saldo y acciones para evitar que el auto-placement de CSS comprima el nombre; los avisos de sincronización ya fluyen dentro del contenido y no cubren el encabezado. Cada cambio de ruta restablece el scroll al inicio.
- Inicio: el dashboard ahora incluye paneles rápidos de metas, próximas compras y cuentas, además del presupuesto y movimientos recientes, con enlaces a cada sección completa.
- Asistente IA: se añadió `/asistente` como consulta de solo lectura. El servidor valida sesión, origen, tamaño y entrada antes de llamar a Ollama; la clave y el modelo son variables exclusivas de servidor y la demo nunca envía datos. El contexto incluye importes formateados en COP y dinero libre calculado; la respuesta elimina marcas Markdown para mantener una lectura directa.
- Asistente IA: una burbuja flotante permite abrirlo directamente desde Inicio y las demás áreas de la app; se oculta dentro de la propia pantalla del asistente para no duplicar controles.
- Vercel Hobby: las reglas de categorización comparten la función de mapeos mediante un rewrite interno para mantener 12 funciones Serverless, el máximo del plan, sin cambiar las rutas públicas del cliente.

## Ampliación de punto de partida financiero · 13 de septiembre

- Onboarding guiado al entrar al espacio: salario mensual equivalente, frecuencia y próximo pago opcional; deudas con total pendiente y pago mensual; y gastos fijos repetibles.
- El resultado **Dinero libre** se calcula como salario − compromisos recurrentes esperados del mes − pagos mensuales declarados de deuda. Los datos se guardan por usuario y no crean ingresos, gastos ni cobros automáticos.
- Las deudas nuevas se guardan como pasivos con apertura explícita y un campo separado de pago mensual declarado; no se inventa un número de cuotas para una deuda cuyo plazo no se conoce.
- Inicio y Plan muestran el desglose del dinero libre. Las próximas compras advierten cuando dejarían el margen en cero/negativo o cuando faltan más de 14 días para el próximo pago y el remanente sería menor al 25% del dinero libre mensual.
- Cuentas concentra la edición de ingresos y gastos fijos junto a cuentas y deudas; ambas opciones se presentan como botones plegables para mantener la pantalla compacta. Ajustes conserva las preferencias. Las migraciones `20260913100000_financial_onboarding.sql` y `20260913103000_debt_monthly_payment.sql` añaden las claves de configuración y el pago mensual de deuda; ambas están aplicadas en Supabase.
- Primer acceso autenticado: `20260913170000_allow_optional_null_user_settings.sql` permite `NULL` solo en salario, frecuencia y fecha de pago opcionales; la columna mantiene valores obligatorios para preferencias y banderas. Verificado remotamente con la restricción `user_settings_value_required_for_non_optional`.
- Primer acceso autenticado: corregida la restricción `user_settings_value_shape` con `20260914120000_fix_optional_user_settings_shape.sql`; ahora acepta `NULL` SQL en salario, frecuencia y próximo pago, tal como envía PostgREST al guardar valores opcionales. Verificado en Supabase con los ocho ajustes de arranque y prueba de regresión local.
- Sincronización: las operaciones antiguas de `nextPayDate` vacío se reconcilian de forma idempotente si el bootstrap ya creó la clave remota; no se descarta información financiera.
- Onboarding: el salario ahora se asocia a una cuenta disponible existente o permite crear una cuenta bancaria identificada por nombre/banco. La cuenta nueva queda con saldo cero: no crea un ingreso ni un movimiento automático, así que el pago real se registra una sola vez desde Nuevo movimiento.
- Importes: los campos monetarios agrupan miles con el formato local (`1.750.000`) mientras se escriben, conservando unidades menores enteras al guardar. Los contenedores y grids de formularios permiten encogimiento en móvil; el onboarding deja de centrarse verticalmente cuando supera la altura disponible para evitar recortes.

## Cuentas en pareja · 13 de septiembre

- Se preparó un espacio compartido separado: la invitación es por correo, la aceptación requiere iniciar sesión con ese correo y cada propietario selecciona sus propias cuentas o deudas para compartir.
- La nueva ruta `/parejas` permite administrar la selección, ver únicamente las cuentas compartidas y proponer ajustes de saldo o cambios de cuota mensual.
- Los cambios sensibles quedan pendientes hasta la aprobación de la otra persona; el RPC transaccional aplica el cambio de cuenta o crea un ajuste contable solo después de aprobarlo. La persona que propone no puede aprobar su propia solicitud.
- La navegación muestra Parejas a cuentas reales desde el primer momento para poder crear una invitación; en demo no se hacen peticiones ni se mezclan datos.
- La migración `20260913150000_couple_spaces.sql` está aplicada en el proyecto remoto autorizado. Sus cinco tablas tienen RLS activo, las invitaciones usan token hash y control de versión, y el RPC de revisión quedó instalado. No se configuró envío de correo: hasta añadir un proveedor, el enlace se copia desde la pantalla.
- Vercel Hobby: la prueba Push comparte la función de procesamiento mediante un rewrite interno; el despliegue quedó dentro del límite de 12 funciones y publica `/api/couples`.

## Implementado

| Fase / área | Estado | Límite honesto |
|---|---|---|
| Fase 1: SPA financiera | Implementada | Demo separada, navegación, movimientos, cuentas, presupuesto y metas |
| Fase 2: Auth, datos y seguridad | Migraciones remotas aplicadas; RLS A/B probado | API HTTP directa, concurrencia y restauración PostgreSQL aislada pendientes |
| Fase 3: PWA y Web Push | Implementada localmente | Recepción/apertura real y actualización en iPhone pendientes |
| Fase 4: Atajos/categorización | Plantilla iCloud publicada; receptor y migración preparados | Instalación desde enlace, vínculo persistente, prueba de conexión y compra real pendientes |
| Fase 5: acabado | Implementada | Foco, horizontal/texto ampliado, estados accesibles, imágenes y temporizadores |
| Punto de partida financiero | Implementado y migración aplicada | El onboarding autenticado y la sincronización en dos dispositivos aún requieren prueba remota con usuarios de prueba |
| Cuentas en pareja | Implementado y desplegado | Correo automático y pruebas A/B desde dos dispositivos siguen pendientes |
| Mascotas | Cuatro escenas estáticas | 12 WebP; no hay capas, rigs ni gestos animados |
| Operación | Documentada | Guía, validación final y publicación/recuperación |

## Probado automáticamente

- `npm run lint`: PASÓ.
- `npm test`: PASÓ, 24 archivos y 100 pruebas. Incluye fuentes de ingreso vinculadas a cuentas, formato de importes, dinero libre, gastos recurrentes, generación de vencimientos, checklist de pagos, fecha de próximo pago, pago mensual declarado de deuda, contratos de migración, reconciliación de sincronización y protección de Push.
- `npm run build`: PASÓ con Vite 8.3.0; 30 entradas y 1279,07 KiB de precaché. La configuración adapta el build del worker a `codeSplitting: false`, sin la opción obsoleta `inlineDynamicImports`.
- E2E dirigido de Automatización en escritorio: PASÓ 1/1. La ejecución completa paralela quedó inválida por `EBUSY` de Windows al observar sus propios artefactos de Playwright; tras caer el servidor produjo 32 fallos derivados y 5 pruebas alcanzaron a pasar.
- Dependencias de build: `glob` se resuelve explícitamente a 13.0.6 bajo `workbox-build`; `npm audit --omit=dev` permanece en 0 vulnerabilidades conocidas.
- Línea base E2E: 22 pruebas efectivas pasaron y 2 variantes se omitieron intencionalmente.
- Suite ampliada final: 28 PASÓ y 2 variantes se omitieron intencionalmente. El retorno de foco había fallado primero en 390×844; corregido el disparador, la regresión pasó 3/3 en 390×844, 375×812 y escritorio.
- `npm run test:pwa -- --workers=1`: PASÓ 1/1; shell/ruta previamente cargados abren sin red.
- E2E del asistente: PASÓ 1/1 en 390×844, 375×812 y escritorio; la demo muestra el estado no disponible y no hace solicitudes de IA.
- `npm audit --omit=dev`: PASÓ, 0 vulnerabilidades conocidas.
- E2E de ampliaciones en escritorio y 375×812: PASÓ 3/3 en cada tamaño (modales de Metas, categoría/hora/comprobante y próxima compra).
- E2E de doble toque en metas y próximas compras en 390×844, 375×812 y 1440×900: PASÓ 9/9; cada flujo termina con una sola tarjeta persistida.
- E2E del onboarding financiero: PASÓ en 390×844, 375×812 y 1440×900; creó una deuda, guardó gastos fijos y mostró el cálculo de dinero libre en Inicio.
- E2E del onboarding con cuenta salarial: PASÓ en 390×844, 375×812 y 1440×900; reutiliza o crea la cuenta elegida, la muestra en Cuentas y no genera un movimiento de ingreso implícito.
- E2E de ubicación de ingresos y gastos fijos: PASÓ 3/3 en 390×844, 375×812 y 1440×900; ambos formularios se guardan desde Cuentas y no aparecen en Ajustes.
- E2E de checklist de gastos recurrentes: PASÓ 3/3 en 390×844, 375×812 y 1440×900; genera ocurrencias según la frecuencia, permite marcar un pago como pagado y conserva el flujo de ingresos.
- E2E de secciones plegables en Cuentas: PASÓ 3/3 en 390×844, 375×812 y 1440×900; Ingresos y Gastos fijos empiezan cerrados y muestran sus opciones al pulsar el botón correspondiente.
- E2E focalizado del formulario de gastos fijos en Cuentas: PASÓ 3/3 en 390×844, 375×812 y 1440×900; confirmó guardado y ausencia del formulario en Ajustes.
- La corrida completa actual de `tests/e2e/app.spec.js` quedó incompleta por un timeout preexistente en la prueba de creación de categoría desde Próximas compras (mobile-390), no relacionado con el cambio de ubicación de gastos fijos.
- E2E del dashboard en 390×844, 375×812 y escritorio: PASÓ 3/3; Inicio muestra metas, compras futuras y cuentas sin overflow.
- Contexto/end-point del asistente: PASÓ; los importes incluyen su representación colombiana (`$ 3.200.000`) y el endpoint limpia énfasis Markdown generado por el modelo.
- E2E de acceso al asistente desde la burbuja: PASÓ 3/3 en 390×844, 375×812 y 1440×900.
- E2E de legibilidad de Cuentas y reinicio de scroll en 390×844, 375×812 y 1440×900: PASÓ 3/3.
- E2E de plan de cuotas e ingresos en 390×844, 375×812 y escritorio: PASÓ 3/3; la deuda conserva el avance y el sueldo aparece en Inicio.
- E2E dirigido del formulario de fuentes de ingreso: PASÓ 1/1 en escritorio tras completar una deuda, guardar el sueldo asociado a una cuenta y verificarlo en Inicio. La ejecución multi-proyecto serial alcanzó 5/6; el sexto caso terminó en `ERR_ABORTED` durante `page.goto` por reinicio del servidor de pruebas, no por una aserción de la aplicación.
- Flujo manual automatizado en servidor local: PASÓ para crear una cuenta con sueldo fijo y para crear una cuenta con ingreso extra esporádico en 390×844; Inicio mostró el resumen correspondiente y no se generó un movimiento automático.
- E2E completo de la app en 390×844: PASÓ 15/15. Una ejecución paralela anterior sufrió contención y reveló que el input oculto del comprobante interceptaba Guardar; se corrigió y la repetición serial pasó.
- Revisión visual del onboarding en 390×844, 375×812 y 1440×900: PASÓ; el salario se muestra como `1.750.000`, los campos quedan dentro de su tarjeta y no hay desplazamiento horizontal.
- `npx supabase db lint --local`: BLOQUEADO; no hay PostgreSQL/Docker en `127.0.0.1:54322`.
- Supabase remoto: PASÓ 20/20 pruebas pgTAP transaccionales de aislamiento A/B, referencias cruzadas, tablas Push/Atajos y bloqueo anónimo; los fixtures y pgTAP temporal terminaron con `ROLLBACK`.
- Fase 4 remota: existen sus seis tablas, RLS está activo en las cuatro públicas, `anon` no puede leer vinculaciones y las funciones privilegiadas principales están instaladas.

## Revisión de navegador

- Revisados 390×844, 1440×900 y 844×390 con datos ficticios, sin overflow horizontal ni consola con errores/advertencias.
- Evidencia: `output/playwright/phase5/mobile-home.png`, `desktop-home.png` y `landscape-movement.png`.
- La escena permanece estática, no tapa cifras y conserva recorte legible. La preferencia propia y `prefers-reduced-motion` aplican la opción más restrictiva.

## No probado en iPhone físico

VoiceOver, teclado/áreas seguras reales, instalación/actualización PWA, Web Push visible/apertura, plantilla importable, token persistente/revocable, payload Transacción y compra compatible. Un viewport emulado no se presenta como prueba de iPhone.

## Bloqueos

- **Crítico:** API HTTP A/B directa, concurrencia de asientos y restauración PostgreSQL aislada.
- **Alto:** endpoints autorizados, push real, instalación/vinculación de la plantilla Apple, segundo dispositivo limpio y compra compatible.
- **Medio:** VoiceOver, texto del sistema y teclado en iPhone.
- **Bajo:** licencia explícita de redistribución de ilustraciones.

La app está desplegada en Vercel y las migraciones de las fases 1–4, punto de partida, cuentas en pareja y ajustes opcionales de primer acceso están presentes en Supabase. No se enviaron avisos reales ni se modificaron servicios Apple. Pasos restantes: `docs/PLAN_DE_PUBLICACION_Y_RECUPERACION.md`.

## Decisión

**BLOQUEADA PARA USO REAL.** La demo y las comprobaciones locales son revisables, pero falta verificar aislamiento, persistencia y recuperación sobre PostgreSQL real. No usar todavía PataWallet como único registro personal.
