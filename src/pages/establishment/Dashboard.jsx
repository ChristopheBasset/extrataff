// Dashboard Établissement - Version complète avec Badge Premium et Onglet Abonnement
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
import SubscriptionManager from '../../components/Establishment/SubscriptionManager'

const FREEMIUM_MAX_MISSIONS = 3
const SUBSCRIPTION_PRICE = 59.90

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

  // Calculs abonnement
  const isPremium = profile?.subscription_status === 'active'
  const isFreemium = profile?.subscription_status === 'freemium'
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const subscriptionEndsAt = profile?.subscription_ends_at ? new Date(profile.subscription_ends_at) : null
  const isTrialExpired = isFreemium && trialEndsAt && trialEndsAt < new Date()
  const missionsUsed = profile?.missions_used || 0
  const missionsRemaining = FREEMIUM_MAX_MISSIONS - missionsUsed
  const canCreateMission = isPremium || (isFreemium && !isTrialExpired && missionsRemaining > 0)
  
  // Calcul des jours restants
  const getDaysRemaining = () => {
    if (isPremium && subscriptionEndsAt) {
      const now = new Date()
      const diff = subscriptionEndsAt - now
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }
    if (!trialEndsAt) return 0
    const now = new Date()
    const diff = trialEndsAt - now
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  // Formatage de la date
  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
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

  // Composant Badge Premium/Freemium (cliquable)
  const StatusBadge = () => {
    if (isPremium) {
      const daysRemaining = getDaysRemaining()
      return (
        <button
          onClick={() => navigate('/establishment/subscription')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-all"
          title="Voir mon abonnement"
        >
          <span>⭐</span>
          <span>Premium</span>
          <span className="text-xs opacity-80">• {daysRemaining}j</span>
        </button>
      )
    }
    
    if (isFreemium) {
      const daysRemaining = getDaysRemaining()
      if (isTrialExpired) {
        return (
          <button
            onClick={() => navigate('/establishment/subscribe')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-full hover:bg-red-200 transition-colors animate-pulse"
          >
            <span>⚠️</span>
            <span>Essai terminé</span>
          </button>
        )
      }
      return (
        <button
          onClick={() => navigate('/establishment/subscription')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-full hover:bg-amber-200 transition-colors"
        >
          <span>🎁</span>
          <span>{daysRemaining}j restants</span>
          <span className="text-xs opacity-70">• {missionsRemaining}/{FREEMIUM_MAX_MISSIONS}</span>
        </button>
      )
    }
    
    return null
  }

  const DashboardHome = () => (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec Badge */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mon Dashboard</h1>
                <p className="text-sm text-gray-500">{profile.name} 🏢</p>
              </div>
              {/* Badge Premium/Freemium */}
              <StatusBadge />
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
            onClick={() => canCreateMission ? navigate('/establishment/create-mission') : navigate('/establishment/subscribe')}
            className={`bg-white rounded-xl p-4 border transition-all flex items-center gap-4 ${
              canCreateMission 
                ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer' 
                : 'border-red-200 bg-red-50 cursor-pointer'
            }`}
          >
            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
              <img src="/icons/creer-mission.svg" alt="" className="w-12 h-12" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-gray-900">Créer une mission</p>
              {canCreateMission ? (
                <p className="text-sm text-gray-500">Publier une nouvelle offre</p>
              ) : (
                <p className="text-sm text-red-600">
                  {isTrialExpired 
                    ? 'Période d\'essai expirée - Passez à Premium' 
                    : 'Limite atteinte - Passez à Premium'}
                </p>
              )}
            </div>
            {isPremium && (
              <span className="text-xs bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-2 py-1 rounded-full">
                ∞ Illimité
              </span>
            )}
            {isFreemium && canCreateMission && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                {missionsRemaining} restante{missionsRemaining > 1 ? 's' : ''}
              </span>
            )}
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

          {/* Mon abonnement - NOUVEL ONGLET */}
          <button
            onClick={() => navigate('/establishment/subscription')}
            className={`rounded-xl p-4 border transition-all flex items-center gap-4 ${
              isPremium 
                ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 hover:border-amber-300' 
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                isPremium 
                  ? 'bg-gradient-to-br from-amber-400 to-yellow-500' 
                  : 'bg-gray-100'
              }`}>
                {isPremium ? '⭐' : '💳'}
              </div>
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-gray-900">Mon abonnement</p>
              <p className="text-sm text-gray-500">
                {isPremium 
                  ? `Premium actif • Renouvellement dans ${getDaysRemaining()}j` 
                  : isTrialExpired 
                    ? 'Essai terminé • Passez à Premium'
                    : `Freemium • ${getDaysRemaining()}j restants`
                }
              </p>
            </div>
            {isPremium && (
              <span className="text-xs bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-3 py-1 rounded-full font-medium">
                {SUBSCRIPTION_PRICE}€/mois
              </span>
            )}
            {isFreemium && !isTrialExpired && (
              <span className="text-xs bg-primary-100 text-primary-700 px-3 py-1 rounded-full font-medium">
                Passer à Premium
              </span>
            )}
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
      <Route path="/create-mission" element={
        canCreateMission 
          ? <MissionForm onMissionCreated={() => checkProfile()} /> 
          : <DashboardHome />
      } />
      <Route path="/missions" element={<MyMissions />} />
      <Route path="/candidatures" element={<ApplicationsList />} />
      <Route path="/applications/:missionId" element={<ApplicationsList />} />
      <Route path="/edit-profile" element={<EstablishmentProfileEdit />} />
      <Route path="/chat" element={<ChatList userType="establishment" />} />
      <Route path="/chat/:applicationId" element={<ChatWindow userType="establishment" />} />
      <Route path="/subscription" element={<SubscriptionManager />} />
    </Routes>
  )
}
