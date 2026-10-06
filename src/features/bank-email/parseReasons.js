const labels = {
  unsupported_template: 'Reconocimos el banco, pero este formato de correo aún no está soportado.',
  multiple_operations: 'El correo contiene varias operaciones; confirma cuál corresponde a este aviso.',
  amount_missing_or_ambiguous: 'No pudimos extraer el monto con seguridad; complétalo manualmente.',
  date_missing_or_invalid: 'No pudimos leer la fecha del movimiento; complétala manualmente.',
  plain_text_required: 'El formato del cuerpo del correo no permitió leer el movimiento.',
}

// Avoid showing routine confirmation requirements as parser errors.
export function bankEmailParseIssue(reasons = []) {
  const reason = reasons.find((item) => labels[item])
  return reason ? labels[reason] : ''
}
