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

        // Récupérer toutes les candidatures
        const { data: applicationsData, error: appError } = await supabase
          .from('applications')
          .select('*, missions(title, establishments(name)), talents(name)')
          .in('mission_id', missionsData.map(m => m.id))
          .order('created_at', { ascending: false })

        if (appError) throw appError

        setApplications(applicationsData || [])
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
                <p className="text-3xl font-bold text-orange-600 mt-2">{applications.length}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">Abonnements Premium</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {establishments.filter(e => e.subscription_status === 'active').length}
                </p>
              </div>
            </div>

            {/* Résumé des restaurants */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Résumé des restaurants</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-semibold text-gray-700">Nom</th>
                      <th className="text-left py-2 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-2 font-semibold text-gray-700">Missions</th>
                      <th className="text-left py-2 font-semibold text-gray-700">Candidatures</th>
                      <th className="text-left py-2 font-semibold text-gray-700">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {establishments.map((estab) => {
                      const estabMissions = missions.filter(m => m.establishment_id === estab.id)
                      const estabApps = applications.filter(
                        a => estabMissions.some(m => m.id === a.mission_id)
                      )

                      return (
                        <tr key={estab.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 font-semibold text-gray-900">{estab.name}</td>
                          <td className="py-3 text-gray-600">{estab.type}</td>
                          <td className="py-3 text-gray-600">{estabMissions.length}</td>
                          <td className="py-3 text-gray-600">{estabApps.length}</td>
                          <td className="py-3">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              estab.subscription_status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {estab.subscription_status === 'active' ? '✅ Premium' : '⚡ Freemium'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
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
                          {app.talents?.name} → {app.missions?.title}
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
                    {estab.subscription_status === 'active' ? '✅ Premium' : '⚡ Freemium'}
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

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Tarification</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Premier établissement</span>
                    <span className="font-semibold">59,90 €/mois</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Supplémentaires ({establishments.length - 1})</span>
                    <span className="font-semibold">{(establishments.length - 1) * 39.90} €/mois</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary-600">
                      {(59.90 + (establishments.length - 1) * 39.90).toFixed(2)} €/mois
                    </span>
                  </div>
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
                    <span className="text-gray-600">Premium</span>
                    <span className="font-semibold">
                      {establishments.filter(e => e.subscription_status === 'active').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Freemium</span>
                    <span className="font-semibold">
                      {establishments.filter(e => e.subscription_status !== 'active').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
              <p className="text-blue-900">
                <strong>ℹ️ Note:</strong> La facturation des groupes est gérée mensuellement au niveau du groupe. Chaque restaurant peut gérer sa souscription indépendamment dans son dashboard.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
