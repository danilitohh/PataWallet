export function BudgetRing({ value }) {
  const safe = Math.max(0, Math.min(value, 100))
  const circumference = 2 * Math.PI * 42

  return (
    <div className="budget-ring">
      <svg viewBox="0 0 100 100" role="img" aria-label={`${Math.round(value)}% del presupuesto usado`}>
        <circle className="budget-ring__track" cx="50" cy="50" r="42" />
        <circle className="budget-ring__value" cx="50" cy="50" r="42" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - safe / 100)} />
      </svg>
      <strong>{Math.round(value)}%</strong>
    </div>
  )
}
