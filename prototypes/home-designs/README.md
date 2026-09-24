# Exploraciones de interfaz de PataWallet

Vista previa aislada con tres composiciones de Inicio. Los diseños elegidos para Actividad, Plan y Cuentas ya fueron integrados en la aplicación productiva; esta vista previa conserva las exploraciones de Inicio y no cambia las pantallas reales. Sus datos son ficticios y las acciones solo viven en memoria.

Desde la raíz del repositorio, ejecuta:

```bash
npm exec vite -- --config prototypes/home-designs/vite.config.js --host 127.0.0.1
```

Abre `http://127.0.0.1:4175` para explorar Inicio. Usa el selector superior, las teclas `1`, `2`, `3` o las flechas para cambiar entre propuestas. El parámetro `?v=2` restaura una selección; `R` vuelve a reproducir la entrada. Los datos de esta exploración no se guardan ni modifican los datos reales.
