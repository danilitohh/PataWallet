# Noche con Mascotas · 18 de septiembre de 2026

La petición explícita de usar `night-pets.webp` da prioridad a esta dirección para el rediseño. No cambia las reglas financieras ni reproduce funciones ficticias del mockup. Las especificaciones históricas se conservan.

## Decisiones y módulos revisados

| Área | Aplicación del diseño |
| --- | --- |
| Bienvenida y acceso | Tipografía editorial en bienvenida, escena nocturna sin textos incrustados, formulario legible, recuperación y registro con el mismo sistema. Google solo se muestra si está habilitado. |
| Onboarding | Campos oscuros, progreso lavanda, foco visible y originales conservados. |
| Inicio | Saldo ilustrado, tres indicadores, presupuesto con anillo, movimientos antes de paneles secundarios; composición de dos columnas en escritorio. |
| Actividad | Chips de tipos, filtro de cuenta, iconos semánticos de colores y estado vacío con acción. |
| Movimientos y diálogos | Campos y selectores uniformes, segmento seleccionado accesible, botón de guardar persistente al desplazar, error sin perder borrador. |
| Cuentas | Activos/deudas separados; ingresos y gastos fijos siguen siendo botones desplegables; checklist preservada. |
| Plan | Anillo con gradiente SVG, reservas y compras con estados honestos y superficies consistentes. |
| Ajustes | Filas agrupadas, selectores con nombre accesible, switches de 44 px de alto, claro/noche/sistema. |
| Notificaciones y Atajos | Misma jerarquía, iconos, botones y estados pendientes; no se solicitaron permisos ni se enviaron eventos reales. |
| Asistente y Parejas | Controles/superficies compartidos y estados disponibles; no se modificaron APIs ni datos reales. Los flujos autenticados de pareja no se probaron end-to-end en esta tarea. |
| Navegación | Dock flotante, acción central circular, notificaciones en cabecera y barra lateral adaptada. |

Los estilos específicos están separados por módulo. `styles/night.css` contiene controles compartidos y se carga antes de los estilos específicos, sobre la base existente. Se conservan rutas, cálculos y persistencia. Noche es el valor inicial para espacios nuevos; un usuario que ya eligió Claro/Sistema conserva esa preferencia. Para ver el rediseño nocturno en ese caso: **Ajustes → Tema → Noche**.

## Efectos

Se consultaron [React Bits](https://reactbits.dev/) y su [repositorio oficial](https://github.com/DavidHDev/react-bits). Se implementaron efectos CSS originales inspirados en su lenguaje de luz: dos capas ambientales lentas y un reflejo puntual sobre botones al pasar el puntero o recibir foco. No se copió código de terceros ni se añadió una dependencia WebGL.

La capa ambiental no recibe clics, se pausa cuando la pestaña está oculta y queda estática al desactivar movimiento o activar la reducción del sistema. Esta última prevalece sobre «Suave». Las ilustraciones son estáticas, no personajes con rig.

## Nueva ilustración

Herramienta: `image_gen` integrada, sin CLI/API externa. Nueva escena complementaria, no sustitución de los cuatro originales. Se guardó en `public/assets/illustrations/night-companions-{480,800,1122}.webp` (27.2 / 57.4 / 95.0 kB). Conversión WebP mediante Sharp, sin recolorear ni quitar fondos. La PWA precachea solo la variante 480.

Prompt utilizado:

> Use case: illustration-story. Asset type: production illustrated background for PataWallet personal finance app, not a UI mockup. Create a beautiful cinematic cozy nighttime pet illustration closely matching the mood of the FIRST reference image's first phone (night-pets mosaic): deep midnight navy sky, small crescent moon, faraway warm golden town lights, lavender twilight, cozy balcony. Second reference is existing pet family for color/character feel. One golden retriever and two fluffy cats calmly cuddled on a navy cushion at the bottom right, warm lantern beside them, leafy plant edge. Composition landscape 1536x1024: mostly dark calm negative space on the LEFT 55% and TOP third for real HTML headings, animals occupy right lower half with all faces visible. Rich softly painted 3D storybook illustration, soft fur, rimlight lavender, warm peach highlights. Premium calm tender mood, not childish. NO text, NO letters, NO numbers, NO interface, NO phones, NO logos, NO frame, no borders. Opaque dark background. This is a NEW complementary asset; do not collage or reproduce the reference mosaic.

## Evidencia

Capturas en `output/playwright/night-*`. La suite `night-design.spec.js` espera imágenes visibles decodificadas, recorre seis módulos en 390×844, 375×812 y 1440×900, comprueba desbordes/errores JS, persistencia de Claro, reacción a Sistema, reducción de movimiento, filtros y conservación del borrador inválido.

La revisión adicional de acceso/registro/recuperación fue visual, sin enviar formularios de autenticación. La prueba PWA verifica el worker y navegación offline, no certifica instalación ni teclado en iPhone real. Los detalles del resultado de cada comando están en `docs/IMPLEMENTATION_STATUS.md`.
