# Estado de implementación

Actualizado: 2026-09-10. Fase actual: **Fase 2 en implementación local; migración y pruebas remotas pendientes**.

## Implementado

| Área | Estado actual | Evidencia / límite |
|---|---|---|
| Diseño y navegación | Conservados | No se rediseñaron rutas, composición ni ilustraciones de Fase 1 |
| Demo | Separada | Sigue usando `patawallet-demo-v1`; nunca se importa automáticamente a usuarios reales |
| Auth | Implementado | Supabase Auth para registro, confirmación compatible, correo/contraseña, Google, recuperación, sesión persistente y cierre |
| Google OAuth | Verificado manualmente | El usuario completó el acceso y regresó a `pata-wallet.vercel.app`; no se modificó el flujo en esta fase |
| Espacios por usuario | Implementado | Tablas con propietario, claves foráneas compuestas y RLS; la migración base fue aplicada por el usuario y la app abrió el espacio real |
| Caché local privada | Implementada | Una base Dexie `patawallet-user-<uuid>` por usuario; no se consulta ni envía la cola de otra sesión |
| Cola y reintentos | Implementados | `outbox` conserva `operation_id`, orden, intentos y error; reintentos reutilizan el UUID |
| Estados de sincronización | Implementados | Guardado en dispositivo, pendiente, sincronizando, sincronizado y conflicto visibles; reintento manual y al volver la conexión |
| Sesión vencida/cambio de usuario | Implementado en cliente | Una sesión inválida no borra la cola; cerrar con pendientes muestra advertencia; cada usuario usa almacenamiento distinto |
| Conflictos | Implementados | Control de versión; el servidor no se sobrescribe silenciosamente. El usuario puede descartar explícitamente el cambio local conflictivo |
| Movimientos y asientos | Implementados en migración | `ledger_entries` y RPC transaccional para crear, editar, anular y restaurar; aperturas/transferencias/pagos no se convierten en gasto nuevo |
| Transferencias | Atómicas en migración | Movimiento, validación, versiones y reconstrucción de todos los asientos ocurren dentro de una función PostgreSQL |
| Reservas | Validadas en migración | RPC idempotente comprueba activo/meta propios y saldo registrado no reservado antes de insertar |
| Autorización | Endurecida en migración | Escritura directa de movimientos, asientos y reservas revocada; funciones privadas verifican `auth.uid()`; lectura con RLS |
| Índices | Implementados en migración | Propietario, referencias, historial y recibos de idempotencia indexados |
| CSV | Implementado y probado | Exportación de movimientos con celdas entrecomilladas y neutralización de fórmulas |
| Respaldo JSON | Implementado y probado | Formato versionado, propietario, validación estricta, límite de tamaño y restauración por mezcla sin sobrescritura |
| Documentación operativa | Actualizada | `docs/AUTH_SETUP.md` y `docs/DATA_SECURITY_AND_RECOVERY.md` |

## Pruebas ejecutadas

- Línea base previa: `npm run lint`, `npm test` (4/4), `npm run build` y `npm run test:e2e` (12/12) aprobados.
- Después de implementar sincronización y respaldo: `npm run lint` aprobado.
- `npm test`: 5 archivos, 19 pruebas aprobadas. Incluyen contrato de autenticación administrada por Supabase, reglas financieras, fin de mes en `America/Bogota`, anulación/edición, reembolso, reintento estable, conflicto, separación local por usuario, CSV y restauración aislada con referencias inválidas/duplicadas rechazadas antes de escribir.
- `npm run build`: aprobado. El bundle usa únicamente la clave publicable en el cliente; no se añadió ninguna clave privilegiada.
- `npm run test:e2e`: 12/12 pruebas aprobadas después de los cambios. Se revisaron además capturas a 390×844, 375×812 y 1440×900; esa inspección manual no mostró errores de consola. La ejecución E2E solo emitió el aviso informativo de Motion al activar movimiento reducido.
- La restauración JSON se probó en colecciones aisladas en memoria; no se sobrescribieron datos remotos.

## No ejecutado / fallos de entorno

- `supabase/tests/rls_isolation.sql` quedó preparado para dos usuarios y solicitudes directas, pero no se ejecutó: este equipo no tiene Docker, `psql` ni Supabase CLI local instalados.
- La sintaxis/ejecución real de `20260910190327_phase2_ledger_sync_security.sql` no se ha comprobado en PostgreSQL.
- No se aplicó la nueva migración al proyecto remoto y no se modificó Supabase desde Codex, conforme al límite solicitado.
- No se verificó todavía una edición concurrente entre dos navegadores reales ni una restauración completa contra una rama/base aislada de Supabase.
- Confirmación de correo y recuperación completa dependen de la configuración de correo/SMTP y necesitan una prueba manual real.

## Pendiente por configuración externa

1. Aplicar `20260910190327_phase2_ledger_sync_security.sql` en una rama/proyecto aislado y ejecutar pruebas PostgreSQL.
2. Ejecutar `supabase test db`, Security Advisor y Performance Advisor; corregir cualquier hallazgo antes de producción.
3. Probar con dos usuarios reales que A no pueda leer, editar, borrar ni referenciar datos de B mediante peticiones directas a REST/RPC.
4. Probar offline → recarga → reconexión y conflicto en navegadores reales.
5. Probar descarga y restauración JSON en un entorno aislado del servidor.
6. Configurar y validar SMTP, remitente, límites, confirmación y recuperación.

## Decisión de preparación

La Fase 2 **no está lista todavía para ser el único registro de datos personales reales**. La implementación local existe y sus pruebas unitarias pasan, pero la nueva migración, el aislamiento remoto con dos usuarios, los advisors y la restauración PostgreSQL aislada siguen pendientes.

PWA/Web Push pertenecen a Fase 3. Wallet/Atajos y captura automática no se implementaron en esta fase.
