# Estado de implementación

Actualizado: 2026-09-26. Fase actual: **entrada sin encuesta obligatoria; validación en sesión remota e iPhone real pendiente**.

## Guía de primera visita · 26 de septiembre

- Al entrar por primera vez, PataWallet muestra un recorrido visual de cuatro pasos: Inicio, Cuentas, registro de movimientos y la diferencia entre Actividad y Plan. No solicita ni crea datos financieros, puede cerrarse en cualquier momento y queda disponible en Ajustes → Guía de uso.
- Se reutiliza la preferencia booleana histórica de onboarding para marcar que el usuario ya la vio; así no se requiere una migración ni se cambia la base de datos existente. La guía no se abre automáticamente en la demo, que ya identifica sus datos como ficticios, pero también puede verse desde Ajustes.
- Pendiente: verificar con sesión remota y en iPhone físico.

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
