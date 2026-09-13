# Estado de implementación

Actualizado: 2026-09-11. Fase actual: **Fase 5 revisada localmente; ampliaciones funcionales en validación**.

## Ampliaciones del 11 de septiembre

- Movimientos: hora opcional; sin hora conserva el comportamiento de fecha a mediodía para evitar cambios accidentales de día.
- Comprobantes: JPG/PNG/WebP opcional de hasta 2 MB, con vista previa, cambio y eliminación. Por ahora se guarda de forma privada en IndexedDB, separado por usuario, y la UI lo rotula como **solo en este dispositivo**; falta almacenamiento remoto privado antes de considerarlo respaldo.
- Categorías: creación personalizada desde el formulario de movimiento, respetando el tipo ingreso/gasto y el aislamiento existente.
- Metas: corregido el modal compartido que quedaba dentro de un ancestro `inert`; X, Escape y Guardar vuelven a funcionar.
- Próximas compras: alta, edición y eliminación, sin crear gastos. Compara el estimado con el presupuesto restante y con activos registrados menos reservas.
- Migración `20260911120000_planned_purchases.sql` aplicada al proyecto remoto autorizado. Verificación SQL: tabla presente, RLS activo, 1 política propia, índice presente, `anon_select = false` y CRUD autenticado habilitado bajo RLS.
- Automatización Apple: el receptor, vinculación y categorización de PataWallet están preparados. La plantilla `PataWallet - Registrar compra` fue construida y publicada por el usuario en iCloud; la automatización personal Wallet quedó configurada para ejecutar inmediatamente y sin aviso previo.
- Enlace publicado: `https://www.icloud.com/shortcuts/12c4f7d2f466425ba3e9379203ab59f5`. El código distingue “publicada” de “probada”: `SHORTCUT_MIN_IOS_TESTED` permanece opcional hasta completar una prueba real.
- Evidencia de iPhone recibida: el activador aparece como **Wallet**, permite escoger tarjetas y conduce a “Cuando use sin contacto…”. La automatización construye un diccionario con `amount`, `merchant_name` y `card_alias` antes de ejecutar la plantilla compartida.
- Inspección de la variable real completada: entrada tipo `Transacción` con propiedades `Tarjeta o pase`, `Comercio`, `Cantidad` y `Nombre`. Fecha y moneda no aparecen; la plantilla añade fecha de ejecución y COP. La vinculación fue confirmada por la notificación de Atajos; falta que la PWA refresque el estado desde servidor, probar conexión y confirmar valores/tipos mediante una compra habitual.
- La pantalla de Automatización refresca el estado al recuperar foco o visibilidad después de volver desde Atajos; el estado activo sigue dependiendo de una lectura autenticada del servidor.
- El Inicio solo muestra la etiqueta de datos locales dentro de la demo; la cuenta real no muestra el banner de demo ni la píldora estable “Sincronizado”. Los estados pendientes, offline y conflicto siguen siendo visibles.
- El formulario de nuevas metas bloquea envíos repetidos durante el guardado y cada tarjeta explica que una reserva es una separación interna, no un movimiento bancario.
- El popup de cada reserva incluye la explicación y el ejemplo de saldo/progreso antes de solicitar cuenta y monto.
- Cuentas: la pantalla explica que “dinero disponible” incluye efectivo, bancos y billeteras, mientras “tarjeta de crédito (deuda)” representa lo pendiente con el emisor; también aclara que pagar la tarjeta no duplica el gasto.

## Implementado

| Fase / área | Estado | Límite honesto |
|---|---|---|
| Fase 1: SPA financiera | Implementada | Demo separada, navegación, movimientos, cuentas, presupuesto y metas |
| Fase 2: Auth, datos y seguridad | Migraciones remotas aplicadas; RLS A/B probado | API HTTP directa, concurrencia y restauración PostgreSQL aislada pendientes |
| Fase 3: PWA y Web Push | Implementada localmente | Recepción/apertura real y actualización en iPhone pendientes |
| Fase 4: Atajos/categorización | Plantilla iCloud publicada; receptor y migración preparados | Instalación desde enlace, vínculo persistente, prueba de conexión y compra real pendientes |
| Fase 5: acabado | Implementada | Foco, horizontal/texto ampliado, estados accesibles, imágenes y temporizadores |
| Mascotas | Cuatro escenas estáticas | 12 WebP; no hay capas, rigs ni gestos animados |
| Operación | Documentada | Guía, validación final y publicación/recuperación |

## Probado automáticamente

- `npm run lint`: PASÓ.
- `npm test`: PASÓ, 14 archivos y 57 pruebas. Incluye la separación entre plantilla publicada y versión de iOS probada.
- `npm run build`: PASÓ con Vite 8.3.0; 30 entradas y 1177,53 KiB de precaché. La configuración adapta el build del worker a `codeSplitting: false`, sin la opción obsoleta `inlineDynamicImports`.
- E2E dirigido de Automatización en escritorio: PASÓ 1/1. La ejecución completa paralela quedó inválida por `EBUSY` de Windows al observar sus propios artefactos de Playwright; tras caer el servidor produjo 32 fallos derivados y 5 pruebas alcanzaron a pasar.
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
- **Alto:** endpoints autorizados, push real, instalación/vinculación de la plantilla Apple, segundo dispositivo limpio y compra compatible.
- **Medio:** VoiceOver, texto del sistema y teclado en iPhone.
- **Bajo:** licencia explícita de redistribución de ilustraciones.

La app está desplegada en Vercel y las migraciones 1–4 están presentes en Supabase. No se enviaron avisos reales ni se modificaron servicios Apple. Pasos restantes: `docs/PLAN_DE_PUBLICACION_Y_RECUPERACION.md`.

## Decisión

**BLOQUEADA PARA USO REAL.** La demo y las comprobaciones locales son revisables, pero falta verificar aislamiento, persistencia y recuperación sobre PostgreSQL real. No usar todavía PataWallet como único registro personal.
