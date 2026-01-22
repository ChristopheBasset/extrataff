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
      // Compter les missions actives
      const { count: missionsCount } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('establishment_id', establishmentId)
        .is('archived_at', null)

      // Compter les candidatures en attente
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

  // Si pas de profil, afficher le formulaire
  if (!profile) {
    return <EstablishmentProfileForm />
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
              <p className="text-sm text-gray-500">{profile.name} 🏢</p>
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
          
          {/* Créer une mission */}
          <button
            onClick={() => navigate('/establishment/create-mission')}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">➕</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Créer une mission</h3>
                <p className="text-sm text-gray-500">Publier une annonce</p>
              </div>
            </div>
          </button>

          {/* Mes missions */}
          <button
            onClick={() => navigate('/establishment/missions')}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Mes missions</h3>
                <p className="text-sm text-gray-500">
                  {stats.missionsCount > 0 ? `${stats.missionsCount} active${stats.missionsCount > 1 ? 's' : ''}` : 'Gérer mes annonces'}
                </p>
              </div>
            </div>
          </button>

          {/* Candidatures */}
          <button
            onClick={() => navigate('/establishment/candidatures')}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Candidatures</h3>
                <p className="text-sm text-gray-500">
                  {stats.applicationsCount > 0 ? `${stats.applicationsCount} en attente` : 'Voir les profils'}
                </p>
              </div>
            </div>
          </button>

          {/* Conversations */}
          <button
            onClick={() => navigate('/establishment/chat')}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">💬</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Conversations</h3>
                <p className="text-sm text-gray-500">
                  {stats.conversationsCount > 0 ? `${stats.conversationsCount} active${stats.conversationsCount > 1 ? 's' : ''}` : 'Discuter'}
                </p>
              </div>
            </div>
          </button>

        </div>

        {/* Bouton profil en bas */}
        <button
          onClick={() => navigate('/establishment/edit-profile')}
          className="w-full mt-4 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-center"
        >
          <span className="text-gray-600">⚙️ Modifier mon profil établissement</span>
        </button>

        {/* Logo en bas */}
        <div className="text-center mt-8">
          <p className="text-primary-600 font-bold">⚡ ExtraTaff</p>
          <p className="text-xs text-gray-400 mt-1">Staff & Taff en temps réel</p>
        </div>
      </div>
    </div>
  )

  // Routes
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
