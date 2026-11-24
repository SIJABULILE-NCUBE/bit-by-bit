import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import SignUp from './pages/auth/SignUp'
import LogIn from './pages/auth/LogIn'
import CustomerHome from './pages/customer/CustomerHome'
import OwnerHome from './pages/owner/OwnerHome'
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
      </Route>

      {/* shop owners only */}
      <Route element={<ProtectedRoute role="owner" />}>
        <Route path="/owner" element={<OwnerHome />} />
      </Route>

      {/* unknown address? back to the landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
