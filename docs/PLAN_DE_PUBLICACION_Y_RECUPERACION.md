# Plan de publicación y recuperación

Estado: publicación autorizada el 26 de septiembre de 2026, pero **aún no ejecutada**. El proyecto Supabase está en Free sin respaldos automáticos y falta una copia PostgreSQL restaurada y verificada antes de aplicar la migración pendiente.

## Configuración sin secretos

Cliente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_VAPID_PUBLIC_KEY` y bandera pública de Google. Servidor: `SUPABASE_URL`, claves pública/privilegiada, `APP_ORIGIN`, VAPID, `CRON_SECRET`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_API_KEY` y variables del Atajo. Las claves privilegiadas nunca usan `VITE_`, Git, chat, URL o captura.

Configura en Supabase los orígenes/redirecciones HTTPS exactos para registro, Google y recuperación. Revisa correo, cuota y costo del plan real; no se asumen copias automáticas.

## Puertas antes de publicar

1. Crear proyecto/rama de base aislado y respaldo verificable.
2. Aplicar migraciones en orden; ejecutar `supabase test db`, lint SQL, Security Advisor y API directa A/B.
3. Restaurar JSON ficticio allí; verificar balances, asientos, reglas, mapeos, deduplicación y que no revive tokens/outbox.
4. Ejecutar lint, unitarias, build, E2E y PWA sobre el commit candidato.
5. Revisar bundle/logs, caché Auth/API, límites de entrada/tasa y rutas de avisos.
6. Con autorización, desplegar a previo HTTPS y repetir Auth, sincronización y recuperación.
7. En iPhone físico, completar PWA/Web Push/VoiceOver y Atajos. No promover si falla aislamiento, persistencia o restauración.

## Respaldo y reversión

Antes de migrar, exporta una copia PostgreSQL compatible y un JSON ficticio. Registra esquema, commit, fecha, responsable y ubicación privada. Comprueba la copia restaurándola en un destino aislado.

Si falla una promoción:

1. Detén la promoción; no borres colas locales.
2. Vuelve al artefacto web anterior compatible sin forzar recarga con formularios o pendientes.
3. Corrige esquema con otra migración versionada; no uses `reset`, `drop` ni restauración destructiva en producción.
4. Restaura primero en un proyecto nuevo, verifica y cambia el origen solo con autorización.
5. Reconcilia por `operation_id`; no reenvíes colas antiguas, avisos históricos o tokens revocados.
6. Repite las puertas esenciales antes de reabrir escrituras.

## Recuperación por usuario

Si el servidor cae, conserva la app instalada y no borres datos del sitio. Descarga JSON si la pantalla opera. Al volver el servicio, entra con la misma cuenta, revisa el indicador y reintenta una vez. Ante conflicto, conserva respaldos y resuelve explícitamente.

Perder el navegador sin JSON y sin persistencia remota verificada puede ser irrecuperable. Por eso el cierre actual permanece bloqueado para datos reales.
