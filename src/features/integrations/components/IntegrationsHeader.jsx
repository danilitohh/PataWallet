import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/PageHeader.jsx'

export function IntegrationsHeader({ title, subtitle }) {
  return <><Link className="back-link" to="/ajustes"><ChevronRight /> Ajustes</Link><PageHeader title={title} subtitle={subtitle} /></>
}
