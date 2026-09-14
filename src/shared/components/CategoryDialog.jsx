import { useRef, useState } from 'react'
import { useApp } from '../../app/AppContext.jsx'
import { Field, SimpleDialog } from './Modal.jsx'
import { makeId } from '../lib/id.js'

// Crea una categoría reutilizable desde cualquier formulario que necesite clasificar un registro.
export function CategoryDialog({ type, close, onCreated }) {
  const { actions, notify } = useApp()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  // Valida y guarda la categoría una sola vez, incluso si se pulsa dos veces rápidamente.
  const submit = async (event) => {
    event.preventDefault()
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const clean = name.trim()
      if (clean.length < 2 || clean.length > 50) throw new Error('Usa entre 2 y 50 caracteres.')
      const id = makeId('category')
      await actions.createCategory({ id, name: clean, type, version: 1, updated_at: new Date().toISOString() })
      onCreated(id)
      notify('Categoría creada')
      close()
    } catch (issue) {
      setError(issue.message)
      savingRef.current = false
      setSaving(false)
    }
  }

  return <SimpleDialog title="Nueva categoría" close={close}>
    <form onSubmit={submit}>
      <Field label="Nombre" error={error}><input autoFocus value={name} maxLength="50" onChange={(event) => setName(event.target.value)} /></Field>
      <p className="helper">Se creará como categoría de {type === 'income' ? 'ingreso' : 'gasto'}.</p>
      <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Creando…' : 'Crear categoría'}</button>
    </form>
  </SimpleDialog>
}
