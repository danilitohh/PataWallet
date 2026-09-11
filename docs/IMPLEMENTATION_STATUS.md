# Estado de implementación

Actualizado: 2026-09-10. Fase actual: **Fase 4 implementada localmente; plantilla Apple, migraciones remotas y validación en iPhone pendientes**.

## IMPLEMENTADO

| Área | Estado actual | Evidencia / límite |
|---|---|---|
| Diseño, mascotas, navegación y datos | Conservados | No se rehízo la app ni se sustituyeron las ilustraciones estáticas |
| Fases 1–2 | Conservadas | CRUD financiero, cuentas, presupuestos, metas, Auth, almacenamiento por usuario, sincronización y respaldo siguen operativos |
| Fase 3 | Conservada | PWA, worker, actualización y Web Push permanecen; migración/entrega real siguen pendientes fuera de este equipo |
| Pantalla Automatización | Implementada | Flujo Añadir → vincular → automatización personal → prueba → compra; estados independientes y avisos honestos |
| Plantilla preparada | Blueprint completo | `shortcuts/README.md` y manifiesto describen acciones, modos y producción; no se creó un `.shortcut` falso ni enlace iCloud inventado |
| Vinculación | Implementada localmente | Ticket aleatorio de 32 bytes, hash, cinco minutos, consumo atómico, token de 32 bytes con hash, expiración, estado incompleto hasta la primera prueba y revocación |
| API de Atajos | Implementada localmente | Pairing, canje, prueba sin efecto financiero, eventos, estado, revocación, mapeos, reglas y resolución de revisión |
| Autorización | Implementada en migración/API | El servidor deriva usuario/dispositivo de credenciales; el cuerpo no acepta `user_id`; RLS de lectura propia y escritura solo de servidor |
| Recepción y dinero | Implementada en migración | COP en unidades menores enteras, fecha ocurrida separada de recepción, débito/crédito mediante el libro contable existente |
| Idempotencia | Implementada en migración | Bloqueo transaccional y unicidad por usuario/evento; misma huella devuelve resultado, contenido distinto devuelve conflicto |
| Posibles duplicados | Implementados | Eventos o movimientos manuales similares quedan para decisión; se pueden asociar sin crear asientos nuevos |
| Categorías | Implementadas | Reglas exactas deterministas; sin regla crea gasto “Sin categoría”, cuenta en totales y queda por revisar |
| Bandeja Por revisar | Implementada | Disponible en Automatización y como filtro de Actividad; permite completar, categorizar, crear regla futura o asociar duplicado |
| Prueba vs compra | Separadas | `/test` solo actualiza `last_test_at`; `/events` actualiza el último evento y puede crear movimiento |
| Estado de automatización iOS | Honesto | El usuario puede declararla configurada o retirar la declaración; la app la rotula como no verificada |
| Revocación | Implementada | Invalida token sin borrar movimientos y advierte que la automatización de iOS debe desactivarse aparte |
| Actualización con app activa | Implementada | La sesión real vuelve a consultar al hacerse visible y cada 30 segundos mientras la app está abierta |
| Respaldo | Endurecido | La copia existente conserva movimientos automáticos, pero excluye tokens, vínculos y eventos de ingreso; restaurar no reactiva ni reemite |

## PROBADO LOCALMENTE

- Línea base antes de Fase 4: `npm run lint`, `npm test` (26/26) y `npm run build` pasaron.
- La línea base `npm run test:e2e` tuvo 13/18 aprobadas y 5 timeouts bajo seis navegadores concurrentes. Los timeouts afectaron navegación/capturas y se registran como fallo real, no como validación aprobada.
- Después de implementar Fase 4: `npm run lint` aprobado; `npm test` aprobó 13 archivos y 54 pruebas; `npm run build` aprobado.
- Las pruebas unitarias cubren contrato JSON, entero monetario, fecha con zona, formato ambiguo, normalización determinista, secretos de 32 bytes, huella de reintento/conflicto, ausencia de enlace iCloud falso, endpoints sin credencial/cuerpos grandes, exclusión de secretos en respaldos y contrato SQL de RLS/idempotencia.
- La migración pgTAP se amplió a 20 aserciones para aislamiento A/B de vínculos, mapeos, reglas y eventos, además de denegar escritura directa del navegador. **No se ejecutó aún** porque no hay PostgreSQL/Docker local ni sesión remota autorizada.
- El build mantiene un único service worker y excluye API/Auth de la caché; muestra la advertencia heredada de `inlineDynamicImports` sin impedir el artefacto.
- `npx playwright test --workers=1`: 22 aprobadas y 2 omisiones intencionales (la variante noche/movimiento reducido se ejecuta una vez en 390×844; la pantalla clara se ejecuta en 390×844, 375×812 y 1440×900). Sin desbordamiento horizontal ni errores de consola. Las capturas están en `output/playwright/phase4-shortcuts-*.png`.
- `npm run test:pwa`: 1/1 aprobada después de Fase 4; el shell ya cargado volvió a abrir una ruta interna sin red con un único worker.
- `npm audit` y `npm audit --omit=dev`: 0 vulnerabilidades conocidas.
- `supabase db lint --local` no se pudo ejecutar: no existe Docker/PostgreSQL local y la conexión `127.0.0.1:54322` fue rechazada. No se sustituyó esta prueba por una afirmación visual sobre SQL.

## PROBADO EN IPHONE

**Nada de Fase 4 se ha probado en un iPhone.** No se afirma importación, almacenamiento persistente del token, ejecución automática, payload nativo, compra compatible, comportamiento sin red ni revocación real. La hoja exacta está en `docs/FASE_4_PRUEBAS_IPHONE.md`.

## FALLOS O LIMITACIONES

- Este equipo Windows no puede abrir Apple Shortcuts, producir/firmar un `.shortcut`, publicar un enlace iCloud ni inspeccionar la entrada real del disparador Transacción.
- Apple documenta el disparador al tocar una tarjeta seleccionada, pero no garantiza públicamente los campos de monto/comercio/alias. La plantilla debe mapear solo lo observado en el iPhone.
- `retry_pending` no está incluido. Sin red, el atajo deberá informar que no pudo enviar; no promete una cola inexistente.
- La migración Fase 4 depende de las migraciones pendientes de Fase 2 y Fase 3.
- No se ejecutaron pruebas SQL reales de expiración, consumo doble/concurrente, evento concurrente, RLS A/B, débito/crédito o outbox. Existen migración y casos pgTAP, pero su ejecución remota está pendiente.
- No se verificó el backend en Vercel ni se modificó el despliegue existente.
- Siguen pendientes de fases anteriores: restauración PostgreSQL aislada, Security Advisor, correo/recuperación remotos y recepción Web Push en iPhone.

## PENDIENTE POR CONFIGURACIÓN EXTERNA

1. Resolver primero los pendientes remotos de Fase 2 y aplicar, en una rama/proyecto aislado y en orden, Fase 2 → `20260910210000_phase3_web_push.sql` → `20260911013904_phase4_shortcuts_categorization.sql`.
2. Ejecutar `supabase test db`, Security Advisor y solicitudes directas con usuarios A/B; probar tickets y eventos concurrentes contra PostgreSQL real.
3. Configurar solo en servidor `APP_ORIGIN`, `SUPABASE_SECRET_KEY`, `SHORTCUT_ICLOUD_URL`, `SHORTCUT_TEMPLATE_VERSION`, `SHORTCUT_NAME` y `SHORTCUT_MIN_IOS_TESTED`. No usar prefijo `VITE_` para secretos.
4. La persona responsable debe construir el blueprint en Apple Shortcuts, probarlo en un segundo dispositivo limpio, publicar el enlace iCloud real y comprobar que no contiene credenciales.
5. Autorizar por separado el despliegue de API/migraciones. Hasta entonces el sitio actualmente publicado no recibe estos endpoints.
6. Completar `docs/FASE_4_PRUEBAS_IPHONE.md` con versión exacta de iOS y tarjetas solo por alias, usando la siguiente compra habitual compatible.
7. Tras desplegar con autorización, repetir E2E sobre el origen real y completar los flujos autenticados de mapeo/revisión con la migración aplicada.

## BLOQUEADO

- **Publicación de la plantilla:** requiere una persona con un dispositivo Apple y permiso para compartir el atajo por iCloud.
- **Validación remota:** requiere autorización explícita para aplicar migraciones, desplegar endpoints y usar el proyecto Supabase/Vercel.
- **Certificación de compra compatible:** requiere el iPhone y una transacción habitual real; no puede simularse desde navegador o Windows.

## Decisión de preparación

Fase 4 está construida y probada en la capa local disponible, pero **no está validada como integración real**. PataWallet no debe presentarse todavía como sincronizada con Wallet/Atajos ni como único registro financiero. No se inició Fase 5.
