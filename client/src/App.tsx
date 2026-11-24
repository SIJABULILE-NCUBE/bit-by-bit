import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import SignUp from './pages/auth/SignUp'
import LogIn from './pages/auth/LogIn'
import CustomerHome from './pages/customer/CustomerHome'
import CustomerLaybyDetail from './pages/customer/CustomerLaybyDetail'
import UploadProof from './pages/customer/UploadProof'
import OwnerHome from './pages/owner/OwnerHome'
import OwnerLaybys from './pages/owner/OwnerLaybys'
import NewLayby from './pages/owner/NewLayby'
import ProtectedRoute from './components/ProtectedRoute'

// all my routes live here
function App() {
  return (
    <Routes>
      {/* anyone can see these */}
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<LogIn />} />

      {/* customers only */}
      <Route element={<ProtectedRoute role="customer" />}>
        <Route path="/customer" element={<CustomerHome />} />
        <Route path="/customer/laybys/:id" element={<CustomerLaybyDetail />} />
        <Route path="/customer/laybys/:id/pay" element={<UploadProof />} />
      </Route>

      {/* shop owners only */}
      <Route element={<ProtectedRoute role="owner" />}>
        <Route path="/owner" element={<OwnerHome />} />
        <Route path="/owner/laybys" element={<OwnerLaybys />} />
        <Route path="/owner/laybys/new" element={<NewLayby />} />
      </Route>

      {/* unknown address? back to the landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
