# Instrucciones de proyecto para Codex

## Objetivo y usuario
Construir PataWallet (nombre provisional): finanzas personales en una SPA/PWA elegante, sencilla y cálida, en español, pensada primero para el iPhone de Danilo. Le gustan los gatos y los perros; tiene siete gatos y un perro. No convertirla en un juego infantil ni en un panel contable empresarial.

## Antes de editar
Lee `README.md`, el prompt de la fase y `docs/01` a `docs/06`; abre las referencias de `design/references/` con las herramientas de imagen disponibles. El contexto completo está en el repositorio, no en una conversación externa. Si ya existe código, inspecciónalo y conserva lo que funciona. No inicialices una plantilla destruyendo los archivos de este paquete.

## Prioridades
1. Números correctos, privacidad y estados honestos.
2. Interfaz fiel a las referencias, con composición limpia y usable.
3. Funcionalidad verificable, persistencia y recuperación de errores.
4. Animaciones suaves y rendimiento, sin sacrificar accesibilidad.

## Decisiones técnicas propuestas
- React + Vite + JavaScript/JSX, módulos ES, JSDoc y validación de datos; no imponer TypeScript sin justificarlo.
- CSS con tokens; React Router; Motion (`motion/react`); Lucide; Dexie/IndexedDB para demo y cola local.
- En fase real: Supabase Auth + PostgreSQL con RLS; endpoints de servidor Node.js para Atajos y Web Push. Vercel es un destino propuesto, no una cuenta configurada.
- `vite-plugin-pwa` con service worker propio cuando se incorpore Web Push.
- Verificar documentación y compatibilidad de versiones, fijarlas en lockfile; no depender de paquetes premium ni añadir varias librerías para la misma función.

## Reglas visuales
Las imágenes son referencia de estilo, no una interfaz para incrustar como screenshot. Todo texto, saldo, gráfico real, campo, botón y navegación debe ser HTML/SVG y datos reales. Usar las cuatro ilustraciones de `public/assets/illustrations/`; no sustituirlas por emojis, fotos de stock ni placeholders remotos.

Las imágenes disponibles NO tienen transparencia, capas ni animación. Se permite animar su entrada o un detalle vectorial superpuesto, no afirmar que un PNG plano parpadea o mueve patas. No quitar fondos automáticamente ni deformar las escenas para fingir un rig. No hacer grandes ilustraciones en todas las pantallas ni cubrir números con mascotas.

Tema claro principal y noche opcional según `docs/02`. No volver al verde dominante por defecto: hubo rechazo a una propuesta cromática anterior. La identidad aprobada es la de mascotas; nombre y acentos exactos siguen siendo una propuesta.

No copiar errores presentes en los mockups: pantalla de caminata, bancos “conectados” sin integración, porcentajes inconsistentes, biometría no implementada, eslóganes en inglés y fechas antiguas. No usar sermones, culpa ni mascotas tristes como castigo por gastar.

## Reglas funcionales no negociables
- Gastos, ingresos, transferencias, cuentas, presupuesto mensual, metas, historial y categorías.
- Débito y crédito se modelan de forma distinta; pagar una tarjeta no duplica el gasto.
- Importes en unidades menores enteras, con límites validados. No hacer aritmética monetaria con decimales binarios sin una estrategia explícita.
- Saldos iniciales, transferencias y reservas de metas no cuentan como ingresos/gastos del mes.
- Toda demo se etiqueta; no mezclar datos de demostración con usuarios reales.
- La PWA no lee directamente Wallet, notificaciones ajenas ni bancos. Atajos es una integración separada y verificable.
- El atajo compartido y su automatización personal son pasos distintos. No inventar enlaces de iCloud, firmas `.shortcut` ni campos de transacción disponibles.
- Una prueba de conexión no crea gastos ni prueba por sí sola una compra de Wallet.

## Seguridad y datos
No incluir secretos en `VITE_*`, repositorio, URLs persistentes, capturas o registros. Las claves privilegiadas y VAPID privada son solo de servidor. Autorización por usuario en cada acceso; RLS en todas las tablas expuestas. Token de dispositivo limitado y revocable para ingresar eventos, nunca para leer/borrar el historial. No solicitar números completos, CVV o claves bancarias.

La protección visual de montos no equivale a autenticación ni cifrado. No desplegar, crear recursos de pago o modificar bases de datos existentes sin autorización del usuario. Conectores disponibles no implican permiso para mutar cuentas.

## Trabajo por fases
Realiza únicamente la fase solicitada, con un plan breve al comenzar. Implementa archivos reales: no entregar solo pseudocódigo o una landing. Si una credencial bloquea una integración, sigue con tareas independientes y marca esa integración como pendiente; no simular su éxito. Al terminar una fase, informa cómo ejecutarla, pruebas realizadas, fallos y siguiente paso concreto.

## Verificación
Crear y ejecutar scripts `dev`, `build`, `lint`, `test` y, cuando corresponda, `test:e2e`. Nunca afirmar pruebas no ejecutadas. Comprobar a 390×844, 375×812 y 1440×900; incluir estados vacío, error, offline, montos ocultos y movimiento reducido. Revisar capturas y consola. WebKit de escritorio emulado no sustituye pruebas de iPhone real.

Mantener `docs/IMPLEMENTATION_STATUS.md` con lo implementado, probado, no probado y bloqueado. No reescribir esta especificación para esconder requisitos pendientes.
