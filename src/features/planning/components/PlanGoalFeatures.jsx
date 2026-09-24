import { Goal, Plus, Sparkles, Trash2 } from 'lucide-react'
import { formatMinor } from '../../../domain/money.js'
import { Progress } from '../../../shared/components/Progress.jsx'

const companionSources = '/assets/illustrations/night-companions'

// Presenta una meta principal con su progreso real o una invitación útil cuando todavía no hay metas.
export function PlanGoalFeature({ goal, progress, hidden, onReserve, onCreate, onDelete }) {
  const achieved = goal && progress.reserved >= Number(goal.target_minor)

  return <section className="plan-featured-goal" aria-labelledby="plan-featured-goal-title">
    <div className="plan-featured-goal__copy">
      <div className="plan-featured-goal__top">
        <span className="plan-featured-goal__kicker"><Goal aria-hidden="true" /> Meta principal</span>
        {goal && <button className="icon-button icon-button--small" type="button" aria-label={`Eliminar meta ${goal.name}`} onClick={() => onDelete(goal)}><Trash2 aria-hidden="true" /></button>}
      </div>
      <h2 id="plan-featured-goal-title">{goal?.name || 'Tu próxima historia empieza aquí.'}</h2>
      <p>{goal ? 'Tu objetivo crece con pasos que puedes sostener.' : 'Elige un objetivo y dale su propio espacio.'}</p>
      {goal ? <>
        <div className="plan-featured-goal__saved">
          <strong>{formatMinor(progress.reserved, 'COP', hidden)}</strong>
          <span>de {formatMinor(goal.target_minor, 'COP', hidden)}</span>
          <small>{Math.round(progress.percent)}% del objetivo</small>
        </div>
        <Progress value={progress.percent} label={`${Math.round(progress.percent)}% completado`} />
        <button className="button button--primary plan-featured-goal__action" type="button" onClick={onReserve}><Plus aria-hidden="true" /> Apartar a esta meta</button>
      </> : <button className="button button--primary plan-featured-goal__action" type="button" onClick={() => onCreate(true)}><Plus aria-hidden="true" /> Crear una meta</button>}
    </div>

    <div className="plan-featured-goal__image" aria-hidden="true">
      <img
        src={`${companionSources}-480.webp`}
        srcSet={`${companionSources}-480.webp 480w, ${companionSources}-800.webp 800w, ${companionSources}-1122.webp 1122w`}
        sizes="(max-width: 700px) 94px, 168px"
        width="1122"
        height="748"
        alt=""
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    </div>

    <div className="plan-featured-goal__milestone">
      <span className="plan-featured-goal__milestone-icon"><Sparkles aria-hidden="true" /></span>
      <div><strong>{achieved ? 'Objetivo alcanzado' : goal ? 'Un avance a tu ritmo' : 'Una meta a tu ritmo'}</strong><small>{goal ? 'Reservar organiza el objetivo; no mueve el saldo.' : 'La fecha objetivo es opcional.'}</small></div>
      <span className="plan-featured-goal__milestone-progress">{goal ? `${Math.round(progress.percent)}%` : '—'}</span>
    </div>
  </section>
}

// Resume una meta secundaria y mantiene accesibles sus acciones de reserva y eliminación.
export function PlanGoalRow({ goal, progress, hidden, onReserve, onDelete }) {
  return <article className="plan-goal-row">
    <span className="plan-goal-row__icon"><Goal aria-hidden="true" /></span>
    <div className="plan-goal-row__content">
      <strong>{goal.name}</strong>
      <span>{formatMinor(progress.reserved, 'COP', hidden)} de {formatMinor(goal.target_minor, 'COP', hidden)}</span>
      <Progress value={progress.percent} label={`${Math.round(progress.percent)}% completado`} />
    </div>
    <div className="plan-goal-row__actions">
      <button className="button button--quiet" type="button" onClick={() => onReserve(goal)}>Reservar</button>
      <button className="icon-button icon-button--small" type="button" aria-label={`Eliminar meta ${goal.name}`} onClick={() => onDelete(goal)}><Trash2 aria-hidden="true" /></button>
    </div>
  </article>
}
