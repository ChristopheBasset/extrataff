import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function TalentDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('home')
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({
    matched: 0,
    interested: 0,
    confirmed: 0
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
        .from('talents')
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

  const loadCounts = async (talentId) => {
    try {
      // Missions matchées (missions proposées au talent - à implémenter via matching)
      // Pour l'instant, on compte les missions sans candidature du talent
      const { data: allMissions } = await supabase
        .from('missions')
        .select('id')
        .eq('status', 'open')

      let matchedCount = 0
      let interestedCount = 0
      let confirmedCount = 0

      if (allMissions && allMissions.length > 0) {
        const missionIds = allMissions.map(m => m.id)

        // Charger toutes les applications du talent
        const { data: allApps } = await supabase
          .from('applications')
          .select('status')
          .eq('talent_id', talentId)
          .in('mission_id', missionIds)

        console.log('🔍 DEBUG: applications du talent =', allApps)

        // Missions intéressées (status = interested)
        interestedCount = allApps ? allApps.filter(a => a.status === 'interested').length : 0

        // Missions validées (status = confirmed)
        confirmedCount = allApps ? allApps.filter(a => a.status === 'confirmed').length : 0

        // Missions matchées = missions ouvertes - candidatures du talent
        matchedCount = allMissions.length - (allApps ? allApps.length : 0)
        if (matchedCount < 0) matchedCount = 0

        console.log('🔍 DEBUG: missions matchées =', matchedCount)
        console.log('🔍 DEBUG: missions intéressées =', interestedCount)
        console.log('🔍 DEBUG: missions confirmées =', confirmedCount)
      }

      setCounts({
        matched: matchedCount,
        interested: interestedCount,
        confirmed: confirmedCount
      })
    } catch (err) {
      console.error('Erreur chargement counts:', err)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
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
              <p className="text-xs text-gray-500">Talent</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {profile.first_name} {profile.last_name}
              </span>
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
            {/* Grille 4 boutons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Missions Matchées */}
              <div
                onClick={() => setView('matched')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold text-gray-900">Missions Matchées</h2>
                <p className="text-gray-600 mt-2">Missions proposées</p>
                <div className="mt-6 text-5xl font-bold text-primary-600">{counts.matched}</div>
              </div>

              {/* Missions Intéressées */}
              <div
                onClick={() => setView('interested')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">❤️</div>
                <h2 className="text-2xl font-bold text-gray-900">Missions Intéressées</h2>
                <p className="text-gray-600 mt-2">Candidatures en cours</p>
                <div className="mt-6 text-5xl font-bold text-primary-600">{counts.interested}</div>
              </div>

              {/* Mes Missions Validées */}
              <div
                onClick={() => setView('confirmed')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-gray-900">Mes Missions Validées</h2>
                <p className="text-gray-600 mt-2">Embauches confirmées</p>
                <div className="mt-6 text-5xl font-bold text-primary-600">{counts.confirmed}</div>
              </div>

              {/* Mon Profil */}
              <div
                onClick={() => setView('profile')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">⚙️</div>
                <h2 className="text-2xl font-bold text-gray-900">Mon Profil</h2>
                <p className="text-gray-600 mt-2">Gérer mon profil</p>
                <div className="mt-6">
                  <span className="text-sm text-gray-500">Paramètres & infos</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Vue Missions Matchées */}
        {view === 'matched' && (
          <div>
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setView('home')}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Retour
              </button>
              <h2 className="text-3xl font-bold text-gray-900">Missions Matchées</h2>
              <button
                onClick={loadCounts}
                className="ml-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                🔄 Rafraîchir
              </button>
            </div>
            <div className="text-gray-600">
              {/* À implémenter: composant MatchedMissions */}
              <p>Composant MatchedMissions à intégrer ici</p>
              <p className="text-sm mt-2">Affiche les missions proposées avec boutons ❤️ Intéressé et ❌ Refuser</p>
            </div>
          </div>
        )}

        {/* Vue Missions Intéressées */}
        {view === 'interested' && (
          <div>
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setView('home')}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Retour
              </button>
              <h2 className="text-3xl font-bold text-gray-900">Missions Intéressées</h2>
              <button
                onClick={loadCounts}
                className="ml-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                🔄 Rafraîchir
              </button>
            </div>
            <div className="text-gray-600">
              {/* À implémenter: composant MyApplications */}
              <p>Composant MyApplications à intégrer ici</p>
              <p className="text-sm mt-2">Affiche les candidatures (status = interested) avec état et bouton conversation si établissement accepte</p>
            </div>
          </div>
        )}

        {/* Vue Missions Validées */}
        {view === 'confirmed' && (
          <div>
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setView('home')}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Retour
              </button>
              <h2 className="text-3xl font-bold text-gray-900">Mes Missions Validées</h2>
              <button
                onClick={loadCounts}
                className="ml-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                🔄 Rafraîchir
              </button>
            </div>
            <div className="text-gray-600">
              {/* À implémenter: composant MyAgenda */}
              <p>Composant MyAgenda à intégrer ici</p>
              <p className="text-sm mt-2">Affiche l'agenda avec les embauches confirmées (status = confirmed)</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                  <p className="text-lg text-gray-900">{profile.first_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                  <p className="text-lg text-gray-900">{profile.last_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                  <p className="text-lg text-gray-900">{profile.phone || 'Non renseigné'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <p className="text-lg text-gray-900">{profile.email || 'Non renseigné'}</p>
                </div>

                <div className="pt-6 border-t">
                  <button
                    onClick={() => navigate('/talent/edit-profile')}
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
