# Atajo preconstruido · PataWallet Registrar compra

## Conclusión verificada

Apple documenta el activador de transacción. En el iPhone validado por el usuario aparece en español como **Wallet → Al realizar un pago sin contacto con mi tarjeta o pase de Wallet** y, dentro de la configuración, como **Cuando use sin contacto…**. Puede ejecutar una automatización al usar una tarjeta seleccionada. Apple también documenta que la acción **Obtener contenido de URL** realiza solicitudes a una API y que un atajo puede compartirse por iCloud.

La documentación pública de Apple no enumera las propiedades que la entrada de Transacción expone al atajo. La inspección realizada en el iPhone del responsable confirmó una entrada de tipo **Transacción** con estas propiedades: **Transacción**, **Tarjeta o pase**, **Comercio**, **Cantidad** y **Nombre**. No aparecieron fecha ni moneda como propiedades seleccionables. Estos nombres ya son evidencia del dispositivo observado, pero se mantiene la prueba con una compra habitual para confirmar sus valores y tipos efectivos.

Fuentes oficiales:

- https://support.apple.com/es-es/guide/shortcuts/apd65c67538a/ios
- https://support.apple.com/es-es/guide/shortcuts/apd58d46713f/ios
- https://support.apple.com/es-es/guide/shortcuts/apdf01f8c054/ios

## Arquitectura

La automatización personal y el atajo compartido son piezas distintas:

1. El responsable construye y publica una sola plantilla llamada `PataWallet - Registrar compra`.
2. Cada usuario añade esa plantilla desde el enlace iCloud de PataWallet.
3. PataWallet genera un ticket de vinculación de cinco minutos y ejecuta la plantilla con ese ticket.
4. La plantilla canjea el ticket por un token limitado a `test` y `event`; no puede leer, editar ni borrar el historial.
5. Cada usuario crea la automatización personal Wallet (el nombre puede aparecer como Transacción en otras versiones/regiones), selecciona sus tarjetas y elige ejecutar la plantilla instalada.
6. En una compra compatible, la plantilla transforma la entrada real al contrato de PataWallet y llama a `/api/shortcuts/events`.

La PWA no puede crear silenciosamente la automatización personal ni seleccionar tarjetas por el usuario.

## Variables públicas de la plantilla

- `API_ORIGIN`: `https://pata-wallet.vercel.app`
- `TEMPLATE_VERSION`: versión publicada, por ejemplo `1.0.0`
- `SHORTCUT_NAME`: `PataWallet - Registrar compra`
- `CONFIG_FILE`: archivo privado de configuración elegido durante la producción del atajo.

El token no se incluye en la plantilla pública. Si se persiste mediante Archivos/iCloud Drive, debe describirse como un archivo de configuración con un token limitado, no como Keychain ni almacenamiento cifrado.

## Flujo `pair`

Entrada: texto JSON enviado por `shortcuts://run-shortcut`, con `{ "mode": "pair", "ticket": "..." }`.

Acciones de la plantilla:

1. Recibir `Entrada del atajo` como texto.
2. Obtener diccionario del texto JSON.
3. Si `mode` es `pair`, construir un diccionario con `ticket` y `template_version`.
4. `Obtener contenido de URL`:
   - URL: `[API_ORIGIN]/api/shortcuts/pair`
   - método: `POST`
   - cuerpo: JSON
   - encabezado: `Content-Type: application/json`
5. Comprobar que la respuesta contiene `token`, `device_id`, `expires_at` y `api_origin`.
6. Comprobar que `api_origin` coincide exactamente con `API_ORIGIN`.
7. Guardar la configuración para las ejecuciones posteriores.
8. Ejecutar el flujo `connection_test`.

No mostrar “vinculado” si falta alguno de esos campos o falla el guardado.

## Flujo `connection_test`

1. Leer la configuración.
2. `POST [API_ORIGIN]/api/shortcuts/test`.
3. Encabezado `Authorization: Bearer [token]`.
4. Aceptar como éxito únicamente `status = connection_verified`.
5. Mostrar claramente que la prueba no creó una compra.

## Flujo `capture`

1. Recibir un diccionario creado por la automatización personal.
2. En esa automatización, mapear `Tarjeta o pase` → `card_alias`, `Comercio` → `merchant_name` y `Cantidad` → `amount`. La plantilla compartida consume esas tres claves sin depender del tipo privado Transacción.
3. Generar UUID antes de enviar y conservarlo en cualquier reintento de esa ejecución.
4. Convertir el monto decimal confirmado a unidades menores: multiplicar por 100 y redondear; producir una cadena entera positiva. No analizar texto localizado ambiguo.
5. Obtener la fecha actual durante la ejecución y formatearla con ISO 8601 y zona/offset, porque no aparece como propiedad de la entrada observada. Usar `COP` según la moneda única actual del perfil; no inferir moneda desde texto.
6. Construir el JSON:

```json
{
  "schema_version": 1,
  "event_id": "UUID",
  "occurred_at": "ISO-8601 con offset",
  "amount_minor": "entero como texto",
  "currency": "COP",
  "merchant_name": null,
  "card_alias": null,
  "source": "ios_shortcuts",
  "mode": "capture",
  "template_version": "1.0.0"
}
```

7. `POST [API_ORIGIN]/api/shortcuts/events`, con `Content-Type: application/json` y `Authorization: Bearer [token]`.
8. Interpretar `recorded`, `recorded_needs_category`, `needs_review`, `duplicate` y `conflict` sin inventar éxito.
9. Si no hay red, avisar que no se pudo enviar. No afirmar que quedó en cola hasta implementar una cola duradera dentro del propio atajo.

## Validación obligatoria en el iPhone responsable

1. Instalar la plantilla desde el enlace iCloud publicado y vincularla desde la sesión real de PataWallet.
2. Probar primero `pair` y después `connection_test`; ninguna de estas operaciones crea una compra.
3. En la siguiente compra habitual compatible, comprobar los valores y tipos efectivos de `Tarjeta o pase`, `Comercio` y `Cantidad`; no registrar número completo de tarjeta.
4. Confirmar débito/crédito, mapeo de alias, categoría, duplicado y revocación con `docs/FASE_4_PRUEBAS_IPHONE.md`.
5. Enlace publicado: `https://www.icloud.com/shortcuts/12c4f7d2f466425ba3e9379203ab59f5`. Configurar en Vercel `SHORTCUT_ICLOUD_URL`, `SHORTCUT_TEMPLATE_VERSION` y `SHORTCUT_NAME`. Añadir `SHORTCUT_MIN_IOS_TESTED` únicamente después de completar las pruebas reales en esa versión de iOS.

Con URL, origen y versión válidos, la UI puede mostrar **Plantilla disponible**, pero debe indicar **pendiente de validación en iPhone** mientras falte `SHORTCUT_MIN_IOS_TESTED`.
