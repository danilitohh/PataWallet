import { useMemo, useState } from 'react'
import { ArrowLeft, Bot, LoaderCircle, RotateCcw, Send, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../app/AppContext.jsx'
import { buildAssistantContext } from './model/assistantContext.js'
import { askAssistant } from '../../services/ai/ollamaClient.js'
import { currentMonth } from '../../shared/lib/date.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { GlassHero } from '../../shared/components/GlassHero.jsx'
import { NightIcon } from '../../shared/components/NightIcon.jsx'

const SUGGESTIONS = [
  '¿En qué categoría gasté más este mes?',
  'Compara mis gastos de los últimos 3 meses',
  '¿Cómo va mi presupuesto?',
  '¿Qué puedo revisar para organizar mejor mi dinero?',
]

// Ofrece un chat de análisis financiero sin permitir que el modelo escriba movimientos o cuentas.
export function AssistantPage() {
  const { accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, settings, isDemo } = useApp()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const month = currentMonth()
  const context = useMemo(() => buildAssistantContext({ accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, month, settings }), [accounts, categories, transactions, budgets, goals, allocations, plannedPurchases, month, settings])

  const submit = async (event) => {
    event.preventDefault()
    const prompt = question.trim()
    if (!prompt || busy || isDemo) return
    setQuestion('')
    setError('')
    setMessages((current) => [...current, { role: 'user', content: prompt }])
    setBusy(true)
    try {
      const conversation = messages.slice(-8).map(({ role, content }) => ({ role, content }))
      const answer = await askAssistant(prompt, context, conversation)
      setMessages((current) => [...current, { role: 'assistant', content: answer }])
    } catch (issue) {
      setError(issue.message)
    } finally {
      setBusy(false)
    }
  }

  return <div className="route-stack assistant-page">
    <Link className="back-link" to="/"><ArrowLeft /> Inicio</Link>
    <PageHeader title="Asistente PataWallet" subtitle="Pregunta con tus propias palabras y entiende mejor tus finanzas." />
    <GlassHero className="assistant-glass-hero"><div><h2>¿Qué quieres saber?</h2><p>Revisemos tus números juntos.</p></div><NightIcon icon={Bot} /></GlassHero>
    <section className="assistant-notice" role="note"><Bot aria-hidden="true" /><div><strong>Respuestas basadas en tu espacio</strong><p>Puede analizar cuentas, presupuesto, categorías, movimientos, deudas y metas. Cada pregunta que envíes comparte con el proveedor de IA tus saldos y planes, tendencias de hasta 12 meses y hasta 12 movimientos recientes con su categoría, comercio y nota. No envía claves ni modifica tus datos.</p></div></section>
    {isDemo ? <section className="assistant-unavailable"><Sparkles aria-hidden="true" /><h2>Disponible para cuentas reales</h2><p>La demo no envía datos de ejemplo a servicios de IA. Inicia sesión en tu espacio real para consultar tus finanzas.</p></section> : <>
      {!messages.length && <section className="assistant-empty"><p>Puedes preguntar sobre tus finanzas con libertad. Tengo un resumen acumulado{context.history.coverage_from_month ? ` desde ${monthLabel(context.history.coverage_from_month)}` : ''} y comparo tendencias de los últimos 12 meses. Si falta información, te lo diré.</p><div className="assistant-suggestions">{SUGGESTIONS.map((suggestion) => <button type="button" className="compact-action" key={suggestion} onClick={() => setQuestion(suggestion)}>{suggestion}</button>)}</div></section>}
      {messages.length > 0 && <div className="assistant-conversation-heading"><span>Conversación actual</span><button type="button" className="compact-action" disabled={busy} onClick={() => { setMessages([]); setError(''); setQuestion('') }}><RotateCcw aria-hidden="true" /> Nueva conversación</button></div>}
      {messages.length > 0 && <section className="assistant-messages" aria-live="polite">{messages.map((message, index) => <article className={`assistant-message assistant-message--${message.role}`} key={`${message.role}-${index}`}><strong>{message.role === 'user' ? 'Tú' : 'PataWallet'}</strong><p>{message.content}</p></article>)}{busy && <article className="assistant-message assistant-message--assistant"><strong>PataWallet</strong><p className="assistant-loading"><LoaderCircle aria-hidden="true" /> Analizando tus datos…</p></article>}</section>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <form className="assistant-form" onSubmit={submit}><label htmlFor="assistant-question" className="sr-only">Escribe tu pregunta</label><textarea id="assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pregunta lo que quieras sobre tus finanzas…" maxLength="1200" disabled={busy} /><button className="button button--primary" type="submit" disabled={!question.trim() || busy}><Send aria-hidden="true" /> {busy ? 'Consultando…' : 'Preguntar'}</button></form>
      <p className="helper">El chat solo dura mientras esta pantalla permanezca abierta. Las respuestas son orientación informativa y se basan en lo que has registrado en PataWallet.</p>
    </>}
  </div>
}

function monthLabel(value) {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-15T12:00:00Z`))
}
