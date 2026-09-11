# Estado de implementación

Actualizado: 2026-09-11. Fase actual: **Fase 5 revisada localmente; ampliaciones funcionales en validación**.

## Ampliaciones del 11 de septiembre

- Movimientos: hora opcional; sin hora conserva el comportamiento de fecha a mediodía para evitar cambios accidentales de día.
- Comprobantes: JPG/PNG/WebP opcional de hasta 2 MB, con vista previa, cambio y eliminación. Por ahora se guarda de forma privada en IndexedDB, separado por usuario, y la UI lo rotula como **solo en este dispositivo**; falta almacenamiento remoto privado antes de considerarlo respaldo.
- Categorías: creación personalizada desde el formulario de movimiento, respetando el tipo ingreso/gasto y el aislamiento existente.
- Metas: corregido el modal compartido que quedaba dentro de un ancestro `inert`; X, Escape y Guardar vuelven a funcionar.
- Próximas compras: alta, edición y eliminación, sin crear gastos. Compara el estimado con el presupuesto restante y con activos registrados menos reservas.
- Migración `20260911120000_planned_purchases.sql` aplicada al proyecto remoto autorizado. Verificación SQL: tabla presente, RLS activo, 1 política propia, índice presente, `anon_select = false` y CRUD autenticado habilitado bajo RLS.
- Automatización Apple: el receptor, vinculación y categorización de PataWallet siguen preparados; la plantilla importable y su automatización Transacción continúan pendientes de publicación/configuración y prueba en iPhone. La PWA no puede activar Wallet por sí sola.
- Verificación de Atajos documentada en `docs/ATAJO_REGISTRAR_COMPRA.md`: Apple confirma el activador por tarjeta, solicitudes API y publicación iCloud; no documenta públicamente las propiedades del payload de Transacción, que deben inspeccionarse en el iPhone responsable antes de terminar y publicar la plantilla.

## Implementado

| Fase / área | Estado | Límite honesto |
|---|---|---|
| Fase 1: SPA financiera | Implementada | Demo separada, navegación, movimientos, cuentas, presupuesto y metas |
| Fase 2: Auth, datos y seguridad | Migraciones remotas aplicadas; RLS A/B probado | API HTTP directa, concurrencia y restauración PostgreSQL aislada pendientes |
| Fase 3: PWA y Web Push | Implementada localmente | Recepción/apertura real y actualización en iPhone pendientes |
| Fase 4: Atajos/categorización | Migración remota aplicada y esquema verificado | Blueprint, no `.shortcut`; endpoints con sesión, compra real y vínculo persistente pendientes |
| Fase 5: acabado | Implementada | Foco, horizontal/texto ampliado, estados accesibles, imágenes y temporizadores |
| Mascotas | Cuatro escenas estáticas | 12 WebP; no hay capas, rigs ni gestos animados |
| Operación | Documentada | Guía, validación final y publicación/recuperación |

## Probado automáticamente

- `npm run lint`: PASÓ.
- `npm test`: PASÓ, 14 archivos y 56 pruebas. Incluye reglas financieras, COP, mes America/Bogota, reembolso, sincronización/idempotencia/conflictos, contratos Auth/PWA/Push/Atajos, respaldo/CSV y evaluación de próximas compras.
- `npm run build`: PASÓ con Vite 8.3.0; 30 entradas y 1164,39 KiB de precaché. La configuración adapta el build del worker a `codeSplitting: false`, sin la opción obsoleta `inlineDynamicImports`.
- Dependencias de build: `glob` se resuelve explícitamente a 13.0.6 bajo `workbox-build`; `npm audit --omit=dev` permanece en 0 vulnerabilidades conocidas.
- Línea base E2E: 22 pruebas efectivas pasaron y 2 variantes se omitieron intencionalmente.
- Suite ampliada final: 28 PASÓ y 2 variantes se omitieron intencionalmente. El retorno de foco había fallado primero en 390×844; corregido el disparador, la regresión pasó 3/3 en 390×844, 375×812 y escritorio.
- `npm run test:pwa -- --workers=1`: PASÓ 1/1; shell/ruta previamente cargados abren sin red.
- `npm audit --omit=dev`: PASÓ, 0 vulnerabilidades conocidas.
- E2E de ampliaciones en escritorio y 375×812: PASÓ 3/3 en cada tamaño (modales de Metas, categoría/hora/comprobante y próxima compra).
- E2E completo de la app en 390×844: PASÓ 10/10. Una ejecución paralela anterior sufrió contención y reveló que el input oculto del comprobante interceptaba Guardar; se corrigió y la repetición serial pasó.
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
- **Alto:** endpoints autorizados, push real, plantilla Apple, segundo dispositivo limpio y compra compatible.
- **Medio:** VoiceOver, texto del sistema y teclado en iPhone.
- **Bajo:** licencia explícita de redistribución de ilustraciones.

La app está desplegada en Vercel y las migraciones 1–4 están presentes en Supabase. No se enviaron avisos reales ni se modificaron servicios Apple. Pasos restantes: `docs/PLAN_DE_PUBLICACION_Y_RECUPERACION.md`.

## Decisión

**BLOQUEADA PARA USO REAL.** La demo y las comprobaciones locales son revisables, pero falta verificar aislamiento, persistencia y recuperación sobre PostgreSQL real. No usar todavía PataWallet como único registro personal.
