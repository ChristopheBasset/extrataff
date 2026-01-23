import { supabase } from '../../lib/supabase'
import { useNavigate, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import TalentProfileForm from '../../components/Talent/TalentProfileForm'
import TalentProfileEdit from '../../components/Talent/TalentProfileEdit'
import MissionList from '../../components/Talent/MissionList'
import MyApplications from '../../components/Talent/MyApplications'
import MyAgenda from '../../components/Talent/MyAgenda'
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
      loadStats(data.id)
    }
    
    setLoading(false)
  }

  const loadStats = async (talentId) => {
    try {
      const { count: appCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('talent_id', talentId)

      const { count: convCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('talent_id', talentId)
        .eq('status', 'accepted')

      setStats({
        missionsCount: 0,
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

  if (!profile) {
    return <TalentProfileForm />
  }

  const DashboardHome = () => (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Mon Dashboard</h1>
              <p className="text-sm text-gray-500">Bonjour {profile.first_name} 👋</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <NotificationBadge onClick={() => setShowNotifications(!showNotifications)} />
                <NotificationList 
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                />
              </div>
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
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-3">
          
          {/* Missions matchées */}
          <button
            onClick={() => navigate('/talent/missions')}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <img src="/icons/mission.png" alt="Missions" className="w-20 h-20 object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Missions</p>
                <p className="text-xs text-gray-500">matchées</p>
              </div>
            </div>
          </button>

          {/* Mes candidatures */}
          <button
            onClick={() => navigate('/talent/applications')}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <img src="/icons/candidature.png" alt="Candidatures" className="w-20 h-20 object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Mes</p>
                <p className="text-xs text-gray-500">Candidatures</p>
              </div>
            </div>
          </button>

          {/* Chat en live */}
          <button
            onClick={() => navigate('/talent/chat')}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <img src="/icons/conversation.png" alt="Chat" className="w-20 h-20 object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Chat</p>
                <p className="text-xs text-gray-500">en live</p>
              </div>
            </div>
          </button>

          {/* Mon profil */}
          <button
            onClick={() => navigate('/talent/edit-profile')}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <img src="/icons/profil.png" alt="Profil" className="w-20 h-20 object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Mon Profil</p>
                <p className="text-xs text-gray-500">Mes infos</p>
              </div>
            </div>
          </button>

        </div>

        {/* Mon Agenda - pleine largeur */}
        <button
          onClick={() => navigate('/talent/agenda')}
          className="w-full mt-3 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-center gap-4">
            <div className="w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform">
              <img src="/icons/agenda.png" alt="Agenda" className="w-16 h-16 object-contain" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Mon Agenda</p>
              <p className="text-xs text-gray-500">Missions confirmées</p>
            </div>
          </div>
        </button>

        {/* Logo en bas */}
        <div className="text-center mt-10">
          <img src="/icons/icon-192.png" alt="ExtraTaff" className="w-24 h-24 mx-auto" />
          <p className="text-sm text-gray-400 mt-2">Staff & Taff en temps réel</p>
        </div>
      </div>
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={<DashboardHome />} />
      <Route path="/missions" element={<MissionList />} />
      <Route path="/applications" element={<MyApplications />} />
      <Route path="/agenda" element={<MyAgenda />} />
      <Route path="/edit-profile" element={<TalentProfileEdit />} />
      <Route path="/chat" element={<ChatList userType="talent" />} />
      <Route path="/chat/:applicationId" element={<ChatWindow userType="talent" />} />
    </Routes>
  )
}
