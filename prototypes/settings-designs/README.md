# Exploración de diseños para Ajustes

Prototipo local e independiente: no carga datos de cuenta, no guarda preferencias reales y no modifica la aplicación de producción.

Desde la raíz del repositorio, ejecútalo con:

```sh
npm exec vite -- --config prototypes/settings-designs/vite.config.js
```

Abre `http://127.0.0.1:4176/`. Cambia de opción con las teclas `1`, `2`, `3` o las flechas; la selección se conserva en `?v=`. Los controles de preferencias funcionan solo dentro de esta vista previa.
