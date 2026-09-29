# PataWallet para Android

Este directorio contiene una Trusted Web Activity (TWA) generada con Bubblewrap. Abre la PWA existente en `https://pata-wallet.vercel.app/` y no duplica la lógica financiera, la autenticación ni el backend.

## Comandos

- `npm run android:init`: solo para regenerar el proyecto a partir del manifiesto PWA. Puede reemplazar la configuración Android local; no ejecutarlo sobre una personalización sin revisar el diff.
- `npm run android:build`: genera `android/app-release-signed.apk` para instalación directa y `android/app-release-bundle.aab` para una futura publicación en Google Play.

La sección Ajustes ofrece la APK actual en `/downloads/patawallet-android.apk`. Después de regenerar una APK para una nueva versión, copia el archivo firmado a `public/downloads/patawallet-android.apk` antes de desplegar.

La APK actual está firmada con una clave local que no se incluye en Git. Conserva `android.keystore` y su contraseña en un lugar seguro; perder esa clave impide actualizar instalaciones distribuidas con ella. Para Google Play conviene usar Play App Signing y agregar la huella de firma de Google a `public/.well-known/assetlinks.json` además de la huella de la APK directa.

## Requisitos para que funcione como app instalada

1. Publicar el sitio incluyendo `/.well-known/assetlinks.json`.
2. Instalar la APK en un dispositivo Android y comprobar inicio de sesión, navegación y actualización de la PWA.
3. Activar las notificaciones desde PataWallet y aceptar el permiso del sistema cuando Android lo solicite.

La TWA permite reutilizar el Web Push que ya existe en la PWA. No añade lectura de notificaciones de otros bancos ni acceso al historial de Google Pay; esas capacidades requerirían una integración nativa separada y revisión de privacidad y de las políticas de Google Play.
