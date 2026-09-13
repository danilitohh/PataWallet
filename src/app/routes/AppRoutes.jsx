import { Route, Routes } from 'react-router-dom'
import { AccountsPage } from '../../features/accounts/AccountsPage.jsx'
import { AssistantPage } from '../../features/assistant/AssistantPage.jsx'
import { CouplesPage } from '../../features/couples/CouplesPage.jsx'
import { DashboardPage } from '../../features/dashboard/DashboardPage.jsx'
import { AutomationPage } from '../../features/integrations/AutomationPage.jsx'
import { NotificationsPage } from '../../features/integrations/NotificationsPage.jsx'
import { PlanPage } from '../../features/planning/PlanPage.jsx'
import { SettingsPage } from '../../features/settings/SettingsPage.jsx'
import { ActivityPage } from '../../features/transactions/ActivityPage.jsx'
import { StateMessage } from '../../shared/components/Feedback.jsx'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/actividad" element={<ActivityPage />} />
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/cuentas" element={<AccountsPage />} />
      <Route path="/parejas" element={<CouplesPage />} />
      <Route path="/asistente" element={<AssistantPage />} />
      <Route path="/ajustes" element={<SettingsPage />} />
      <Route path="/ajustes/notificaciones" element={<NotificationsPage />} />
      <Route path="/ajustes/automatizacion" element={<AutomationPage />} />
      <Route path="*" element={<StateMessage title="Esta página no existe" body="Vuelve al inicio para continuar." actionLabel="Ir al inicio" action={() => { location.href = '/' }} />} />
    </Routes>
  )
}
