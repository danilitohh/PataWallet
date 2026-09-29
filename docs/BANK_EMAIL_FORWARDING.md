# Correos bancarios por reenvío selectivo

Estado: implementación local, **sin receptor de producción configurado**. No se ha accedido a Gmail, creado una cuenta de Resend, modificado DNS, aplicado SQL remoto ni desplegado esta función.

Alternativa añadida el 28 de septiembre: [conexión directa Gmail/Outlook](MAIL_CONNECTIONS.md), con sus tablas ya aplicadas y proveedores aún desactivados. Comparte la bandeja y no exige configurar reenvíos.

## Alcance de esta versión

- Ruta privada `/ajustes/correos-bancarios`, con consentimiento, dirección aleatoria individual, recepción desactivable y bandeja paginada de revisión.
- Adaptador Resend Inbound: webhook firmado, consulta del mensaje por ID al proveedor y asociación al destinatario SMTP (`received_for`, con `to` como compatibilidad). No se acepta un usuario indicado en el cuerpo del correo.
- Plantillas observadas en los ejemplos: salida Lulo, entrada/salida Bancolombia y entrada/salida/pago Nequi. Extrae importes enteros en unidades menores y fechas de operación de Colombia. Cambios de plantilla, moneda incierta o datos faltantes necesitan revisión, nunca se completan con dinero o fechas inventados.
- Cada correo queda pendiente. La persona decide registrar, vincular a un movimiento existente o descartar. Registrar reutiliza las validaciones y asientos de `private.apply_transaction_mutation`, de forma atómica con la resolución del correo.
- Nequi → Lulo puede confirmarse como **entre mis cuentas**: salida de un activo y entrada a otro, sin ingreso/gasto. El nombre «Lulo» por sí solo no demuestra titularidad ni tipo de operación.
- Se admiten también gasto, ingreso, pago de deuda y reembolso, confirmando las cuentas y categoría cuando corresponda. No se recuerdan reglas ni se utiliza IA en esta versión.
- Reintentos del mismo evento/Message-ID no duplican la recepción. Avisos distintos de una misma operación no se fusionan por simple igualdad de importe: se alerta sobre movimientos del mismo importe a ±2 minutos y se permite vincularlos; operaciones realmente distintas requieren confirmación explícita.

## Configuración del operador (pendiente de autorización)

1. Seleccionar la cuenta responsable de Resend y revisar coste, límites, acceso, retención de mensajes y tratamiento de datos. No se asume un plan gratuito ni se crea un recurso de pago.
2. Habilitar recepción en el subdominio real asignado por Resend o en un subdominio propio verificado. No reemplazar los MX del correo principal sin evaluar el impacto. [Guía oficial de recepción](https://resend.com/docs/dashboard/receiving/introduction).
3. Revisar y aplicar `supabase/migrations/20260927200000_bank_email_inbox.sql` con autorización sobre el proyecto correcto. Requiere las migraciones existentes, especialmente `20260926123000_budget_only_expenses.sql`. Las dos tablas nuevas tienen RLS; clientes solo pueden leer filas propias; el ingreso es exclusivo del servidor y la revisión usa `auth.uid()`.
4. Configurar secretos únicamente en servidor: `BANK_EMAIL_DOMAIN`, `RESEND_API_KEY` con permiso de lectura de recibidos y `RESEND_WEBHOOK_SECRET`. Mantener `BANK_EMAIL_ENABLED=false` hasta completar los pasos. Reutiliza `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY` y `APP_ORIGIN` existentes. Nunca usar `VITE_` para estos secretos ni pegarlos en el chat.
5. Configurar un webhook Resend para `email.received` a `https://<dominio-real-de-la-app>/api/bank-email/receive`. Conservar el secreto de firma y los bytes originales del cuerpo. [Contrato del webhook](https://resend.com/docs/dashboard/receiving/create-receiving-webhook), [verificación Svix](https://docs.svix.com/receiving/verifying-payloads/how-manual), [cuerpo original en Vercel](https://vercel.com/kb/guide/how-do-i-get-the-raw-body-of-a-serverless-function).
6. Revisar límites del plan Vercel antes de publicar: el árbol contiene ahora 15 archivos de API, incluida la conexión directa; no se ha confirmado la capacidad ni el empaquetado de funciones del despliegue real. No cambiar de plan automáticamente.
7. Publicar únicamente con autorización. Activar `BANK_EMAIL_ENABLED=true` en un entorno controlado, crear una dirección desde una sesión de prueba, comprobar entrega/reintento y aislamiento entre usuarios. La compilación Vite no certifica el runtime de las funciones Vercel.

## Configuración del usuario en Gmail

Usar Gmail de escritorio: Ajustes → Ver todos los ajustes → Reenvío y correo POP/IMAP → Añadir dirección de reenvío. Copiar la dirección privada generada por PataWallet. Volver a la app y actualizar recepción: si el mensaje de Google trae un código de confirmación reconocido, aparecerá durante una hora. Si no, el administrador debe revisar ese mensaje en Resend; la app no abre enlaces ni confirma el reenvío automáticamente.

**Dejar desactivado el reenvío general.** Crear filtros solamente para remitentes y asuntos de operaciones. Remitentes observados en las capturas, utilizados como selección de plantilla y no como prueba de autenticidad:

- Lulo: `notificaciones@lulobank.com`; asunto del envío exitoso.
- Bancolombia: `alertasynotificaciones@notificacionesbancolombia.com`; alertas de movimientos. Revisar el filtro porque el remitente también puede enviar avisos sin movimientos.
- Nequi: `notificaciones@nequi.com.co` y `somos@nequi.com.co`; recepción/envío de plata por Bre-B y pago exitoso.

Seleccionar «Reenviarlo a» la dirección privada en cada filtro. Gmail no necesariamente reenvía mensajes históricos al crear un filtro. Validar el siguiente aviso habitual sin realizar compras innecesarias. [Instrucciones oficiales de reenvío selectivo](https://support.google.com/mail/answer/10957?hl=es).

Desactivar en PataWallet no borra movimientos ni elimina filtros de Gmail. Retirar esos filtros también. Reactivar genera una dirección nueva; la anterior deja de admitirse.

## Seguridad, privacidad y límites

- Svix verifica que el webhook procede del proveedor, **no que el banco haya autorizado la operación**. Esta versión no usa SPF/DKIM/DMARC para autorizar movimientos y nunca registra dinero automáticamente. Un remitente visible puede falsificarse.
- PataWallet conserva solo datos extraídos, huella del Message-ID, ID del proveedor, referencia bancaria y trazabilidad de la decisión. No conserva el cuerpo completo ni descarga adjuntos. Resend sí recibe el correo completo; su retención debe revisarse antes de activar el servicio.
- Texto/HTML son datos no confiables: no ejecutar scripts, seguir enlaces, cargar imágenes o enviar instrucciones a un modelo. `html-to-text` 10.0.1 (MIT) convierte HTML en servidor; no se incluye en el frontend.
- Límites de aplicación: webhook 32 KB, respuesta del proveedor 400 KB, HTML 200 KB, texto 32 KB, 200 correos bancarios guardados por usuario por 24 horas. Este último límite no evita todos los costes del proveedor ni las descargas previas; vigilar consumo y alertas del servicio antes de abrir al público.
- Los fallos transitorios devuelven error para permitir reintento del proveedor. Formatos demasiado grandes/no admitidos pueden requerir intervención en su panel. No hay importación histórica ni conciliación automática entre bancos, Atajos y correo.
- Reenvío automático que preserve remitente y entrega es el objetivo; un reenvío manual envuelto como mensaje del usuario no se interpreta como auténtico del banco.
- Antes del lanzamiento público quedan pendientes las políticas de privacidad/términos acordes con este flujo, plazos reales de retención/borrado, responsable, jurisdicciones y revisión jurídica aplicable. No se afirma cumplimiento legal completo ni se publicaron textos genéricos como validados.

## Comprobaciones y recuperación

```sh
npm run dev
npm run lint
npm test
npm run build
npx playwright test tests/e2e/bank-email.spec.js --workers=2
node scripts/test-bank-email-db.mjs
```

El último comando requiere Docker y usa un PostgreSQL 17 efímero, sin puertos ni volúmenes persistentes. Elimina únicamente su contenedor al terminar. No usa las credenciales locales de Supabase. Comprueba RLS, revisión atómica, deduplicación, separación entre usuarios y asientos de una transferencia. Los ejemplos de pruebas son sintéticos.

Playwright prueba componentes reales con transporte simulado y la ruta de demo en 390×844, 375×812 y 1440×900. No sustituye un iPhone físico, una sesión remota ni un correo entregado realmente por Gmail/Resend.

Para detener la integración, desactivar `BANK_EMAIL_ENABLED`, retirar el webhook y pedir que se retiren los filtros de Gmail. Mantener las tablas y movimientos para auditoría; no ejecutar un `DROP` como rollback automático. Los movimientos ya confirmados conservan sus asientos. Una versión anterior puede desplegarse conservando esta migración aditiva.
