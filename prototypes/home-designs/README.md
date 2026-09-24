# Exploraciones de interfaz de PataWallet

Vista previa aislada con tres composiciones de Inicio y tres direcciones para Plan. La propuesta Cronología para Actividad ya fue integrada en la aplicación productiva; el servidor de esta vista previa conserva Inicio y Plan, no cambia código de producción. Sus datos son ficticios y las acciones solo viven en memoria.

Desde la raíz del repositorio, ejecuta:

```bash
npm exec vite -- --config prototypes/home-designs/vite.config.js --host 127.0.0.1
```

Abre `http://127.0.0.1:4175` para explorar Inicio o `http://127.0.0.1:4175/plan` para comparar Plan. En cada ruta usa el selector superior, las teclas `1`, `2`, `3` o las flechas para cambiar entre propuestas. El parámetro `?v=2` restaura una selección; `R` vuelve a reproducir la entrada. Los datos de estas exploraciones no se guardan ni modifican los datos reales.
