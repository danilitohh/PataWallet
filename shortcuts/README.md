# Blueprint de “PataWallet · Registrar compra”

Este directorio no contiene un `.shortcut` y `template-manifest.json` no es importable. En este equipo Windows no están disponibles la app Atajos, la firma de Apple ni un iPhone para verificar los nombres y tipos de las acciones. Por eso la app mantiene `availability: pending` y desactiva “Añadir atajo”. El usuario final no debe construir estas acciones: este documento es el procedimiento de producción para la persona responsable del proyecto.

## Contrato fijo

- Nombre: `PataWallet · Registrar compra`.
- Versión inicial de blueprint: `1.0.0-blueprint`.
- Modos incluidos: `pair`, `connection_test` y `capture`.
- `retry_pending` queda excluido. Si una solicitud falla, la plantilla debe mostrar “No se pudo enviar; este evento no quedó en cola”.
- Origen API: constante HTTPS del despliegue autorizado. No se pregunta ni acepta un destino arbitrario.
- Credencial: 32 bytes aleatorios emitidos una sola vez por `POST /api/shortcuts/pair`; se guarda localmente mediante acciones de Archivos. No afirmar que es Keychain. Elegir “En mi iPhone”, no iCloud Drive, y comprobar en el dispositivo si Atajos puede leer/escribir de forma persistente sin interacción. Si no puede, la vinculación no se considera exitosa.
- Nunca incluir un token, ticket usado, correo, identificador de usuario ni datos de tarjeta en la plantilla que se comparte.

## Acciones que debe construir el responsable en Apple Shortcuts

La primera acción recibe Texto. Convertirlo a diccionario y leer `mode`.

### `pair`

1. Leer `ticket` del texto recibido mediante `shortcuts://run-shortcut`.
2. Crear JSON `{ "ticket": <ticket>, "template_version": "1.0.0-blueprint" }`.
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

## Producir el artefacto real

1. Crear la plantilla anterior en un iPhone o Mac dedicado al proyecto y verificar cada acción con una base aislada.
2. Exportar/compartir el atajo sin credenciales. Si se distribuye como archivo desde macOS, usar las herramientas oficiales disponibles allí para firmarlo; no renombrar JSON como `.shortcut`.
3. Importarlo en un segundo dispositivo limpio y confirmar que no contiene token, ticket ni URL editable.
4. Publicar desde Atajos mediante “Copiar enlace de iCloud”, abrir el enlace en un dispositivo sin la plantilla y confirmar nombre/versión/acciones.
5. Solo después, configurar en el servidor `SHORTCUT_ICLOUD_URL`, `SHORTCUT_TEMPLATE_VERSION`, `SHORTCUT_NAME` y `SHORTCUT_MIN_IOS_TESTED`; desplegar requiere autorización separada.
6. Ejecutar la hoja `docs/FASE_4_PRUEBAS_IPHONE.md`. Hasta completar toda la evidencia, no cambiar `availability` a disponible ni decir que Wallet está sincronizada.

Apple documenta que el disparador Transacción se activa al tocar una tarjeta seleccionada, que Atajos puede hacer solicitudes HTTP y que los atajos pueden compartirse por iCloud. Esas capacidades no garantizan el payload ni compras online, con tarjeta física o desde Apple Watch.
