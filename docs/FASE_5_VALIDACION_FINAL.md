# Fase 5 · validación final

Fecha: 2026-09-10. Base revisada: `9d9291a`. Entorno: Windows, Node.js 22+, Chromium automatizado; sin Docker/PostgreSQL local ni dispositivo Apple disponible.

## Decisión de cierre

**BLOQUEADA PARA USO REAL.** La implementación local está revisada y el aislamiento A/B pasó 20/20 pruebas transaccionales en PostgreSQL remoto. Todavía faltan solicitudes HTTP directas con dos sesiones, concurrencia, persistencia extremo a extremo y una restauración aislada. También faltan la recepción Web Push, la plantilla importable y una compra compatible en un iPhone físico. La demo local sí puede revisarse; no debe usarse aún como único registro financiero.

## Cambios de acabado

- El diálogo ahora mantiene el foco dentro, cierra con Escape, vuelve al control que lo abrió y deja el fondo inerte.
- La hoja de movimiento usa el alto disponible en horizontal y deja accesibles sus acciones mediante desplazamiento interno.
- Avisos y carga comunican su estado a tecnologías de asistencia; los temporizadores de avisos se limpian al desmontar.
- Se añadieron estados coherentes de selección, cursor, hover y deshabilitado, sin alterar la paleta aprobada.
- Las escenas conservan sus recortes y movimiento de entrada del contenedor. Tienen dimensiones, decodificación asíncrona, prioridad del hero y carga diferida secundaria. No se finge movimiento de ojos, patas o colas.

Antes no existía evidencia específica de horizontal/texto ampliado ni confinamiento de foco. Después, `output/playwright/phase5/mobile-home.png`, `desktop-home.png` y `landscape-movement.png` documentan 390×844, 1440×900 y 844×390 con datos demo. No hubo overflow horizontal ni mensajes de consola.

## Rendimiento local

Medido el 2026-09-10 con `npm run build`, caché de dependencias caliente y sin limitación de red. No es una medición de iPhone ni un puntaje Lighthouse.

| Medida | Antes | Después | Observación |
|---|---:|---:|---|
| CSS sin comprimir | 31,72 kB | 32,54 kB | Estados y horizontal |
| JS principal sin comprimir | 112,39 kB | 113,31 kB | Foco y limpieza de avisos |
| Precaché PWA | 1162,68 KiB | 1164,39 KiB | 30 entradas |
| Compilación | 824 ms | 893 ms | Variación local, no benchmark controlado |

El build del worker usa la compatibilidad de Vite 8 `codeSplitting: false` y ya no emite la advertencia de `inlineDynamicImports`. `glob`, dependencia transitiva de Workbox, queda fijada en 13.0.6. No se envían originales de diseño; `picture` elige 480, 800 o 1122 px.

## Inventario de mascotas

Todos son WebP planos, opacos, sin alfa, capas, rig ni estados animados. Procedencia: paquete PataWallet; no se adjuntó licencia redistribuible independiente. Se consideran aprobados para este proyecto por inclusión y uso previo, no para redistribución externa.

| Escena y uso | Recursos (ancho×alto; peso) | Estados |
|---|---|---|
| Bienvenida / acceso | `welcome-family-480.webp` (480×600; 60.942 B), `-800` (800×1000; 120.718 B), `-1122` (1122×1402; 184.200 B) | Una escena estática |
| Plan / presupuesto | `budget-calm-480.webp` (480×600; 54.324 B), `-800` (800×1000; 103.592 B), `-1122` (1122×1402; 154.438 B) | Una escena estática |
| Vacío / primer movimiento | `empty-state-friends-480.webp` (480×600; 50.168 B), `-800` (800×1000; 103.476 B), `-1122` (1122×1402; 158.844 B) | Una escena estática |
| Meta completada | `success-friends-480.webp` (480×600; 29.802 B), `-800` (800×1000; 59.598 B), `-1122` (1122×1402; 93.842 B) | Una escena estática de éxito |

Para gestos futuros hacen falta personajes autorizados con capas, pivotes, estados y respaldo estático. Eso no bloquea cálculos, pero el sistema de mascotas animadas no se declara completo.

## Evidencia de pruebas

Datos: fixtures ficticios de `examples/demo-fixtures.json`, cuentas A/B sintéticas en pgTAP y demo IndexedDB independiente.

| ID | Escenario / esperado | Observado | Estado | Evidencia |
|---|---|---|---|---|
| AUT-01 | Registro/recuperación con proveedor | Contratos pasan; correo remoto no repetido | PASÓ local / BLOQUEADO remoto | Vitest |
| FIN-01 | Apertura, ingreso, gasto, transferencia, crédito, pago, reserva, edición/anulación, reembolso, mes y COP | Reglas pasan dentro de 54/54 pruebas | PASÓ | `npm test` |
| ISO-01 | A no lee/escribe B ni cruza referencias | 20/20 casos remotos pasan y finalizan con `ROLLBACK` | PASÓ SQL remoto / API HTTP pendiente | pgTAP transaccional en Supabase |
| SYN-01 | Cola estable, reintento, conflicto y usuario aislado | Controlador/contratos pasan | PASÓ local | Vitest; servidor pendiente |
| BAK-01 | JSON/dueño/referencias/conflicto; CSV seguro | Restauración aislada en memoria pasa | PASÓ local | `backup.test.js`; PostgreSQL pendiente |
| UI-01 | 390×844, 375×812, 1440×900, CRUD/persistencia | 28 pasaron y 2 variantes se omitieron intencionalmente | PASÓ | `npx playwright test --workers=1` y capturas Phase 5 |
| A11Y-01 | Foco, Escape, fondo inerte y retorno | Falló primero el retorno táctil; corregido, 3/3 pasan | PASÓ | Regresión Playwright |
| A11Y-02 | 844×390, texto 200 %, Guardar y sin overflow X | Acción accesible; ancho 844/844 | PASÓ automatizado | No equivale a VoiceOver |
| PWA-01 | Worker único y ruta cargada sin red | 1/1 pasa | PASÓ | `npm run test:pwa -- --workers=1` |
| PUSH-01 | Permiso solo por acción | No se solicita al abrir; recepción real ausente | PASÓ local / BLOQUEADO dispositivo | Playwright |
| SCT-01 | Prueba sin gasto, idempotencia y UI honesta | Contratos pasan | PASÓ local | Vitest |
| SCT-02 | Plantilla importable, vínculo persistente y compra real | Sin `.shortcut`, iCloud ni iPhone | BLOQUEADO | Documentación Fase 4 |
| SEC-01 | Sin privilegios en cliente/repositorio | Contratos locales y RLS SQL A/B remota pasan | PASÓ SQL remoto / API HTTP pendiente | Vitest; pgTAP; audit 0 |
| BUILD-01 | Lint y build | Ambos pasan | PASÓ | ESLint; Vite 8.3.0 |

## Navegador frente a iPhone

La revisión de navegador comprobó composición, navegación, hoja horizontal, foco, consola y overflow. **NO EJECUTADO en iPhone físico:** VoiceOver, teclado/áreas seguras reales, instalación/actualización, Web Push visible/apertura, token de Atajos, plantilla importable, automatización Transacción y compra compatible.

## Pendientes priorizados

- Crítico: API HTTP A/B directa, asientos concurrentes, persistencia extremo a extremo y restauración PostgreSQL aislada.
- Alto: endpoints autorizados, push real, plantilla firmada/importable, revocación y compra habitual en iPhone.
- Medio: VoiceOver, texto del sistema, teclado y orientación en iPhone.
- Bajo: licencia explícita de redistribución de ilustraciones.
