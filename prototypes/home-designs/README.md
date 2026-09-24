# Exploraciones de interfaz de PataWallet

Vista previa aislada con tres composiciones de Inicio y tres propuestas de Cuentas. Las propuestas Cronología para Actividad y Metas primero para Plan ya fueron integradas en la aplicación productiva; esta vista previa conserva las exploraciones locales y no cambia las pantallas reales. Sus datos son ficticios y las acciones solo viven en memoria.

Desde la raíz del repositorio, ejecuta:

```bash
npm exec vite -- --config prototypes/home-designs/vite.config.js --host 127.0.0.1
```

Abre `http://127.0.0.1:4175` para explorar Inicio o `http://127.0.0.1:4175/cuentas` para comparar Cuentas. En cada ruta, usa el selector superior, las teclas `1`, `2`, `3` o las flechas para cambiar entre propuestas. El parámetro `?v=2` restaura una selección; `R` vuelve a reproducir la entrada. Los datos de estas exploraciones no se guardan ni modifican los datos reales.
