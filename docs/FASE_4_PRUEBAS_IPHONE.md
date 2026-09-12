# Fase 4 · Pruebas pendientes en iPhone

Esta hoja se completa con una base y usuario aislados. No anotar número completo de tarjeta, credenciales ni secretos. Identificar tarjetas solo por alias.

## Entorno

- Responsable:
- Fecha:
- Modelo de iPhone:
- Versión exacta de iOS:
- Versión de la plantilla:
- Alias de tarjetas probadas:
- URL HTTPS autorizada:

## Plantilla y vinculación

- [ ] El enlace iCloud real abre la plantilla correcta en un dispositivo limpio.
- [ ] La plantilla importada no contiene credenciales ni datos del creador.
- [ ] El ticket vence tras cinco minutos.
- [ ] Un ticket consumido no puede usarse otra vez, incluidas dos solicitudes simultáneas.
- [ ] El token se conserva tras cerrar/reabrir Atajos sin interacción adicional inesperada.
- [ ] Un fallo al guardar la configuración no aparece como vinculación exitosa.
- [ ] “Probar conexión” actualiza solo “Última prueba” y no saldo, presupuesto, movimientos ni “Último evento real”.

## Automatización y compra compatible

- [x] Crear Automatización personal → Wallet → “Cuando use sin contacto” → tarjetas seleccionadas.
- [ ] Confirmar si “Ejecutar inmediatamente” está disponible y anotar su etiqueta exacta.
- [x] Crear el diccionario `amount`/`merchant_name`/`card_alias` y pasarlo a `PataWallet - Registrar compra`; no reconstruir el atajo.
- [ ] En la siguiente compra habitual compatible, registrar qué campos entrega realmente Atajos.
- [ ] Un evento completo con regla crea exactamente un gasto y los asientos correctos para débito/crédito.
- [ ] Un evento completo sin regla crea un gasto “Sin categoría”, entra en totales y queda por revisar.
- [ ] Falta de monto, moneda, fecha o mapeo no cambia cifras y queda en “Por revisar”.
- [ ] Repetir el mismo UUID y contenido devuelve el resultado original sin duplicar gasto ni aviso.
- [ ] Repetir el UUID con contenido distinto devuelve conflicto y no sobrescribe.
- [ ] Dos compras legítimas similares con UUID distintos no se borran automáticamente.
- [ ] Resolver/reintentar simultáneamente no crea dos movimientos.

## Red, privacidad y revocación

- [ ] Sin red, el atajo dice que no pudo enviar y no promete que quedó en cola.
- [ ] Ninguna URL, captura, archivo compartido o registro muestra token completo.
- [ ] Revocar en PataWallet invalida `test` y `events`, conserva movimientos y explica que la automatización del iPhone sigue allí.
- [ ] Desactivar/eliminar también la automatización en Atajos.
- [ ] Usuario A no ve ni modifica dispositivos, mapeos, reglas o eventos de B mediante solicitudes directas.
- [ ] Restaurar un respaldo no reactiva tokens ni vuelve a emitir eventos.

## Resultado

- Plantilla importada: **PENDIENTE**
- Vinculación persistente: **PENDIENTE**
- Prueba de conexión real: **PENDIENTE**
- Compra compatible real: **PENDIENTE**
- Débito probado: **PENDIENTE**
- Crédito probado: **PENDIENTE**
- Revocación probada: **PENDIENTE**

No marcar Fase 4 validada hasta completar estos resultados y la ejecución remota de migraciones/RLS en un entorno aislado.
