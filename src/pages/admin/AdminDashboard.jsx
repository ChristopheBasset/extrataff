import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// Liste des emails admin autorisés
const ADMIN_EMAILS = [
  'christophe@comunecom.fr'
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('stats')
  const [stats, setStats] = useState({
    totalTalents: 0,
    totalEstablishments: 0,
    totalMissions: 0,
    totalApplications: 0,
    activeMissions: 0,
    acceptedApplications: 0,
    blockedUsers: 0
  })
  const [talents, setTalents] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [missions, setMissions] = useState([])
  const [applications, setApplications] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setIsAdmin(true)
      await loadStats()
      await loadTalents()
      await loadEstablishments()
      await loadMissions()
      await loadApplications()
    } catch (err) {
      console.error('Erreur vérification admin:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { count: talentsCount } = await supabase
        .from('talents')
        .select('*', { count: 'exact', head: true })

      const { count: establishmentsCount } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true })

      const { count: missionsCount } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })

      const { count: applicationsCount } = await supabase
        .from('candidatures')
        .select('*', { count: 'exact', head: true })

      const { count: activeMissionsCount } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      const { count: acceptedApplicationsCount } = await supabase
        .from('candidatures')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')

      const { count: blockedTalents } = await supabase
        .from('talents')
        .select('*', { count: 'exact', head: true })
        .eq('is_blocked', true)

      const { count: blockedEstablishments } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true })
        .eq('is_blocked', true)

      setStats({
        totalTalents: talentsCount || 0,
        totalEstablishments: establishmentsCount || 0,
        totalMissions: missionsCount || 0,
        totalApplications: applicationsCount || 0,
        activeMissions: activeMissionsCount || 0,
        acceptedApplications: acceptedApplicationsCount || 0,
        blockedUsers: (blockedTalents || 0) + (blockedEstablishments || 0)
      })
    } catch (err) {
      console.error('Erreur chargement stats:', err)
    }
  }

  const loadTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('talents')
        .select('id, user_id, first_name, last_name, phone, city, position_types, is_blocked, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTalents(data || [])
    } catch (err) {
      console.error('Erreur chargement talents:', err)
    }
  }

  const loadEstablishments = async () => {
    try {
      const { data, error } = await supabase
        .from('establishments')
        .select('id, user_id, name, phone, address, is_blocked, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEstablishments(data || [])
    } catch (err) {
      console.error('Erreur chargement établissements:', err)
    }
  }

  const loadMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select(`
          id,
          position,
          location_fuzzy,
          location_exact,
          status,
          created_at,
          establishment:establishment_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMissions(data || [])
    } catch (err) {
      console.error('Erreur chargement missions:', err)
    }
  }

  const loadApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('candidatures')
        .select(`
          id,
          status,
          created_at,
          talent:talent_id (
            id,
            first_name,
            last_name
          ),
          mission:mission_id (
            id,
            position,
            establishment:establishment_id (
              name
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (err) {
      console.error('Erreur chargement candidatures:', err)
    }
  }

  const toggleBlockTalent = async (talentId, currentStatus) => {
    setActionLoading(talentId)
    try {
      const { error } = await supabase
        .from('talents')
        .update({ is_blocked: !currentStatus })
        .eq('id', talentId)

      if (error) throw error
      
      await loadTalents()
      await loadStats()
    } catch (err) {
      console.error('Erreur blocage talent:', err)
      alert('Erreur lors du blocage')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleBlockEstablishment = async (establishmentId, currentStatus) => {
    setActionLoading(establishmentId)
    try {
      const { error } = await supabase
        .from('establishments')
        .update({ is_blocked: !currentStatus })
        .eq('id', establishmentId)

      if (error) throw error
      
      await loadEstablishments()
      await loadStats()
    } catch (err) {
      console.error('Erreur blocage établissement:', err)
      alert('Erreur lors du blocage')
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin')
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'En attente', bg: 'bg-yellow-100', text: 'text-yellow-700' },
      accepted: { label: 'Acceptée', bg: 'bg-green-100', text: 'text-green-700' },
      rejected: { label: 'Refusée', bg: 'bg-red-100', text: 'text-red-700' },
      confirmed: { label: 'Confirmée', bg: 'bg-blue-100', text: 'text-blue-700' },
      active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-700' },
      completed: { label: 'Terminée', bg: 'bg-gray-100', text: 'text-gray-700' },
      cancelled: { label: 'Annulée', bg: 'bg-red-100', text: 'text-red-700' }
    }
    const config = statusConfig[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-700' }
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium ${config.bg} ${config.text} rounded-full`}>
        {config.label}
      </span>
    )
  }

  // Filtrer les talents
  const filteredTalents = talents.filter(t => {
    const search = searchTerm.toLowerCase()
    return (
      t.first_name?.toLowerCase().includes(search) ||
      t.last_name?.toLowerCase().includes(search) ||
      t.city?.toLowerCase().includes(search) ||
      t.phone?.includes(search)
    )
  })

  // Filtrer les établissements
  const filteredEstablishments = establishments.filter(e => {
    const search = searchTerm.toLowerCase()
    return (
      e.name?.toLowerCase().includes(search) ||
      e.address?.toLowerCase().includes(search) ||
      e.phone?.includes(search)
    )
  })

  // Filtrer les missions
  const filteredMissions = missions.filter(m => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = (
      m.position?.toLowerCase().includes(search) ||
      m.establishment?.name?.toLowerCase().includes(search) ||
      m.location_fuzzy?.toLowerCase().includes(search)
    )
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Filtrer les candidatures
  const filteredApplications = applications.filter(a => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = (
      a.talent?.first_name?.toLowerCase().includes(search) ||
      a.talent?.last_name?.toLowerCase().includes(search) ||
      a.mission?.establishment?.name?.toLowerCase().includes(search) ||
      a.mission?.position?.toLowerCase().includes(search)
    )
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des droits...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600 mb-6">Vous n'avez pas les droits d'administration.</p>
          <button
            onClick={() => navigate('/admin')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">🛠️ Admin ExtraTaff</h1>
              <p className="text-sm text-gray-500">Tableau de bord</p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      {/* Onglets */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 md:gap-4">
            <button
              onClick={() => { setActiveTab('stats'); setSearchTerm(''); setFilterStatus('all'); }}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'stats'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Stats
            </button>
            <button
              onClick={() => { setActiveTab('talents'); setSearchTerm(''); setFilterStatus('all'); }}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'talents'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              👤 Talents ({stats.totalTalents})
            </button>
            <button
              onClick={() => { setActiveTab('establishments'); setSearchTerm(''); setFilterStatus('all'); }}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'establishments'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🏢 Étab. ({stats.totalEstablishments})
            </button>
            <button
              onClick={() => { setActiveTab('missions'); setSearchTerm(''); setFilterStatus('all'); }}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'missions'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 Missions ({stats.totalMissions})
            </button>
            <button
              onClick={() => { setActiveTab('applications'); setSearchTerm(''); setFilterStatus('all'); }}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'applications'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ✉️ Candidatures ({stats.totalApplications})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab Stats */}
        {activeTab === 'stats' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vue d'ensemble</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-3xl font-bold text-primary-600">{stats.totalTalents}</p>
                <p className="text-sm text-gray-500">Talents</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-3xl font-bold text-primary-600">{stats.totalEstablishments}</p>
                <p className="text-sm text-gray-500">Établissements</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-3xl font-bold text-green-600">{stats.totalMissions}</p>
                <p className="text-sm text-gray-500">Missions totales</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-3xl font-bold text-green-600">{stats.activeMissions}</p>
                <p className="text-sm text-gray-500">Missions actives</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-3xl font-bold text-amber-600">{stats.totalApplications}</p>
                <p className="text-sm text-gray-500">Candidatures</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-3xl font-bold text-blue-600">{stats.acceptedApplications}</p>
                <p className="text-sm text-gray-500">Acceptées</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-3xl font-bold text-red-600">{stats.blockedUsers}</p>
                <p className="text-sm text-gray-500">Bloqués</p>
              </div>
            </div>

            {/* Dernières inscriptions */}
            <div className="mt-8 grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Derniers talents inscrits</h3>
                <div className="space-y-2">
                  {talents.slice(0, 5).map(t => (
                    <div key={t.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-900">{t.first_name} {t.last_name}</span>
                      <span className="text-gray-500">{formatDate(t.created_at)}</span>
                    </div>
                  ))}
                  {talents.length === 0 && (
                    <p className="text-gray-500 text-sm">Aucun talent inscrit</p>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Derniers établissements inscrits</h3>
                <div className="space-y-2">
                  {establishments.slice(0, 5).map(e => (
                    <div key={e.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-900">{e.name}</span>
                      <span className="text-gray-500">{formatDate(e.created_at)}</span>
                    </div>
                  ))}
                  {establishments.length === 0 && (
                    <p className="text-gray-500 text-sm">Aucun établissement inscrit</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dernières candidatures */}
            <div className="mt-6">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Dernières candidatures</h3>
                <div className="space-y-2">
                  {applications.slice(0, 5).map(a => (
                    <div key={a.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-900">
                        {a.talent?.first_name} {a.talent?.last_name} → {a.mission?.establishment?.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(a.status)}
                        <span className="text-gray-500">{formatDate(a.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {applications.length === 0 && (
                    <p className="text-gray-500 text-sm">Aucune candidature</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Talents */}
        {activeTab === 'talents' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Liste des talents</h2>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 max-w-xs"
              />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ville</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Postes</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Inscrit le</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTalents.map(talent => (
                      <tr key={talent.id} className={talent.is_blocked ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {talent.first_name} {talent.last_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{talent.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{talent.city || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {talent.position_types?.slice(0, 2).join(', ') || '-'}
                          {talent.position_types?.length > 2 && '...'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(talent.created_at)}</td>
                        <td className="px-4 py-3">
                          {talent.is_blocked ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                              Bloqué
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              Actif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleBlockTalent(talent.id, talent.is_blocked)}
                            disabled={actionLoading === talent.id}
                            className={`text-sm font-medium ${
                              talent.is_blocked
                                ? 'text-green-600 hover:text-green-800'
                                : 'text-red-600 hover:text-red-800'
                            } disabled:opacity-50`}
                          >
                            {actionLoading === talent.id ? '...' : talent.is_blocked ? 'Débloquer' : 'Bloquer'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTalents.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Aucun talent trouvé</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Establishments */}
        {activeTab === 'establishments' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Liste des établissements</h2>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 max-w-xs"
              />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Adresse</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Inscrit le</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEstablishments.map(establishment => (
                      <tr key={establishment.id} className={establishment.is_blocked ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900">{establishment.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{establishment.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{establishment.address || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(establishment.created_at)}</td>
                        <td className="px-4 py-3">
                          {establishment.is_blocked ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                              Bloqué
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              Actif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleBlockEstablishment(establishment.id, establishment.is_blocked)}
                            disabled={actionLoading === establishment.id}
                            className={`text-sm font-medium ${
                              establishment.is_blocked
                                ? 'text-green-600 hover:text-green-800'
                                : 'text-red-600 hover:text-red-800'
                            } disabled:opacity-50`}
                          >
                            {actionLoading === establishment.id ? '...' : establishment.is_blocked ? 'Débloquer' : 'Bloquer'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredEstablishments.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Aucun établissement trouvé</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Missions */}
        {activeTab === 'missions' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Liste des missions</h2>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Tous statuts</option>
                  <option value="active">Actives</option>
                  <option value="completed">Terminées</option>
                  <option value="cancelled">Annulées</option>
                </select>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Établissement</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Poste</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Localisation</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Créée le</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMissions.map(mission => (
                      <tr key={mission.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{mission.establishment?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{mission.position}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{mission.location_fuzzy || '-'}</td>
                        <td className="px-4 py-3">{getStatusBadge(mission.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(mission.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredMissions.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Aucune mission trouvée</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Applications */}
        {activeTab === 'applications' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Liste des candidatures</h2>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Tous statuts</option>
                  <option value="pending">En attente</option>
                  <option value="accepted">Acceptées</option>
                  <option value="rejected">Refusées</option>
                  <option value="confirmed">Confirmées</option>
                </select>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Talent</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Établissement</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Poste</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Candidature le</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredApplications.map(application => (
                      <tr key={application.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {application.talent?.first_name} {application.talent?.last_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{application.mission?.establishment?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{application.mission?.position || '-'}</td>
                        <td className="px-4 py-3">{getStatusBadge(application.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(application.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredApplications.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Aucune candidature trouvée</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
