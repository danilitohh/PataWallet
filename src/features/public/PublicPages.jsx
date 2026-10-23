import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PawPrint } from 'lucide-react'
import './public-pages.css'

const updatedAt = '14 de octubre de 2026'
const homeDescription = 'PataWallet Web organiza cuentas, ingresos, gastos, presupuestos y metas. Revisa avisos bancarios opcionales antes de registrarlos.'

function updatePublicMetadata(title, description) {
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
}

function PublicHeader() {
  return (
    <header className="public-header">
      <Link className="public-brand" to="/" aria-label="PataWallet Web, página principal">
        <PawPrint aria-hidden="true" />
        <span>PataWallet Web</span>
      </Link>
      <nav aria-label="Información de PataWallet">
        <Link to="/privacidad">Privacidad</Link>
        <Link to="/terminos">Términos</Link>
        <Link className="public-header__action" to="/?acceso=1">Iniciar sesión</Link>
      </nav>
    </header>
  )
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <span>PataWallet Web · Finanzas personales</span>
      <nav aria-label="Enlaces legales">
        <Link to="/privacidad">Política de privacidad</Link>
        <Link to="/terminos">Términos del servicio</Link>
        <a href="mailto:danilitohhh@gmail.com">Contacto</a>
      </nav>
    </footer>
  )
}

function PublicLayout({ children }) {
  return (
    <div className="public-site">
      <div className="public-site__inner">
        <PublicHeader />
        {children}
        <PublicFooter />
      </div>
    </div>
  )
}

export function PublicHomePage() {
  useEffect(() => { updatePublicMetadata('PataWallet Web · Finanzas personales', homeDescription) }, [])
  return (
    <PublicLayout>
      <main className="public-home">
        <section className="public-hero" aria-labelledby="public-home-title">
          <div className="public-hero__copy">
            <p className="public-eyebrow">Tus finanzas, con más claridad</p>
            <h1 id="public-home-title">Organiza tu dinero a tu propio ritmo.</h1>
            <p className="public-lead">
              PataWallet Web te ayuda a reunir cuentas, ingresos, gastos, presupuestos y metas en un solo lugar.
              Tú decides qué registrar y cuándo.
            </p>
            <div className="public-actions">
              <Link className="public-button public-button--primary" to="/?acceso=1">Entrar a PataWallet</Link>
              <Link className="public-button public-button--quiet" to="/privacidad">Cómo tratamos tus datos</Link>
            </div>
            <p className="public-hero__note">PataWallet no es un banco ni mueve dinero por ti.</p>
          </div>
          <img
            className="public-hero__image"
            src="/assets/illustrations/welcome-family-800.webp"
            srcSet="/assets/illustrations/welcome-family-480.webp 480w, /assets/illustrations/welcome-family-800.webp 800w, /assets/illustrations/welcome-family-1122.webp 1122w"
            sizes="(max-width: 760px) 92vw, 42vw"
            width="800"
            height="1000"
            alt="Ilustración de un perro y varios gatos descansando juntos"
            fetchPriority="high"
          />
        </section>

        <section className="public-features" aria-labelledby="public-features-title">
          <div>
            <p className="public-eyebrow">Una vista sencilla de tu día a día</p>
            <h2 id="public-features-title">Tus decisiones siguen siendo tuyas.</h2>
          </div>
          <div className="public-features__grid">
            <article>
              <h3>Registra y organiza</h3>
              <p>Guarda movimientos, cuentas, presupuestos, metas y compromisos. Puedes consultar y editar la información de tu espacio.</p>
            </article>
            <article>
              <h3>Revisa los avisos antes de registrarlos</h3>
              <p>Si conectas un correo, PataWallet puede proponer avisos bancarios para revisión. Un aviso no modifica tus saldos hasta que tú lo confirmes.</p>
            </article>
            <article>
              <h3>Consulta tus datos con ayuda de IA</h3>
              <p>Cuando usas el asistente, se envían tu pregunta y el contexto financiero necesario al servicio de IA configurado. Puedes conocer qué se comparte en la política de privacidad.</p>
            </article>
          </div>
        </section>

        <section className="public-how" aria-labelledby="public-how-title">
          <div>
            <p className="public-eyebrow">Así funciona</p>
            <h2 id="public-how-title">Tú decides qué entra en tu registro.</h2>
          </div>
          <ol>
            <li><strong>Organiza.</strong> Crea tus cuentas y registra ingresos, gastos, transferencias y compromisos.</li>
            <li><strong>Revisa.</strong> Consulta tus movimientos, presupuestos y metas en un mismo espacio.</li>
            <li><strong>Confirma.</strong> Si conectas un correo, verifica cada aviso bancario antes de convertirlo en movimiento.</li>
          </ol>
        </section>

        <section className="public-mail" aria-labelledby="public-mail-title">
          <p className="public-eyebrow">Conexión opcional</p>
          <h2 id="public-mail-title">¿Qué ocurre si conectas Gmail?</h2>
          <p>
            Google solicita permiso de solo lectura para el buzón. En PataWallet eliges los bancos que quieres buscar;
            la app consulta avisos que coincidan con ellos y procesa temporalmente el texto para extraer datos del movimiento.
            No envía, modifica ni elimina tus correos, y no descarga archivos adjuntos.
          </p>
          <p>
            Los avisos encontrados aparecen en una bandeja para que tú los revises. Puedes leer los detalles y cómo desconectar el correo en la{' '}
            <Link to="/privacidad">política de privacidad</Link>.
          </p>
        </section>
      </main>
    </PublicLayout>
  )
}

function PolicySection({ title, children }) {
  return <section className="public-policy__section"><h2>{title}</h2>{children}</section>
}

export function PublicDocumentPage({ type = 'privacy' }) {
  const isPrivacy = type === 'privacy'
  useEffect(() => {
    updatePublicMetadata(
      `${isPrivacy ? 'Política de privacidad' : 'Términos del servicio'} · PataWallet Web`,
      isPrivacy
        ? 'Consulta qué información usa PataWallet Web, cómo se procesan avisos bancarios de Gmail y cómo ejercer tus derechos.'
        : 'Consulta los términos para usar PataWallet Web, sus funciones de finanzas personales y conexiones opcionales.'
    )
  }, [isPrivacy])
  return (
    <PublicLayout>
      <main className="public-policy">
        <Link className="public-back" to="/">Volver a PataWallet</Link>
        <p className="public-eyebrow">PataWallet Web</p>
        <h1>{isPrivacy ? 'Política de privacidad' : 'Términos del servicio'}</h1>
        <p className="public-policy__updated">Última actualización: <time dateTime="2026-10-14">{updatedAt}</time></p>

        {isPrivacy ? <>
          <p className="public-policy__intro">
            Esta política explica qué información trata PataWallet Web, para qué la usa, con qué servicios puede compartirla
            y cómo puedes solicitar acceso, corrección, supresión o revocar una autorización. PataWallet es una herramienta
            de organización financiera personal; no es un banco.
          </p>

          <PolicySection title="Responsable y contacto">
            <p>El operador de PataWallet Web atiende consultas de privacidad en <a href="mailto:danilitohhh@gmail.com">danilitohhh@gmail.com</a>. Incluye el correo de tu cuenta y explica tu solicitud para que podamos verificar que eres su titular.</p>
          </PolicySection>

          <PolicySection title="Información que tratamos">
            <ul>
              <li><strong>Cuenta:</strong> correo electrónico, nombre de perfil y datos necesarios para iniciar sesión y recuperar el acceso.</li>
              <li><strong>Finanzas que agregas:</strong> cuentas, saldos, ingresos, gastos, transferencias, categorías, presupuestos, metas, compromisos y preferencias.</li>
              <li><strong>Colaboración y avisos:</strong> información que compartes al usar funciones de pareja, y datos de suscripción de dispositivo si activas notificaciones.</li>
              <li><strong>Uso del sitio:</strong> datos técnicos mínimos que intervienen al autenticarte, sincronizar información o atender errores. No usamos tus finanzas para publicidad.</li>
            </ul>
          </PolicySection>

          <PolicySection title="Qué permiso solicita la conexión de correo">
            <p>Si conectas Gmail, Google solicita el permiso <code>gmail.readonly</code>. Ese permiso técnico permite leer mensajes y metadatos del buzón, por eso debes elegirlo de forma expresa; se usa para ofrecer la búsqueda de avisos bancarios que solicitas, no para publicidad. Si conectas Outlook, se solicita lectura del correo mediante Microsoft Graph. La conexión es opcional y separada del inicio de sesión de PataWallet.</p>
            <p>En PataWallet eliges cuáles bancos buscar. El servidor consulta remitentes de esos bancos y, para Bancolombia, también busca avisos cuyo contenido mencione el banco junto con lenguaje de una operación. El texto de los mensajes seleccionados se procesa temporalmente en el servidor para extraer datos como banco, monto, fecha, comercio y tipo sugerido. PataWallet no envía, modifica ni elimina correos, ni descarga adjuntos.</p>
            <p>El buzón y los avisos encontrados quedan vinculados a tu cuenta. Se guarda el correo conectado, los bancos elegidos, identificadores necesarios para evitar duplicados, los datos extraídos y el estado de revisión; no se conserva el cuerpo completo del mensaje. Los avisos quedan pendientes y no crean movimientos ni cambian saldos hasta que los confirmes. PataWallet no usa los datos de Google para publicidad ni los vende.</p>
            <p>El token de renovación de la conexión se cifra en el servidor y no se entrega al navegador. Al desconectar, PataWallet elimina el token y los datos de la conexión activa. Los avisos que ya se importaron no se borran automáticamente al desconectar. También puedes retirar el permiso desde la configuración de seguridad de tu cuenta de Google o Microsoft.</p>
          </PolicySection>

          <PolicySection title="Uso limitado de datos de Google">
            <p>El uso de información recibida de las API de Google se limita a prestar las funciones de PataWallet que ves y solicitas, como buscar y organizar avisos bancarios para que los revises. No se vende ni se usa para publicidad, determinar tu capacidad de crédito o entrenar modelos generales de inteligencia artificial. No permitimos que personas lean los mensajes, salvo que autorices revisar un mensaje específico o que sea necesario para seguridad o para cumplir la ley.</p>
            <p>El uso de datos obtenidos mediante Google Workspace APIs se ajusta a la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Política de datos de usuario de los servicios de API de Google</a>, incluidos sus requisitos de uso limitado.</p>
          </PolicySection>

          <PolicySection title="Funciones de inteligencia artificial">
            <p>El asistente solo recibe información cuando envías una pregunta: se transmite la pregunta, hasta seis mensajes recientes de esa conversación y el contexto financiero necesario para contestarla al servicio de IA configurado por PataWallet (por defecto, Ollama; el operador puede configurar otro endpoint compatible). La conversación no se guarda como historial de chat por PataWallet.</p>

            <p>Cuando está habilitada la sugerencia de categoría para una compra recibida por Atajos, pueden enviarse el nombre del comercio y los nombres de tus categorías a Google Gemini y OpenAI. Un tercer modelo de OpenAI puede recibir esos mismos datos si los dos primeros discrepan. Estos servicios procesan la información de acuerdo con sus propias condiciones y políticas. Las respuestas de IA son sugerencias y no registran movimientos por sí solas.</p>
          </PolicySection>

          <PolicySection title="Dónde se almacena y con quién se comparte">
            <p>La aplicación usa Supabase para autenticación y almacenamiento de los datos de la cuenta, y Vercel para alojar la web y ejecutar funciones del servidor. La app también mantiene una copia local y una cola de sincronización en el navegador para que puedas continuar en el dispositivo. Google o Microsoft reciben la autorización directa para el proveedor de correo que elijas. Los proveedores de alojamiento y autenticación también pueden procesar datos técnicos de conexión, como dirección IP, dispositivo y registros operativos.</p>
            <p>Solo se envían datos a servicios de IA en las situaciones descritas arriba. Si activas notificaciones, se guarda la información técnica de la suscripción para poder enviarlas a través del servicio Web Push del dispositivo. Las notificaciones son genéricas por defecto; si habilitas mostrar detalles, las de movimientos pueden incluir comercio e importe y las de presupuesto un porcentaje de avance. PataWallet no vende información personal ni comparte datos financieros para publicidad. Los proveedores externos aplican sus propias políticas de tratamiento y pueden procesar datos en los países donde operan.</p>
          </PolicySection>

          <PolicySection title="Conservación, desconexión y eliminación">
            <p>Los datos de una cuenta activa permanecen asociados a ella; no hay una fecha automática de expiración publicada. PataWallet tampoco aplica una fecha de vencimiento automática a los avisos importados; puedes resolverlos desde la bandeja. Desconectar el correo detiene futuras búsquedas y elimina las credenciales activas, pero no elimina los avisos ya importados.</p>
            <p>Para solicitar una copia, corrección, supresión de datos o cierre de cuenta, escribe a <a href="mailto:danilitohhh@gmail.com?subject=Solicitud%20de%20privacidad%20PataWallet">danilitohhh@gmail.com</a>. Verificaremos la titularidad y responderemos sobre la gestión solicitada. Los datos que se incluyan en respaldos del proveedor pueden permanecer hasta que se apliquen sus ciclos de conservación; PataWallet no publica un plazo exacto para esos respaldos. Para retirar el permiso de Gmail, además, debes revocarlo en tu Cuenta de Google.</p>
            <p>Los datos de demostración se guardan únicamente en el navegador. Si borras los datos del sitio en el navegador, también puedes eliminar esa copia local.</p>
          </PolicySection>

          <PolicySection title="Seguridad y tus derechos">
            <p>Los datos remotos de cada cuenta se consultan con controles de acceso por usuario. Las credenciales de correo se cifran en el servidor; las claves de servicio no se envían al navegador. Ningún sistema conectado a Internet puede garantizar riesgo cero, así que no compartas tu contraseña ni agregues números completos de tarjeta o códigos de seguridad.</p>
            <p>Puedes solicitar conocer, actualizar, corregir o suprimir tus datos, revocar autorizaciones y preguntar por el uso que se les ha dado, conforme a la normativa aplicable. En Colombia, estos derechos se enmarcan en la Ley 1581 de 2012. Si una solicitud no se resuelve, puedes acudir a la autoridad de protección de datos competente, como la Superintendencia de Industria y Comercio en Colombia.</p>
          </PolicySection>

          <PolicySection title="Cambios a esta política">
            <p>Actualizaremos esta página cuando cambien las prácticas de datos o los servicios utilizados. Si un cambio afecta la conexión de correo o el uso de IA, mostraremos la información y solicitaremos el consentimiento correspondiente antes de activar ese tratamiento.</p>
          </PolicySection>
        </> : <>
          <p className="public-policy__intro">Al crear una cuenta o usar PataWallet Web, aceptas estas condiciones. Si no estás de acuerdo, no uses el servicio.</p>

          <PolicySection title="Qué ofrece PataWallet">
            <p>PataWallet ayuda a organizar información de finanzas personales: cuentas, movimientos, presupuestos y metas. No es una entidad financiera, no custodia fondos, no inicia pagos y no sustituye asesoría financiera, tributaria, contable o jurídica.</p>
          </PolicySection>

          <PolicySection title="Tus datos y conexiones">
            <p>Tú decides qué información agregas y qué integraciones activas. Debes tener autorización para conectar un buzón o compartir datos de otra persona. Puedes desconectar Gmail u Outlook desde Ajustes y retirar el permiso directamente en el proveedor. Desconectar una integración no elimina automáticamente avisos que ya importaste.</p>
            <p>Los avisos de correo y las sugerencias de IA pueden contener errores. Revisa el monto, la fecha, la cuenta y el tipo antes de confirmar cualquier movimiento. PataWallet no cambia saldos por un correo ni por una sugerencia automática.</p>
          </PolicySection>

          <PolicySection title="Uso responsable y seguridad">
            <p>Usa el servicio de manera lícita, mantén segura tu cuenta y no intentes acceder a espacios de otras personas, interferir con la disponibilidad del sistema ni cargar datos que no tengas derecho a tratar. No incluyas claves bancarias, CVV o números completos de tarjetas en notas o correos.</p>
          </PolicySection>

          <PolicySection title="Disponibilidad y servicios externos">
            <p>PataWallet depende de conexión a Internet y de proveedores de autenticación, almacenamiento, correo e inteligencia artificial. Algunas funciones pueden pausarse, cambiar o no estar disponibles por fallas o cambios de esos proveedores. Sus servicios se rigen también por sus propias condiciones.</p>
          </PolicySection>

          <PolicySection title="Tus solicitudes y contacto">
            <p>Puedes solicitar la corrección o eliminación de información y el cierre de tu cuenta escribiendo a <a href="mailto:danilitohhh@gmail.com">danilitohhh@gmail.com</a>. Para más información sobre datos personales, consulta la <Link to="/privacidad">Política de privacidad</Link>.</p>
          </PolicySection>

          <PolicySection title="Cambios a estos términos">
            <p>Podemos actualizar estas condiciones para reflejar cambios en el servicio. Publicaremos aquí la versión vigente y su fecha de actualización.</p>
          </PolicySection>
        </>}
      </main>
    </PublicLayout>
  )
}
