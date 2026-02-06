import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import MyMissions from '../../components/Establishment/MyMissions'
import ApplicationsReceived from '../../components/Establishment/ApplicationsReceived'
import EstablishmentAgenda from '../../components/Establishment/EstablishmentAgenda'
import EstablishmentProfileEdit from '../../components/Establishment/EstablishmentProfileEdit'
import NotificationBadge from '../../components/shared/NotificationBadge'
import NotificationList from '../../components/shared/NotificationList'

export default function EstablishmentDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({
    missionsCount: 0,
    applicationsCount: 0,
    conversationsCount: 0,
    confirmedCount: 0
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
      const { count: missCount } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('establishment_id', establishmentId)
        .eq('status', 'open')

      const { data: missions } = await supabase
        .from('missions')
        .select('id')
        .eq('establishment_id', establishmentId)

      let appCount = 0
      let convCount = 0
      let confirmedCount = 0

      if (missions && missions.length > 0) {
        const missionIds = missions.map(m => m.id)

        const { count: appC } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .in('mission_id', missionIds)

        const { count: convC } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .in('mission_id', missionIds)
          .eq('status', 'accepted')

        const { count: confC } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .in('mission_id', missionIds)
          .eq('status', 'confirmed')

        appCount = appC || 0
        convCount = convC || 0
        confirmedCount = confC || 0
      }

      setStats({
        missionsCount: missCount || 0,
        applicationsCount: appCount,
        conversationsCount: convCount,
        confirmedCount: confirmedCount
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Chargement du profil...</p>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: '📊 Vue d\'ensemble' },
    { id: 'missions', label: '📋 Missions' },
    { id: 'candidates', label: '👥 Candidatures' },
    { id: 'agenda', label: '📅 Confirmées' },
    { id: 'profile', label: '⚙️ Profil' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mon Établissement</h1>
              <p className="text-sm text-gray-500">{profile.name}</p>
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

          {/* Onglets */}
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`py-3 px-4 font-medium text-sm whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'border-b-2 border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Vue d'ensemble */}
        {tab === 'overview' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Tableau de bord</h2>

            {/* Cartes de stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Missions ouvertes</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.missionsCount}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Candidatures</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.applicationsCount}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Conversations</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.conversationsCount}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Confirmées</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.confirmedCount}</p>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setTab('missions')}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
              >
                <p className="text-lg font-semibold text-gray-900">📋 Gérer les missions</p>
                <p className="text-sm text-gray-600 mt-1">Créer et suivre vos offres</p>
              </button>

              <button
                onClick={() => setTab('candidates')}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
              >
                <p className="text-lg font-semibold text-gray-900">👥 Candidatures</p>
                <p className="text-sm text-gray-600 mt-1">Voir et traiter les candidatures</p>
              </button>

              <button
                onClick={() => setTab('agenda')}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
              >
                <p className="text-lg font-semibold text-gray-900">📅 Missions confirmées</p>
                <p className="text-sm text-gray-600 mt-1">Vos missions validées des deux côtés</p>
              </button>

              <button
                onClick={() => setTab('profile')}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
              >
                <p className="text-lg font-semibold text-gray-900">⚙️ Paramètres</p>
                <p className="text-sm text-gray-600 mt-1">Gérez vos informations</p>
              </button>
            </div>
          </div>
        )}

        {/* Missions */}
        {tab === 'missions' && (
          <MyMissions onViewCandidates={() => setTab('candidates')} />
        )}

        {/* Candidatures */}
        {tab === 'candidates' && (
          <ApplicationsReceived establishmentId={profile.id} />
        )}

        {/* Agenda - Missions confirmées */}
        {tab === 'agenda' && (
          <EstablishmentAgenda establishmentId={profile.id} />
        )}

        {/* Profil */}
        {tab === 'profile' && (
          <EstablishmentProfileEdit />
        )}
      </div>
    </div>
  )
}
