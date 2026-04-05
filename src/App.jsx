import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login    from './pages/Login'
import Setup    from './pages/Setup'
import Home     from './pages/Home'
import Calendar from './pages/Calendar'
import Shopping from './pages/Shopping'
import Tasks    from './pages/Tasks'
import BottomNav from './components/BottomNav'

function ProtectedApp() {
  const { user, profile, couple, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full app-bg">
        <div className="text-center">
          <div className="text-5xl font-black text-gray-300 mb-4 animate-pulse">A</div>
          <p className="text-brand-400 font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user)           return <Navigate to="/connexion" replace />
  if (!profile?.name)  return <Navigate to="/configuration" replace />
  if (!profile?.coupleId) return <Navigate to="/configuration" replace />

  return (
    <div className="flex flex-col h-full app-bg">
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/"           element={<Home />} />
          <Route path="/calendrier" element={<Calendar />} />
          <Route path="/courses"    element={<Shopping />} />
          <Route path="/taches"     element={<Tasks />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/connexion"     element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/configuration" element={<AuthRequired><Setup /></AuthRequired>} />
        <Route path="/*"             element={<AuthRequired><ProtectedApp /></AuthRequired>} />
      </Routes>
    </BrowserRouter>
  )
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (user && profile?.coupleId) return <Navigate to="/" replace />
  return children
}

function AuthRequired({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/connexion" replace />
  return children
}
