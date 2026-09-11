import { useState } from 'react'
import { Link2Off, Trash2 } from 'lucide-react'

const dateLabel = (value) => value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin registro'

export function ShortcutManagement({ integration, accounts, categories, notify }) {
  const [alias, setAlias] = useState('')
  const [accountId, setAccountId] = useState(accounts.find((item) => !item.archived)?.id || '')
  const [merchant, setMerchant] = useState('')
  const [categoryId, setCategoryId] = useState(categories.find((item) => item.type === 'expense')?.id || '')
  const submit = async (event, action, clear) => { event.preventDefault(); try { await action(); clear(); notify('Configuración guardada') } catch (error) { notify(error.message) } }
  const active = integration.devices.filter((item) => item.status === 'active' || item.status === 'incomplete')
  return <div className="shortcut-management">
    <section className="shortcut-section"><div className="section-heading"><div><h2>Vinculaciones</h2><p>El acceso se puede revocar sin borrar movimientos ya registrados.</p></div></div>
      <div className="shortcut-list">{active.length ? active.map((item) => <article className="shortcut-row shortcut-row--device" key={item.id}><div><strong>{item.label} {item.status === 'incomplete' && <span className="status-label">Guardado sin verificar</span>}</strong><p>Automatización: {item.automation_declared_at ? 'declarada por ti, no verificada por la app' : 'sin confirmar'} · Última prueba: {dateLabel(item.last_test_at)} · Último evento real: {dateLabel(item.last_event_at)}</p></div><div className="shortcut-row__actions"><button className="compact-action" onClick={async () => { await integration.declareAutomation(item.id, !item.automation_declared_at); notify(item.automation_declared_at ? 'Declaración retirada' : 'Marcada como configurada por ti') }}>{item.automation_declared_at ? 'Retirar declaración' : 'La configuré'}</button><button className="compact-action danger-text" onClick={async () => { if (confirm('¿Revocar este acceso? La automatización seguirá en el iPhone hasta que la desactives allí.')) { await integration.revoke(item.id); notify('Acceso revocado') } }}><Link2Off /> Revocar</button></div></article>) : <p className="empty-inline">No hay dispositivos vinculados.</p>}</div>
    </section>
    <section className="shortcut-section"><div className="section-heading"><div><h2>Tarjetas y cuentas</h2><p>Usa solo un alias reconocible; nunca escribas el número de tarjeta.</p></div></div>
      <form className="shortcut-form" onSubmit={(event) => submit(event, () => integration.saveMapping({ card_alias: alias, account_id: accountId }), () => setAlias(''))}><label className="field"><span>Alias recibido</span><input value={alias} onChange={(event) => setAlias(event.target.value)} maxLength="80" required placeholder="Ej. Visa principal" /></label><label className="field"><span>Cuenta propia</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)} required>{accounts.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="button button--primary">Guardar mapeo</button></form>
      <div className="shortcut-list">{integration.mappings.map((item) => <article className="shortcut-row" key={item.id}><div><strong>{item.card_alias}</strong><p>{accounts.find((account) => account.id === item.account_id)?.name || 'Cuenta archivada'}</p></div><button className="icon-button" aria-label={`Eliminar mapeo ${item.card_alias}`} onClick={() => integration.deleteMapping(item.id)}><Trash2 /></button></article>)}</div>
    </section>
    <section className="shortcut-section"><div className="section-heading"><div><h2>Reglas de categoría</h2><p>Coincidencia exacta normalizada y orden determinista; no usa IA.</p></div></div>
      <form className="shortcut-form" onSubmit={(event) => submit(event, () => integration.saveRule({ merchant_pattern: merchant, category_id: categoryId, priority: 100 }), () => setMerchant(''))}><label className="field"><span>Comercio exacto</span><input value={merchant} onChange={(event) => setMerchant(event.target.value)} maxLength="120" required placeholder="Ej. Mercado de ejemplo" /></label><label className="field"><span>Categoría de gasto</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>{categories.filter((item) => item.type === 'expense' && item.name !== 'Sin categoría').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="button button--primary">Crear regla</button></form>
      <div className="shortcut-list">{integration.rules.map((item) => <article className="shortcut-row" key={item.id}><div><strong>{item.merchant_pattern}</strong><p>{categories.find((category) => category.id === item.category_id)?.name || 'Categoría eliminada'}</p></div><button className="icon-button" aria-label={`Eliminar regla ${item.merchant_pattern}`} onClick={() => integration.deleteRule(item.id)}><Trash2 /></button></article>)}</div>
    </section>
  </div>
}
