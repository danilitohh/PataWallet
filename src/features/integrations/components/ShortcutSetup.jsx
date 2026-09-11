import { CheckCircle2, CircleDashed, ExternalLink, ShieldCheck } from 'lucide-react'

export function ShortcutSetup({ integration, isDemo, notify }) {
  const templateReady = integration.template.availability === 'available'
  const active = integration.devices.find((item) => item.status === 'active')
  const pairingReady = templateReady && !isDemo
  const pair = async () => { try { const result = await integration.pair('iPhone'); location.href = result.runUrl } catch (error) { notify(error.message) } }
  return <section className="integration-card">
    <h2>Preparación guiada</h2>
    <ol className="steps shortcut-steps">
      <li><span>1</span><div><strong>Añadir la plantilla {templateReady ? <CheckCircle2 /> : <CircleDashed />}</strong><p>{templateReady ? `Versión ${integration.template.templateVersion}${integration.template.minSupportedVersionTested ? `, probada en iOS ${integration.template.minSupportedVersionTested}` : ''}.` : 'El blueprint existe en el proyecto, pero falta publicarlo y validarlo desde un dispositivo Apple.'}</p>{templateReady && <a className="button button--secondary" href={integration.template.shortcutIcloudUrl} target="_blank" rel="noreferrer"><ExternalLink /> Añadir atajo</a>}</div></li>
      <li><span>2</span><div><strong>Vincular esta cuenta {active ? <CheckCircle2 /> : <CircleDashed />}</strong><p>El código dura cinco minutos. El token persistente se entrega al atajo por HTTPS y nunca viaja en la URL.</p><button className={`button ${pairingReady ? 'button--primary' : 'button--disabled'}`} disabled={!pairingReady} onClick={pair}>Vincular atajo</button></div></li>
      <li><span>3</span><div><strong>Crear la automatización personal <CircleDashed /></strong><p>En Atajos: Automatización → Transacción → elegir tarjeta → ejecutar “{integration.template.shortcutName}” pasando la entrada. La app no puede confirmar este paso sola.</p></div></li>
      <li><span>4</span><div><strong>Probar conexión <ShieldCheck /></strong><p>La plantilla usa el modo <code>connection_test</code>. Esta prueba no crea gastos ni demuestra una compra; solo confirma el vínculo.</p></div></li>
      <li><span>5</span><div><strong>Validar la próxima compra habitual <CircleDashed /></strong><p>Solo una compra compatible real permite comprobar los campos recibidos. No hagas una compra innecesaria para probar.</p></div></li>
    </ol>
    {!templateReady && <button className="button button--disabled" disabled>Añadir atajo — pendiente</button>}
    <p className="info-note">Sin conexión, el atajo debe mostrar que no pudo enviar. No se anuncia una cola de reintentos porque todavía no está construida ni probada en iPhone.</p>
  </section>
}
