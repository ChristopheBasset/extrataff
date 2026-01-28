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

  // Calculs freemium
  const isFreemium = profile?.subscription_status === 'freemium'
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const isTrialExpired = trialEndsAt && trialEndsAt < new Date()
  const missionsUsed = profile?.missions_used || 0
  const missionsRemaining = FREEMIUM_MAX_MISSIONS - missionsUsed
  const canCreateMission = !isFreemium || (!isTrialExpired && missionsRemaining > 0)
  
  // Calcul des jours restants
  const getDaysRemaining = () => {
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

  // Composant bannière Freemium
  const FreemiumBanner = () => {
    if (!isFreemium) return null

    const daysRemaining = getDaysRemaining()

    return (
      <div className={`mx-4 mt-4 rounded-xl p-4 ${isTrialExpired ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-start gap-3">
          <div className="text-2xl">
            {isTrialExpired ? '⚠️' : '🎁'}
          </div>
          <div className="flex-1">
            {isTrialExpired ? (
              <>
                <p className="font-semibold text-red-800">Votre période d'essai est terminée</p>
                <p className="text-sm text-red-700 mt-1">
                  Pour continuer à publier des missions, passez à l'abonnement premium à {SUBSCRIPTION_PRICE}€/mois.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-amber-800">Offre Freemium</p>
                <p className="text-sm text-amber-700 mt-1">
                  Vous bénéficiez de <strong>{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</strong> d'essai gratuit 
                  (jusqu'au {formatDate(trialEndsAt)}).
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  <strong>{missionsRemaining}</strong> mission{missionsRemaining > 1 ? 's' : ''} restante{missionsRemaining > 1 ? 's' : ''} sur {FREEMIUM_MAX_MISSIONS}.
                </p>
                <p className="text-sm text-amber-600 mt-2">
                  Après cette période, l'abonnement passe à <strong>{SUBSCRIPTION_PRICE}€/mois</strong>.
                </p>
              </>
            )}
            <button
              onClick={() => navigate('/establishment/subscribe')}
              className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isTrialExpired 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              {isTrialExpired ? 'Souscrire maintenant' : 'Passer à Premium'}
            </button>
          </div>
        </div>
      </div>
    )
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

      {/* Bannière Freemium */}
      <div className="max-w-4xl mx-auto">
        <FreemiumBanner />
      </div>

      {/* Liste des options */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-3">
          
          {/* Créer une mission */}
          <button
            onClick={() => canCreateMission ? navigate('/establishment/create-mission') : null}
            disabled={!canCreateMission}
            className={`bg-white rounded-xl p-4 border transition-all flex items-center gap-4 ${
              canCreateMission 
                ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer' 
                : 'border-gray-200 opacity-60 cursor-not-allowed'
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
                <p className="text-sm text-red-500">
                  {isTrialExpired 
                    ? 'Période d\'essai expirée - Passez à Premium' 
                    : 'Limite de missions atteinte - Passez à Premium'}
                </p>
              )}
            </div>
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
    </Routes>
  )
}
