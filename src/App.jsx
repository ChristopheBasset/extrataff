import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing';

// Pages
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Register from './pages/Register'
import EstablishmentDashboard from './pages/establishment/Dashboard'
import TalentDashboard from './pages/talent/Dashboard'

// Formulaires de profil
import TalentProfileForm from './components/Talent/TalentProfileForm'
import EstablishmentProfileForm from './components/Establishment/EstablishmentProfileForm'

// Formulaires mission
import EditMissionForm from './components/Establishment/EditMissionForm'

// Admin
import AdminDashboard from './pages/admin/AdminDashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupérer la session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Écouter les changements d'auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/register" element={<Register />} />

        {/* Route Admin */}
        <Route 
          path="/admin" 
          element={session ? <AdminDashboard /> : <Navigate to="/login" />} 
        />

        {/* Routes formulaires profil (après création compte) */}
        {/* IMPORTANT: Ces routes doivent être AVANT les routes wildcard /* */}
        <Route 
          path="/talent/profile-form" 
          element={session ? <TalentProfileForm /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/establishment/profile-form" 
          element={session ? <EstablishmentProfileForm /> : <Navigate to="/login" />} 
        />
        
        {/* Route édition mission (avant le wildcard) */}
        <Route 
          path="/establishment/edit-mission/:missionId" 
          element={session ? <EditMissionForm /> : <Navigate to="/login" />} 
        />

        {/* Routes protégées - Établissement */}
        <Route
          path="/establishment/*"
          element={
            session ? <EstablishmentDashboard /> : <Navigate to="/login" />
          }
        />

        {/* Routes protégées - Talent */}
        <Route
          path="/talent/*"
          element={
            session ? <TalentDashboard /> : <Navigate to="/login" />
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
