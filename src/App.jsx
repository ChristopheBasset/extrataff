import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing';

// Pages
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Register from './pages/Register'
import EstablishmentDashboard from './pages/establishment/Dashboard'
import TalentDashboard from './pages/talent/Dashboard'

// Formulaires de profil
import TalentProfileForm from './components/Talent/TalentProfileForm'
import EstablishmentProfileForm from './components/Establishment/EstablishmentProfileForm'

// Formulaires mission
import MissionForm from './components/Establishment/MissionForm'
import EditMissionForm from './components/Establishment/EditMissionForm'

// Chat
import ChatWindow from './components/shared/ChatWindow'

// Abonnement
import Subscribe from './pages/establishment/Subscribe'
import SubscribeSuccess from './pages/establishment/SubscribeSuccess'

// Admin
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminActivate from './pages/admin/AdminActivate'

// Groupe
import GroupLanding from './pages/groupe/GroupLanding'
import GroupRegister from './pages/groupe/GroupRegister'
import GroupInvitePage from './pages/groupe/GroupInvitePage'
import GroupJoinPage from './pages/groupe/GroupJoinPage'
import GroupAdminDashboard from './pages/group-admin/GroupAdminDashboard'

// Pages légales
import MentionsLegales from './pages/MentionsLegales'
import CGV from './pages/CGV'
import Confidentialite from './pages/Confidentialite'

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
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/cgv" element={<CGV />} />
        <Route path="/confidentialite" element={<Confidentialite />} />

        {/* Routes Groupe */}
        <Route path="/groupe" element={<GroupLanding />} />
        <Route path="/groupe/register" element={<GroupRegister />} />
        <Route path="/group-invite" element={session ? <GroupInvitePage /> : <Navigate to="/login" />} />
        <Route path="/groupe/:groupId/join" element={<GroupJoinPage />} />
        <Route path="/group-admin" element={session ? <GroupAdminDashboard /> : <Navigate to="/login" />} />

        {/* Routes Admin */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/activate" element={<AdminActivate />} />
        <Route 
          path="/admin/dashboard" 
          element={session ? <AdminDashboard /> : <Navigate to="/admin" />} 
        />

        {/* Routes formulaires profil (après création compte) */}
        <Route 
          path="/talent/profile-form" 
          element={session ? <TalentProfileForm /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/establishment/profile-form" 
          element={session ? <EstablishmentProfileForm /> : <Navigate to="/login" />} 
        />
        
        {/* Routes abonnement Stripe */}
        <Route 
          path="/establishment/subscribe" 
          element={session ? <Subscribe /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/establishment/subscribe/success" 
          element={session ? <SubscribeSuccess /> : <Navigate to="/login" />} 
        />

        {/* ========== ROUTES ÉTABLISSEMENT ========== */}
        
        {/* Dashboard Établissement */}
        <Route 
          path="/establishment" 
          element={session ? <EstablishmentDashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/establishment/dashboard" 
          element={session ? <EstablishmentDashboard /> : <Navigate to="/login" />} 
        />

        {/* Mission - Créer une nouvelle mission */}
        <Route 
          path="/establishment/create-mission" 
          element={session ? <MissionForm /> : <Navigate to="/login" />} 
        />

        {/* Mission - Éditer une mission existante */}
        <Route 
          path="/establishment/edit-mission/:missionId" 
          element={session ? <EditMissionForm /> : <Navigate to="/login" />} 
        />

        {/* Chat - Conversation avec un candidat/talent */}
        <Route 
          path="/establishment/chat/:applicationId" 
          element={session ? <ChatWindow userType="establishment" /> : <Navigate to="/login" />} 
        />

        {/* Routes protégées Établissement (wildcard - doit rester à la fin des routes établissement) */}
        <Route
          path="/establishment/*"
          element={
            session ? <EstablishmentDashboard /> : <Navigate to="/login" />
          }
        />

        {/* ========== ROUTES TALENT ========== */}

        {/* Dashboard Talent */}
        <Route 
          path="/talent/dashboard" 
          element={session ? <TalentDashboard /> : <Navigate to="/login" />} 
        />

        {/* Chat Talent */}
        <Route 
          path="/talent/chat/:applicationId" 
          element={session ? <ChatWindow userType="talent" /> : <Navigate to="/login" />} 
        />

        {/* Routes protégées Talent */}
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
