# 05 · Criterios de aceptación y pruebas

## Puertas de entrega
**Fase 1 — revisión de producto local**: pantallas navegables, cuatro imágenes reales integradas, tema oscuro con identidad Noche con Mascotas, altas/ediciones/borrados coherentes, presupuesto, reservas, filtros y persistencia local. Demo identificada. Integraciones sin configurar no muestran éxitos. Aprobación visual antes de servicios externos.

**Fase 2 — datos reales**: Auth, recuperación, permisos por usuario, esquema/migraciones, RLS, datos persistentes, cola local idempotente, conflictos, exportación y prueba de restauración. No usar la app como único registro personal hasta validar esta etapa.

**Fase 3 — PWA y Web Push**: instalación, HTTPS autorizado, worker, actualización y notificación real; verificar en dispositivo, no únicamente en un navegador de escritorio.

**Fase 4 — Atajos**: plantilla importable/publicada, vinculación persistente, automatización guiada, recepción real, revisión, deduplicación y desconexión. No se acepta una UI simulada como entrega de automatización.

**Fase 5 — acabado**: correcciones de visual, rendimiento y accesibilidad; animación interna de mascotas únicamente si existen los recursos necesarios. Estados pendientes explícitos en todo momento.

## Pruebas financieras automatizadas
1. Apertura de activo de COP 1.000.000 no crea ingreso del mes.
2. Ingreso de COP 3.200.000 sube activo e ingresos exactamente una vez.
3. Gasto de COP 85.000 desde activo baja ese saldo y aumenta gasto.
4. Transferir COP 200.000 entre activos no cambia su suma ni presupuesto.
5. Compra de COP 85.000 en crédito aumenta deuda y gasto, no baja la cuenta bancaria.
6. Pagar COP 100.000 a crédito reduce activo y deuda, no crea segundo gasto.
7. Reservar COP 300.000 para una meta deja activos y gasto intactos.
8. Editar/borrar/deshacer un movimiento revierte todos sus asientos, incluidas transferencias.
9. Evento automático incompleto no cambia totales; gasto completo sin categoría sí entra como Sin categoría.
10. Mismo device/event id repetido no duplica movimiento ni aviso. Mismo id con contenido distinto devuelve conflicto.
11. Reembolso vinculado reduce gasto y modifica activo/deuda correctamente; no se cuenta como salario.
12. Presupuesto superado muestra importe negativo/restante o exceso claro, no un cero engañoso.
13. Monto es-CO `85.000,50` se almacena como `8500050`; rechazar ambigüedad no contemplada y exceso de rango.
14. Un plan de deuda conserva total, cuotas pagadas, valor y frecuencia; rechazar planes incompletos o cuotas pagadas por encima del total.
15. Sueldo mensual y frecuencia de pago son referencias opcionales; no crean ingresos automáticos y se pueden quitar dejando ambos campos vacíos.
16. Fechas cercanas a medianoche y fin de mes usan la zona del perfil correctamente.
17. Cambio de usuario nunca mezcla bases locales, colas, cuentas o categorías.

`examples/demo-fixtures.json` incluye un conjunto ficticio estable con resultados esperados. No confundir sus fechas con la fecha actual de producción.

## Pruebas de UI
A 390×844, 375×812 y 1440×900: no hay scroll horizontal, botones cortados o saldo ilegible. Probar también modo horizontal y tamaños de texto ampliados. La barra inferior respeta áreas seguras. El teclado no impide completar ni guardar. Hojas/modales controlan foco, cierre y retorno al elemento que los abrió; no dejar el contenido del fondo navegable mientras son modales.

Todas las acciones tienen nombre accesible, estado de foco, semántica correcta y objetivos cómodos. Iconos no reemplazan sin explicación el texto esencial. Errores vinculados al campo. No depender solo del color para gasto/ingreso o estado. Contraste objetivo mínimo 4,5:1 en texto normal y 3:1 para componentes/gráficos esenciales, comprobado en la UI real [S22, S23].

Verificar las cuatro escenas incluidas sin cortes accidentales ni mezcla de estilos. No mostrar mockups enteros como aplicación. En modo noche las ilustraciones no se invierten ni quedan con bordes mal borrados. Montos ocultos también se ocultan en etiquetas accesibles/resúmenes cuando corresponda. Reducir movimiento detiene animación ornamental.

Conservar filtros y scroll al abrir/cerrar movimientos. Filtros vacíos muestran “No encontramos movimientos”, no una lista falsa. Borrar/deshacer conserva coherencia. Cambiar presupuesto y crear reservas actualiza números de todas las pantallas.

## Pruebas de datos, API y seguridad
Auth caducada, recuperación, usuario A intentando leer/escribir datos de B, referencias cruzadas, claves privilegiadas ausentes del bundle, RLS activada y endpoint de prueba push protegido. Tokens de Atajos inválidos, vencidos/revocados, ticket usado dos veces, tasa excesiva, payload grande, moneda incorrecta, tarjeta sin mapeo, comercio vacío, posibles duplicados y cambios concurrentes.

Validar que la API determina `user_id` desde la credencial y no acepta otro en el cuerpo. Probar inyección de HTML en notas, CSV con fórmula y URLs de notificación manipuladas. No registrar secretos/payloads completos. Las notificaciones no se envían para transacciones que fallaron.

## Offline y recuperación
App ya cargada → desconectar → registrar → cerrar/abrir → comprobar pendiente local → reconectar → sincronizar una sola vez. Probar fallo de almacenamiento, sesión vencida, conflicto y cierre de sesión con operaciones pendientes. Una actualización del worker no borra el borrador.

La cola del atajo se prueba aparte. Sin esa prueba no afirmar que Wallet funciona offline. Datos locales borrados por el navegador no se recuperan mágicamente: restaurar desde servidor/copia probada.

## Pruebas manuales de iPhone
Instalación desde Safari; apertura independiente; foco de inputs/teclado; notch y barra Inicio; modo claro/noche; Reducir movimiento; permiso de notificaciones permitido/denegado; prueba visible con app cerrada; pulsación de aviso y autenticación; añadir atajo desde enlace real; vinculación; permisos iniciales; automatización de una tarjeta; siguiente compra normal; alias de tarjeta; datos ausentes; desconexión/revocación; pérdida de red.

Playwright/WebKit ayuda a detectar problemas, pero no certifica comportamiento del sistema iOS ni del disparador de Wallet. Registrar versión de iOS y tarjeta por alias en la hoja de pruebas, sin números de tarjeta.

## Evidencia solicitada a Codex
Scripts reales `dev`, `build`, `lint`, `test` y `test:e2e` cuando esté disponible. Ejecutar pruebas pertinentes, revisar consola y capturas. Informar qué comando pasó/falló/no se pudo ejecutar y por qué. No inventar una URL desplegada, capturas, Lighthouse, notificaciones entregadas o compra real.

Mantener `docs/IMPLEMENTATION_STATUS.md` con fecha, fase, funcionalidad, evidencia, límites y configuración pendiente. Una función sin verificar se rotula “No probada”, no “Lista”.
