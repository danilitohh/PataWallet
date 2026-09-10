# Datos, sincronización y recuperación

## Migraciones

PataWallet mantiene las migraciones en orden cronológico:

1. `20260910190000_auth_and_user_data.sql`: tablas base, restricciones entre recursos del mismo usuario, RLS y permisos.
2. `20260910190327_phase2_ledger_sync_security.sql`: asientos, versiones, índices, idempotencia y RPC atómicos para movimientos y reservas.

La segunda migración revoca las escrituras directas sobre movimientos, asientos y reservas. La aplicación usa funciones PostgreSQL que obtienen el propietario desde `auth.uid()`, comprueban referencias y ejecutan movimiento + asientos dentro de una sola transacción. No aplicarla a un proyecto distinto ni ejecutarla parcialmente.

Las tablas nuevas necesitan estar expuestas en la Data API del proyecto para que los permisos explícitos funcionen. RLS sigue siendo obligatorio: exposición y autorización son controles diferentes.

## Cola local

Cada usuario tiene una base IndexedDB distinta: `patawallet-user-<uuid>`. La demo continúa en `patawallet-demo-v1` y nunca se copia automáticamente.

Una escritura se aplica primero a la copia local y entra en `outbox` con un `operation_id` estable. Los reintentos reutilizan ese identificador. La cola se procesa con la app abierta, al recuperar conexión, al volver a abrirla o al pulsar **Reintentar**. No se promete sincronización con la app cerrada.

Estados visibles:

- **Guardado en este dispositivo**: existe una operación local aún no confirmada.
- **Pendiente de sincronizar**: hay conexión y operaciones por enviar/reintentar.
- **Sincronizado**: el servidor confirmó las operaciones y se descargó un estado posterior.
- **Conflicto**: la versión remota cambió; la copia local no se sobrescribe. El usuario puede conservar explícitamente la versión del servidor.

Al cerrar sesión, las operaciones pendientes se advierten y permanecen únicamente en la base correspondiente a esa cuenta. Una sesión distinta no lee ni envía esa cola.

## Exportación y respaldo

**CSV** exporta movimientos para análisis. Todas las celdas se entrecomillan y los valores que podrían interpretarse como fórmulas (`=`, `+`, `-`, `@`, tabulador o retorno) se neutralizan. El CSV no es una copia completa.

**JSON** usa `format: patawallet-backup` y `version: 1`. Incluye cuentas, categorías, movimientos, presupuestos, metas, reservas y preferencias, además del propietario. No incluye contraseña, tokens ni claves.

Procedimiento de copia:

1. Abrir **Ajustes → Datos → Descargar respaldo**.
2. Guardar el archivo fuera del dispositivo principal y protegerlo como información financiera privada.
3. Conservar más de una versión; PataWallet no asume que el plan de Supabase incluya una copia descargable o restauración puntual.

Procedimiento de restauración:

1. Iniciar sesión con la misma cuenta propietaria del respaldo.
2. Abrir **Ajustes → Datos → Restaurar JSON**.
3. Seleccionar el archivo y revisar el número de registros.
4. La importación agrega registros ausentes. Si encuentra el mismo identificador con contenido diferente, se detiene antes de escribir y muestra un conflicto.
5. Mantener la app abierta hasta ver **Sincronizado**.

La restauración se probó de forma automatizada sobre colecciones aisladas en memoria. La migración y una restauración contra PostgreSQL real deben comprobarse en un proyecto local o rama aislada antes de considerar la app como único registro personal.

## Prueba de aislamiento

`supabase/tests/rls_isolation.sql` prepara dos usuarios ficticios, intenta lecturas, escrituras y referencias cruzadas y revierte todo al finalizar. Requiere Supabase CLI, Docker y una base local aislada:

```bash
supabase start
supabase db reset
supabase test db
```

No ejecutar esa prueba contra datos reales. En este equipo no había Docker/CLI disponible, por lo que el archivo quedó preparado pero su ejecución PostgreSQL sigue pendiente.

