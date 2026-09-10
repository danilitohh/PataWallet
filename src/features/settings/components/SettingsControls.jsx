import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SettingRow({ icon: Icon, title, detail, children }) {
  return <div className="setting-row"><span className="setting-row__icon"><Icon /></span><div><h3>{title}</h3><p>{detail}</p></div><div className="setting-row__control">{children}</div></div>
}

export function SettingLink({ icon, title, detail, to }) {
  return <Link className="setting-link" to={to}><SettingRow icon={icon} title={title} detail={detail}><ChevronRight /></SettingRow></Link>
}

export function Switch({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}><span /></button>
}
