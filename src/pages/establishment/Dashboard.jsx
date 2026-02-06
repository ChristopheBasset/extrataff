import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ChatList from '../../components/shared/ChatList'
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

      const { count: convCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')

      const { count: confirmedCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed')

      setStats({
        missionsCount: missCount || 0,
        applicationsCount: 0,
        conversationsCount: convCount || 0,
        confirmedCount: confirmedCount || 0
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
    { id: 'chat', label: '💬 Messagerie' },
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
                <p className="text-sm text-gray-600">Missions publiées</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.missionsCount}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Candidatures</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.applicationsCount}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Conversations actives</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.conversationsCount}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Missions confirmées</p>
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
                <p className="text-sm text-gray-600 mt-1">Créer et suivre vos offres d'emploi</p>
              </button>

              <button
                onClick={() => setTab('candidates')}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
              >
                <p className="text-lg font-semibold text-gray-900">👥 Candidatures</p>
                <p className="text-sm text-gray-600 mt-1">Voir et traiter les candidatures reçues</p>
              </button>

              <button
                onClick={() => setTab('chat')}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
              >
                <p className="text-lg font-semibold text-gray-900">💬 Messages</p>
                <p className="text-sm text-gray-600 mt-1">Échangez avec les candidats</p>
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
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">📋 Gestion des missions</p>
            <p className="text-sm text-gray-500 mb-6">Fonction en préparation</p>
            <button
              onClick={() => navigate('/establishment/create-mission')}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
            >
              + Créer une mission
            </button>
          </div>
        )}

        {/* Candidatures */}
        {tab === 'candidates' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">👥 Candidatures reçues</p>
            <p className="text-sm text-gray-500">Vous n'avez pas encore reçu de candidatures</p>
          </div>
        )}

        {/* Messagerie */}
        {tab === 'chat' && (
          <ChatList userType="establishment" />
        )}

        {/* Profil */}
        {tab === 'profile' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Profil de l'établissement</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Nom</p>
                <p className="text-gray-900 font-medium">{profile.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="text-gray-900 font-medium">{profile.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Adresse</p>
                <p className="text-gray-900 font-medium">{profile.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Téléphone</p>
                <p className="text-gray-900 font-medium">{profile.phone}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/establishment/edit-profile')}
              className="mt-6 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
            >
              Modifier le profil
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
