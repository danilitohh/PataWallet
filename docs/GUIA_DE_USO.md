# Guía de uso de PataWallet

## Abrir la versión local

1. Instala Node.js 22 o posterior.
2. En la carpeta ejecuta `npm install` y `npm run dev`.
3. Abre la dirección que indica Vite. Usa **Probar con datos de ejemplo** para revisar sin mezclar datos reales.

## Entrar y registrar

- Crea una cuenta con nombre, correo y contraseña. Si Supabase exige confirmación, abre el enlace recibido. **Olvidé mi contraseña** usa la recuperación del proveedor.
- Google aparece solo si el proveedor está configurado; PataWallet no almacena contraseñas por su cuenta.
- Pulsa **+** y responde «¿Qué pasó?»: **Hice una compra**, **Recibí dinero** o **Pagué una deuda**. **Moví dinero** está en «Más opciones». Fecha, hora, nota y comprobante están en «Añadir detalles»; la fecha de hoy ya está seleccionada.
- Para una compra común, escribe monto y categoría. **Dinero disponible** afecta solo el presupuesto y no cambia saldos; elige efectivo, banco o crédito en «¿Con qué pagaste?» si quieres actualizar la cuenta correspondiente.
- Para pagar una deuda, elige la cuenta de donde salió el dinero y la deuda pagada. El saldo de ambas baja sin contar un segundo gasto. Para un ingreso, elige la cuenta donde llegó.
- En **Cuentas → Gastos fijos**, marca un vencimiento y confirma monto, origen y categoría. Esto registra el pago en Actividad y lo quita de la checklist; si no eliges una cuenta, solo cambia el presupuesto. El pago real sustituye al compromiso previsto en «dinero libre», sin restarlo dos veces.
- En **Actividad**, abre un movimiento para corregirlo o eliminarlo. **Deshacer** restaura la eliminación mientras el aviso está visible.
- En **Cuentas** administra activos/tarjetas. En **Plan** configura presupuesto, metas y reservas; reservar no crea ni mueve dinero.

## Sincronización

- **Guardado en este dispositivo**: el cambio existe localmente.
- **Pendiente de sincronizar**: espera al servidor; mantén la app abierta o pulsa Reintentar.
- **Sincronizado**: el servidor confirmó el estado.
- **Conflicto**: existe otra versión; revisa antes de elegir la del servidor.

No cierres sesión con cambios pendientes sin leer la advertencia. Cada cola pertenece al usuario que la creó.

## Avisos, PWA y Atajos

En iPhone, abre el origen HTTPS autorizado en Safari, usa Compartir → Añadir a pantalla de inicio y abre el icono. En **Ajustes → Notificaciones**, solicita permiso con el botón. “Aceptado por el servicio” no demuestra que el teléfono mostró el aviso.

En **Ajustes → Automatización**, **Añadir atajo** seguirá bloqueado hasta una plantilla Apple auténtica. La vinculación será revocable y la automatización de iOS se administra aparte. **Probar conexión** no crea una compra. Los eventos incompletos aparecen en **Por revisar**; categorizar no crea otro movimiento.

## Exportar y recuperar

- CSV es una tabla de movimientos, no un respaldo completo.
- JSON es el respaldo versionado. Guárdalo en una ubicación privada distinta del dispositivo.
- Para restaurar, entra con la misma cuenta, elige **Restaurar JSON**, revisa el resumen y espera **Sincronizado**. Un conflicto detiene la escritura.

Si la app falla, no borres datos del navegador. Conserva el JSON y sigue `docs/PLAN_DE_PUBLICACION_Y_RECUPERACION.md`.
