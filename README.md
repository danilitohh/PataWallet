# PataWallet — paquete para Codex
**Preparado para Danilo · 10 de septiembre de 2026 · Nombre provisional**

Este repositorio reúne las imágenes disponibles, la dirección visual y el encargo de desarrollo de una web de finanzas personales para iPhone. **La Fase 1 ya contiene una SPA local ejecutable; el atajo y los servicios externos siguen sin instalar.**

## Abrir la aplicación
Requiere Node.js 22.12 o posterior. Ejecuta `npm install`, después `npm run dev` y abre `http://127.0.0.1:4173`.

Con las variables de Supabase configuradas, la app exige registro o inicio de sesión y guarda cada espacio en PostgreSQL con RLS. También mantiene una cola IndexedDB separada por usuario, con reintentos idempotentes y conflictos visibles. Sin credenciales —o con `VITE_AUTH_DISABLED=true` para las pruebas— conserva la demo IndexedDB separada. Antes de usar cuentas reales, aplica las migraciones en orden y sigue [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md) y [docs/DATA_SECURITY_AND_RECOVERY.md](docs/DATA_SECURITY_AND_RECOVERY.md).

## Organización del código

La aplicación está organizada por responsabilidades y áreas del producto:

```text
src/
├── app/                  # Arranque, contexto, shell y rutas
├── features/
│   ├── accounts/         # Cuentas y sus formularios
│   ├── auth/             # Registro, sesión, Google y recuperación
│   ├── dashboard/        # Inicio y resumen financiero
│   ├── integrations/     # Notificaciones y Automatización
│   ├── onboarding/       # Bienvenida a la demo
│   ├── planning/         # Presupuesto, metas y reservas
│   ├── settings/         # Preferencias locales
│   └── transactions/     # Actividad, lista y editor de movimientos
├── shared/               # Componentes, hooks y utilidades reutilizables
├── data/                 # Adaptadores de persistencia local y remota
├── lib/supabase/         # Cliente público de Supabase
├── domain/               # Reglas financieras y dinero entero
├── components/           # Recursos visuales transversales
└── styles/               # Tokens y estilos globales
supabase/migrations/      # Esquema PostgreSQL y políticas RLS
```

Cada `feature` puede contener subcarpetas `components/` y `model/`. Las reglas monetarias permanecen fuera de React en `domain/`, y las pantallas no acceden a detalles de inicialización de la aplicación.

## Cómo empezar
1. Descomprime el ZIP y abre la carpeta `patawallet-codex` como carpeta de proyecto en tu editor o entorno de Codex. Los archivos deben estar en el espacio de trabajo que Codex realmente pueda leer; no basta con pegar un enlace de este chat.
2. Si ya existe un repositorio, integra el contenido sin sobrescribir su código o sus instrucciones actuales. Coloca las imágenes y los documentos en ese repositorio y combina `AGENTS.md` con cuidado.
3. Revisa la Fase 1 local antes de conectar datos personales. El encargo original se conserva en `PROMPT_INICIAL_CODEX.txt`.
4. Tras aprobarla, utiliza `PROMPTS_SIGUIENTES.md` para continuar con persistencia real, notificaciones y Atajos.

La documentación oficial de instrucciones de Codex se encuentra en `docs/07_FUENTES_OFICIALES.md` [S01].

## Qué incluye
- **4 ilustraciones distintas**, cada una en WebP de 480, 800 y 1122 píxeles de ancho: 12 archivos de uso web.
- **3 referencias de pantallas**: interfaz clara con mascotas, modo noche y una alternativa botánica secundaria.
- Instrucciones persistentes para Codex en `AGENTS.md` y un mensaje inicial listo para copiar.
- Especificación de pantallas, reglas del dinero, estilo, animación, datos, seguridad, PWA, notificaciones y Atajos.
- Tokens de diseño, inventario de recursos, ejemplo del contrato de un evento y datos ficticios con resultados esperados.
- `ABRIR_CATALOGO.html`, un catálogo local de los recursos incluidos. Es documentación visual, no un prototipo de la app.

## Qué NO incluye
No hay personajes separados por capas, parpadeos dibujados, mallas de animación, Rive, Lottie, vídeos, credenciales, un enlace de iCloud publicado ni comprobaciones con un iPhone real. Las ilustraciones son **raster, estáticas y con fondo opaco**. No representan fielmente a las mascotas reales de Danilo porque no se aportaron sus fotografías.

El ZIP opcional de originales contiene las cuatro ilustraciones PNG, los tres mockups PNG y un póster adicional de inspiración. No es necesario para iniciar el desarrollo. Al descomprimirlo en el mismo lugar, añade `design/originals/` y `design/references-originals/`. No colocar estas carpetas en `public/`.

## Orden de lectura
`AGENTS.md` → `docs/01_PRODUCTO_Y_FLUJOS.md` → `docs/02_DISENO_Y_ANIMACIONES.md` → `design/assets-manifest.json` → `docs/03_ARQUITECTURA_Y_DATOS.md` → `docs/04_IOS_NOTIFICACIONES_Y_ATAJOS.md` → `docs/05_CRITERIOS_Y_PRUEBAS.md`.

Consultar `docs/06_ASSETS_Y_PENDIENTES.md` para no confundir los recursos disponibles con los que aún debemos producir. Las decisiones de arquitectura y colores de este paquete son propuestas de implementación; no son declaraciones de que el usuario ya haya elegido proveedor, dominio o nombre definitivo.

## Decisiones que sí están claras
Web SPA/PWA, iPhone primero, español, finanzas fáciles de entender, mascotas ilustradas con protagonismo de gatos, notificaciones opcionales y automatización de compras compatibles mediante un atajo preparado por el proyecto. Danilo quiere un proceso guiado, no construir el atajo manualmente.

## Regla de confianza
Una pantalla puede estar terminada visualmente sin que su integración esté activa. Mostrar siempre esa diferencia. No decir “Wallet conectado”, “notificación enviada”, “sincronizado” o “datos protegidos con Face ID” sin una implementación y una prueba que lo respalden.
