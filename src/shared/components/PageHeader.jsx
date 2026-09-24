// Conserva una jerarquía compartida y permite una etiqueta breve sobre el título cuando aporta contexto.
export function PageHeader({ title, subtitle, action, eyebrow, className = '' }) {
  return (
    <header className={`page-header ${className}`.trim()}>
      <div>
        {eyebrow && <span className="page-header__eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
