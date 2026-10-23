const LABELS = new Set([
  'respuesta',
  'resumen',
  'detalles',
  'desglose',
  'periodo',
  'presupuesto',
  'comparación',
  'comparacion',
  'recomendación',
  'recomendacion',
  'siguiente paso',
  'nota',
  'importante',
])

function cleanLine(value) {
  return value
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .replace(/\*\*|__/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1$2')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function headingLabel(value) {
  const normalized = value.toLocaleLowerCase('es-CO').replace(/:$/, '').trim()
  return LABELS.has(normalized) ? value.replace(/:$/, '').trim() : null
}

function isListLine(value) {
  return /^\s*(?:[-*•]|\d+[.)])\s+/.test(value)
}

// Convierte la salida del modelo en bloques seguros de texto. No usa HTML generado por la IA.
export function parseAssistantAnswer(answer = '') {
  const lines = String(answer)
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*([*_=-]){3,}\s*$/gm, '')
    .split('\n')

  const blocks = []
  let paragraph = []
  let list = null

  const flushParagraph = () => {
    if (!paragraph.length) return
    const text = paragraph.map(cleanLine).filter(Boolean).join(' ')
    if (text) blocks.push({ type: 'paragraph', text })
    paragraph = []
  }

  const flushList = () => {
    if (!list?.items.length) return
    blocks.push(list)
    list = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const labelMatch = line.match(/^([^:]{2,42}):\s*(.*)$/)
    const label = labelMatch ? headingLabel(labelMatch[1]) : null
    if (label) {
      flushParagraph()
      flushList()
      blocks.push({ type: labelMatch[2] ? 'labeled' : 'heading', label, text: labelMatch[2] ? cleanLine(labelMatch[2]) : '' })
      continue
    }

    const standaloneLabel = headingLabel(cleanLine(line))
    if (standaloneLabel) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'heading', label: standaloneLabel })
      continue
    }

    if (isListLine(line)) {
      flushParagraph()
      const ordered = /^\s*\d+[.)]\s+/.test(line)
      const item = cleanLine(line)
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { type: 'list', ordered, items: [] }
      }
      if (item) list.items.push(item)
      continue
    }

    if (/^.{2,72}:$/.test(line)) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'heading', label: cleanLine(line).replace(/:$/, '') })
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}
