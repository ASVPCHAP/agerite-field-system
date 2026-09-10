import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from './layouts/PublicLayout'
import { PortalLayout } from './layouts/PortalLayout'
import { CrmLayout } from './layouts/CrmLayout'
import { RequireAdmin } from './auth/RequireAdmin'
import { Home } from './pages/public/Home'
import { ProductReference } from './pages/public/ProductReference'
import { Ordering } from './pages/public/Ordering'
import { Contact } from './pages/public/Contact'
import { Login } from './pages/portal/Login'
import { Dashboard } from './pages/portal/Dashboard'
import { Pipeline } from './pages/portal/Pipeline'
import { Refills } from './pages/portal/Refills'
import { Knowledge } from './pages/portal/Knowledge'
import { ManageProducts } from './pages/portal/ManageProducts'
import { Leads } from './pages/portal/crm/Leads'
import { FindProspects } from './pages/portal/crm/FindProspects'
import { Analytics } from './pages/portal/crm/Analytics'
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
        <Route path="crm" element={<CrmLayout />}>
          <Route index element={<Navigate to="leads" replace />} />
          <Route path="leads" element={<Leads />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="find-prospects" element={<FindProspects />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
        <Route path="refills" element={<Refills />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route
          path="manage-products"
          element={
            <RequireAdmin>
              <ManageProducts />
            </RequireAdmin>
          }
        />
        <Route path="certification" element={<Certification />} />
        <Route path="states" element={<States />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
