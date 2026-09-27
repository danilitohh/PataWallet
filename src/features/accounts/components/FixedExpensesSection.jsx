import { useRef, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useApp } from '../../../app/AppContext.jsx'
import { readFixedExpenses } from '../../../domain/financialSetup.js'
import { formatMinor } from '../../../domain/money.js'
import { calendarToday, expenseFrequencyLabel, sumExpectedFixedExpenses } from '../../../domain/recurringExpenses.js'
import { Field } from '../../../shared/components/Modal.jsx'
import { AccountSectionToggle, useAccountSectionExpansion } from './AccountSectionToggle.jsx'
import { FixedExpenseEditor } from './FixedExpenseEditor.jsx'
import { ExpensePagination } from './ExpensePagination.jsx'
import { RecurringPaymentChecklist } from './RecurringPaymentChecklist.jsx'
import './fixedExpenses.css'

const PAGE_SIZE = 5

// Lista los compromisos guardados; solo el gasto elegido monta un formulario.
export function FixedExpensesSection({ standalone = false, showChecklist = true }) {
  const { settings, guideOpen } = useApp()
  const [userExpanded, setExpanded] = useAccountSectionExpansion('gastos-fijos')
  const expanded = standalone || userExpanded || Boolean(guideOpen)
  const [editor, setEditor] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const addButton = useRef(null)
  const opener = useRef(null)
  // Safari no enfoca botones al tocarlos: conserva explícitamente el origen del editor.
  const openEditor = (event, expense) => {
    opener.current = event.currentTarget
    event.currentTarget.focus()
    setEditor(expense)
  }
  const closeEditor = () => {
    setEditor(null)
    requestAnimationFrame(() => (opener.current?.isConnected ? opener.current : addButton.current)?.focus())
  }
  const savedExpenses = readFixedExpenses(settings.fixedExpenses)
  const savedTotal = sumExpectedFixedExpenses(savedExpenses, { month: calendarToday().slice(0, 7), payFrequency: settings.payFrequency, nextPayDate: settings.nextPayDate })
  const sectionSummary = savedExpenses.length ? `${savedExpenses.length} ${savedExpenses.length === 1 ? 'gasto' : 'gastos'} · ${formatMinor(savedTotal, 'COP', settings.hiddenAmounts)} al mes` : 'Sin gastos configurados'
  const filtered = savedExpenses.filter((expense) => expense.name.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1))
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  return <section className="settings-group fixed-expenses-section" id="gastos-fijos">
    {standalone ? <header className="account-section-toggle"><h2>Gastos fijos</h2><p className="helper">{sectionSummary}</p></header> : <AccountSectionToggle sectionId="gastos-fijos" title="Gastos fijos" description="Compromisos recurrentes que conviene apartar antes de comprar." summary={sectionSummary} expanded={expanded} onToggle={() => setExpanded((value) => !value)} />}
    {expanded && <div id="gastos-fijos-content" className="account-section-toggle__content">
      <p className="settings-group__intro">Programa tus compromisos y confirma {showChecklist ? 'abajo' : 'en la pestaña Pagos'} los pagos que ya hiciste. Agregar un gasto fijo no descuenta dinero.</p>
      <button ref={addButton} type="button" className="button button--secondary" onClick={(event) => openEditor(event, {})}><Plus aria-hidden="true" /> Agregar gasto fijo</button>
      {savedExpenses.length > 0 && <Field label="Buscar gasto fijo"><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Internet, mercado…" /></Field>}
      <ul className="fixed-expense-list" aria-label="Gastos fijos guardados">
        {visible.map((expense) => <li key={expense.id}>
          <button className="fixed-expense-summary" type="button" aria-label={`Editar ${expense.name}`} onClick={(event) => openEditor(event, expense)}>
            <span className="fixed-expense-summary__details"><strong>{expense.name}</strong><small>{expenseFrequencyLabel(expense.frequency)}</small></span>
            <strong className="fixed-expense-summary__amount">{formatMinor(expense.amount_minor, 'COP', settings.hiddenAmounts)}</strong>
            <Pencil aria-hidden="true" />
          </button>
        </li>)}
      </ul>
      {!visible.length && <p className="helper" role="status">{savedExpenses.length ? 'No encontramos gastos con ese nombre.' : 'Aún no tienes gastos fijos. Agrega el primero cuando quieras.'}</p>}
      <ExpensePagination page={currentPage} count={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} label="Gastos fijos" />
      {showChecklist && <RecurringPaymentChecklist expenses={savedExpenses} settings={settings} />}
    </div>}
    {editor && <FixedExpenseEditor expense={editor.id ? editor : null} close={closeEditor} />}
  </section>
}
