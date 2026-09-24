import { useState } from 'react'
import { HOME_VIEWS } from '../model/dashboardViews.js'

// Permite cambiar el enfoque de Inicio y guarda la preferencia en el espacio actual.
export function DashboardViewPicker({ value, actions }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Evita escrituras duplicadas y presenta errores de sincronización junto al selector.
  const selectView = async (view) => {
    if (saving || view === value) return
    setSaving(true)
    setError('')
    try {
      await actions.setSetting('homeView', view)
    } catch (issue) {
      setError(issue.message || 'No pudimos guardar esta vista. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="dashboard-view-picker-wrap">
    <div className="dashboard-view-picker" role="group" aria-label="Vistas de Inicio" aria-busy={saving}>
      {HOME_VIEWS.map((view) => <button key={view.id} type="button" aria-pressed={value === view.id} disabled={saving} onClick={() => selectView(view.id)}>{view.label}</button>)}
    </div>
    {error && <p className="dashboard-view-picker__error" role="alert">{error}</p>}
  </div>
}
