import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'

// all my routes live here
// I'll add log in, sign up and the customer/owner pages in the next issues
function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
    </Routes>
  )
}

export default App
