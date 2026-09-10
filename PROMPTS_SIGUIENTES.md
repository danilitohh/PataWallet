# Mensajes para continuar después de revisar cada entrega

No ejecutar estas etapas a la vez que la primera. Cada una presupone que se revisó la anterior. Los siguientes bloques se pueden copiar directamente.

## Fase 2 — datos reales y seguridad
```text
Apruebo la dirección visual de la Fase 1. Continúa con la Fase 2 de este paquete, conservando el diseño. Lee AGENTS.md, docs/03 y docs/05. Implementa autenticación real, recuperación de acceso, Supabase/PostgreSQL con migraciones y RLS, separación por usuario, persistencia en servidor, cola local y sincronización explícita. Conserva una demo separada; no subas automáticamente sus movimientos a mi cuenta. Protege las operaciones con autorización y validación. Incluye exportación y una estrategia documentada y probada de copia/restauración. No uses claves privilegiadas en el navegador. Pide únicamente la configuración externa imprescindible, sin pedirme pegar secretos en el chat. No modifiques proyectos existentes ni crees recursos de pago sin autorización. Ejecuta los tests de aislamiento y las pruebas financieras; entrega resultados y pasos pendientes. No actives aún la captura de Wallet.
```

## Fase 3 — PWA y notificaciones reales
```text
Continúa con la Fase 3 según docs/04 y docs/05. Implementa la instalación PWA, manifiesto, iconos, service worker, gestión de actualización sin perder formularios y Web Push real con VAPID. El permiso se solicita solo al tocar el botón correspondiente, con detección de funciones, instrucciones de instalación en iPhone y manejo de permisos denegados. Guarda las suscripciones por usuario/dispositivo, permite desactivar avisos y ocultar datos en ellos. No hagas push silencioso. La prueba de notificación debe ser real, no un toast que finge una notificación del sistema. Configura el despliegue HTTPS únicamente con mi autorización; documenta variables, costes por verificar y pruebas pendientes en mi iPhone. Diferencia que el proveedor aceptó el envío de que el dispositivo lo mostró.
```

## Fase 4 — atajo listo para el usuario y categorización
```text
Continúa con la Fase 4 según docs/04 y docs/05. Construye la API de vinculación y recepción de eventos, autorización de dispositivo limitada y revocable, idempotencia, validación, reglas de categorización y bandeja Por revisar. Implementa el asistente que ofrece un atajo preconstruido, lo vincula y guía la creación de la automatización personal en Atajos. No quiero construir las acciones manualmente como usuario final. No inventes un enlace iCloud ni renombres un JSON como .shortcut. Genera y publica una plantilla importable por un proceso compatible cuando el entorno lo permita; de lo contrario, deja el enlace deshabilitado y entrega el procedimiento preciso para que el responsable del proyecto la publique desde un dispositivo Apple. No declares la integración terminada hasta probar plantilla, persistencia de la vinculación, permisos y compra real en mi iPhone. Usa una prueba de conexión que no cree gasto y separa esa prueba de una transacción auténtica. Pregunta ahora la versión real de iOS y los bancos/tarjetas por alias, nunca datos de tarjeta o claves. Valida los campos disponibles; lo faltante pasa a revisión, no se inventa.
```

## Fase 5 — acabado de mascotas y revisión final
```text
Revisa la app completa con docs/02, docs/05 y docs/06. Perfecciona transiciones, rendimiento y composición sin cambiar la identidad aprobada. Mantén las ilustraciones originales; no finjas animación interna de un PNG. Si no hay personajes separados por capas o animaciones compatibles ya aprobadas, conserva la versión estática cuidada y documenta el recurso pendiente para cada gesto. Corrige desbordes, teclado, contraste, foco, modo oscuro, estados offline y posibles pérdidas/duplicados. Presenta pruebas automatizadas y manuales por separado. No declares producción lista si falta validar seguridad, restauración, notificaciones o Atajos en dispositivo real.
```
