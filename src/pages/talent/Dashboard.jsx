import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import TalentProfileForm from '../../components/Talent/TalentProfileForm'
import TalentProfileEdit from '../../components/Talent/TalentProfileEdit'
import MissionList from '../../components/Talent/MissionList'
import MyApplications from '../../components/Talent/MyApplications'
import ChatList from '../../components/shared/ChatList'
import ChatWindow from '../../components/shared/ChatWindow'
import NotificationBadge from '../../components/shared/NotificationBadge'
import NotificationList from '../../components/shared/NotificationList'
import { formatDate } from '../../lib/supabase'

export default function TalentDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [tab, setTab] = useState('overview')
  const [confirmedMissions, setConfirmedMissions] = useState([])
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
      .from('talents')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    setProfile(data)
    
    if (data) {
      loadStats(data.id)
      loadConfirmedMissions(data.id)
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

      const { count: confirmedCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('talent_id', talentId)
        .eq('status', 'confirmed')

      setStats({
        missionsCount: 0,
        applicationsCount: appCount || 0,
        conversationsCount: convCount || 0,
        confirmedCount: confirmedCount || 0
      })
    } catch (err) {
      console.error('Erreur chargement stats:', err)
    }
  }

  const loadConfirmedMissions = async (talentId) => {
    try {
      const { data } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          missions (
            id,
            position,
            location_fuzzy,
            start_date,
            end_date,
            hourly_rate,
            shift_start_time,
            shift_end_time,
            establishments (
              name
            )
          )
        `)
        .eq('talent_id', talentId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })

      setConfirmedMissions(data || [])
    } catch (err) {
      console.error('Erreur chargement missions confirmées:', err)
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

  const tabs = [
    { id: 'overview', label: '📊 Vue d\'ensemble', icon: '📊' },
    { id: 'missions', label: '🎯 Missions', icon: '🎯' },
    { id: 'applications', label: '📝 Candidatures', icon: '📝' },
    { id: 'chat', label: '💬 Messagerie', icon: '💬' },
    { id: 'agenda', label: '📅 Agenda', icon: '📅' },
    { id: 'profile', label: '⚙️ Profil', icon: '⚙️' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mon Dashboard</h1>
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
            <h2 className="text-xl font-bold text-gray-900 mb-6">Bienvenue sur ExtraTaff</h2>

            {/* Cartes de stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Candidatures</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.applicationsCount}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Conversations</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.conversationsCount}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Missions confirmées</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.confirmedCount}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">À explorer</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">∞</p>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setTab('missions')}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
              >
                <p className="text-lg font-semibold text-gray-900">🎯 Explorer les missions</p>
                <p className="text-sm text-gray-600 mt-1">Découvrez les offres qui vous correspondent</p>
              </button>

              <button
                onClick={() => setTab('chat')}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
              >
                <p className="text-lg font-semibold text-gray-900">💬 Vos conversations</p>
                <p className="text-sm text-gray-600 mt-1">Échangez avec les établissements</p>
              </button>

              <button
                onClick={() => setTab('applications')}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
              >
                <p className="text-lg font-semibold text-gray-900">📝 Mes candidatures</p>
                <p className="text-sm text-gray-600 mt-1">Suivez l'état de vos candidatures</p>
              </button>

              <button
                onClick={() => setTab('agenda')}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
              >
                <p className="text-lg font-semibold text-gray-900">📅 Mon agenda</p>
                <p className="text-sm text-gray-600 mt-1">Vos missions confirmées</p>
              </button>
            </div>
          </div>
        )}

        {/* Missions */}
        {tab === 'missions' && (
          <MissionList />
        )}

        {/* Candidatures */}
        {tab === 'applications' && (
          <MyApplications />
        )}

        {/* Messagerie */}
        {tab === 'chat' && (
          <ChatList userType="talent" />
        )}

        {/* Agenda */}
        {tab === 'agenda' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">📅 Mon Agenda</h2>

            {confirmedMissions.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
                <p className="text-xl text-gray-600 mb-4">📅 Aucune mission confirmée</p>
                <p className="text-gray-500 mb-6">
                  Vos missions confirmées apparaîtront ici
                </p>
                <button
                  onClick={() => setTab('applications')}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                >
                  Voir mes candidatures
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {confirmedMissions.map(app => {
                  const mission = app.missions
                  return (
                    <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{mission.position}</h3>
                          <p className="text-primary-600 font-medium">{mission.establishments?.name}</p>
                        </div>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          🎉 Confirmée
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">📍 Lieu</p>
                          <p className="font-medium">{mission.location_fuzzy || 'Non précisé'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">📅 Début</p>
                          <p className="font-medium">{formatDate(mission.start_date)}</p>
                        </div>
                        {mission.hourly_rate && (
                          <div>
                            <p className="text-sm text-gray-600">💰 Tarif</p>
                            <p className="font-medium text-primary-600">{mission.hourly_rate}€/h</p>
                          </div>
                        )}
                        {mission.shift_start_time && mission.shift_end_time && (
                          <div>
                            <p className="text-sm text-gray-600">🕐 Horaires</p>
                            <p className="font-medium">{mission.shift_start_time.slice(0,5)} - {mission.shift_end_time.slice(0,5)}</p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setTab('chat')}
                        className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 w-full"
                      >
                        💬 Contacter l'établissement
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Profil */}
        {tab === 'profile' && (
          <TalentProfileEdit />
        )}
      </div>
    </div>
  )
}
