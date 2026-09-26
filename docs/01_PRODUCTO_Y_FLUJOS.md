# 01 · Producto y flujos

## Intención
Una billetera personal cálida, elegante y simple, no una contabilidad empresarial. La mascota acompaña; los números y las acciones importantes mandan. Usuario inicial: Danilo, español, iPhone. COP y `America/Bogota` son valores iniciales propuestos y editables; no asumir información bancaria personal.

La marca provisional es **PataWallet**. No se ha confirmado un nombre comercial, un dominio ni una paleta exacta. La preferencia confirmada es el estilo de animales, especialmente gatos. Las mascotas actuales son ilustraciones genéricas, no retratos de sus animales.

## Alcance de la primera versión funcional
Cuentas de efectivo, banco/billetera y tarjeta de crédito; gastos, ingresos, transferencias, pagos de tarjeta, presupuesto mensual, categorías, reglas por comercio, metas de ahorro, búsqueda e historial. Una moneda activa por perfil en el MVP. Cambiarla con datos existentes requiere migración explícita; no convertir números sin tipo de cambio.

Desde el diseño se contemplan PWA, notificaciones y captura compatible mediante Atajos. Su funcionamiento real llega por fases. Fuera del MVP: conexión bancaria directa, inversiones, impuestos, préstamos complejos, intereses automáticos, generación automática de cuotas, lectura OCR de recibos, presupuestos compartidos y seguimiento de caminatas. El apartado de caminatas de un mockup es un error, no una función solicitada.

## Navegación
Barra inferior: **Inicio · Actividad · + · Plan · Cuentas**. `+` abre un panel, no una página vacía. Ajustes se abre desde la cabecera. En escritorio usar navegación lateral compacta o adaptación equivalente; no escalar un teléfono gigante al ancho completo.

Rutas propuestas: `/`, `/actividad`, `/plan`, `/cuentas`, `/ajustes`, `/ajustes/notificaciones`, `/ajustes/automatizacion`. Bienvenida y acceso fuera del área autenticada. Conservar búsqueda, filtros y posición del historial al volver de un detalle.

## Bienvenida y acceso
Escena `welcome-family` con título y descripción fuera de la imagen. Una pantalla útil, sin carrusel obligatorio. Acciones: “Comenzar” y acceso existente. En Fase 1, “Probar con datos de ejemplo”; no pedir una contraseña para una autenticación ficticia. En fase real, correo y contraseña con confirmación y recuperación, o un método equivalente implementado y documentado. No mostrar Apple/Google si sus proveedores no están configurados.

Primer acceso: Inicio sin encuesta financiera obligatoria. Un recorrido breve y omisible explica Inicio, Cuentas, el botón para registrar y Plan; puede reabrirse desde Ajustes. La primera cuenta y su saldo actual se agregan desde Cuentas cuando el usuario lo necesite; deudas, gastos fijos, presupuesto, metas, notificaciones y atajo también se pueden completar después. La instalación PWA no debe impedir entrar.

## Inicio
Cabecera, selector de mes y botón para ocultar montos. Mostrar:
- **Saldo en cuentas**: suma de activos registrados, no saldo consultado al banco.
- Ingresos y gastos del mes seleccionado.
- Presupuesto: gastado, límite y restante; no llamar a este restante “saldo disponible”.
- Últimos movimientos, acceso a todos y contador de pendientes de revisión si existe.

La deuda aparece claramente en Cuentas y puede resumirse en Inicio sin restarla silenciosamente de “Saldo en cuentas”. Toda cifra deriva del modelo, nunca de constantes decorativas. Las ilustraciones en Inicio deben ser pequeñas y opcionales, no desplazar los movimientos bajo varios banners.

## Nuevo movimiento
Abrir panel inferior desde cualquier sección; permitir cerrar y volver sin perder la posición. Tipo inicial Gasto, con Ingreso y Transferencia. Monto en grande con teclado decimal nativo; categoría, cuenta visible preseleccionada, fecha actual y nota opcional en más detalles. No construir un teclado artificial solo porque el mockup lo dibuja.

Validar monto mayor que cero, límites razonables, cuenta válida y categoría para el registro manual. En una transferencia, origen y destino diferentes. Al guardar, deshabilitar el envío repetido, conservar borrador en error y actualizar datos solo de manera coherente con la persistencia. Confirmación discreta con “Deshacer”; no pantalla de celebración obligatoria después de cada gasto. Meta de usabilidad propuesta: registrar un gasto habitual en unos diez segundos, a comprobar.

## Actividad y detalle
Lista agrupada por fecha, signos y categorías visibles, búsqueda por comercio/nota y filtros de tipo, cuenta y “Por revisar”. Permitir abrir, editar, eliminar con confirmación y deshacer según el modelo. La búsqueda no modifica datos. Una edición conserva origen automático y auditoría; no crea otro gasto por accidente.

Si el evento automático tiene monto/cuenta/moneda válidos pero categoría desconocida, puede registrarse como gasto “Sin categoría” que sí entra en el total, y queda pendiente de categorizar. Si falta un dato financiero esencial o hay duplicado ambiguo, queda como **evento por revisar**, sin crear asiento ni afectar saldos. Mostrar la diferencia en la UI.

Al cambiar categoría, preguntar “¿Aplicar solo a esta compra o crear una regla para este comercio?”. La regla requiere decisión explícita. No inferir exactamente qué se compró en un comercio multipropósito.

## Plan
Dos apartados: presupuesto mensual y metas. Presupuesto global con categorías opcionales; barras y porcentajes calculados. Permitir editar límite; cuando se supera, expresar “Superaste el presupuesto por …”, no ocultar el exceso ni avergonzar al usuario.

Meta: nombre, monto objetivo y fecha opcional; aportes/reservas ligados a una cuenta propia. Reservar no mueve dinero en el banco. Mostrarlo como organización interna y no sumarlo de nuevo a los activos. Reservas editables y reversibles; advertir cuando dejan de estar cubiertas por fondos de esa cuenta. Celebrar la primera vez que la meta se alcanza, no cada vez que se abre la pantalla.

## Cuentas
Crear cuenta con nombre/alias, tipo y saldo o deuda inicial. En una deuda se puede registrar opcionalmente un plan informativo con total de cuotas, cuotas pagadas, valor de cuota y frecuencia. Modificar nombre y archivar; no borrar movimientos en cascada sin confirmación. Correcciones de saldo se registran como ajustes explícitos no presupuestables. Mostrar activos separados de tarjetas/deuda. El alias de tarjeta utilizado por Atajos se relaciona con una cuenta; no almacenar números completos, CVV ni acceso bancario.

## Ajustes
Tema oscuro único, montos ocultos, movimiento Sistema/Suave/Desactivado, moneda/configuración, exportación, notificaciones, automatización, seguridad y salida. No llamar “Face ID” a un botón ornamental. Los controles deben funcionar o explicar de forma visible por qué están pendientes.

## Estados imprescindibles
Vacío con acción útil; cargando sin saltos de layout; error recuperable; sin conexión; guardado local; sincronización pendiente; sincronizado según confirmación del servidor; conflicto; integración sin configurar. Un borrador no debe perderse al aparecer una actualización de la PWA.

En demo, mostrar “Datos de ejemplo · guardados solo en este navegador”. En producción, no usar “Todo sincronizado” hasta que no queden operaciones pendientes y el servidor haya confirmado la descarga/subida esperada.
