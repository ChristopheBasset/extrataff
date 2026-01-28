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

      {/* Liste des options */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-3">
          
          {/* Créer une mission */}
          <button
            onClick={() => navigate('/establishment/create-mission')}
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
              <img src="/icons/creer-mission.svg" alt="" className="w-12 h-12" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Créer une mission</p>
              <p className="text-sm text-gray-500">Publier une nouvelle offre</p>
            </div>
          </button>

          {/* Mes missions */}
          <button
            onClick={() => navigate('/establishment/missions')}
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
              <img src="/icons/mes-missions.svg" alt="" className="w-12 h-12" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Mes missions</p>
              <p className="text-sm text-gray-500">{stats.missionsCount} mission{stats.missionsCount > 1 ? 's' : ''} en cours</p>
            </div>
          </button>

          {/* Les candidatures */}
          <button
            onClick={() => navigate('/establishment/candidatures')}
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
              <img src="/icons/candidatures.svg" alt="" className="w-12 h-12" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Les candidatures</p>
              <p className="text-sm text-gray-500">{stats.applicationsCount} en attente</p>
            </div>
          </button>

          {/* Chat en live */}
          <button
            onClick={() => navigate('/establishment/chat')}
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
              <img src="/icons/chat.svg" alt="" className="w-12 h-12" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Chat en live</p>
              <p className="text-sm text-gray-500">{stats.conversationsCount} conversation{stats.conversationsCount > 1 ? 's' : ''}</p>
            </div>
          </button>

          {/* Mes infos */}
          <button
            onClick={() => navigate('/establishment/edit-profile')}
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
              <img src="/icons/mon-profil.svg" alt="" className="w-12 h-12" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Mes infos</p>
              <p className="text-sm text-gray-500">Modifier mon profil</p>
            </div>
          </button>

        </div>

        {/* Logo en bas */}
        <div className="text-center mt-10">
          <img src="/icons/icon-192.png" alt="ExtraTaff" className="w-20 h-20 mx-auto" />
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
