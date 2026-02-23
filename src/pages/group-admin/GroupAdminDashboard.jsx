// GroupAdminDashboard.jsx - Dashboard admin groupe avec vue consolidée
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function GroupAdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [establishments, setEstablishments] = useState([])
  const [missions, setMissions] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [tab, setTab] = useState('overview') // overview, missions, applications, restaurants, billing

  useEffect(() => {
    fetchGroupData()
  }, [])

  const fetchGroupData = async () => {
    try {
      setLoading(true)

      // Récupérer l'user connecté
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        navigate('/login')
        return
      }

      setUser(authUser)

      // Récupérer le groupe
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('owner_id', authUser.id)
        .single()

      if (groupError && groupError.code !== 'PGRST116') throw groupError

      if (!groupData) {
        navigate('/establishment')
        return
      }

      setGroup(groupData)

      // Récupérer tous les établissements du groupe
      const { data: estabData, error: estabError } = await supabase
        .from('establishments')
        .select('*')
        .eq('group_id', groupData.id)
        .order('created_at', { ascending: true })

      if (estabError) throw estabError

      setEstablishments(estabData || [])

      // Récupérer toutes les missions des restaurants du groupe
      if (estabData && estabData.length > 0) {
        const estabIds = estabData.map(e => e.id)

        const { data: missionsData, error: missionsError } = await supabase
          .from('missions')
          .select('*, establishments(name)')
          .in('establishment_id', estabIds)
          .order('created_at', { ascending: false })

        if (missionsError) throw missionsError

        setMissions(missionsData || [])

        // Récupérer toutes les candidatures (sans imbrication complexe)
        const { data: applicationsData, error: appError } = await supabase
          .from('applications')
          .select('*')
          .in('mission_id', missionsData.map(m => m.id))
          .order('created_at', { ascending: false })

        if (appError) throw appError

        // Enrichir les candidatures avec les données des missions
        const enrichedApplications = (applicationsData || []).map(app => {
          const mission = missionsData.find(m => m.id === app.mission_id)
          return {
            ...app,
            missions: mission ? {
              title: mission.title,
              establishments: mission.establishments
            } : null
          }
        })

        setApplications(enrichedApplications)
      }

    } catch (err) {
      console.error('Erreur fetch:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Vous devez être admin d'un groupe</p>
          <button
            onClick={() => navigate('/establishment')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📦 {group.name}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Tableau de bord administrateur
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/group-invite')}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-semibold text-sm"
              >
                ➕ Inviter un restaurant
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-semibold text-gray-700"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {['overview', 'missions', 'applications', 'restaurants', 'billing'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                  tab === t
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {t === 'overview' && '📊 Vue d\'ensemble'}
                {t === 'missions' && '📋 Missions'}
                {t === 'applications' && '📨 Candidatures'}
                {t === 'restaurants' && '🏪 Restaurants'}
                {t === 'billing' && '💳 Facturation'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* VUE D'ENSEMBLE */}
        {tab === 'overview' && (
          <div>
            {/* Bandeau Club ExtraTaff si pas tous abonnés */}
            {establishments.some(e => e.subscription_status !== 'active') && (
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 mb-8 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">🏆 Rejoignez le Club ExtraTaff</h3>
                  <p className="text-white/80 text-sm mt-1">
                    30 jours d'essai gratuit • 1 mission incluse/mois/établissement • Urgentes à prix réduit
                  </p>
                </div>
                <button
                  onClick={() => navigate('/establishment/subscribe')}
                  className="bg-white text-primary-700 px-6 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  Essai gratuit →
                </button>
              </div>
            )}

            <h2 className="text-xl font-bold text-gray-900 mb-6">Statistiques du groupe</h2>

            {/* Cartes de stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Restaurants</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{establishments.length}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Missions publiées</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{missions.length}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Candidatures</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{applications.length}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Club ExtraTaff</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {establishments.filter(e => e.subscription_status === 'active').length}
                </p>
              </div>
            </div>

            {/* Tableau restaurants */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="font-bold text-gray-900">Résumé des restaurants</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Missions</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {establishments.map((estab) => (
                      <tr key={estab.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-900 font-medium">{estab.name}</td>
                        <td className="px-6 py-3 text-gray-600 text-sm">{estab.type}</td>
                        <td className="px-6 py-3 text-gray-600 text-sm">
                          {missions.filter(m => m.establishment_id === estab.id).length}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            estab.subscription_status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {estab.subscription_status === 'active' && estab.subscription_plan === 'club'
                              ? '🏆 Club ExtraTaff'
                              : estab.subscription_status === 'active'
                              ? '✅ Actif'
                              : '⚡ Freemium'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MISSIONS */}
        {tab === 'missions' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Toutes les missions ({missions.length})</h2>

            <div className="space-y-4">
              {missions.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-600">Aucune mission publiée</p>
                </div>
              ) : (
                missions.map((mission) => (
                  <div key={mission.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{mission.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          🏪 {mission.establishments.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">{mission.description}</p>
                      </div>
                      <div className="text-right ml-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          mission.status === 'open'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {mission.status === 'open' ? '✅ Ouverte' : mission.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CANDIDATURES */}
        {tab === 'applications' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Toutes les candidatures ({applications.length})</h2>

            <div className="space-y-4">
              {applications.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-600">Aucune candidature</p>
                </div>
              ) : (
                applications.map((app) => (
                  <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">
                          {app.talent_id} → {app.missions?.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          🏪 {app.missions?.establishments?.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(app.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        app.status === 'accepted'
                          ? 'bg-green-100 text-green-700'
                          : app.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {app.status === 'accepted' && '✅ Acceptée'}
                        {app.status === 'rejected' && '❌ Refusée'}
                        {app.status === 'pending' && '⏳ En attente'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* RESTAURANTS */}
        {tab === 'restaurants' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Restaurants du groupe ({establishments.length})</h2>

            <div className="grid grid-cols-2 gap-6">
              {establishments.map((estab) => (
                <div key={estab.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{estab.name}</h3>
                      <p className="text-sm text-gray-600">{estab.type}</p>
                    </div>
                    {estab.is_group_owner && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                        Principal
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p>📍 {estab.address}</p>
                    <p>📞 {estab.phone}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="text-xs text-gray-600 mb-1">Missions publiées</div>
                    <div className="text-lg font-bold text-gray-900">
                      {missions.filter(m => m.establishment_id === estab.id).length}
                    </div>
                  </div>

                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    estab.subscription_status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {estab.subscription_status === 'active' && estab.subscription_plan === 'club'
                      ? '🏆 Club ExtraTaff'
                      : estab.subscription_status === 'active'
                      ? '✅ Actif'
                      : '⚡ Freemium'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FACTURATION */}
        {tab === 'billing' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Gestion de la facturation</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Tarification Club ExtraTaff</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">1er établissement</span>
                    <span className="font-semibold">24,00 €/mois</span>
                  </div>
                  {establishments.length > 1 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {establishments.length - 1} supplémentaire{establishments.length > 2 ? 's' : ''} <span className="text-green-600">(-10%)</span>
                      </span>
                      <span className="font-semibold">{((establishments.length - 1) * 21.60).toFixed(2)} €/mois</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <div className="text-right">
                      <span className="text-primary-600">
                        {(24.00 + (establishments.length - 1) * 21.60).toFixed(2)} € TTC/mois
                      </span>
                      <span className="block text-xs text-gray-400 font-normal">
                        {((24.00 + (establishments.length - 1) * 21.60) / 1.2).toFixed(2)} € HT
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    🎁 1 mission incluse par établissement et par mois
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Résumé du groupe</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Restaurants</span>
                    <span className="font-semibold">{establishments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">🏆 Club ExtraTaff</span>
                    <span className="font-semibold">
                      {establishments.filter(e => e.subscription_status === 'active' && e.subscription_plan === 'club').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">⚡ Freemium</span>
                    <span className="font-semibold">
                      {establishments.filter(e => e.subscription_status !== 'active').length}
                    </span>
                  </div>
                </div>

                {/* Bouton Gérer / Souscrire */}
                <div className="mt-6">
                  {establishments.some(e => e.subscription_status === 'active') ? (
                    <button
                      onClick={() => navigate('/establishment/subscribe')}
                      className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors"
                    >
                      ⚙️ Gérer les abonnements
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/establishment/subscribe')}
                      className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold text-sm transition-colors"
                    >
                      🏆 Rejoindre le Club — 30 jours gratuits
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
              <p className="text-blue-900">
                <strong>ℹ️ Note :</strong> Chaque restaurant du groupe bénéficie de 30 jours d'essai gratuit lors de son adhésion au Club ExtraTaff. La facturation commence après la période d'essai.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
