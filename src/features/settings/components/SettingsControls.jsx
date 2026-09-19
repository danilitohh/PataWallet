import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'

export function SettingRow({ icon: Icon, title, detail, children }) {
  return <div className="setting-row"><NightIcon icon={Icon} className="setting-row__icon" tone="violet" /><div><h3>{title}</h3><p>{detail}</p></div><div className="setting-row__control">{children}</div></div>
}

export function SettingLink({ icon, title, detail, to }) {
  return <Link className="setting-link" to={to}><SettingRow icon={icon} title={title} detail={detail}><ChevronRight /></SettingRow></Link>
}

export function Switch({ checked, onChange, label, disabled = false }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)} disabled={disabled}><span /></button>
}
