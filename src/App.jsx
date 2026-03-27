import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
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
import TalentDashboard from './pages/talent/DashboardTalent'

// Auth OAuth
import AuthCallback from './pages/auth/AuthCallback'
import ChooseRole from './pages/auth/ChooseRole'

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

// ─────────────────────────────────────────────────────────────
// COMPOSANT : redirige vers le bon dashboard après restauration
// de session — sans jamais afficher le login
// ─────────────────────────────────────────────────────────────
function SessionRedirect({ session }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!session) return

    const redirect = async () => {
      const { data: est } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (est) {
        navigate('/establishment/dashboard', { replace: true })
        return
      }

      const { data: tal } = await supabase
        .from('talents')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (tal) {
        navigate('/talent/dashboard', { replace: true })
      }
    }

    redirect()
  }, [session])

  return null
}

// Redirige vers le bon dashboard si déjà connecté
function AuthGuard({ session, children }) {
  const [userRole, setUserRole] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!session) { setChecking(false); return }
    const checkRole = async () => {
      const { data: est } = await supabase.from('establishments').select('id').eq('user_id', session.user.id).maybeSingle()
      if (est) { setUserRole('establishment'); setChecking(false); return }
      const { data: tal } = await supabase.from('talents').select('id').eq('user_id', session.user.id).maybeSingle()
      if (tal) { setUserRole('talent'); setChecking(false); return }
      setChecking(false)
    }
    checkRole()
  }, [session])

  if (!session) return children
  if (checking) return null
  if (userRole === 'establishment') return <Navigate to="/establishment/dashboard" replace />
  if (userRole === 'talent') return <Navigate to="/talent/dashboard" replace />
  return children
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ─────────────────────────────────────────────────────────────
    // RESTAURATION DE SESSION ROBUSTE
    // On reste sur le spinner jusqu'à avoir la réponse définitive.
    // Jamais de flash login.
    // ─────────────────────────────────────────────────────────────
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setSession(session)
        setLoading(false)
        return
      }

      // Pas de session dans le localStorage → tenter le refresh token
      const { data: refreshData } = await supabase.auth.refreshSession()
      if (refreshData?.session) {
        setSession(refreshData.session)
      }

      setLoading(false)
    }

    restoreSession()

    // Écouter les changements (refresh token, déconnexion, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
      } else if (session) {
        setSession(session)
      }
    })

    // Rafraîchit le token quand l'app revient au premier plan
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.refreshSession()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Refresh toutes les 10 minutes
    const refreshInterval = setInterval(() => {
      supabase.auth.refreshSession()
    }, 10 * 60 * 1000)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(refreshInterval)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // SPINNER pendant toute la durée de la vérification de session
  // L'utilisateur ne voit JAMAIS le login pendant ce temps
  // ─────────────────────────────────────────────────────────────
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
      {/* Redirige vers le dashboard dès qu'une session est restaurée */}
      <SessionRedirect session={session} />

      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthGuard session={session}><Login /></AuthGuard>} />
        <Route path="/signup" element={<AuthGuard session={session}><Signup /></AuthGuard>} />
        <Route path="/register" element={<AuthGuard session={session}><Register /></AuthGuard>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/cgv" element={<CGV />} />
        <Route path="/confidentialite" element={<Confidentialite />} />

        {/* Routes OAuth Google */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/choose-role" element={<ChooseRole />} />

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

        {/* Routes formulaires profil */}
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
        <Route 
          path="/establishment" 
          element={session ? <EstablishmentDashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/establishment/dashboard" 
          element={session ? <EstablishmentDashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/establishment/create-mission" 
          element={session ? <MissionForm /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/establishment/edit-mission/:missionId" 
          element={session ? <EditMissionForm /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/establishment/chat/:applicationId" 
          element={session ? <ChatWindow userType="establishment" /> : <Navigate to="/login" />} 
        />
        <Route
          path="/establishment/*"
          element={session ? <EstablishmentDashboard /> : <Navigate to="/login" />}
        />

        {/* ========== ROUTES TALENT ========== */}
        <Route 
          path="/talent/dashboard" 
          element={session ? <TalentDashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/talent/chat/:applicationId" 
          element={session ? <ChatWindow userType="talent" /> : <Navigate to="/login" />} 
        />
        <Route
          path="/talent/*"
          element={session ? <TalentDashboard /> : <Navigate to="/login" />}
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
