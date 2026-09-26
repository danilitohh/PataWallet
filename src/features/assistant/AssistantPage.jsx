import { useMemo, useState } from 'react'
import { ArrowLeft, Bot, LoaderCircle, Send, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../app/AppContext.jsx'
import { buildAssistantContext } from './model/assistantContext.js'
import { askAssistant } from '../../services/ai/ollamaClient.js'
import { currentMonth } from '../../shared/lib/date.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'

const SUGGESTIONS = ['Resume mis gastos del mes', '¿Cómo voy con mis metas?', '¿Qué deudas debería priorizar?']

// Ofrece un chat de análisis financiero sin permitir que el modelo escriba movimientos o cuentas.
export function AssistantPage() {
  const { accounts, transactions, budgets, goals, allocations, plannedPurchases, settings, isDemo } = useApp()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const month = currentMonth()
  const context = useMemo(() => buildAssistantContext({ accounts, transactions, budgets, goals, allocations, plannedPurchases, month, settings }), [accounts, transactions, budgets, goals, allocations, plannedPurchases, month, settings])

  const submit = async (event) => {
    event.preventDefault()
    const prompt = question.trim()
    if (!prompt || busy || isDemo) return
    setQuestion('')
    setError('')
    setMessages((current) => [...current, { role: 'user', content: prompt }])
    setBusy(true)
    try {
      const answer = await askAssistant(prompt, context)
      setMessages((current) => [...current, { role: 'assistant', content: answer }])
    } catch (issue) {
      setError(issue.message)
    } finally {
      setBusy(false)
    }
  }

  return <div className="route-stack assistant-page">
    <Link className="back-link" to="/"><ArrowLeft /> Inicio</Link>
    <PageHeader title="Asistente PataWallet" subtitle="Entiende tus datos con ayuda de IA, sin automatizar decisiones." />
    <section className="assistant-notice" role="note"><Bot aria-hidden="true" /><div><strong>Solo lectura</strong><p>El asistente puede resumir y explicar tu información. No crea movimientos, no modifica cuentas y no reemplaza tu criterio.</p></div></section>
    {isDemo ? <section className="assistant-unavailable"><Sparkles aria-hidden="true" /><h2>Disponible para cuentas reales</h2><p>La demo no envía datos a servicios de IA. Inicia sesión en tu espacio real para consultar tu información con Ollama.</p></section> : <>
      {!messages.length && <section className="assistant-empty"><Bot aria-hidden="true" /><h2>¿Qué quieres entender?</h2><p>Pregunta por tus gastos, presupuesto, metas, ingresos o deudas.</p><div className="assistant-suggestions">{SUGGESTIONS.map((suggestion) => <button type="button" className="compact-action" key={suggestion} onClick={() => setQuestion(suggestion)}>{suggestion}</button>)}</div></section>}
      {messages.length > 0 && <section className="assistant-messages" aria-live="polite">{messages.map((message, index) => <article className={`assistant-message assistant-message--${message.role}`} key={`${message.role}-${index}`}><strong>{message.role === 'user' ? 'Tú' : 'PataWallet'}</strong><p>{message.content}</p></article>)}{busy && <article className="assistant-message assistant-message--assistant"><strong>PataWallet</strong><p className="assistant-loading"><LoaderCircle aria-hidden="true" /> Analizando tus datos…</p></article>}</section>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <form className="assistant-form" onSubmit={submit}><label htmlFor="assistant-question" className="sr-only">Escribe tu pregunta</label><textarea id="assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ejemplo: ¿en qué categoría gasté más este mes?" maxLength="1200" disabled={busy} /><button className="button button--primary" type="submit" disabled={!question.trim() || busy}><Send aria-hidden="true" /> {busy ? 'Consultando…' : 'Preguntar'}</button></form>
      <p className="helper">Se comparte un resumen acotado de este espacio; no se envían claves ni números completos de tarjetas.</p>
    </>}
  </div>
}
