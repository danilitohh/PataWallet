# 03 · Arquitectura y reglas de datos

Todas las elecciones de infraestructura de este documento son una propuesta para implementar; no representan servicios ya contratados ni conectados.

## Estructura propuesta
**Frontend**: React + Vite + JavaScript/JSX, React Router, CSS con variables, Motion, Lucide, Zod para validación y Dexie para IndexedDB. React es una plantilla soportada por Vite [S09]; usar versiones compatibles, documentar el Node requerido y fijar el lockfile. No instalar dependencias innecesarias ni cambiar a un framework de renderizado en servidor sin una razón aprobada.

**Persistencia real**: Supabase Auth y PostgreSQL, con RLS por usuario [S13]. **Servidor**: funciones Node.js para recepción de Atajos, vinculación y Web Push; Vercel es una opción propuesta [S18]. Mantener la lógica de negocio independiente del hosting. No provisionar recursos ni desplegar sin autorización.

**Modo demo**: operativo sin credenciales, datos ficticios guardados en IndexedDB. Dexie facilita el acceso reactivo a esa base local, pero no agrega por sí solo una sincronización remota [S15]. Separar demo y producción incluso en el nombre de la base local. El cambio de modo nunca copia automáticamente transacciones ficticias.

```text
src/
  app/                  rutas, proveedores, shell
  components/ui/        controles compartidos
  components/pets/      escenas y reacciones con respaldo estático
  features/             dashboard, activity, accounts, plan, settings
  domain/               dinero, saldos, presupuestos, reglas
  data/                 interfaces y adaptadores demo/remoto
  services/             auth, API, sincronización, push
  styles/               tokens y estilos
  sw.js                 service worker cuando corresponda
api/                    funciones de servidor, no código público
supabase/migrations/    esquema, restricciones, funciones, RLS
public/assets/          únicamente recursos web de producción
```

La estructura es orientativa: no generar carpetas vacías por apariencia. Componentes de UI sin SQL ni aritmética financiera dispersa. Funciones puras comprobables para los cálculos.

## Dinero y fechas
MVP en COP. Guardar unidades menores enteras con exponente 2: COP 85.000 corresponde a `8500000` unidades menores. En JSON del servidor se recomienda representarlo como cadena de entero; en JavaScript, convertir de forma validada y limitar a `Number.isSafeInteger`, comprobando también las sumas. Alternativa válida: `BigInt` con serialización explícita. Prohibido mezclar ambas estrategias sin pruebas.

El monto ingresado usa gramática explícita es-CO: punto de miles y coma decimal; admitir pegado solo mediante normalización controlada. Los datos numéricos de Atajos no deben interpretarse como texto localizado arbitrario. Añadir casos de prueba para decimales, montos grandes, espacios y entradas ambiguas. Nunca “arreglar” un monto ambiguo multiplicándolo o dividiéndolo por mil.

Formato visual con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })`, ajustando decimales cuando el monto sea entero sin perder centavos si existen. Mostrar COP cuando sea necesario. No poner un monto en una imagen.

Eventos con `occurred_at` en ISO 8601 y offset/UTC; `received_at` separado. El mes se calcula según la zona del perfil, inicialmente `America/Bogota`. Fechas puramente de calendario como plazo de meta no deben cambiar de día por conversión UTC.

## Modelo mínimo
| Entidad | Datos y restricciones principales |
|---|---|
| profiles | id asociado a Auth, nombre, moneda, zona, tema, movimiento |
| accounts | id, user_id, nombre, tipo asset/liability, subtipo, archivada; moneda coherente |
| categories | id, user_id, nombre, tipo, icono permitido; crear categorías iniciales por usuario |
| transactions | id UUID, user_id, tipo, importe, fecha, categoría, comercio/nota, origen, versión y estado |
| ledger_entries | transaction_id, account_id, user_id, delta de saldo/deuda; múltiples entradas atómicas para transferencias |
| budgets | user_id, mes, moneda, límite; categoría opcional; evitar duplicados lógicos |
| goals / goal_allocations | meta, objetivo, plazo opcional, reservas ligadas a cuenta; no asientos bancarios |
| category_rules | comercio normalizado/condiciones, categoría, prioridad, activación explícita |
| device_links / card_mappings | usuario, hash del token de dispositivo, alcance, revocación, alias de tarjeta→cuenta |
| incoming_events | device_id + event_id únicos, huella del contenido, campos normalizados y estado |
| pairing_tickets | hash, vencimiento, usuario y consumo único atómico |
| push_subscriptions | usuario/dispositivo, endpoint y claves de suscripción; acceso restringido |
| notification_preferences / notification_outbox | tipos autorizados, privacidad y avisos pendientes de envío |

La tabla local `outbox` guarda operaciones offline con UUID estable. Las tablas reales incluyen restricciones, índices, timestamps y autorización. Validar que las cuentas/categorías referenciadas pertenecen al mismo usuario; una foreign key que solo compruebe existencia no basta.

## Convención contable interna
Para cuentas de activos, saldo positivo = dinero registrado. Para tarjetas, saldo positivo = deuda registrada. Una entrada `delta_minor` aumenta o reduce el saldo según esa convención.

| Operación | Efecto | ¿Afecta gasto/ingreso mensual? |
|---|---|---|
| Saldo inicial | Crea apertura de activo o deuda | No |
| Ingreso en activo | Activo + monto | Ingreso |
| Compra con activo/débito | Activo − monto | Gasto |
| Compra con crédito | Deuda + monto | Gasto |
| Transferencia activo→activo | Origen − monto, destino + monto | No |
| Pago de tarjeta desde activo | Activo − monto, deuda − monto | No |
| Reserva para meta | Aumenta reserva; no modifica activos | No |
| Ajuste explícito de saldo | Corrige activo/deuda con trazabilidad | No |
| Reembolso vinculado | Activo + monto o deuda − monto | Reduce gasto, no es salario/ingreso ordinario |

El plan de cuotas de una deuda es opcional y descriptivo: no genera pagos ni intereses automáticos. No llamar a un gasto “pago de tarjeta” para ocultarlo en presupuesto. Los saldos pueden resultar negativos por movimientos reales; no clavar los números a cero para disimularlos. Un crédito a favor de la tarjeta requiere etiqueta clara y no debe confundirse con dinero líquido.

**Saldo en cuentas** = suma de activos. **Deuda registrada** = suma de obligaciones, con créditos a favor explicados. **Posición neta registrada** = activos − deuda (opcional en Cuentas). **Gasto del mes** = gastos menos reembolsos según fecha del evento, excluyendo aperturas, ajustes, transferencias, pagos de tarjeta y reservas. **Restante del presupuesto** = límite − gasto computable. No presentar estas cifras como intercambiables.

Las reservas no deben duplicarse entre metas. Validar disponibilidad al apartar dinero y permitir corregir reservas; si un gasto posterior deja reservas sin respaldo, mostrar advertencia y no falsear el saldo. Cambiar el límite del presupuesto no cambia ninguna cuenta.

Transferencias y edición de sus asientos deben ser atómicas. Eliminar/deshacer revierte de forma coherente todas las entradas asociadas. Mantener auditoría o anulación reversible; no perder trazabilidad para simplificar una pantalla.

## Captura, categoría y duplicados
Dos niveles de entrada: `incoming_event` y transacción financiera. Evento incompleto sin monto/moneda/cuenta válidos queda por revisar sin asiento. Un gasto completo con categoría desconocida sí se registra como Sin categoría y entra en totales, con revisión pendiente.

Primero, regla explícita del usuario para un comercio normalizado. En ausencia de regla, sugerir solo cuando haya una base clara o dejar Sin categoría. Evitar normalizaciones que fusionen comercios diferentes. Nada de enviar compras a un modelo de IA externo por defecto.

Idempotencia fuerte por `(device_id, event_id)` con restricción única: mismo id y contenido = misma respuesta sin nuevo gasto; mismo id con contenido diferente = conflicto. Para dos ids distintos con comercio/monto/tiempo similares, marcar posible duplicado y solicitar revisión, no borrar automáticamente dos compras legítimas. Una huella heurística no sustituye un identificador.

## Offline y sincronización
Guardar formularios y operaciones locales de manera transaccional. Diferenciar borrador, guardado en dispositivo y confirmado en servidor. Sincronizar al recuperar red mientras la app esté activa, al volver a abrirla y con botón Reintentar. No depender de Background Sync universal [S16].

Reintentos conservan UUID de operación. El servidor valida permisos y versión; conflictos se presentan sin sobrescribir silenciosamente. No prometer sincronización continua con la PWA cerrada. Las operaciones originadas en Atajos tienen otra cola y otro ciclo de vida: la outbox del navegador no rescata automáticamente un pago que Atajos no pudo enviar.

Al cerrar sesión, comprobar cambios pendientes y advertir antes de borrarlos. Separar/eliminar datos locales por cuenta; al cambiar de usuario, no mostrar ni reenviar datos de la sesión anterior. La caducidad de sesión no elimina la cola ni habilita envíos sin autenticar.

## Seguridad y entrega de datos
RLS en tablas expuestas y pruebas con dos usuarios, no solo revisar SQL visualmente. Las claves privilegiadas de Supabase no van al navegador [S14]. Validación de servidor, consultas parametrizadas, límites de tamaño/tasa y protección contra XSS. Un token de Atajos identifica al usuario en servidor: no confiar en `user_id` enviado en el payload.

Exportación CSV escapada para evitar fórmulas y JSON versionado para respaldos/transferencia. No llamar a un CSV “copia completa” si omite reglas, cuentas y relaciones. Documentar estrategia real de backup/restauración y verificar costes/retención del proveedor; no asumir backups incluidos. Probar restauración antes de usar el sistema como único registro.

No afirmar “cifrado bancario”, “extremo a extremo”, biometría, auditoría externa o certificaciones sin implementación y evidencia. Ocultar montos es privacidad visual, no un mecanismo de acceso. No introducir analytics financieros ni adjuntos de terceros por defecto.
