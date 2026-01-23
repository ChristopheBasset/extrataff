import { supabase } from '../../lib/supabase'
import { useNavigate, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import TalentProfileForm from '../../components/Talent/TalentProfileForm'
import TalentProfileEdit from '../../components/Talent/TalentProfileEdit'
import MissionList from '../../components/Talent/MissionList'
import MyApplications from '../../components/Talent/MyApplications'
import ChatList from '../../components/shared/ChatList'
import ChatWindow from '../../components/shared/ChatWindow'
import NotificationBadge from '../../components/shared/NotificationBadge'
import NotificationList from '../../components/shared/NotificationList'

export default function TalentDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [stats, setStats] = useState({
    missionsCount: 0,
    applicationsCount: 0,
    conversationsCount: 0
  })

  useEffect(() => {
    checkProfile()
  }, [])

  const checkProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data } = await supabase
      .from('talents')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    setProfile(data)
    
    if (data) {
      // Charger les stats
      loadStats(data.id)
    }
    
    setLoading(false)
  }

  const loadStats = async (talentId) => {
    try {
      // Compter les candidatures
      const { count: appCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('talent_id', talentId)

      // Compter les conversations (candidatures acceptées)
      const { count: convCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('talent_id', talentId)
        .eq('status', 'accepted')

      setStats({
        missionsCount: 0, // On pourrait compter les missions matchées
        applicationsCount: appCount || 0,
        conversationsCount: convCount || 0
      })
    } catch (err) {
      console.error('Erreur chargement stats:', err)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Si pas de profil, afficher le formulaire
  if (!profile) {
    return <TalentProfileForm />
  }

  // Dashboard principal
  const DashboardHome = () => (
    <div className="min-h-screen bg-gray-50">
      {/* Header épuré */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Mon Dashboard</h1>
              <p className="text-sm text-gray-500">Bonjour {profile.first_name} 👋</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <NotificationBadge onClick={() => setShowNotifications(!showNotifications)} />
                <NotificationList 
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                />
              </div>
              
              {/* Déconnexion */}
              <button 
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Grille 2x2 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-4">
          
          {/* Missions matchées */}
          <button
            onClick={() => navigate('/talent/missions')}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                <img src="/icons/mission.png" alt="Missions" className="w-14 h-14 object-contain" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Missions matchées</h3>
                <p className="text-sm text-gray-500">Offres pour vous</p>
              </div>
            </div>
          </button>

          {/* Mes candidatures */}
          <button
            onClick={() => navigate('/talent/applications')}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                <img src="/icons/candidature.png" alt="Candidatures" className="w-14 h-14 object-contain" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Mes candidatures</h3>
                <p className="text-sm text-gray-500">
                  {stats.applicationsCount > 0 ? `${stats.applicationsCount} en cours` : 'Suivre mes demandes'}
                </p>
              </div>
            </div>
          </button>

          {/* Mes conversations */}
          <button
            onClick={() => navigate('/talent/chat')}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                <img src="/icons/conversation.png" alt="Conversations" className="w-14 h-14 object-contain" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Mes conversations</h3>
                <p className="text-sm text-gray-500">
                  {stats.conversationsCount > 0 ? `${stats.conversationsCount} active${stats.conversationsCount > 1 ? 's' : ''}` : 'Discuter'}
                </p>
              </div>
            </div>
          </button>

          {/* Mon profil */}
          <button
            onClick={() => navigate('/talent/edit-profile')}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                <img src="/icons/profil.png" alt="Profil" className="w-14 h-14 object-contain" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Mon profil</h3>
                <p className="text-sm text-gray-500">Modifier mes infos</p>
              </div>
            </div>
          </button>

        </div>

        {/* Logo en bas */}
        <div className="text-center mt-12">
          <img src="/icons/icon-192.png" alt="ExtraTaff" className="w-16 h-16 mx-auto" />
          <p className="text-xs text-gray-400 mt-2">Staff & Taff en temps réel</p>
        </div>
      </div>
    </div>
  )

  // Routes
  return (
    <Routes>
      <Route path="/" element={<DashboardHome />} />
      <Route path="/missions" element={<MissionList />} />
      <Route path="/applications" element={<MyApplications />} />
      <Route path="/edit-profile" element={<TalentProfileEdit />} />
      <Route path="/chat" element={<ChatList userType="talent" />} />
      <Route path="/chat/:applicationId" element={<ChatWindow userType="talent" />} />
    </Routes>
  )
}
