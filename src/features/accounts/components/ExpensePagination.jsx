// Mantiene acotadas las listas sin ocultar el total ni cargar más filas indefinidamente.
export function ExpensePagination({ page, count, pageSize, onChange, label }) {
  if (count <= pageSize) return null
  const pages = Math.ceil(count / pageSize)
  return <nav className="expense-pagination" aria-label={`Páginas de ${label.toLowerCase()}`}>
    <button type="button" className="button button--secondary" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label={`${label}: anteriores`}>Anterior</button>
    <span role="status">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, count)} de {count}</span>
    <button type="button" className="button button--secondary" disabled={page >= pages - 1} onClick={() => onChange(page + 1)} aria-label={`${label}: siguientes`}>Siguiente</button>
  </nav>
}
