import { useId } from 'react'

// El SVG usa datos reales; cada anillo tiene un gradiente propio para evitar IDs duplicados.
export function BudgetRing({ value }) {
  const gradientId = useId()
  const safe = Math.max(0, Math.min(value, 100))
  const circumference = 2 * Math.PI * 42

  return (
    <div className="budget-ring">
      <svg viewBox="0 0 100 100" role="img" aria-label={`${Math.round(value)}% del presupuesto usado`}>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--success)" /><stop offset="52%" stopColor="var(--primary)" /><stop offset="100%" stopColor="var(--coral)" /></linearGradient></defs>
        <circle className="budget-ring__track" cx="50" cy="50" r="42" />
        <circle className="budget-ring__value" style={{ stroke: `url(#${gradientId})` }} cx="50" cy="50" r="42" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - safe / 100)} />
      </svg>
      <strong>{Math.round(value)}%</strong>
    </div>
  )
}
