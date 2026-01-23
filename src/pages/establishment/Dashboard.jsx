import { supabase } from '../../lib/supabase'
import { useNavigate, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import EstablishmentProfileForm from '../../components/Establishment/EstablishmentProfileForm'
import EstablishmentProfileEdit from '../../components/Establishment/EstablishmentProfileEdit'
import MissionForm from '../../components/Establishment/MissionForm'
import MyMissions from '../../components/Establishment/MyMissions'
import ApplicationsList from '../../components/Establishment/ApplicationsList'
import ChatList from '../../components/shared/ChatList'
import ChatWindow from '../../components/shared/ChatWindow'
import NotificationBadge from '../../components/shared/NotificationBadge'
import NotificationList from '../../components/shared/NotificationList'

export default function EstablishmentDashboard() {
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
      .from('establishments')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    setProfile(data)
    
    if (data) {
      loadStats(data.id)
    }
    
    setLoading(false)
  }

  const loadStats = async (establishmentId) => {
    try {
      const { count: missionsCount } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('establishment_id', establishmentId)
        .is('archived_at', null)

      const { data: missions } = await supabase
        .from('missions')
        .select('id')
        .eq('establishment_id', establishmentId)

      if (missions && missions.length > 0) {
        const missionIds = missions.map(m => m.id)
        
        const { count: appCount } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .in('mission_id', missionIds)
          .eq('status', 'interested')

        const { count: convCount } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .in('mission_id', missionIds)
          .eq('status', 'accepted')

        setStats({
          missionsCount: missionsCount || 0,
          applicationsCount: appCount || 0,
          conversationsCount: convCount || 0
        })
      } else {
        setStats({
          missionsCount: 0,
          applicationsCount: 0,
          conversationsCount: 0
        })
      }
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
    return <EstablishmentProfileForm />
  }

  const DashboardHome = () => (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Mon Dashboard</h1>
              <p className="text-sm text-gray-500">{profile.name} 🏢</p>
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
          
          {/* Créer une mission */}
          <button
            onClick={() => navigate('/establishment/create-mission')}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-4xl text-white font-bold">+</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Créer</p>
                <p className="text-xs text-gray-500">une mission</p>
              </div>
            </div>
          </button>

          {/* Mes missions */}
          <button
            onClick={() => navigate('/establishment/missions')}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <img src="/icons/mission.png" alt="Missions" className="w-20 h-20 object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Mes</p>
                <p className="text-xs text-gray-500">Missions</p>
              </div>
            </div>
          </button>

          {/* Candidatures */}
          <button
            onClick={() => navigate('/establishment/candidatures')}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <img src="/icons/candidature.png" alt="Candidatures" className="w-20 h-20 object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Les</p>
                <p className="text-xs text-gray-500">Candidatures</p>
              </div>
            </div>
          </button>

          {/* Conversations */}
          <button
            onClick={() => navigate('/establishment/chat')}
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

        </div>

        {/* Bouton profil en bas */}
        <button
          onClick={() => navigate('/establishment/edit-profile')}
          className="w-full mt-4 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3"
        >
          <img src="/icons/profil.png" alt="Profil" className="w-10 h-10 object-contain" />
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Mon Profil</p>
            <p className="text-xs text-gray-500">Mes infos établissement</p>
          </div>
        </button>

        {/* Logo en bas */}
        <div className="text-center mt-8">
          <img src="/icons/icon-192.png" alt="ExtraTaff" className="w-24 h-24 mx-auto" />
          <p className="text-sm text-gray-400 mt-2">Staff & Taff en temps réel</p>
        </div>
      </div>
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={<DashboardHome />} />
      <Route path="/create-mission" element={<MissionForm />} />
      <Route path="/missions" element={<MyMissions />} />
      <Route path="/candidatures" element={<ApplicationsList />} />
      <Route path="/applications/:missionId" element={<ApplicationsList />} />
      <Route path="/edit-profile" element={<EstablishmentProfileEdit />} />
      <Route path="/chat" element={<ChatList userType="establishment" />} />
      <Route path="/chat/:applicationId" element={<ChatWindow userType="establishment" />} />
    </Routes>
  )
}
