# 04 · iPhone, PWA, notificaciones y Atajos

## Límites que cambian el diseño
La ruta es web, no App Store. En iOS/iPadOS 16.4 o posteriores, Web Push está documentado para apps web añadidas a Inicio; el permiso requiere interacción del usuario y no membresía de Apple Developer [S02]. Usar detección de capacidades, no prometer compatibilidad solo leyendo el número de versión.

El permiso de notificaciones sirve para avisos de nuestra app. No implementa lectura de notificaciones de Wallet/bancos. La integración propuesta de pagos depende de Atajos: Apple documenta el disparador Transacción al usar por acercamiento una tarjeta seleccionada [S03]. No extrapolar a compras con tarjeta física, online, suscripciones o Apple Watch sin validación.

No se asumen nuevas funciones de una versión de iOS no verificada ni un disparador de lectura de notificaciones de Wallet. Tampoco usar FinanceKit como si fuera una API JavaScript de la PWA. La versión concreta de iOS y las tarjetas reales siguen pendientes de comprobar.

## PWA
Manifiesto con nombre, nombre corto, id estable, `display: standalone`, scope/start_url coherentes, iconos 192/512 y variante de icono adecuada para pantalla de Inicio. Crear iconos propios simples si faltan y marcarlos como propuesta visual, no copiar logos de bancos. HTTPS en despliegue y rutas SPA con recarga directa; no reescribir `/api/*` como HTML.

Service worker con caché versionada del shell y recursos estáticos; `vite-plugin-pwa` ofrece estrategia `injectManifest` para un worker personalizado [S12]. No cachear indiscriminadamente peticiones de Auth, tokens, respuestas financieras o APIs privadas en Cache Storage. Los datos offline se administran explícitamente en la capa local por usuario.

Actualizar la PWA con aviso y sin perder borradores. No precachear todas las ilustraciones a sus tres tamaños ni los mockups/originales. Mostrar instrucciones accesibles para “Añadir a pantalla de inicio”; no inventar un prompt nativo de instalación en Safari si no está disponible.

## Notificaciones reales
Flujo: explicación → acción “Activar notificaciones” → permiso del sistema → registro de suscripción → opción de enviar prueba. Estados: no compatible, necesita instalación, no solicitado, concedido sin suscripción, activo, denegado y error. Al denegarse, ofrecer instrucciones de ajustes, no un bucle de peticiones.

Usar Push API, service worker y VAPID. El servidor puede enviar con `web-push` [S17]; clave privada solo en servidor. Registrar preferencias por usuario/dispositivo. Las suscripciones son datos sensibles; validar endpoints y tamaños, evitar SSRF y destinos privados, no seguir redirecciones arbitrarias. Restringir prueba de envío al propietario, con rate limit. Limpiar suscripciones expiradas según las respuestas del servicio.

Tipos iniciales: compra registrada, movimiento por revisar y presupuesto. Metas o resúmenes, solo si el mecanismo de cálculo/programación está realmente implementado. No simular recordatorios cerrados con un `setTimeout` del navegador. Respetar horarios/preferencias y evitar avisos duplicados.

Privacidad por defecto: mensaje general sin monto/comercio; el usuario decide mostrar detalles. Notificación pulsada abre una ruta interna segura y exige sesión antes de mostrar datos. Una respuesta exitosa del proveedor no prueba que el usuario recibió o vio el aviso. La UI debe reflejarlo.

No usar push silencioso como motor de sincronización; WebKit requiere avisos visibles para Web Push [S21]. Guardar primero el movimiento y encolar el aviso después. Un error de push nunca deshace una compra ya guardada.

## La app proporciona el atajo: flujo objetivo
1. **Añadir atajo**. Mostrar una plantilla preconstruida publicada mediante un enlace iCloud real y versionado. Apple permite compartir atajos y configurar preguntas de importación [S04, S08]. El usuario añade la plantilla; no construye sus acciones.
2. **Vincular cuenta**. La app autenticada crea un ticket de un solo uso y de corta vida. Un enlace `shortcuts://run-shortcut` puede ejecutar un atajo instalado y entregarle texto [S05]. El ticket es temporal; nunca pasar un token permanente en la URL.
3. **Activar automatización**. Guía dentro de la app para crear en Atajos el disparador Transacción, seleccionar tarjeta(s) y ejecutar la plantilla pasando la entrada del evento. Los pasos y etiquetas se verifican en el iPhone real. Apple admite ejecución automática para Transacción [S06]; eso no equivale a que la web pueda instalarla silenciosamente.
4. **Enviar prueba de conexión**. La plantilla hace ping autenticado; no crea gasto, no altera balances y no representa una compra real.
5. **Validar primera compra compatible**. Comprobar datos recibidos, tarjeta→cuenta, permisos y categoría. Mostrar el último evento real recibido, sin afirmar sincronización del historial bancario.

Atajos admite solicitudes a APIs [S07]. Los nombres concretos y presencia de campos como monto/comercio/tarjeta deben comprobarse; la breve documentación pública del disparador no garantiza ese payload. No inventar datos ausentes ni pedir al usuario una compra innecesaria: validar en su próximo pago normal compatible.

## Entregable de plantilla y publicación
El proyecto debe ofrecer una plantilla preparada. Este paquete contiene su especificación y contrato, **no un archivo `.shortcut` firmado ni un enlace iCloud**. Codex debe producirla y validarla con herramientas compatibles disponibles. Un JSON renombrado como `.shortcut` no es un instalador.

Si el entorno de Codex no permite crear/validar/publicar un atajo, debe entregar el blueprint exacto y señalar el paso que debe realizar el responsable del proyecto en Atajos desde un dispositivo Apple. Esto es una tarea de preparación del proyecto, no el flujo que se espera de cada usuario final. No mostrar “Añadir a Atajos” como funcional hasta tener enlace real.

Configuración por servidor: `shortcutIcloudUrl`, `templateVersion`, `shortcutName`, `minSupportedVersionTested` y estado de disponibilidad. El último campo indica versión probada, no compatibilidad universal. Si no hay URL, mostrar “Plantilla pendiente de publicar”.

## Blueprint funcional que debe construir Codex
Modos de la plantilla: `pair`, `connection_test`, `capture` y `retry_pending` (este último solo si la cola duradera se implementa y prueba).

**Vinculación**: recibir ticket, verificar destino HTTPS esperado, canjearlo por token de dispositivo limitado y guardar configuración para futuros eventos. Revisar almacenamiento y permisos iniciales en Atajos. Una configuración en Archivos no debe presentarse como Keychain o caja fuerte cifrada. Evitar que el token acabe en una plantilla pública o fichero sincronizado sin explicación. Si no se logra almacenamiento persistente automático seguro y fiable, documentar alternativa de configuración de una sola vez.

**Captura**: recibir entrada del disparador; extraer exclusivamente datos disponibles; aplicar un parser verificado; resolver alias de tarjeta mediante el mapeo del servidor; crear un UUID antes del primer envío; enviar por HTTPS con token en cabecera. Preservar el mismo UUID en reintentos. No abrir la web en cada compra si el flujo real no lo requiere.

**Sin conexión**: para asegurar reenvío, la plantilla necesita una cola duradera propia y probada, distinta de la de la PWA. Si no existe, avisar del fallo sin decir “quedó pendiente” como si se hubiera persistido. No prometer captura sin pérdidas.

## API propuesta
| Endpoint | Acceso | Propósito |
|---|---|---|
| POST /api/shortcuts/pairing-tickets | Sesión del usuario | Crear ticket temporal de alta entropía |
| POST /api/shortcuts/pair | Ticket válido | Consumirlo atómicamente y emitir token limitado |
| POST /api/shortcuts/test | Token del dispositivo | Registrar prueba, sin transacción financiera |
| POST /api/shortcuts/events | Token del dispositivo | Validar evento, deduplicar y registrar o revisar |
| GET /api/shortcuts/status | Sesión del propietario | Leer estado y última recepción |
| DELETE /api/shortcuts/devices/:id | Sesión del propietario | Revocar token y desconectar |
| POST /api/push/subscriptions | Sesión del usuario | Guardar suscripción autorizada |
| DELETE /api/push/subscriptions/:id | Sesión del propietario | Desactivar dispositivo |
| POST /api/push/test | Sesión del propietario | Enviar prueba con límite de frecuencia |

Usar tokens aleatorios de alta entropía, hashes en almacenamiento servidor, vencimiento corto para tickets (propuesta: cinco minutos), consumo único, revocación y límites distribuidos de intentos. Un contador en memoria de una función serverless no basta. El token del atajo solo permite ingresar eventos y hacer su prueba, no leer historial, editar, borrar ni elegir otro usuario.

Payload de ejemplo en `examples/shortcut-event.json`: es **nuestro contrato propuesto**, no una descripción certificada de lo que iOS entrega. Campos faltantes van a revisión. Limitar longitud de notas/comercio y no guardar números completos de tarjeta o notificaciones bancarias sin filtrar.

Responder con estados distinguibles: `recorded`, `recorded_needs_category`, `needs_review`, `duplicate`, `conflict` o error. Inserción de evento/asientos y decisión de idempotencia en transacción atómica. Una respuesta repetida no crea otro aviso de compra.

## Estados de interfaz
Plantilla no disponible → atajo por añadir → vinculación pendiente → conexión verificada → esperando primera compra → último evento real recibido. El estado de automatización personal solo puede confirmarse mediante evidencia adecuada o declaración explícita del usuario, no suponerse por abrir Atajos.

Desconectar revoca la autorización del servidor; no afirma borrar automáticamente la automatización del iPhone. Ofrecer instrucciones para desactivarla también en Atajos.
