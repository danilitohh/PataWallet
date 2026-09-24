import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'

// Composes a setting label and its control using the app's shared Night icon treatment.
export function SettingRow({ icon: Icon, tone = 'violet', title, detail, children }) {
  return <div className="setting-row"><NightIcon icon={Icon} className="setting-row__icon" tone={tone} /><div><h3>{title}</h3><p>{detail}</p></div><div className="setting-row__control">{children}</div></div>
}

// Turns a setting row into a route link while retaining its icon, copy and accessible target.
export function SettingLink({ icon, tone = 'violet', title, detail, to }) {
  return <Link className="setting-link" to={to}><SettingRow icon={icon} tone={tone} title={title} detail={detail}><ChevronRight /></SettingRow></Link>
}

// Exposes the boolean preference as a keyboard-operable switch with an explicit accessible name.
export function Switch({ checked, onChange, label, disabled = false }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)} disabled={disabled}><span /></button>
}
