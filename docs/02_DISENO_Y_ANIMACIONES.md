# 02 · Diseño visual y animaciones

## Referencias y jerarquía
1. `design/references/light-patawallet.webp`: composición clara y mascotas como referencia principal.
2. `design/references/night-pets.webp`: dirección de noche, no contrato de funciones.
3. `design/references/botanical-pets.webp`: calidez y personajes; no obligación de usar verde dominante.

El usuario rechazó los colores de una primera propuesta y después le gustaron los animales. No interpretar esa aprobación como elección explícita de todo el verde, todos los textos o todas las funciones de las imágenes. Implementar una propuesta coherente y mostrarla para aprobación.

## Propuesta de estilo
Tema claro: blanco cálido, texto azul tinta, botones azul profundo, toques de melocotón y turquesa apagado. Tema noche: azul oscuro, texto claro, lavanda y acentos suaves. Las ilustraciones conservan sus colores originales; no aplicarles `invert()` ni tintes que alteren el pelaje. En noche, usar un marco/superficie ilustrada cálida cuando sea necesario para que el fondo opaco no parezca un recorte mal hecho.

Valores iniciales en `design/tokens.json`. Tokens semánticos y variables CSS, no colores dispersos por componentes. Acentos propuestos, sujetos a revisión. Comprobar contraste en combinaciones reales, no asumirlo por el nombre del color.

Tipografía del sistema para evitar descargas adicionales: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`. No se adjuntan archivos de fuente. Cuerpo de 16 px, etiquetas 14 px, ayudas 13 px, título 26 px, saldo 36 px, cifras tabulares. Ajustar sin truncar montos grandes. Espaciado base de 4 px, margen móvil de 20 px, tarjetas de 24 px de radio y campos de 14 px. Sombras discretas, bordes sutiles, iconos coherentes con texto.

## Composición móvil
Referencia principal 390×844; verificar también 375×812. Usar `viewport-fit=cover`, áreas seguras de iOS y unidades dinámicas cuando sean compatibles. Barra inferior separada del indicador de Inicio. Formularios desplazables con teclado abierto; “Guardar” no puede quedar inaccesible. Controles de al menos 44×44 CSS px como objetivo de comodidad. No prohibir zoom.

Una sola tarjeta protagonista por pantalla. Los contenidos financieros deben estar visibles antes de grandes ilustraciones, excepto en Bienvenida o estado vacío. Fuera de esos casos, limitar la escena a aproximadamente 100–140 px de altura y no añadir una imagen enorme a cada tarjeta. Los fondos no deben restar legibilidad.

Los mockups son referencias de proporción, tono y jerarquía. No mostrar la barra de estado dibujada de los teléfonos dentro de la app. No copiar textos ilegibles, fechas de 2024, montos inconsistentes, avatares inventados como identidad verificada, caminatas, promesas bancarias ni biometría no construida.

## Animaciones realizables con los recursos presentes
Usar Motion para transiciones de componentes HTML/SVG [S10]. `AnimatePresence`/equivalentes para paneles, respuesta al toque y progresos. Efectos concretos propuestos:

| Elemento | Movimiento | Condición |
|---|---|---|
| Botón | Escala 1 → 0,98 → 1; unos 150 ms | Al tocar; sin alterar el área táctil efectiva |
| Panel inferior | Entrada desde abajo + velo tenue; unos 280 ms | Abrir/cerrar; foco controlado y fondo inerte |
| Cambio de sección | Fundido breve, desplazamiento máximo de 8 px | Sin reiniciar el scroll innecesariamente |
| Imagen de escena | Aparición de opacidad y escala 0,985 → 1, una vez | No flotar continuamente una habitación completa |
| Progreso | Transición de ancho/segmento; 350–500 ms | Cambio real de dato; etiqueta numérica inmediata |
| Meta cumplida | Ilustración de éxito + 6–10 pequeños detalles SVG | Una vez, menos de 1 s, sin bloquear interacción |
| Error | Mensaje visible y foco/acción Reintentar | Sin sacudidas agresivas ni gato triste |

Estos tiempos son propuestas para ajustar al probar, no una garantía de fluidez. No bloquear el guardado hasta que termine una animación. No fingir que se ha guardado por haber reproducido una celebración.

## Qué NO puede hacerse directamente con este paquete
Las cuatro escenas son imágenes raster planas con fondo. No existe una capa de ojos, cabeza, cola o patas. Transformar toda la imagen no produce una animación anatómica del animal. No entregar un `.riv`, `.lottie` o `.svg` que simplemente envuelva el PNG y llamarlo personaje editable.

Los parpadeos, respiración localizada, movimientos de orejas y gestos de patas son un trabajo de producción posterior: piezas completas y separadas, poses o una animación preparada. Crear una interfaz de componente `PetScene`/`PetReaction` que admita una implementación animada futura, con el recurso estático actual como respaldo. No referenciar archivos que no existen.

No se necesita vídeo en la primera versión. No instalar Rive, Lottie y otra librería de animación simultáneamente “por si acaso”. Un recurso animado nuevo requiere revisión visual, peso, licencia y pruebas de reproducción antes de integrarlo.

## Accesibilidad y rendimiento
Respetar `prefers-reduced-motion`; Motion ofrece un hook para esta preferencia [S11]. Añadir ajustes propios sin forzar movimiento contra la preferencia del sistema. Si el usuario o el sistema reduce movimiento, eliminar traslaciones, rebotes y bucles; mantener cambios de estado claros.

Pausar trabajo decorativo al ocultarse la página y fuera del viewport. No usar sonido automático, gifs pesados, destellos ni parallax del giroscopio. Una mascota protagonista por pantalla. Imágenes con dimensiones explícitas, variantes responsivas del manifiesto y carga diferida salvo la imagen principal visible. No precargar simultáneamente las doce variantes.

Usar 480 o 800 px según el tamaño real y densidad, reservando 1122 px para una escena grande. No agrandar fuentes o pesos de imagen para “ganar calidad”. Los fondos originales PNG y los mockups no deben formar parte del bundle público.

Objetivos de evaluación: sin errores de consola, sin layout shifts visibles, navegación y teclado fluidos. Medir carga y rendimiento; no prometer 60/120 fps universales ni una puntuación de Lighthouse antes de ejecutarlo.
