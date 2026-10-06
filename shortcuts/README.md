# Atajo “PataWallet - Registrar compra”

`artifacts/PataWallet-Registrar-compra.shortcut` es el artefacto Apple firmado y corregido localmente. El 5 de octubre de 2026 se publicó desde Atajos para macOS un enlace iCloud nuevo que contiene la clave HTTP exacta `Authorization`: https://www.icloud.com/shortcuts/8062e3a7c10748a7aceaf47b9d0fdb19. Production de Vercel entrega ese enlace con el nombre `PataWallet - Registrar compra` y versión `1.0.0`; el despliegue final es `HmRNaiiNBVTVXFZL2tabkqDHhcRN`. Ni el artefacto ni el enlace contienen ticket o token.

El atajo publicado contiene versión `1.0.0` y conserva el nombre que selecciona la automatización personal. La corrección del encabezado se verificó en el editor de Atajos para macOS antes de crear el enlace nuevo, y la ficha de Apple carga con el nombre correcto. En el iPhone se comprobó que la automatización Wallet está activa para cualquiera de seis tarjetas/pases y que mapea tarjeta/pase, comercio y cantidad al atajo de captura. La plantilla ya está publicada en el enlace que sirve la microapp; falta instalar/actualizar esa versión en el iPhone y ejecutar una prueba de conexión sin efectos financieros. No se hizo un POST autenticado ni una compra de prueba.

## Contrato fijo

- Nombre: `PataWallet - Registrar compra`.
- Versión observada en el atajo publicado: `1.0.0`.
- Modos incluidos: `pair`, `connection_test` y `capture`.
- `retry_pending` queda excluido. Si una solicitud falla, la plantilla debe mostrar “No se pudo enviar; este evento no quedó en cola”.
- Origen API: constante HTTPS del despliegue autorizado. No se pregunta ni acepta un destino arbitrario.
- Credencial: 32 bytes aleatorios emitidos una sola vez por `POST /api/shortcuts/pair`; se guarda localmente mediante acciones de Archivos. No afirmar que es Keychain. Elegir “En mi iPhone”, no iCloud Drive, y comprobar en el dispositivo si Atajos puede leer/escribir de forma persistente sin interacción. Si no puede, la vinculación no se considera exitosa.
- Nunca incluir un token, ticket usado, correo, identificador de usuario ni datos de tarjeta en la plantilla que se comparte.

## Contrato del atajo

La primera acción recibe Texto. Convertirlo a diccionario y leer `mode`.

### `pair`

1. Leer `ticket` del texto recibido mediante `shortcuts://run-shortcut`.
2. Crear JSON `{ "ticket": <ticket>, "template_version": "1.0.0" }`.
3. `Obtener contenido de URL`: POST a `<ORIGEN_FIJO>/api/shortcuts/pair`, cuerpo JSON.
4. Exigir respuesta con `token`, `device_id`, `expires_at` y el mismo origen fijo. Un error termina con aviso; no guardar un estado parcial.
5. Guardar un diccionario JSON con esos valores en una ubicación local privada de la app Atajos, reemplazando la configuración anterior solo después de verificar que el archivo nuevo puede releerse. Si el guardado o la relectura falla, no mostrar “vinculado”; el propietario debe revocar el dispositivo incompleto desde PataWallet.

### `connection_test`

1. Leer la configuración persistida y comprobar que el origen coincide exactamente con la constante HTTPS.
2. POST vacío a `<ORIGEN_FIJO>/api/shortcuts/test` con `Authorization: Bearer <token>`.
3. Mostrar el mensaje devuelto: la prueba no crea gasto y no prueba una compra.

### `capture`

1. Recibir la entrada del disparador personal Transacción.
2. En el iPhone de prueba, inspeccionar los tipos realmente expuestos por Atajos. Mapear exclusivamente campos observados y documentados; no suponer monto, comercio o tarjeta.
3. Generar un UUID antes del primer envío y construir el contrato de `examples/shortcut-event.json`. `amount_minor` es texto entero en centavos: COP 85.000 se envía como `"8500000"`, nunca como flotante.
4. Formatear la fecha en ISO 8601 con zona. Los campos no disponibles se omiten; el servidor los envía a “Por revisar”.
5. POST a `<ORIGEN_FIJO>/api/shortcuts/events` con `Authorization: Bearer <token>`.
6. Interpretar `recorded`, `recorded_needs_category`, `needs_review`, `duplicate` y `conflict`. No repetir automáticamente con un UUID nuevo. Sin una cola local probada, un fallo de red muestra que el evento no fue guardado.

Compatibilidad: el receptor también acepta `amount` como pesos decimales (por ejemplo `32500` o `32500.50`) y lo convierte a unidades menores. `amount_minor` sigue siendo el contrato preferido. Texto con separadores localizados ambiguos o dos campos de monto contradictorios no se interpretan y quedan para revisión.

## Publicación y validación

1. El enlace oficial corregido ya está publicado desde Atajos para macOS: https://www.icloud.com/shortcuts/8062e3a7c10748a7aceaf47b9d0fdb19. El enlace anterior de septiembre se reemplazó en Production porque su copia compartida tenía un espacio final en `Authorization`.
2. La variable `SHORTCUT_ICLOUD_URL` en Production de Vercel ya apunta al enlace nuevo; `SHORTCUT_TEMPLATE_VERSION=1.0.0` y `SHORTCUT_NAME=PataWallet - Registrar compra` coinciden con la plantilla. El despliegue final quedó Ready en `https://pata-wallet.vercel.app`.
3. Instalar/actualizar desde el enlace nuevo en el iPhone y confirmar que la automatización Wallet selecciona esa copia del atajo.
4. Ejecutar `docs/FASE_4_PRUEBAS_IPHONE.md`: primero vinculación y prueba de conexión sin crear movimientos; después observar una compra habitual compatible. El simulador no valida pagos sin contacto reales; esa prueba requiere iPhone físico.

Apple documenta que el disparador Transacción se activa al tocar una tarjeta seleccionada, que Atajos puede hacer solicitudes HTTP y que los atajos pueden compartirse por iCloud. Esas capacidades no garantizan el payload ni compras online, con tarjeta física o desde Apple Watch.
