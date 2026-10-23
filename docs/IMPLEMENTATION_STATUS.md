# Estado de implementación

## Respuestas del asistente con formato legible · 23 de octubre de 2026

- El asistente de PataWallet ahora recibe instrucciones para responder con una conclusión directa, un bloque breve de detalles y un siguiente paso opcional. Debe conservar los importes calculados, indicar el periodo cuando aplica y distinguir ingresos, gastos, transferencias, reembolsos y pagos de tarjeta sin inventar datos.
- La interfaz convierte la salida en bloques seguros de texto: etiquetas visibles, párrafos y listas ordenadas. Se eliminan asteriscos, separadores y marcas Markdown sobrantes sin renderizar HTML generado por el modelo.
- Verificado con `npm run lint`, `npm run build`, `git diff --check` y una comprobación dirigida del parser de respuestas. El build conserva el aviso existente de un bloque minificado superior a 500 kB. No se probó con un proveedor Ollama real ni en un iPhone físico.

## Búsqueda Bancolombia por contenido y sugerencias de clasificación · 13 de octubre de 2026

- Al buscar desde una conexión OAuth con Bancolombia seleccionado, Gmail y Outlook incluyen mensajes que mencionan “Bancolombia” en asunto o cuerpo, además de los remitentes conocidos. Se descartan coincidencias de remitentes nuevos que no tengan lenguaje de operación para reducir correo irrelevante.
- Los remitentes nuevos quedan señalados en «Por revisar» para que la persona compruebe el mensaje y la operación. La coincidencia del nombre del banco no se considera autenticación del remitente.
- La instrucción de clasificación para IA ahora sugiere gasto ante compras, pagos y transferencias enviadas; sugiere ingreso ante dinero recibido, consignado o abonado. Distingue traslados propios, reembolsos y pagos de deuda. La evidencia puede venir del asunto o del cuerpo y la sugerencia requiere confirmación manual.
- La migración `20261013120000_mail_ai_classification.sql` ya se aplicó al proyecto de Supabase de producción. Como el proyecto no tiene tabla de historial de migraciones, se aplicó únicamente esta migración; hay que reconciliar la línea base antes de usar `supabase db push`.
- `npm run lint`, `npm run build` y `git diff --check` pasaron. El despliegue de producción `dpl_Hygbm4goaZUTa3uznxAtoSTtZEuv` está `READY` para el commit `a696268`, basado en la última versión que estaba en producción. El dominio `pata-wallet.vercel.app` responde HTTP 200. No se probaron buzones reales ni se ejecutaron pruebas automatizadas; cada aviso aún requiere confirmación manual.

## Acceso directo con protección biométrica · 13 de octubre de 2026

- Se eliminó la pantalla «Tu billetera está lista» y la acción «Toca la tarjeta para abrir». Después de elegir una portada, PataWallet abre directamente el Inicio; el bloqueo biométrico local permanece como protección de acceso cuando está activado.
- La selección de portada sigue apareciendo solo cuando todavía no existe una elección y se puede cambiar desde Ajustes.
- Verificado con `npm run lint`, `npm run build` y las pruebas E2E de portadas, Inicio y biometría en los tamaños configurados.

## Compatibilidad del desbloqueo biométrico en Android · 13 de octubre de 2026

- Android/TWA pinta primero la pantalla de desbloqueo y, tras una espera breve, solicita automáticamente la huella, el rostro o el método configurado. Si el navegador rechaza una solicitud automática, el botón queda disponible como reintento manual.
- Una recarga explícita de la página conserva la sesión visible: no abre el diálogo biométrico ni muestra una pantalla intermedia. Una apertura normal de la app conserva la solicitud automática; al volver desde segundo plano se vuelve a proteger la sesión.
- iPhone y escritorio conservan la solicitud automática al abrir la app; la protección local sigue activa en todos los casos.
- Verificado con `npm run lint`, `npm run build` y Playwright dirigido en 390×844, 375×812, Android 390×844 y 1440×900.

## Desbloqueo biométrico local · 13 de octubre de 2026

- Ajustes ahora ofrece «Desbloqueo biométrico» en Seguridad. Al activarlo, el navegador registra una credencial de plataforma mediante WebAuthn y PataWallet guarda únicamente su identificador local por espacio/dispositivo; la clave privada permanece en el autenticador del celular.
- Al abrir de nuevo la PWA o volver desde segundo plano, la app muestra un bloqueo y solicita el autenticador disponible. El sistema decide si presenta Face ID, Touch ID, huella u otro método compatible; la web no puede forzar una modalidad que el hardware no ofrece. La configuración no se sincroniza entre dispositivos.
- Se añadieron mensajes para navegador/dispositivo no compatible, cancelación y errores; no se presenta la biometría como cifrado ni reemplazo de la sesión Supabase. El flujo usa una comprobación local del autenticador y todavía requiere validar compatibilidad, VoiceOver y comportamiento en un iPhone físico.
- Verificado: `npm run lint`, `npm run build`, prueba dirigida `src/services/security/biometricUnlock.test.js` (2/2) y `tests/e2e/biometric.spec.js` (1/1 por tamaño del proyecto). La suite completa conserva cuatro fallos previos no relacionados: dos expectativas del parser bancario, una de sincronización de correo y una del resumen del asistente. No se probó biometría real en hardware.

## Lectura de avisos de Bancolombia · 13 de octubre de 2026

- El parser ahora reconoce montos con separador colombiano de miles (`$10.000`) y fechas recientes con año de dos dígitos (`13/10/26`), además de los formatos que ya aceptaba. Esto completa monto y fecha del candidato para mostrarlo en «Por revisar».
- La búsqueda manual de Gmail ahora está preparada para volver a consultar los últimos siete días y recuperar avisos que faltaron por retraso/fallo de Pub/Sub; la clave única existente evita duplicados. La búsqueda automática conserva su intervalo incremental.
- El correo sigue siendo un aviso pendiente: el usuario confirma si corresponde a ingreso, transferencia u otro tipo antes de crear un movimiento financiero. Los avisos ya guardados no se recalculan porque PataWallet no conserva el cuerpo del correo.
- `npm run build` pasó localmente y la compilación de producción de Vercel también pasó; el despliegue `dpl_5j9dwaArUVXULQfCSPwcRXJ19JUH` del commit `80fd12b` llegó a `READY` el 13 de octubre de 2026. Se mantiene la advertencia de un chunk superior a 500 kB. No ejecuté pruebas automatizadas. El parser ahora acepta el formato de monto y año observados en el aviso; la búsqueda manual vuelve a revisar siete días y deduplica. La causa exacta de que la entrega automática no llegara sigue sin confirmarse y requiere revisar los eventos de Gmail/Pub/Sub.

## Botones de tipo de movimiento sin sombra · 12 de octubre de 2026

- Se quitaron la sombra de los círculos y el relieve proyectado por sus símbolos en Compra, Ingreso y Pago de deuda del panel Nuevo movimiento. Se conservaron bordes, degradados y el indicador de selección.
- Verificado con `npm run lint`, `npm run build` y `git diff --check`. No se ejecutaron pruebas automatizadas ni se probó en iPhone físico.

## Guía para instalar desde el registro · 12 de octubre de 2026

- El paso «Conecta solo lo que quieras» ahora incluye una guía para agregar PataWallet como app. Selecciona pasos para iPhone/iPad, Android o computadora; la guía propone el dispositivo actual y enlaza instrucciones oficiales de Apple o Chrome.
- Cuando el navegador expone `beforeinstallprompt`, aparece «Instalar ahora» y se reflejan la respuesta y el evento real de instalación. Si no hay aviso compatible, se mantienen los pasos manuales; no se intenta instalar sin una acción de la persona.
- Verificado con `npm run lint`, `npm run build`, `git diff --check` y `npx playwright test tests/e2e/signup-install-guide.spec.js --workers=1`: 3/3 pasan a 390×844, 375×812 y 1440×900, incluida la selección de guías y el aviso de instalación simulado. Revisé las capturas de esos tamaños. No probado en iPhone físico.

## Ajustes de exportación simplificados · 12 de octubre de 2026

- Se retiraron de Ajustes los controles manuales «Descargar respaldo» y «Restaurar JSON» para simplificar el manejo de datos. Se mantienen la exportación CSV y el Excel para contador.
- No se añadió un servicio de respaldo automático; la sincronización existente conserva su propio estado y control.
- Verificado con `npm run lint`, `npm run build` y `git diff --check`. No se ejecutaron pruebas automatizadas.

## Exportación legible y resumen para contador · 12 de octubre de 2026

- El CSV de movimientos ahora usa encabezados en español, fechas de Bogotá ordenables, tipos/orígenes/estados traducidos, nombres de cuenta y categoría, montos en unidades monetarias y separador compatible con Excel en configuración regional española. Se quitaron los identificadores internos de la tabla visible y se conserva la protección contra fórmulas de hoja de cálculo.
- «Excel para contador» genera un libro `.xlsx` con dos hojas: detalle del año gravable elegido y resumen anual/mensual/por categoría separado por moneda. Incluye saldos de cuentas reconstruidos al 31 de diciembre a partir de movimientos registrados y una advertencia para contrastarlos con certificados oficiales. El resumen incluye los tipos excluidos para evitar doble conteo y los movimientos pendientes/anulados aparte; excluye del total los registros marcados como demostración.
- La segunda hoja incluye una lista para reunir RUT, certificados y extractos patrimoniales, soportes de ingresos y pagos, documentos de bienes/deudas e información exógena DIAN, con enlace a la guía oficial. Las categorías de la app quedan marcadas como pendientes de validación fiscal.
- Límites explícitos: la exportación solo organiza lo guardado en PataWallet; no certifica patrimonio al cierre, no determina ingresos gravables o gastos deducibles, no reemplaza soportes ni calcula/presenta la declaración. El contador debe contrastar datos y documentos de origen.
- Verificado con `npm run lint`, `npm run build` y `git diff --check`. El build avisa que el paquete ExcelJS genera un bloque minificado de unos 930 KB (256 KB gzip) y queda incluido en la precarga de la PWA. No se ejecutaron pruebas automatizadas ni se probaron archivos con Excel/iPhone físicos o datos fiscales reales.

## Métricas y accesos al asistente desde el dock · 12 de octubre de 2026

- Se añadieron al dock móvil los accesos «Asistente» (chat financiero existente) y «Métricas». La navegación lateral de escritorio también los ofrece.
- Métricas muestra ingresos, gastos netos, flujo neto, promedio diario, evolución de seis meses, principales categorías y una proyección de gasto al cierre calculada desde los movimientos guardados. Respeta el ajuste de montos ocultos y actualiza sus cálculos cuando cambia el estado financiero en la app.
- La proyección se etiqueta como estimación y no incluye ingresos futuros ni pagos programados. Verificado con `npm run lint` y `npm run build`; no se ejecutaron pruebas automatizadas ni se probó en iPhone físico.

## Navegación móvil desplegable · 12 de octubre de 2026

- La barra inferior inicia compacta con Inicio anclado a la izquierda. El primer toque solo despliega Actividad, Plan, Cuentas y Parejas hacia la derecha, sin cambiar de sección; al tocar Inicio otra vez, navega al panel y cierra el menú. Elegir otra sección también cierra la barra.
- El menú comunica su estado a lectores de pantalla, retira los enlaces ocultos del recorrido de teclado y se puede cerrar con Escape. Se respeta la preferencia del sistema para reducir movimiento.
- Verificado con `npm run lint`, `npm run build` y `git diff --check`. No se ejecutaron pruebas automatizadas ni se probó en un iPhone físico.

## Iconos de Parejas sin sombra · 11 de octubre de 2026

- Se quitaron las sombras exteriores y las sombras de los trazos de iconos en Parejas, incluidos integrantes, cuentas compartidas e invitaciones. Se mantienen colores, contornos y fondos.
- Verificado con `npm run lint`, `npm run build` y `git diff --check`. No se ejecutaron pruebas automatizadas ni se probó en un iPhone físico.

## Fondo del panel de cuentas · 11 de octubre de 2026

- Se quitó el panel blanco detrás de la acción para agregar y la lista de cuentas en el tema claro. Las cuentas mantienen su propia superficie y borde.
- Verificado con `npm run lint`, `npm run build` y `git diff --check`. No se ejecutaron pruebas automatizadas ni se probó en un iPhone físico.

## Iconos planos y alta compacta en Cuentas · 11 de octubre de 2026

- Se quitaron las sombras de los iconos en toda la sección Cuentas, incluidos los accesos a deudas, gastos fijos y pagos.
- «Agregar cuenta» y «Agregar deuda» usan ahora botones compactos alineados a la derecha. También se eliminó el espacio reservado para sus botones circulares grandes.
- Verificado con `npm run lint`, `npm run build` y `git diff --check`. No se ejecutaron pruebas automatizadas ni se probó en un iPhone físico.

## Actividad como historial de solo consulta · 11 de octubre de 2026

- Se eliminó «Registrar» y el espacio asociado de Actividad. El registro de movimientos sigue disponible desde las otras acciones globales.
- Verificado con `npm run lint`, `npm run build` y `git diff --check`. No se ejecutaron pruebas automatizadas ni se probó en un iPhone físico.

## Acciones compactas y filas de Cuentas · 11 de octubre de 2026

- En Actividad, «Registrar» ahora es un botón compacto con signo más; se redujo el espacio reservado que dejaba el botón circular anterior.
- En Plan, «Nueva meta» quedó junto al encabezado «Metas activas» y se eliminó el espacio que se reservaba para el botón flotante.
- En Cuentas, se quitaron las sombras de los iconos de cuenta. Las opciones de editar/archivar se alinearon con cada saldo; las filas usan menos relleno y, en móvil, el saldo aparece debajo del nombre para darles espacio.
- Verificado con `npm run lint`, `npm run build` y `git diff --check`. No se ejecutaron pruebas automatizadas ni se probó en un iPhone físico.

## Descartar avisos con gesto lateral · 11 de octubre de 2026

- En Notificaciones, deslizar un aviso hacia la izquierda lo descarta; un deslizamiento corto revela también la acción «Eliminar». El botón sigue siendo accesible con teclado.
- El aviso se marca como descartado usando la resolución existente de correos bancarios, sale de la bandeja pendiente y no crea movimientos ni cambia saldos. Si falla la resolución, se conserva el aviso y aparece un mensaje para reintentar.
- Verificado con `npm run lint` y `npm run build`. No se ejecutaron pruebas automatizadas ni se probó en un iPhone físico.

## Notificaciones sin tarjeta contenedora · 11 de octubre de 2026

- La bandeja ya no muestra el panel blanco de «Por revisar». El encabezado y la acción de actualizar quedan sobre el fondo de la página, y cada aviso aparece como una fila independiente separada por una línea sutil. También se quitó el contenedor del estado vacío.
- La lista sigue abriendo el editor habitual de movimientos y conserva recarga, paginación, carga y recuperación de errores.
- Verificado con `npm run lint` y `npm run build`. No probado en un iPhone físico.

## Descartar eventos de Atajos no reconocidos · 11 de octubre de 2026

- Los eventos de Atajos pendientes sin movimiento asociado pueden descartarse desde «Revisar ahora». La app pide confirmación, los saca de «Por revisar» y no crea gastos ni cambia saldos; conserva el registro de forma cerrada para idempotencia y auditoría.
- Los eventos que ya generaron un movimiento no muestran esta acción. El endpoint valida usuario, versión, estado pendiente y ausencia de movimiento asociado antes de cerrar el aviso.
- El cierre usa los campos existentes de resolución y versión de `incoming_events`; no requiere una migración de esquema.
- Verificado con `npm run lint` y `npm run build`. No se probaron eventos reales.

## Iconos de notificaciones y ajustes sin sombra · 11 de octubre de 2026

- Se quitó la sombra exterior de los iconos de notificaciones y Ajustes en la barra superior; se mantienen su contorno, fondo y color.
- Verificado con `npm run lint` y `npm run build`.

## Altura de pantalla al elegir la tarjeta · 11 de octubre de 2026

- El selector de portada y la entrada con tarjeta usan `100dvh` como altura mínima, con valores alternativos para navegadores anteriores. Esto evita que Safari deje visible el fondo claro del documento debajo de la pantalla oscura.
- Verificado con `npm run lint` y `npm run build`. No se comprobó en un iPhone físico.

## Inicio simplificado y sin acceso punteado · 11 de octubre de 2026

- La cabecera muestra «Balance» junto al selector de mes; el selector conserva el campo mensual y actualiza los resúmenes existentes. El saldo queda como cifra principal, con su etiqueta, moneda y control para ocultarlo debajo.
- Ingresos y gastos usan tarjetas compactas. Se retiró el botón punteado «Agregar»; el botón flotante móvil y «Nuevo movimiento» del menú de escritorio siguen abriendo el formulario, con sus tipos actuales.
- Ambos temas conservan la misma composición y aplican su propia paleta. Verificado con `npm run lint`, `npm run build` y revisión local en Chromium a 390×844 (tema nocturno y claro), 375×812 y 1440×900 (tema claro): no hubo errores de página ni desbordamiento horizontal; el selector cambió a septiembre de 2026 y el botón flotante abrió el formulario con compra, ingreso, pago de deuda y transferencia. No probado en iPhone físico.

## Mismo diseño de Inicio en ambos temas · 11 de octubre de 2026

- Inicio claro y nocturno comparten título, saldo, selector de mes, totales, movimientos recientes y próximos pagos. Cambian los colores según el tema.
- El botón punteado descrito en la primera iteración se retiró en la sección más reciente. El botón flotante móvil y el menú de escritorio conservan el acceso al formulario. Compra, ingreso, pago de deuda y transferencia siguen disponibles allí.

## Inicio nocturno sin GlassHero · 11 de octubre de 2026

- El saldo de Inicio en modo oscuro ya no usa el `GlassHero` ni su ilustración SVG. Las acciones para ingreso y pago de deuda están disponibles dentro del formulario «Agregar».
- El importe del saldo se muestra en blanco para mantener el contraste sobre el fondo oscuro.
- Cambio implementado; aún no se ha vuelto a verificar visualmente.

## Resúmenes sin forma tipo burbuja · 11 de octubre de 2026

- Actividad, Plan, Cuentas y Parejas muestran los montos sin la forma SVG decorativa detrás. Se conservan sus etiquetas, controles, círculos de avance y acciones; las acciones que antes se superponían a la forma vuelven al flujo normal.
- El componente `GlassHero` mantiene su opción ilustrada para las otras pantallas. Las vistas de presupuesto y gastos fijos, pagos y deudas en Cuentas también usan la variante sin ilustración.
- Verificado con `npm run lint` y `npm run build`. Playwright pasó 6/6 pruebas en 390×844, 375×812 y 1440×900: el tema claro recorrió las rutas objetivo y confirmó que no se renderiza el SVG; la prueba de Parejas verificó el saldo compartido. No probado en iPhone físico.

## Paleta de toda la app según la portada elegida · 11 de octubre de 2026

- Las cinco portadas tienen una paleta compartida. La elección aplicada al registro también define fondos, superficies, bordes, acentos, botones principales, navegación, controles, iconos, focos y la tarjeta de saldo; cambiarla desde Ajustes actualiza la app en el momento.
- La misma paleta se usa en el registro, el selector y la entrada con tarjeta y la configuración opcional de correo/notificaciones. Inicio conserva su superficie clara, con sus acentos, acciones y superficies teñidos por la portada. La opción de Ajustes ahora explica este alcance.
- Verificado con `npm run lint` y `npm run build`. Revisé manualmente la demo local en 390×844 (Inicio y entrada de tarjeta), 375×812 (Ajustes) y 1440×900 (Actividad); cambié la portada desde Ajustes y confirmé que la paleta activa pasó a Nutrias. Sin errores de página ni desbordamiento horizontal. No ejecuté la suite automatizada ni probé un iPhone físico. El código se envió a `main`; no confirmé si Vercel ejecutó el despliegue automático.

## Inicio ligero inspirado en la referencia · 11 de octubre de 2026

- La pantalla Inicio adopta una composición gris clara y despejada: saldo en cuentas destacado, selector del mes, ingresos y gastos en indicadores compactos, acceso discontinuo «Agregar» y un botón flotante azul en móvil.
- Ambos accesos de agregar abren el formulario actual, que conserva compra, ingreso, pago de deuda y transferencia. También siguen visibles los movimientos recientes y próximos pagos; el presupuesto, margen, metas, compras previstas y cuentas permanecen dentro del detalle desplegable.
- Se conservan el cálculo real del saldo, moneda, ocultar montos, selección mensual, enlaces a las secciones y el aviso de datos de ejemplo locales. La adaptación visual clara se aplica al Inicio.
- Verificado: `npm run lint` y `npm run build`. Revisé manualmente 375×812 y 390×844; el documento no presenta desbordamiento horizontal. En 1440×900 comprobé el ancho del contenido y del menú lateral. Confirmé en el formulario que siguen disponibles compra, ingreso, pago de deuda y transferencia. No guardé ningún movimiento. No probé en iPhone físico ni revisé visualmente aquí el estado vacío.

## Inicio de sesión dentro de la bienvenida · 11 de octubre de 2026

- «Ya tengo cuenta» reemplaza los botones por el acceso en el espacio de la bienvenida; el encabezado, el mensaje y la ilustración permanecen. Incluye correo, contraseña con control para mostrarla, Google cuando está habilitado, recuperación y regreso al inicio. La recuperación también se muestra dentro de la bienvenida.
- Verifiqué el cambio de vista y regreso en local; revisé 375×812, 390×844 y 1440×900, sin desbordamiento horizontal y con el contenido visible. `npm run lint` y `npm run build` pasan. No envié el formulario ni inicié OAuth o recuperación; no probé en iPhone físico.

## Activación de correo y notificaciones durante el primer acceso · 11 de octubre de 2026

- La selección de correo y notificaciones del registro ahora abre, inmediatamente después de iniciar sesión, una pantalla de configuración interactiva con los controles ya existentes de Gmail/Outlook y Web Push; aparece antes de elegir la portada si todavía falta.
- Para el correo la persona elige bancos y acepta explícitamente el alcance antes de ir al proveedor OAuth. Para notificaciones, el botón activa el permiso del dispositivo y registra la suscripción con la cuenta autenticada. Estados incompatibles, proveedor no configurado, denegación y errores siguen visibles.
- El registro todavía solo guarda la preferencia de mostrar esa pantalla. La conexión no puede hacerse antes de una sesión activa; si Supabase pide confirmación de correo, la activación queda para cuando la persona vuelva con su cuenta confirmada. Atajos conserva su guía independiente.
- No se solicitaron permisos reales, no se conectó un buzón y no se modificaron Supabase ni Vercel durante este cambio.
- Verificado: lint y build pasan; pruebas del registro y activación 5/5. Playwright pasó 3/3 en 375×812, 390×844 y 1440×900; confirmó controles de correo, requisito de consentimiento y presencia del botón push en una PWA compatible, sin desbordamiento ni errores de página. Se simuló el entorno push y no se solicitó permiso al sistema.
- La suite completa quedó en 211 pasaron y 2 fallaron en expectativas preexistentes del parser bancario (`7,90.0` y separadores alternos de Lulo), ajenas a este cambio. No probé OAuth, no conecté buzones ni pedí permiso push real. WebKit de escritorio no sustituye la prueba en iPhone físico; depende de la configuración de Gmail/Outlook y VAPID del entorno.

## Tema según la portada elegida · 11 de octubre de 2026

- La selección de portada ahora tiñe toda la experiencia de registro: acentos de marca y progreso, flechas, selección de moneda y categorías, enlaces secundarios y botones principales con gradiente y sombra propios.
- Verificado con captura local en Chromium a 375×812, 390×844 y 1440×900; sin desbordamiento horizontal ni errores de página. `npm run lint` y `npm run build` pasaron. No se probó en iPhone físico.

## Iconos de categoría sin placa · 11 de octubre de 2026

- Los pictogramas conservan sus tonos y volumen con luz y sombra, pero ya no aparecen dentro de un recuadro. Aplicado al presupuesto inicial y al historial de movimientos, incluidas categorías personalizadas.
- Verificado: `npm run lint` y `npm run build`. No se probó en iPhone físico.

## Iconos tridimensionales de categorías · 11 de octubre de 2026

- Se creó un componente compartido para el presupuesto inicial y el historial de movimientos. Los nombres reconocibles reciben un pictograma adecuado; los personalizados usan un símbolo general según el tipo de movimiento, y ambos conservan el mismo tratamiento visual.
- Verificado: `npm run lint` y `npm run build`. No se probó en iPhone físico.

## Iconos 3D en la selección de moneda · 11 de octubre de 2026

- Los símbolos de COP, GTQ, USD, EUR, MXN y GBP ahora aparecen en monedas CSS con canto estriado, bisel metálico y relieve. Cada divisa tiene acabado propio y la selección, búsqueda y navegación de teclado mantienen su comportamiento.
- Verificado: `npm run lint` y `npm run build`; Vercel Production quedó `READY` para `196b089`. Sin captura nueva de esta variante ni prueba en iPhone físico.

## Moneda base elegible durante el registro · 11 de octubre de 2026

- El paso «Tu moneda» ya ofrece COP, GTQ, USD, EUR, MXN y GBP en una lista buscable y accesible por teclado. El presupuesto inicial, sus campos y las etiquetas monetarias muestran el código elegido.
- La moneda queda en las preferencias iniciales de Auth y se persiste en `profiles.currency` al crear el perfil. Un perfil existente conserva la moneda guardada aunque aún tenga metadatos antiguos de registro. Ajustes muestra la moneda base; las cuentas, movimientos nuevos, presupuestos, metas, compras previstas, pagos fijos y resúmenes la usan. Cada movimiento histórico conserva su moneda y no hay conversión automática.
- Las copias de seguridad guardan y validan la moneda base, y se rechaza importar datos con una moneda distinta. Correo bancario y Atajos de iPhone siguen reportando COP; el registro muestra una explicación al elegir otra moneda y el servidor rechaza eventos cuya moneda no coincide con el perfil.
- Aplicada a Supabase `gzsuhlkvaiinphlcqelt` el 11 de octubre de 2026: amplía las restricciones a las seis opciones y ajusta las operaciones del servidor para validar la moneda base sin reescribir datos existentes. La verificación confirmó las seis restricciones y que no había filas con monedas fuera de las admitidas. El proyecto no tiene `supabase_migrations.schema_migrations`; se aplicó solo este SQL y no se reprodujo la cola histórica sin registrar. El código se envió a `main` y el despliegue de producción se verificó `READY` en `196b089`.
- Verificado: lint y build; pruebas dirigidas de moneda, contexto del asistente, migración y respaldo (29/29); suite completa (211 pasaron, 2 fallaron en expectativas previas del parser bancario: `7,90.0` y separadores alternos de Lulo). Playwright de portada pasó 3/3 y revisó 390×844, 375×812 y 1440×900. Una prueba antigua de `app.spec.js` falló en los tres proyectos porque espera el Inicio directamente, pero la app abre el selector de portada requerido antes del Inicio; el recorrido de esa prueba no refleja el flujo actual. No se probó en iPhone físico.

## Video con chroma en la bienvenida · 10 de octubre de 2026

- La portada de acceso muestra el clip aportado por Danilo en lugar de la tarjeta PNG. Se eliminó el verde por chroma key y se exportó WebP animado con alfa real (480×232, 72 cuadros a 12 fps, 1.139.174 bytes, en bucle, sin audio); el póster PNG de respaldo mide 480×232 y pesa 155.410 bytes.
- Ajuste de chroma del 10 de octubre: se redujo la tolerancia para que los tonos naturales del pelaje no se confundan con el verde del fondo. La revisión de seis momentos del clip confirma que se conservan las manchas del cachorro tricolor y las rayas del gato gris, manteniendo el fondo transparente. El PNG estático usa la misma corrección.
- La escena conserva sus colores sobre el fondo azul noche. El movimiento se reemplaza por el póster cuando `prefers-reduced-motion` está activo, el ajuste propio está en «Desactivado» o se oculta la pestaña; al volver a la página continúa la animación. PNG también queda como fuente alternativa del elemento `<picture>`.
- Ambos archivos están incluidos en la precarga offline de la PWA. El límite por archivo es 2.300.000 bytes; el build actual precarga 39 recursos (7.509,84 KiB).
- Verificación tras la corrección: `npm run lint` y `npm run build` pasaron; el build incluye los dos recursos en la precarga. Revisé seis momentos del clip sobre el fondo azul y la animación con transparencia en Chromium y WebKit (480×232, las esquinas permanecen transparentes y los fotogramas cambian). El póster PNG conserva alfa y se muestra con movimiento reducido. La bienvenida se revisó en Chromium a 390×844, 375×812 y 1440×900 sin desbordamiento horizontal; no registró errores de consola. La corrida anterior de Vitest dio 206 correctas y 2 fallidas (208 totales): expectativas previas del parser en `tests/api/bank-email.test.js` para `7,90.0` y separadores alternos de Lulo; no repetí esa suite en este ajuste de recursos. No probé en un iPhone físico.
- El video fue aportado por el usuario; la procedencia/licencia externa no se verificó independientemente. No se conectó Supabase ni se hizo una comprobación de despliegue.

## Bienvenida y conexiones durante el registro · 10 de octubre de 2026

- El acceso ahora empieza con una bienvenida propia de PataWallet y permite elegir entre crear cuenta o iniciar sesión. El acceso existente por correo, Google y recuperación de contraseña se conserva.
- El registro ofrece una selección opcional para pagos con tarjeta, lectura de transferencias por correo y notificaciones. La persona puede abrir el enlace oficial de Atajos o ver el tutorial; correo y notificaciones se configuran después de crear la cuenta. Las selecciones son preferencias, no permisos concedidos.
- Las preferencias se guardan en los metadatos de Auth tanto para el registro por correo como para la continuación OAuth de Google. Tras abrir la portada por primera vez, la app presenta una guía con accesos a Ajustes → Pagos con tarjeta, Correos bancarios y Notificaciones. La guía puede cerrarse y el ajuste de cierre se guarda en el navegador por usuario; los accesos siguen en Ajustes.
- Correo y notificaciones mantienen sus autorizaciones explícitas en las pantallas existentes. En iPhone, para solicitar avisos primero hay que instalar PataWallet en Inicio. Instalar el atajo y reproducir el video tampoco activan por sí solos una automatización personal. No se conectaron cuentas de correo ni se solicitaron permisos reales.
- Verificado: `npm run lint` y `npm run build`; pruebas dirigidas de preferencias y guía 5/5. Revisión visual a 390×844, 375×812 y 1440×900 sin desbordamiento horizontal. La suite completa dio 206 pasaron y 2 fallaron (208 totales): ambas expectativas ya conocidas del parser en `tests/api/bank-email.test.js` para `7,90.0` y separadores alternos de Lulo. No se probó OAuth, el permiso de notificaciones ni la instalación/ejecución del atajo en un iPhone real.
- No se desplegó la aplicación ni se modificaron servicios externos o registros financieros.

## Portada de billetera configurable · 10 de octubre de 2026

- Al primer acceso al espacio, la persona elige una de las cinco portadas: Guacamayas, Gatos, Perros, Conejos o Nutrias. En las siguientes aperturas de la ruta Inicio durante una sesión nueva, aparece esa tarjeta; tocarla abre el Inicio existente. Las rutas profundas de notificación no quedan bloqueadas por la portada.
- El selector recorre las portadas en un carrusel con gesto horizontal, flechas y teclado; ya no muestra botones de elección debajo. Las tarjetas vecinas quedan visibles detrás de la principal y cambian de posición con una transición suave; las flechas permanecen accesibles delante de la pila. Una sombra elíptica bajo la imagen da el efecto flotante.
- Al tocar la portada de entrada, esta se desliza hacia arriba y el Inicio aparece cuando termina el movimiento. Con movimiento reducido, Inicio se abre sin esperar la animación.
- La selección se guarda en `localStorage` bajo una clave separada por usuario o demo. Se puede cambiar desde Ajustes. No cambia cuentas, saldos ni movimientos y se identifica como una portada visual, no como una tarjeta de pago.
- Persistencia actual por navegador/dispositivo; no se sincroniza a otros dispositivos ni se incluye en la copia de seguridad financiera. No requiere ni altera el esquema de Supabase.
- Portadas RGBA reducidas proporcionalmente a 640×800 px; cada PNG pesa menos de 1 MB y entra en la precarga offline PWA. Mantienen transparencia y proporción.
- Verificación inicial del selector: `npm run lint` y `npm run build` pasaron; prueba unitaria dirigida 3/3 y `tests/e2e/wallet-cards.spec.js` 3/3 proyectos Chromium, incluyendo swipe, teclado y flechas. Para la pila y la apertura animada, `npm run lint` y `npm run build` pasaron; se revisaron capturas a 390×844, 375×812 y 1440×900 sin desbordamiento y la transición en 390×844. No se volvió a ejecutar E2E. El build precarga las imágenes en la PWA.
- La suite completa no se repitió en esta actualización. La corrida completa anterior dio 201/203; permanecen dos expectativas preexistentes del parser en `tests/api/bank-email.test.js` (`7,90.0` y separadores alternos de Lulo). Pendiente comprobar visualmente en iPhone real.

## Registro de correos desde Nuevo movimiento · 5 de octubre de 2026

- Tocar un aviso abre el mismo panel «Nuevo movimiento» usado en Inicio, Actividad y las demás secciones. Precarga el monto detectado, comercio/nota y fecha/hora en America/Bogota; la categoría queda para selección manual.
- El movimiento se guarda mediante la acción habitual del libro. Usa un identificador ligado al aviso y, tras sincronizar el movimiento, marca el correo como vinculado; nunca vuelve a crear un segundo asiento desde el endpoint del correo. Si no se puede asociar por falta de conexión, el movimiento sigue guardado y el aviso queda pendiente.
- La bandeja no cambia de ruta ni despliega campos propios de correo dentro de cada fila. El panel compartido gestiona su cierre y validaciones habituales.
- Verificado: lint, build y `notifications-inbox.spec.js` (9/9) en Chromium de escritorio y móvil emulado. El formulario se comprobó sin desbordamiento horizontal a 390×844, 375×812 y 1440×900; los avisos y transacciones de la prueba son sintéticos.
- `npm test`: 198/200. Siguen fallando las dos expectativas preexistentes de `tests/api/bank-email.test.js` (`7,90.0` y separadores alternos de Lulo); esta edición no modifica el parser. No probado en iPhone real ni con una sesión bancaria real.

## Lectura y categoría sugerida de correos bancarios · 5 de octubre de 2026

- El parser ya no depende de que coincida toda la plantilla para mostrar el monto: si identifica un banco y encuentra un único importe explícito con `$`, lo precarga aunque el texto del correo haya cambiado. Si hay importes distintos o formatos numéricos dudosos, no adivina y pide revisión. Para Lulo acepta tanto `$111,300.00` como `$111.300,00`.
- El ejemplo de Lulo «Realizaste una compra en PRIMOR COLOMBIA ÉXITO por $111,300.00» se prepara para precargar COP 111.300 en el campo y el resumen. Comercio y categoría son independientes; la categoría puede elegirse manualmente.
- No se conserva ni se vuelve a pedir el cuerpo del mensaje. Si un aviso no trae un monto usable, el renglón dice «Monto por confirmar» y el campo del editor queda vacío para completar.
- El registro desde la bandeja reutiliza el editor habitual: permite gasto o ingreso según la dirección detectada y deja la categoría bajo decisión manual. La lista muestra fecha, comercio, monto detectado o «Monto por confirmar».
- No se usa IA ni se cambia el registro automático. Los avisos pendientes nuevos muestran el monto extraído aunque el formato no esté soportado; los avisos antiguos sin monto no se pueden recalcular porque el cuerpo no se conserva. `eslint .` y `vite build` pasan localmente con Node 24.19.0; el proyecto declara Node 22.x. No ejecuté pruebas automatizadas. Revisé visualmente el aviso y la transferencia en la PWA publicada con navegador integrado; falta probar medidas exactas de 390×844 y 375×812, escritorio y iPhone real.
- Desplegado a Production en Vercel como `dpl_9m6fbVXEDoiopYoLJWTXYyacti4n`, Ready y con alias `https://pata-wallet.vercel.app`. No se alteró ni confirmó ningún movimiento durante la revisión. El escaneo de logs de errores de la última hora no encontró registros.

## Captura de pagos sin contacto desde Atajos · 5 de octubre de 2026

- Se reportaron tres pagos sin contacto que no llegaron a Actividad; el iPhone mostró «La conexión de red se perdió» y «Por revisar» quedó en 0. El aviso de correo de PataWallet solo indica que detectó un correo bancario; no confirma que el evento de Wallet se haya guardado.
- Riesgo encontrado en el servidor: el endpoint hacía cuatro consultas y esperaba la clasificación por IA antes de llamar al RPC que guarda la compra. Se quitó esa clasificación del camino de captura; ahora autentica y llama directamente a `server_ingest_shortcut_event`. Si el servidor recibe el evento pero no puede asignar categoría, la compra sigue en revisión. Esto elimina esperas opcionales antes de guardar, pero no confirma sin registros que esa fuera la causa exacta de los tres fallos.
- La plantilla no tiene cola local duradera: si el teléfono pierde red antes de enviar el evento, la compra puede perderse. Los tres pagos reportados no se pudieron recuperar porque no aparecen en Actividad ni en «Por revisar».
- Se inspeccionó el atajo público de iCloud (48 acciones, versión `1.0.0`): la captura usaba la clave HTTP `Authorization ` con un espacio final, mientras el servidor requiere `Authorization`. En Atajos para macOS se publicó la versión corregida con la clave exacta `Authorization`, URL `/api/shortcuts/events` y nombre/versión conservados. Apple generó el enlace oficial `https://www.icloud.com/shortcuts/8062e3a7c10748a7aceaf47b9d0fdb19`; su ficha pública carga como «PataWallet - Registrar compra».
- Vercel Production ahora tiene `SHORTCUT_ICLOUD_URL` apuntando a ese nuevo enlace, `SHORTCUT_TEMPLATE_VERSION=1.0.0` y `SHORTCUT_NAME=PataWallet - Registrar compra`. El despliegue final `HmRNaiiNBVTVXFZL2tabkqDHhcRN` quedó Ready y asignó `https://pata-wallet.vercel.app`; así la microapp ofrece el enlace corregido. El enlace anterior de septiembre fue reemplazado porque su copia compartida conservaba el encabezado defectuoso.
- En la duplicación del iPhone físico se confirmó que la automatización personal de Wallet ya estaba activa para pagos sin contacto con cualquiera de seis tarjetas o pases, sin filtros de categoría ni comercio. Su diccionario conecta tarjeta/pase, comercio y cantidad con el atajo `PataWallet - Registrar compra`.
- Se inspeccionó la rama real de captura: envía `POST /api/shortcuts/events`, lee el token local y construye el cuerpo JSON con `event_id`, `occurred_at`, `amount_minor`, `currency`, comercio y alias de tarjeta. La clave de autenticación instalada tenía el espacio final; se reemplazó en el editor del iPhone por el texto exacto `Authorization`. El editor guardó el cambio al volver a la biblioteca. No se leyó ni cambió el token.
- El archivo corregido también se firmó localmente con la herramienta oficial `shortcuts sign`. No se leyó ni cambió el token del dispositivo.
- No se ejecutó un `POST` autenticado ni una prueba de conexión desde el teléfono; tampoco se hizo una compra de prueba. Por eso la publicación y la configuración de la microapp están corregidas, pero todavía no se ha verificado el recorrido completo desde una compra de Wallet. La plantilla no tiene cola local duradera y puede perder el evento si no hay red.
- Verificado en este checkout: `npm run lint`, `npm run build`, `npm test` (200 pruebas en 37 archivos) y `npm run test:e2e -- tests/e2e/shortcuts-visual.spec.js --project=desktop --workers=1` (1 pasó, 1 se omitió). También se verificaron 48 acciones y el encabezado corregido antes de firmar, y la firma del archivo con `shortcuts sign`. Ninguna de estas pruebas ejecuta la compra desde Wallet.
- Pendiente: instalar/actualizar desde el enlace oficial nuevo en el iPhone y comprobar una prueba de conexión sin efectos financieros. Después, confirmar el disparador en una compra habitual compatible; no crear una compra solo para probar. Dependencias instaladas con Node 22.23.3 y `npm ci`; npm reportó 3 vulnerabilidades en el lockfile (1 baja, 1 moderada, 1 alta), sin aplicar actualizaciones automáticas.

## Importes de gastos en Actividad · 1 de octubre de 2026

- Los importes de gastos conservan el signo negativo y ahora usan el color rojo de estado de la app.
- Verificado: `npm run lint` y `npm run build`. Sin prueba visual en iPhone real.

## Selector mensual del presupuesto en Plan · 1 de octubre de 2026

- Plan permite elegir un mes hasta el actual. El presupuesto y los gastos por categoría muestran el período elegido; las metas, el dinero disponible y las compras previstas conservan el estado actual. Las etiquetas del resumen indican el mes consultado.
- Verificado: `npm run lint`, `npm run build` y `npm run test:e2e -- tests/e2e/plan-goals.spec.js --project=desktop --workers=1` (3/3). El flujo nuevo se recorrió en Chromium con viewports 390×844, 375×812 y 1440×900, sin desbordamiento horizontal.
- No verificado en iPhone real. Los proyectos móviles de WebKit no pudieron iniciar en este entorno; los tres tamaños se comprobaron en Chromium.

## Pago variable de gasto fijo desde correo · 30 de septiembre

- Al revisar un correo como gasto, se pueden vincular vencimientos fijos pendientes cercanos a la fecha del movimiento. El formulario compara el valor previsto con el real y explica la diferencia; al confirmar, guarda el importe real y marca solo ese vencimiento como pagado. El monto de las próximas recurrencias no cambia.
- La confirmación está preparada como operación SQL atómica para evitar que el gasto se registre sin cerrar el vencimiento (o viceversa). **Pendiente aplicar** `supabase/migrations/20260930160000_bank_email_recurring_payment.sql` en Supabase antes de publicar/usar esta opción en producción; no se modificó la base de datos.
- Verificado: `npm test` (199 pruebas), `npm run lint`, `npm run build` y la E2E del correo de Mercado a 390×844. La migración se revisó y tiene prueba de contrato, pero no se ejecutó contra PostgreSQL; producción y otros tamaños de pantalla no se verificaron.

## Ingresos recibidos desde notificaciones · 30 de septiembre

- Para avisos identificados como entrada, la revisión propone «Ingreso» y oculta tipos de salida como «Pago de deuda». Desde el mismo formulario se puede crear una categoría y queda seleccionada; el texto aclara que el abono posterior a una deuda se registra como otro movimiento. «Entre mis cuentas» sigue disponible para transferencias propias.
- Los avisos guardados sin dirección detectada conservan el selector completo, así que el movimiento existente se puede clasificar manualmente. Para el caso descrito: registrar primero el millón recibido en la cuenta donde entró y, al abonar la deuda, registrar el pago desde esa cuenta a la deuda.
- Verificado: lint, build, 197 pruebas unitarias y E2E de revisión entrante en Chromium a 390×844. No se confirmó ningún movimiento real.

## Transferencia recibida Lulo por Bre-B · 30 de septiembre

- El parser reconoce el aviso «Recibiste plata por Bre-B»: extrae contraparte, importe, fecha/hora de Colombia, referencia y últimos cuatro dígitos de la cuenta destino. La bandeja muestra «Recibiste dinero» y permite revisar el importe y la fecha. No selecciona ingreso/transferencia ni una cuenta, ni modifica saldos antes de confirmar; la moneda sigue pendiente si el correo solo usa «$».
- El aviso que ya estaba guardado conserva los campos vacíos: la deduplicación no vuelve a interpretar mensajes existentes. Puede completarse desde su formulario de revisión; los avisos nuevos con esta plantilla sí se procesan con la extracción corregida.
- Verificado: lint, build, 197 pruebas unitarias (incluida la regresión con fixture sintético) y 29 pruebas API de correo. Sin correo real ni movimiento financiero confirmado.

## Lista compacta de gastos fijos · 30 de septiembre

- Los vencimientos se ordenan en «Atrasados» y secciones por mes, con cantidad y total. Atrasados y el mes actual empiezan abiertos; si el mes actual no tiene vencimientos, se abre el primer mes próximo. Las recurrencias del mismo gasto se agrupan y conservan una casilla por fecha; cada mes pagina seis gastos.
- Verificado: `npm run lint`, `npm run build`, `npm test` (196 pruebas) y E2E de confirmar pagos y de una lista sintética de 30 gastos. La lista se comprobó en Chromium a 390×844, 375×812 y 1440×900. La E2E existente de Quincena falla antes de verificar ese flujo porque busca «Otras vistas de Inicio», control que la aplicación no monta actualmente. WebKit y un iPhone físico no se probaron.

## Confirmación de pagos fijos · 30 de septiembre

- El selector «¿Con qué pagaste?» ofrece solo cuentas activas con dinero disponible. Desde el mismo diálogo se pueden crear categorías de gasto; la nueva categoría queda seleccionada automáticamente.
- Verificado: `npm run lint`, `npm run build`, 196 pruebas unitarias y la E2E del flujo en Chromium a 375×812, 390×844 y 1440×900. Los pagos se registran como gastos desde dinero disponible. WebKit móvil no inició en este entorno; no se probó en un iPhone físico.

## Edición de deudas · 30 de septiembre

- El editor permite cambiar el tipo de deuda y su saldo pendiente. Cambiar el saldo agrega un ajuste explícito y conserva pagos y compras anteriores. Dejar el campo vacío mantiene el saldo; «Marcar como pagada» fija $0, y la lista resalta toda la tarjeta en verde, cambia la barra de avance a menta y muestra el chulito «Pagado». El plan de cuotas sigue siendo opcional.
- Verificado: `npm run lint`, `npm run build`, las 196 pruebas unitarias y la E2E en Chromium con 375×812, 390×844 y 1440×900. WebKit no inició en este entorno, así que Safari/iPhone sigue sin verificarse.

## Corrección de Web Push · 28 de septiembre

- Corregido el estado falso «Falta la clave pública VAPID»: el cliente obtiene la clave pública desde `/api/push/config` y la clave privada continúa solo en Vercel. No se rotaron claves, suscripciones ni datos financieros.
- Publicado en `main`; falta probar la solicitud de permiso y el aviso visible en un dispositivo instalado.

## Guía de notificaciones en iPhone · 29 de septiembre

- La explicación para añadir PataWallet a Inicio solo aparece cuando Safari en iPhone detecta que la web aún no está instalada. En equipos compatibles ya instalados, se oculta.
- Se explica el motivo, los tres pasos para instalar y luego conceder permiso, y se enlaza la guía oficial actual de Apple. Se quitó una nota interna de pruebas que no ayudaba al usuario.
- Verificado: lint, build, 181 pruebas unitarias y 4 E2E en 390×844 y 375×812. No se hizo prueba física en iPhone.

Actualizado: 2026-10-01. Fase actual: **ingesta automática Gmail configurada en infraestructura; falta verificar un correo nuevo de banco de extremo a extremo**.

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

## Enlace de notificación a revisión · 29 de septiembre

- Corregido el destino del push bancario: al tocarlo abre `/notificaciones` con el evento exacto expandido y su formulario Registrar / Ya existe / Descartar visible. Usa únicamente el UUID del evento en la URL; no incluye monto, comercio ni contenido del correo. Si el ID del aviso no tiene el formato esperado, abre la bandeja general.
- Verificado: lint, build, 183 pruebas unitarias y 6 E2E del flujo en escritorio, 375×812 y 390×844. La notificación real ya llega al teléfono según la prueba del usuario; el clic físico aún requiere confirmación después del despliegue.

## Compras con tarjeta Lulo por correo · 29 de septiembre

- El parser reconoce el formato «Realizaste una compra en … por $…» y extrae comercio, importe, dirección de salida y fecha/hora de Colombia. No crea ni confirma movimientos: sigue requiriendo la decisión del usuario.
- Los números de cuenta y comprobante no se guardan. La moneda permanece sin confirmar si el correo no incluye un código explícito; la UI pide revisar el importe antes de registrar.
- Aplica a correos procesados desde el despliegue; los avisos ya guardados no se recalculan al sincronizar de nuevo, por la deduplicación idempotente.
- Regresión con dos fixtures sintéticos basada en el formato compartido y un caso con fecha ajena previa: 28 pruebas del parser y 186 pruebas unitarias pasan; lint y build pasan. La autenticidad bancaria del remitente no queda certificada por este parser: el usuario debe comprobar el movimiento en Lulo antes de confirmarlo. Aún no probado en producción.

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

- Gmail Pub/Sub dispara la búsqueda incremental, los candidatos quedan pendientes sin alterar saldos y `push_outbox` encola la notificación «Tienes un movimiento por revisar» hacia `/notificaciones`; al tocarla, se abre directamente el evento pendiente correspondiente. El reenvío selectivo usa el mismo aviso.
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
- En la primera entrega, el botón era «Buscar correos» y no había reglas aprendidas. Desde el 5 de octubre, las reglas exactas confirmadas de Atajos también se pueden usar para sugerir categorías en correos. IA para correos, conciliación autónoma y Yahoo siguen fuera de alcance. Activación, seguridad, límites, fuentes oficiales y recuperación en `docs/MAIL_CONNECTIONS.md`; variables de servidor en `.env.example`.

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

## Enlace anterior del atajo en producción · 27 de septiembre (sustituido el 5 de octubre)

- El 27 de septiembre se actualizó `SHORTCUT_ICLOUD_URL` a `https://www.icloud.com/shortcuts/a804ef275939493cafca512894b61c8c`. La inspección posterior mostró que la copia compartida aún tenía `Authorization ` con espacio final; el enlace fue sustituido el 5 de octubre por la publicación corregida indicada arriba.
- Redesplegada la misma fuente de producción `2b634b3`, sin cambios de código de aplicación, SQL ni datos financieros. Vercel confirmó Ready en `E6AnEModX4DrPTF8rwyfwTD5G7Qr`, asignado a `pata-wallet.vercel.app`; el despliegue anterior `BqYVpnwUPKb8HRZYDbgKDha8kFkM` queda como referencia de recuperación.
- En esa publicación intermedia se verificó que «Añadir atajo» entregaba el enlace configurado y que iCloud mostraba «PataWallet - Registrar compra». Esas comprobaciones y 7 pruebas confirmaban la URL, no el encabezado de captura; por eso el enlace se reemplazó al descubrir el espacio final. Evidencia histórica: `output/playwright/serial-check/shortcut-release.png`.
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
- La base nocturna fue inicialmente única; desde el 11 de octubre Inicio permite elegir también el diseño claro. Las demás rutas permanecen nocturnas y el color de la tarjeta elegida define los acentos globales.
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

## Ajuste de captura Wallet · 29 de septiembre de 2026

- El receptor de Atajos ahora acepta el campo `amount` que prepara la automatización de Wallet como pesos decimales inequívocos y lo convierte a centavos. Si el monto llega localizado/ambiguo, no lo adivina y conserva el evento para revisión.
- Verificación local: `tests/api/shortcut-contract.test.js` cubre monto numérico y texto ambiguo. Pendiente de compra real en iPhone: confirmar que la plantilla instalada envía la petición y verificar que el evento llega a PataWallet. Esta corrección del contrato no prueba ni repara un disparador que no se ejecute en iOS.

## Diagnóstico seguro de Atajos · 30 de septiembre de 2026

- Se agregó `POST /api/shortcuts/events/validate`: autentica la vinculación y comprueba contrato/normalización, informa campos faltantes, pero no llama a la IA ni a la función que registra eventos; responde explícitamente `event_persisted: false`, `financial_effect: false` y `notification_sent: false`. El control normal de frecuencia de solicitudes sigue aplicándose.
- Para una prueba manual controlada, cambia temporalmente en la acción “Obtener contenido de URL” del atajo la ruta `/api/shortcuts/events` por `/api/shortcuts/events/validate`, conserva POST, JSON y el encabezado Bearer; ejecuta con datos ficticios y verifica `ok: true`, `payload_complete` y los campos de `event`. Luego restaura `/api/shortcuts/events` antes de capturar compras reales.
- Esta prueba valida entrega del atajo, autenticación y lectura del payload; no simula una compra, no crea una notificación pendiente y no comprueba el registro real.
- La captura de prueba mostró `amount_minor` como número JSON, mientras el contrato solo aceptaba texto. Ahora acepta enteros JSON seguros en ese campo; fracciones y valores fuera de rango siguen sin redondearse y quedan ambiguos.
- Para errores del contrato, la ruta de validación devuelve pistas por campo y tipo esperado; las claves extra se muestran solo si tienen formato simple y nunca se reflejan valores. Pruebas locales cubren este límite; queda comprobar la respuesta desde Atajos en producción.

## Registro guiado de nuevas cuentas · 10 de octubre de 2026

- El registro ahora guía a la persona por bienvenida, nombre, portada visual, moneda, categorías/límite mensual opcional, información de Atajos y creación de cuenta. Conserva el acceso, recuperación de contraseña y Google cuando el proveedor está habilitado.
- Las preferencias se validan antes de guardarse. La cuenta nueva usa categorías existentes y puede crear un límite mensual general en la moneda base elegida; un límite ya presente no se reemplaza. La selección de portada queda en metadata de Auth y se usa al abrir la billetera.
- El selector de moneda de esa versión ofrecía solo COP; el 11 de octubre de 2026 se amplió a COP, GTQ, USD, EUR, MXN y GBP. El paso de Atajos explica dónde configurarlo después y aclara que no se instala ni activa durante el registro.
- Verificación local: `npm run lint` y `npm run build` pasaron. Revisión visual con viewport 390×844, 375×812 y 1440×900 sin errores de consola ni fallos de página.
- Pendiente: alta real en Supabase, confirmación de correo, retorno OAuth, persistencia remota de las preferencias con una cuenta de prueba y revisión en iPhone físico. La migración se aplicó el 11 de octubre y el código actualizado llegó a `main`; falta comprobar el despliegue automático.

## Bienvenida y acceso inicial · 10 de octubre de 2026

- La primera pantalla de acceso muestra la portada de PataWallet, una sombra para elevarla visualmente y dos acciones: crear una cuenta o iniciar sesión. El login, Google y recuperación siguen disponibles desde “Ya tengo cuenta”.
- “Crear cuenta” abre el registro guiado en el paso del nombre, sin repetir la pantalla de bienvenida.
- Verificación local: `npm run lint` y `npm run build` pasaron. Revisión Playwright en 390×844, 375×812 y 1440×900; sin desbordamiento horizontal, error de página ni solapamiento entre la portada y el botón. Se recorrieron las dos acciones y los seis pasos del registro sin crear una cuenta real.
- `npm test`: 37 archivos y 201 pruebas pasaron; 2 pruebas fallaron en `tests/api/bank-email.test.js` al analizar importes de correo Lulo/Nequi. Este cambio no modifica el lector ni su parser.
- Pendiente: probar la autenticación real y el flujo en iPhone físico. No se modificó Supabase ni se desplegó.

## Asistente financiero conversacional · 11 de octubre de 2026

- El asistente acepta preguntas financieras en lenguaje natural y conserva hasta tres intercambios anteriores mientras la pantalla siga abierta. «Nueva conversación» limpia ese contexto; no se guarda el chat al salir.
- El contexto ahora incluye los importes actuales, presupuesto, metas, deudas, totales acumulados, tendencias mensuales y categorías principales de los últimos 12 meses, además de hasta 12 movimientos recientes. Los resúmenes usan la lógica financiera de la app y las cantidades se envían formateadas.
- Antes de escribir, la pantalla explica que cada consulta comparte saldos, planes, tendencias y detalles limitados de movimientos con el proveedor de IA configurado. La demo continúa sin enviar sus datos. El endpoint mantiene autenticación, credencial solo de servidor, límites de entrada y respuestas de solo lectura.
- Verificado con `npm run lint`, `npm run build` y `git diff --check`. No ejecuté pruebas automatizadas ni consultas con datos reales; falta confirmar en el despliegue que Ollama tenga `OLLAMA_MODEL` y credencial configurados.

## Dos diseños para Inicio · 11 de octubre de 2026

- Inicio vuelve al diseño nocturno original por defecto y permite cambiar al diseño claro desde Ajustes. La preferencia usa el ajuste de apariencia ya persistido; no añade columnas ni migraciones.
- Ambas variantes conservan los mismos datos, saldo, movimientos, presupuesto, pagos, control de montos y acciones reales para compra, ingreso y pago de deuda. La tarjeta elegida sigue determinando los acentos de la app.
- El menú lateral de escritorio adapta su superficie y texto al diseño nocturno, en línea con el resto del Inicio.
- La verificación inicial cubrió dos composiciones de Inicio; en esa iteración las demás rutas aún permanecían nocturnas. El cambio descrito abajo extiende el tema claro a toda la aplicación.
- `npm test`: 211 de 213 pruebas pasaron; quedan 2 fallos en `tests/api/bank-email.test.js` por análisis de formatos Lulo/Nequi, fuera de este cambio. No se modificó Supabase ni se desplegó.

## Tema claro global · 11 de octubre de 2026

- Ajustes ahora lo presenta como “Tema de la app”. Claro y Nocturno se aplican a Inicio, Actividad, Plan, Cuentas, Parejas, Ajustes, Notificaciones y a la bandeja de movimientos por revisar.
- Los colores de acento siguen la tarjeta elegida; los tonos de texto, éxito y error se adaptan para mantener legibilidad sobre fondos claros. Se aclaran las superficies particulares de Cuentas, Inicio, Parejas, navegación y el panel de nuevo movimiento.
- La preferencia existente continúa guardándose con la misma clave de usuario; no hay cambios de esquema ni de operaciones financieras.
- Verificación de esta iteración: `npm run lint` y `npm run build` pasaron. `npx playwright test tests/e2e/home-design.spec.js --workers=1` pasó **3/3** en 390×844, 375×812 y 1440×900; recorrió las siete secciones, comprobó persistencia, movimientos, tema/acento y ausencia de errores de página o desbordamiento horizontal. Se generaron capturas por ruta y viewport; se revisaron ejemplos de Inicio, Actividad, Cuentas, Ajustes, Parejas, Notificaciones y el panel de movimiento. `npm test`: **211/213**; siguen los dos fallos conocidos del parser de correos Lulo/Nequi en `tests/api/bank-email.test.js`, ajenos al tema. No equivale a prueba en iPhone físico. Sin cambios en Supabase ni despliegue.

## Iconos planos en Inicio · 11 de octubre de 2026

- Se quitaron las sombras exteriores y los filtros de relieve de los iconos en Inicio y de los iconos de la navegación inferior. Se conservaron sus fondos, colores y botones.
- Verificación local: `npm run lint` y `npm run build` pasaron. No se ejecutaron pruebas automatizadas ni se revisó en un iPhone físico.

## Perfil e iconos de Ajustes · 11 de octubre de 2026

- Se alinearon los iconos de las filas de Ajustes con un tamaño común y se simplificó su relieve. La tarjeta de perfil usa una franja oscura translúcida para que el nombre y el correo blancos tengan contraste; conserva el acento de la portada elegida.
- Verificación local: `npm run lint` y `npm run build` pasaron. No se ejecutaron pruebas automatizadas ni se revisó en un iPhone físico.

## Recuperación manual de avisos bancarios · 13 de octubre de 2026

- Una búsqueda manual inicia una ventana nueva de treinta días si encuentra un cursor incremental anterior. Si la búsqueda manual tiene más de una página, conserva y continúa su propio cursor. Los avisos repetidos se siguen deduplicando en la bandeja.
- El analizador de transferencias recibidas de Bancolombia acepta el marcador `#` y los caracteres de enmascarado antes de los últimos cuatro dígitos de cuenta, como en el aviso compartido.
- Se admiten como remitentes exactos de Bancolombia `alertasynotificaciones@notificacionesbancolombia.com`, `alertasynotificaciones@ayn.notificacionesbancolombia.com`, `alertasynotificaciones@an.notificacionesbancolombia.com` y `alertasynotificaciones@bancolombia.com.co`, tanto en la búsqueda como en el parser. La captura de Gmail confirmó la variante `ayn.`; el usuario proporcionó las otras variantes. No se usa un comodín de dominio. Todo aviso continúa en revisión manual; el remitente por sí solo no autentica el contenido ni registra un movimiento.
- La respuesta de búsqueda ahora informa cuántos mensajes encontró, cuántos remitentes reconoció y cuántos avisos nuevos guardó. El log técnico conserva solo proveedor, conteos y tipo/estado de error; no registra dirección ni contenido del correo.
- Verificación tras añadir las variantes `an.` y `@bancolombia.com.co`: `npm run build`, `npm run lint` y `git diff --check` pasaron. El build mantiene una advertencia preexistente de chunk mayor a 500 kB. El cambio está en producción como parte del despliegue `dpl_Hygbm4goaZUTa3uznxAtoSTtZEuv`; no se probaron buzones reales.

## Clasificación asistida de avisos bancarios · 13 de octubre de 2026

- Gmail y Outlook pueden usar el modelo Ollama configurado en el servidor para sugerir si cada aviso describe una compra, ingreso, transferencia, pago de deuda o reembolso. El parser determinista conserva la extracción de monto/fecha disponible y la sugerencia no reemplaza esos valores.
- La lectura de contenido por IA exige una segunda autorización explícita y revocable por proveedor conectado. Se procesa asunto/texto de avisos compatibles; no se guardan contenido ni evidencia y no se envía a IA el canal de reenvío. Solo se almacena tipo sugerido y nivel de confianza.
- La revisión muestra la sugerencia sin seleccionar ni confirmar automáticamente el tipo. El usuario decide; no se crean movimientos ni cambian saldos hasta la confirmación existente.
- La búsqueda manual puede añadir una sugerencia a un aviso OAuth ya pendiente sin duplicarlo. La función SQL impide actualizar avisos resueltos, avisos reenviados y candidatos ya clasificados.
- La migración `20261013120000_mail_ai_classification.sql` se aplicó a Supabase de producción y el código se publicó en Vercel en `dpl_Hygbm4goaZUTa3uznxAtoSTtZEuv`. `npm run lint`, `npm run build` y `git diff --check` pasaron; persiste la advertencia existente de un chunk mayor a 500 kB. No se probaron buzones reales ni se ejecutaron pruebas automatizadas. La IA requiere `OLLAMA_MODEL`; si no está configurado, la búsqueda y revisión determinista siguen disponibles.

## Páginas públicas para revisión de marca OAuth · 14 de octubre de 2026

- Se creó una portada pública con el propósito de PataWallet Web, sus funciones principales, el flujo de revisión de avisos y una explicación del permiso de lectura de Gmail. La portada ofrece enlaces directos a privacidad, términos e inicio de sesión.
- `/privacidad` y `/terminos` son accesibles sin iniciar sesión ni inicializar Supabase. Si no hay sesión, `/` muestra la portada cuando Auth está configurado; `/?acceso=1` conserva el acceso y el registro. Los usuarios autenticados conservan Inicio.
- La política documenta los datos de Google que se leen, extraen, guardan, comparten y conservan; el consentimiento separado para clasificación por IA; los servicios externos; la desconexión; solicitudes de supresión; y una declaración expresa de Google Limited Use. Se actualizó el título y la descripción pública del sitio.
- Verificación: `npm run lint`, `npm run build` y `git diff --check` pasaron en la copia limpia de producción. La portada, privacidad y términos respondieron `200` y se revisaron en navegador a 375 × 812, 390 × 844 y 1440 × 900; no hubo errores de JavaScript. El build mantiene la advertencia existente de un chunk mayor a 500 kB.
- Estado: publicado en producción con el despliegue `dpl_ASQEyMLuRjvrbKVJNxEHczKUr3Uv` (`READY`) en `https://pata-wallet.vercel.app`. No se hicieron cambios al dominio, a Google Cloud ni a credenciales. La marca aún debe volver a revisión; la verificación de titularidad del dominio continúa pendiente. La identidad jurídica completa del operador y el plazo exacto de conservación de copias de proveedores requieren confirmación antes de afirmar cumplimiento legal total.

## Registro inicial, correo y avisos en cuentas nuevas · 23 de octubre de 2026

- El registro del service worker de PWA se movió al nivel de autenticación para que exista antes del onboarding. La activación de Web Push ya no depende de haber terminado la guía inicial; si el navegador no queda listo en doce segundos, la interfaz muestra una instrucción accionable en lugar de quedarse esperando.
- El borrador de registro de Google ya no se elimina al montar la pantalla de acceso. Se conserva hasta que `AuthProvider` aplica la configuración y después se limpia; el acceso normal y un registro por correo descartan borradores abandonados para no mezclar cuentas.
- La búsqueda manual de Gmail/Outlook amplió su primera ventana de siete a treinta días, conserva deduplicación y mantiene la paginación existente. Esto cubre avisos recibidos antes de que una cuenta nueva terminara su autorización.
- No se pudo confirmar desde este entorno un buzón real ni el estado de las variables de Vercel (`VAPID_*`, `CRON_SECRET`, credenciales OAuth). Sigue siendo necesario desplegar, probar en un dispositivo nuevo y comprobar los logs técnicos sin exponer contenido del correo.

## Auditoría visual transversal · 23 de octubre de 2026

- Se revisaron Inicio, Actividad, Plan, Cuentas, Parejas, Asistente, Métricas, Ajustes, Notificaciones y el formulario de nuevo movimiento en móvil y escritorio.
- El aviso de nueva versión ahora se coloca en la esquina superior derecha en escritorio para no cubrir listas, formularios ni tarjetas; en móvil conserva su posición sobre el dock y los márgenes de área segura.
- Los estados hover de campos se limitan a dispositivos que realmente admiten hover, evitando cambios de borde inesperados al tocar en móvil.
- Se conservaron la navegación lateral, el dock táctil, los estados vacíos, el foco visible, el soporte de movimiento reducido y la jerarquía visual existente. No se cambiaron datos ni operaciones financieras.
- Verificación de esta iteración: `npm run lint`, `npm run build` y `git diff --check` pasaron. Se revisaron las rutas en navegador a 390×844, 375×812 y 1440×900; no se ejecutaron pruebas automatizadas ni se comprobó en un iPhone físico. La corrección quedó desplegada en producción y el dominio responde HTTP 200.
