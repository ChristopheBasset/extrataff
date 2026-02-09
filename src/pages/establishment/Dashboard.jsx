import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import MyMissions from '../../components/Establishment/MyMissions'

export default function EstablishmentDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('home')
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({
    missions: 0,
    candidates: 0,
    hired: 0
  })

  useEffect(() => {
    checkProfile()
  }, [])

  // Recalcule les compteurs quand on change de view ou de profil
  useEffect(() => {
    if (profile && view === 'home') {
      loadCounts(profile.id)
    }
  }, [profile, view])

  const checkProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data } = await supabase
        .from('establishments')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      setProfile(data)
      if (data) loadCounts(data.id)
    } catch (err) {
      console.error('Erreur chargement profil:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCounts = async (establishmentId) => {
    try {
      // Missions ouvertes
      const { count: missCount } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('establishment_id', establishmentId)
        .eq('status', 'open')

      // Toutes les missions de l'établissement
      const { data: missions } = await supabase
        .from('missions')
        .select('id')
        .eq('establishment_id', establishmentId)

      let candCount = 0
      let hiredCount = 0

      if (missions && missions.length > 0) {
        const missionIds = missions.map(m => m.id)

        // Charger TOUTES les applications
        const { data: allApps } = await supabase
          .from('applications')
          .select('status')
          .in('mission_id', missionIds)

        console.log('🔍 DEBUG: allApps =', allApps)

        // Compter en JavaScript
        candCount = allApps ? allApps.filter(a => a.status === 'interested').length : 0
        hiredCount = allApps ? allApps.filter(a => a.status === 'confirmed').length : 0

        console.log('🔍 DEBUG: candidats (interested) =', candCount)
        console.log('🔍 DEBUG: embauches (confirmed) =', hiredCount)
      }

      setCounts({
        missions: missCount || 0,
        candidates: candCount,
        hired: hiredCount
      })
    } catch (err) {
      console.error('Erreur chargement counts:', err)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleCreateMission = () => {
    navigate('/establishment/create-mission')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">Profil non trouvé</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-primary-600">⚡ ExtraTaff</h1>
              <p className="text-xs text-gray-500">Établissement</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{profile.name}</span>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'home' && (
          <>
            {/* Bouton créer mission */}
            <div className="mb-8">
              <button
                onClick={handleCreateMission}
                className="w-full sm:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-xl">+</span>
                Créer une mission
              </button>
            </div>

            {/* Grille 4 boutons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mes Missions */}
              <div
                onClick={() => setView('missions')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">📝</div>
                <h2 className="text-2xl font-bold text-gray-900">Mes Missions</h2>
                <p className="text-gray-600 mt-2">Missions créées et gérées</p>
                <div className="mt-6 text-5xl font-bold text-primary-600">{counts.missions}</div>
              </div>

              {/* Mes Candidats */}
              <div
                onClick={() => setView('candidates')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">👥</div>
                <h2 className="text-2xl font-bold text-gray-900">Mes Candidats</h2>
                <p className="text-gray-600 mt-2">Candidatures reçues</p>
                <div className="mt-6 text-5xl font-bold text-primary-600">{counts.candidates}</div>
              </div>

              {/* Mes Embauches */}
              <div
                onClick={() => setView('hired')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-gray-900">Mes Embauches</h2>
                <p className="text-gray-600 mt-2">Candidats validés</p>
                <div className="mt-6 text-5xl font-bold text-primary-600">{counts.hired}</div>
              </div>

              {/* Mon Profil */}
              <div
                onClick={() => setView('profile')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">⚙️</div>
                <h2 className="text-2xl font-bold text-gray-900">Mon Profil</h2>
                <p className="text-gray-600 mt-2">Gérer mon établissement</p>
                <div className="mt-6">
                  <span className="text-sm text-gray-500">Paramètres & infos</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Vue Missions */}
        {view === 'missions' && (
          <MyMissions 
            establishmentId={profile.id} 
            onBack={() => setView('home')} 
          />
        )}

        {/* Vue Candidats */}
        {view === 'candidates' && (
          <div>
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setView('home')}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Retour
              </button>
              <h2 className="text-3xl font-bold text-gray-900">Mes Candidats</h2>
              <button
                onClick={loadCounts}
                className="ml-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                🔄 Rafraîchir
              </button>
            </div>
            <div className="text-gray-600">
              {/* À implémenter: composant ApplicationsReceived */}
              <p>Composant ApplicationsReceived à intégrer ici</p>
            </div>
          </div>
        )}

        {/* Vue Embauches */}
        {view === 'hired' && (
          <div>
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setView('home')}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Retour
              </button>
              <h2 className="text-3xl font-bold text-gray-900">Mes Embauches</h2>
              <button
                onClick={loadCounts}
                className="ml-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                🔄 Rafraîchir
              </button>
            </div>
            <div className="text-gray-600">
              {/* À implémenter: composant EstablishmentAgenda */}
              <p>Composant EstablishmentAgenda à intégrer ici</p>
            </div>
          </div>
        )}

        {/* Vue Profil */}
        {view === 'profile' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setView('home')}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Retour
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Mon Profil</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom établissement</label>
                  <p className="text-lg text-gray-900">{profile.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                  <p className="text-lg text-gray-900">{profile.address || 'Non renseignée'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                  <p className="text-lg text-gray-900">{profile.phone || 'Non renseigné'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut abonnement</label>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-3 h-3 rounded-full ${profile.subscription_status === 'premium' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    <span className="text-lg font-medium">
                      {profile.subscription_status === 'premium' ? '🟢 Premium' : '🟡 Freemium'}
                    </span>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <button
                    onClick={() => navigate('/establishment/edit-profile')}
                    className="btn-primary"
                  >
                    ✏️ Modifier mon profil
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
