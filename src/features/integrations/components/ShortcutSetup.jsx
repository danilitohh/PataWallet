import { CheckCircle2, CircleDashed, ExternalLink, Play, ShieldCheck } from 'lucide-react'

export function ShortcutSetup({ integration, isDemo, notify }) {
  const templateReady = integration.template.availability === 'available'
  const active = integration.devices.find((item) => item.status === 'active')
  const pairingReady = templateReady && !isDemo
  const pair = async () => { try { const result = await integration.pair('iPhone'); location.href = result.runUrl } catch (error) { notify(error.message) } }
  return <section className="integration-card">
    <h2>Preparación guiada</h2>
    <ol className="steps shortcut-steps">
      <li><span>1</span><div><strong>Añadir la plantilla {templateReady ? <CheckCircle2 /> : <CircleDashed />}</strong><p>{templateReady ? `Versión ${integration.template.templateVersion}${integration.template.minSupportedVersionTested ? `, probada en iOS ${integration.template.minSupportedVersionTested}` : ', publicada y pendiente de validación en iPhone'}.` : 'El blueprint existe en el proyecto, pero falta publicarlo y validarlo desde un dispositivo Apple.'}</p>{templateReady && <a className="button button--secondary" href={integration.template.shortcutIcloudUrl} target="_blank" rel="noreferrer"><ExternalLink /> Añadir atajo</a>}</div></li>
      <li><span>2</span><div><strong>Vincular esta cuenta {active ? <CheckCircle2 /> : <CircleDashed />}</strong><p>El código dura cinco minutos. El token persistente se entrega al atajo por HTTPS y nunca viaja en la URL.</p><button className={`button ${pairingReady ? 'button--primary' : 'button--disabled'}`} disabled={!pairingReady} onClick={pair}>Vincular atajo</button></div></li>
      <li><span>3</span><div>
        <strong>Crear la automatización personal <CircleDashed /></strong>
        <p>Esta automatización se crea en Atajos y ejecuta la plantilla de PataWallet con los datos de la compra. La app no puede crearla ni confirmar este paso por ti.</p>
        {/* Abre el video entregado por el usuario en el reproductor nativo del navegador. */}
        <a className="button button--secondary shortcut-video-link" href="/assets/integrations/tutorial-patawallet-paso-a-paso.mp4" target="_blank" rel="noopener noreferrer" aria-label="Abrir el tutorial de automatización en video en una pestaña nueva"><Play /> Abrir tutorial en video <ExternalLink /></a>
        {/* Pasos y nombres de campos transcritos de la guía del usuario para configurar Atajos. */}
        <ol className="shortcut-instructions">
          <li>Entra en <strong>Todos los atajos</strong> y localiza <strong>PataWallet - Registrar compra</strong>.</li>
          <li>Abre <strong>Automatización</strong> y empieza una automatización nueva.</li>
          <li>En <strong>Cuando se use</strong>, parte de “Cualquier tarjeta”, selecciona las tarjetas que quieras incluir (por ejemplo, Apple Cash o Débito Mastercard) y deja la selección final en “Todo”.</li>
          <li>Agrega la acción <strong>Diccionario</strong>.</li>
          <li>Crea estas tres claves: <code>amount</code>, <code>card_alias</code> y <code>merchant_name</code>.</li>
          <li>Asigna los valores de <strong>Entrada de atajo</strong>: <code>amount</code> → <strong>Cantidad</strong>, <code>card_alias</code> → <strong>Tarjeta o pase</strong> y <code>merchant_name</code> → <strong>Comercio</strong>.</li>
          <li>Agrega <strong>Ejecutar atajo</strong> y selecciona <strong>PataWallet - Registrar compra</strong>.</li>
        </ol>
        {/* Referencia visual para configurar el activador de Wallet y sus campos. */}
        <figure className="shortcut-automation-guide">
          <img src="/assets/integrations/shortcut-wallet-automation.png" alt="Ejemplo de cómo debe quedar la automatización de Wallet para ejecutar PataWallet y enviar cantidad, tarjeta o pase y comercio" width="768" height="1536" loading="lazy" decoding="async" />
          <figcaption>Ejemplo de configuración. Cada usuario debe seleccionar sus propias tarjetas de Wallet.</figcaption>
        </figure>
      </div></li>
      <li><span>4</span><div><strong>Probar conexión <ShieldCheck /></strong><p>La plantilla usa el modo <code>connection_test</code>. Esta prueba no crea gastos ni demuestra una compra; solo confirma el vínculo.</p></div></li>
      <li><span>5</span><div><strong>Validar la próxima compra habitual <CircleDashed /></strong><p>Solo una compra compatible real permite comprobar los campos recibidos. No hagas una compra innecesaria para probar.</p></div></li>
    </ol>
    {!templateReady && <button className="button button--disabled" disabled>Añadir atajo — pendiente</button>}
    <p className="info-note">Sin conexión, el atajo debe mostrar que no pudo enviar. No se anuncia una cola de reintentos porque todavía no está construida ni probada en iPhone.</p>
  </section>
}
