# Estado de implementación

Actualizado: 2026-09-10. Fase actual: **Fase 2, autenticación implementada; activación remota pendiente**.

| Área | Estado actual | Evidencia / límite |
|---|---|---|
| Brief de producto, diseño y flujos | Conservado | `AGENTS.md`, `PROMPT_INICIAL_CODEX.txt` y `docs/01` a `docs/07` |
| App React/SPA | Implementada y probada localmente | React 19 + Vite 8; rutas Inicio, Actividad, Plan, Cuentas y Ajustes |
| Arquitectura frontend | Modularizada y probada | `src/app` concentra arranque/rutas/contexto; `src/features` separa siete áreas del producto; `src/shared` contiene UI, hooks y utilidades comunes; dominio y persistencia permanecen independientes de React |
| Fidelidad visual a referencias | Revisada y corregida | Bienvenida editorial ilustrada; Inicio con escena integrada; Actividad agrupada por fecha e iconos de categoría; Plan con anillo de presupuesto y composición ilustrada. Se evitaron patrones de panel administrativo genérico |
| Demo identificada | Implementada | Bienvenida y rótulo “Datos de ejemplo”; base local `patawallet-demo-v1` |
| Movimientos | Implementados y probados | Crear gasto/ingreso/transferencia, editar, eliminar con confirmación, deshacer, buscar y filtrar |
| Cuentas | Implementadas | Crear con saldo/deuda inicial, renombrar, archivar; activos y deuda separados |
| Presupuesto y metas | Implementados | Límite mensual, exceso honesto, crear metas, reservas cubiertas y celebración única al alcanzar objetivo |
| Cálculos financieros | Implementados y probados | `src/domain/finance.test.js` reproduce todos los totales esperados del fixture |
| Dinero es-CO | Implementado y probado | Unidades menores enteras; `85.000,50` produce `8500050`; rango seguro validado |
| Persistencia local | Implementada y probada | Dexie/IndexedDB; un gasto creado permanece tras recargar en E2E |
| Registro e inicio de sesión | Implementados | Supabase Auth con correo/contraseña, confirmación de correo compatible, sesión persistente y cierre de sesión |
| Recuperación de contraseña | Implementada | Solicitud por correo y formulario de nueva contraseña mediante el flujo de recuperación de Supabase |
| Inicio con Google | Implementado y proveedor habilitado | Supabase devuelve una redirección válida hacia `accounts.google.com`; falta completar una sesión real de usuario y comprobar el regreso a la app |
| Datos por usuario | Implementados en código y migración | Adaptador remoto para cuentas, categorías, movimientos, presupuestos, metas, reservas y ajustes; todas las filas incluyen propietario |
| RLS | Preparada, no aplicada | `supabase/migrations/20260910190000_auth_and_user_data.sql`; acceso anónimo revocado y políticas por `auth.uid()`. No se aplicó porque el conector disponible apuntaba a otro proyecto |
| Tema, privacidad y movimiento | Implementados y probados | Claro/noche/sistema, montos ocultos, movimiento sistema/suave/desactivado |
| Cuatro ilustraciones | Integradas | Bienvenida/Inicio, Plan, actividad vacía y celebración de meta; WebP responsivo sin alterar ni simular partes móviles de las escenas |
| Estados | Parcialmente implementados | Cargando, vacío, error de almacenamiento, sin conexión y guardado local. Conflictos y sincronización remota pertenecen a Fase 2 |
| Accesibilidad modal | Implementada | Fondo inerte, cierre con Escape, bloqueo de scroll y retorno de foco |
| Capturas | Generadas y revisadas visualmente | Inicio claro en 390×844, 375×812 y 1440×900; noche en 375×812; además bienvenida, Actividad y Plan en 390×844 dentro de `output/playwright/` |
| Lint | Probado | `npm run lint` pasa |
| Pruebas unitarias | Probadas | `npm test`: 4 pruebas pasan |
| Build | Probado | `npm run build` pasa; dependencias separadas en chunks, el mayor queda en 257,48 kB sin comprimir |
| Pruebas E2E | Probadas | 12 de 12 en WebKit móvil y Chromium escritorio; navegación, layout, CRUD/persistencia y preferencias |
| PWA instalada en iPhone | No implementada ni probada | Fase 3; no sustituir por la emulación de WebKit |
| Web Push real | No implementado ni probado | Pantalla honesta “Pendiente de configurar”; requiere servidor, VAPID y dispositivo |
| Atajo importable/publicado | Pendiente | Pantalla y guía preparadas; no existe `.shortcut` ni enlace iCloud real |
| Compra real de Wallet | No probada | Requiere iPhone, tarjeta compatible y verificación de campos disponibles |
| Animación interna de mascotas | Recursos pendientes | Solo entrada de la escena completa; no hay capas, rig, Rive ni Lottie |
| Despliegue, dominio y recursos de pago | No configurados | No autorizados en esta fase |

## Comandos ejecutados

- `npm install`: instalación completa, 0 vulnerabilidades reportadas por npm.
- `npm run lint`: aprobado.
- `npm test`: 4 de 4 pruebas aprobadas.
- `npm run build`: aprobado tras la revisión visual; CSS 23,36 kB y chunks JavaScript de hasta 257,48 kB sin comprimir.
- `npm run test:e2e`: 12 de 12 pruebas aprobadas en 390×844, 375×812 y 1440×900.
- Pantalla Auth revisada con navegador real en 390×844 y escritorio; registro, recuperación y estados accesibles inspeccionados. Sin errores de consola en la app.
- Solicitud OAuth real comprobada: Supabase respondió `302` hacia `accounts.google.com`; no se simuló un acceso exitoso ni se automatizó una cuenta personal.
- Refactorización modular: lint, 4 pruebas unitarias, build y 12 pruebas E2E repetidas después de separar el antiguo `App.jsx` monolítico.
- Revisión manual de capturas: bienvenida, Inicio, Actividad y Plan; claro/noche, móvil/escritorio. Sin desbordamiento horizontal ni errores de consola.

## No probado

No se ejecutaron Lighthouse, orientación horizontal, texto ampliado del sistema ni un iPhone real. Tampoco se probaron notificaciones, instalación PWA, Atajos o compras de Wallet. El registro real, correo de confirmación, recuperación completa, retorno exitoso de Google, migración/RLS con dos usuarios y CRUD remoto quedan sin prueba hasta aplicar el SQL en el proyecto correcto. La API `profiles` respondió 404, confirmando que la migración aún está pendiente.
