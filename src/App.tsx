import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from './layouts/PublicLayout'
import { PortalLayout } from './layouts/PortalLayout'
import { Home } from './pages/public/Home'
import { ProductReference } from './pages/public/ProductReference'
import { Ordering } from './pages/public/Ordering'
import { Contact } from './pages/public/Contact'
import { Login } from './pages/portal/Login'
import { Dashboard } from './pages/portal/Dashboard'
import { Pipeline } from './pages/portal/Pipeline'
import { Refills } from './pages/portal/Refills'
import { Knowledge } from './pages/portal/Knowledge'
import { Territory } from './pages/portal/Territory'
import { Certification } from './pages/portal/Certification'
import { States } from './pages/portal/States'

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<ProductReference />} />
        <Route path="ordering" element={<Ordering />} />
        <Route path="contact" element={<Contact />} />
      </Route>

      <Route path="/portal/login" element={<Login />} />
      <Route path="/portal" element={<PortalLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="refills" element={<Refills />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="territory" element={<Territory />} />
        <Route path="certification" element={<Certification />} />
        <Route path="states" element={<States />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
