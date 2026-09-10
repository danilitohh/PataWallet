# 06 · Recursos presentes y pendientes

## Inventario verificable
Hay **cuatro escenas únicas** en este paquete. Cada una tiene tres tamaños WebP (480/800/1122 px de ancho); son doce archivos, no doce dibujos distintos. El manifiesto incluye dimensiones, bytes, SHA-256, texto alternativo y uso propuesto. Todas son estáticas y opacas, sin canal alfa.

| Id | Escena | Ubicación propuesta |
|---|---|---|
| welcome-family | Perro y grupo de gatos en un ambiente acogedor | Bienvenida / presentación |
| budget-calm | Gato con libreta y otro descansando | Introducción a Plan / presupuesto vacío |
| empty-state-friends | Gato en una caja y perro | Actividad sin movimientos |
| success-friends | Gato y perro con recibo de confirmación | Meta completada / éxito especial |

No se ha usado una imagen duplicada como una ilustración extra. El archivo genérico `imagegen.png` coincide con la escena de éxito y no se incluye dos veces.

## Formatos
Las variantes WebP se exportaron de los PNG presentes en esta conversación. Mantienen el fondo y la composición; no se redibujaron ni se les removió el fondo. WebP es un formato de imagen para web; esto no lo convierte en vector ni separa elementos [S20].

Los originales opcionales: cuatro escenas PNG, tres referencias de interfaz PNG y un póster PNG de inspiración con textos incrustados. El póster no es un recurso de UI de producción. Ni originales ni referencias deben servirse o precachearse por defecto en la app.

## Integración correcta
Leer rutas y variantes del manifiesto. En el proyecto Vite, `public/assets/...` se sirve desde `/assets/...`; no escribir URLs de `/mnt/data/` ni `sandbox:`. Usar `srcset`/`sizes`, width/height y carga diferida cuando corresponda. Evitar recortes destructivos y filtros que alteren colores.

Bienvenida puede usar una escena grande. En el resto, preferir tarjeta editorial pequeña o imagen de estado vacío con texto independiente. No superponer controles sobre las caras ni usar el gráfico dibujado de una libreta para mostrar datos reales. La escena de éxito no debe reutilizarse para comunicar fallo o vinculación pendiente.

Las tres imágenes de `design/references/` orientan el estilo, pero contienen contenido ficticio/errores. La especificación escrita prevalece sobre promesas funcionales dibujadas en ellas.

## Pendientes para animación de personajes
No están incluidos: fichas consistentes de los ocho personajes, vistas de cada uno, capas de cuerpo/cabeza/orejas/ojos/párpados/patas/cola/sombra, poses intermedias, sprites de parpadeo, rig, mallas, escenas con transparencia real, archivos Rive/Lottie o vídeos. Los gatos de escenas distintas no constituyen una ficha anatómica consistente.

Antes de animación interna: elegir un personaje maestro, definir sus rasgos y aprobar una muestra. Producir piezas completas bajo solapamientos para que no aparezcan huecos. Luego preparar estados idle/success/error sin culpabilizar al usuario y un respaldo estático. Medir tamaño/calidad y probar en iPhone. No inventar esas piezas con recortes pobres para declarar terminado el trabajo.

También faltan un logo aislado y los iconos técnicos PWA finales. Codex puede proponer un icono simple propio y un wordmark provisional, señalándolos para aprobación. No extraer logos de bancos ni distribuir fuentes de pago.

## Publicación del atajo
No hay enlace iCloud ni `.shortcut` importable en este paquete. Se incluyen el flujo, blueprint y contrato para que el proyecto lo construya, valide y publique. No introducir un enlace inventado ni afirmar que el usuario ya tiene la automatización instalada.

## Criterio de alcance
La primera versión puede tener una experiencia muy cuidada con las cuatro escenas estáticas y microinteracciones. Esto no equivale a haber producido todo el sistema de mascotas animadas. Mantener esa distinción en la entrega de Codex.
