import { createRoot } from 'react-dom/client'
import '../../../src/styles/app.css'
import '../../../src/styles/night.css'
import '../../../src/features/auth/signup-flow.css'
import { SignupFlow } from '../../../src/features/auth/SignupFlow.jsx'

createRoot(document.getElementById('root')).render(
  <SignupFlow onLogin={() => {}} onCreateAccount={() => {}} onGoogle={() => {}} googleEnabled={false} busy={false} error="" notice="" />,
)
