# Estado de implementación

Actualizado: 2026-09-15. Fase actual: **Fase 5 revisada localmente; ampliaciones funcionales validadas localmente**.

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
- Movimientos: el selector de Gasto, Ingreso y Transferencia muestra una explicación contextual; Transferencia aclara que mueve dinero entre cuentas y no altera ingresos ni gastos.
- PWA móvil: los campos usan al menos 16 px para evitar el zoom automático al enfocarlos; el viewport y los gestos de zoom se bloquean únicamente en modo app instalada, no en la web abierta en Safari.
- Cuentas en móvil: las filas reordenan explícitamente icono, detalle, saldo y acciones para evitar que el auto-placement de CSS comprima el nombre; los avisos de sincronización ya fluyen dentro del contenido y no cubren el encabezado. Cada cambio de ruta restablece el scroll al inicio.
- Inicio: el dashboard ahora incluye paneles rápidos de metas, próximas compras y cuentas, además del presupuesto y movimientos recientes, con enlaces a cada sección completa.
- Asistente IA: se añadió `/asistente` como consulta de solo lectura. El servidor valida sesión, origen, tamaño y entrada antes de llamar a Ollama; la clave y el modelo son variables exclusivas de servidor y la demo nunca envía datos. El contexto incluye importes formateados en COP y dinero libre calculado; la respuesta elimina marcas Markdown para mantener una lectura directa.
- Asistente IA: una burbuja flotante permite abrirlo directamente desde Inicio y las demás áreas de la app; se oculta dentro de la propia pantalla del asistente para no duplicar controles.
- Vercel Hobby: las reglas de categorización comparten la función de mapeos mediante un rewrite interno para mantener 12 funciones Serverless, el máximo del plan, sin cambiar las rutas públicas del cliente.

## Ampliación de punto de partida financiero · 13 de septiembre

- Onboarding guiado al entrar al espacio: salario mensual equivalente, frecuencia y próximo pago opcional; deudas con total pendiente y pago mensual; y gastos fijos repetibles.
- El resultado **Dinero libre** se calcula como salario − gastos fijos − pagos mensuales declarados de deuda. Los datos se guardan por usuario y no crean ingresos, gastos ni cobros automáticos.
- Las deudas nuevas se guardan como pasivos con apertura explícita y un campo separado de pago mensual declarado; no se inventa un número de cuotas para una deuda cuyo plazo no se conoce.
- Inicio y Plan muestran el desglose del dinero libre. Las próximas compras advierten cuando dejarían el margen en cero/negativo o cuando faltan más de 14 días para el próximo pago y el remanente sería menor al 25% del dinero libre mensual.
- Cuentas concentra la edición de gastos fijos junto a cuentas y deudas; Ajustes conserva las preferencias y fuentes de ingreso. Las migraciones `20260913100000_financial_onboarding.sql` y `20260913103000_debt_monthly_payment.sql` añaden las claves de configuración y el pago mensual de deuda; ambas están aplicadas en Supabase.
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
- `npm test`: PASÓ, 23 archivos y 97 pruebas. Incluye fuentes de ingreso vinculadas a cuentas, formato de importes, dinero libre, gastos fijos, fecha de próximo pago, pago mensual declarado de deuda, contratos de migración, reconciliación de sincronización y protección de Push.
- `npm run build`: PASÓ con Vite 8.3.0; 30 entradas y 1263,77 KiB de precaché. La configuración adapta el build del worker a `codeSplitting: false`, sin la opción obsoleta `inlineDynamicImports`.
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
