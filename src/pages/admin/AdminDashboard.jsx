import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [activeTab, setActiveTab] = useState('stats')
  const [stats, setStats] = useState({
    totalTalents: 0,
    totalEstablishments: 0,
    totalMissions: 0,
    totalApplications: 0,
    activeMissions: 0,
    acceptedApplications: 0,
    blockedUsers: 0,
    premiumActive: 0,
    freemium: 0,
    expiredPremium: 0
  })
  const [talents, setTalents] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [missions, setMissions] = useState([])
  const [applications, setApplications] = useState([])
  const [admins, setAdmins] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  
  // Formulaire nouvel admin
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setCurrentUserEmail(user.email)

      const { data: adminData, error } = await supabase
        .from('admins')
        .select('id')
        .eq('email', user.email)
        .single()

      if (error || !adminData) {
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
      await loadAdmins()
    } catch (err) {
      console.error('Erreur vérification admin:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id, email, name, created_at, created_by, is_activated, activation_token')
        .order('created_at', { ascending: true })

      if (error) throw error
      setAdmins(data || [])
    } catch (err) {
      console.error('Erreur chargement admins:', err)
    }
  }

  const loadStats = async () => {
    try {
      const { count: talentsCount } = await supabase.from('talents').select('*', { count: 'exact', head: true })
      const { count: establishmentsCount } = await supabase.from('establishments').select('*', { count: 'exact', head: true })
      const { count: missionsCount } = await supabase.from('missions').select('*', { count: 'exact', head: true })
      const { count: applicationsCount } = await supabase.from('applications').select('*', { count: 'exact', head: true })
      const { count: activeMissionsCount } = await supabase.from('missions').select('*', { count: 'exact', head: true }).eq('status', 'open')
      const { count: acceptedApplicationsCount } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'accepted')
      const { count: blockedTalents } = await supabase.from('talents').select('*', { count: 'exact', head: true }).eq('is_blocked', true)
      const { count: blockedEstablishments } = await supabase.from('establishments').select('*', { count: 'exact', head: true }).eq('is_blocked', true)
      const { count: premiumActive } = await supabase.from('establishments').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active')
      const { count: expiredPremium } = await supabase.from('establishments').select('*', { count: 'exact', head: true }).eq('subscription_status', 'expired')

      setStats({
        totalTalents: talentsCount || 0,
        totalEstablishments: establishmentsCount || 0,
        totalMissions: missionsCount || 0,
        totalApplications: applicationsCount || 0,
        activeMissions: activeMissionsCount || 0,
        acceptedApplications: acceptedApplicationsCount || 0,
        blockedUsers: (blockedTalents || 0) + (blockedEstablishments || 0),
        premiumActive: premiumActive || 0,
        freemium: (establishmentsCount || 0) - (premiumActive || 0),
        expiredPremium: expiredPremium || 0
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
        .select('id, user_id, name, phone, address, city, is_blocked, created_at, subscription_status, subscription_ends_at, stripe_customer_id, stripe_subscription_id, missions_used, trial_ends_at, group_id, is_group_owner')
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
          id, position, location_fuzzy, status, start_date, created_at,
          establishment:establishment_id (id, name)
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
        .from('applications')
        .select(`
          id, status, created_at,
          talent:talent_id (id, first_name, last_name),
          mission:mission_id (id, position, establishment:establishment_id (name))
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (err) {
      console.error('Erreur chargement candidatures:', err)
    }
  }

  // =====================
  // FONCTIONS BLOCAGE
  // =====================

  const toggleBlockTalent = async (talentId, currentStatus) => {
    setActionLoading(talentId)
    try {
      const { error } = await supabase.from('talents').update({ is_blocked: !currentStatus }).eq('id', talentId)
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
      const { error } = await supabase.from('establishments').update({ is_blocked: !currentStatus }).eq('id', establishmentId)
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

  // =====================
  // FONCTIONS SUPPRESSION
  // =====================

  const deleteMission = async (missionId, missionPosition) => {
    if (!confirm(`⚠️ Supprimer la mission "${missionPosition}" et toutes ses candidatures ?`)) return

    setActionLoading(missionId)
    try {
      // Supprimer d'abord les candidatures liées
      await supabase.from('applications').delete().eq('mission_id', missionId)
      
      // Puis supprimer la mission
      const { error } = await supabase.from('missions').delete().eq('id', missionId)
      if (error) throw error
      
      await loadMissions()
      await loadApplications()
      await loadStats()
      alert('✅ Mission supprimée avec succès')
    } catch (err) {
      console.error('Erreur suppression mission:', err)
      alert('Erreur lors de la suppression: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteTalent = async (talentId, userId, talentName) => {
    if (!confirm(`⚠️ SUPPRIMER DÉFINITIVEMENT le compte de ${talentName} ?\n\nCette action supprimera:\n• Le profil talent\n• Toutes ses candidatures\n• Son compte utilisateur\n\nCette action est IRRÉVERSIBLE.`)) return

    setActionLoading(talentId)
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId, userType: 'talent' }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)
      
      await loadTalents()
      await loadApplications()
      await loadStats()
      alert('✅ Compte talent supprimé avec succès')
    } catch (err) {
      console.error('Erreur suppression talent:', err)
      alert('Erreur lors de la suppression: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteEstablishment = async (establishmentId, userId, establishmentName) => {
    if (!confirm(`⚠️ SUPPRIMER DÉFINITIVEMENT le compte de ${establishmentName} ?\n\nCette action supprimera:\n• Le profil établissement\n• Toutes ses missions\n• Toutes les candidatures associées\n• Son compte utilisateur\n\nCette action est IRRÉVERSIBLE.`)) return

    setActionLoading(establishmentId)
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId, userType: 'establishment' }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)
      
      await loadEstablishments()
      await loadMissions()
      await loadApplications()
      await loadStats()
      alert('✅ Compte établissement supprimé avec succès')
    } catch (err) {
      console.error('Erreur suppression établissement:', err)
      alert('Erreur lors de la suppression: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  // =====================
  // FONCTIONS ADMIN
  // =====================

  const addAdmin = async (e) => {
    e.preventDefault()
    if (!newAdminEmail.trim()) return

    setAddingAdmin(true)
    try {
      const { data: newAdmin, error } = await supabase
        .from('admins')
        .insert({
          email: newAdminEmail.trim().toLowerCase(),
          name: newAdminName.trim() || null,
          created_by: currentUserEmail,
          is_activated: false
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          alert('Cet email est déjà administrateur')
        } else {
          throw error
        }
        return
      }

      const { error: inviteError } = await supabase.functions.invoke('send-admin-invite', {
        body: { email: newAdmin.email, name: newAdmin.name, activationToken: newAdmin.activation_token }
      })

      if (inviteError) {
        alert('Admin créé mais erreur lors de l\'envoi de l\'invitation.')
      } else {
        alert(`Invitation envoyée à ${newAdmin.email} !`)
      }

      setNewAdminEmail('')
      setNewAdminName('')
      await loadAdmins()
    } catch (err) {
      console.error('Erreur ajout admin:', err)
      alert('Erreur lors de l\'ajout')
    } finally {
      setAddingAdmin(false)
    }
  }

  const resendInvite = async (admin) => {
    if (!confirm(`Renvoyer l'invitation à ${admin.email} ?`)) return
    
    setActionLoading(admin.id)
    try {
      const { data, error: updateError } = await supabase
        .from('admins')
        .update({ activation_token: crypto.randomUUID() })
        .eq('id', admin.id)
        .select()
        .single()

      if (updateError) throw updateError

      const { error: inviteError } = await supabase.functions.invoke('send-admin-invite', {
        body: { email: data.email, name: data.name, activationToken: data.activation_token }
      })

      if (inviteError) throw inviteError
      alert(`Invitation renvoyée à ${admin.email} !`)
    } catch (err) {
      console.error('Erreur renvoi invitation:', err)
      alert('Erreur lors du renvoi')
    } finally {
      setActionLoading(null)
    }
  }

  const removeAdmin = async (adminId, adminEmail) => {
    if (adminEmail === currentUserEmail) {
      alert('Vous ne pouvez pas vous supprimer vous-même')
      return
    }

    if (!confirm(`Supprimer ${adminEmail} des administrateurs ?`)) return

    setActionLoading(adminId)
    try {
      const { error } = await supabase.from('admins').delete().eq('id', adminId)
      if (error) throw error
      await loadAdmins()
    } catch (err) {
      console.error('Erreur suppression admin:', err)
      alert('Erreur lors de la suppression')
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin')
  }

  // =====================
  // FONCTIONS ABONNEMENTS
  // =====================

  const togglePremium = async (establishmentId, currentStatus) => {
    const action = currentStatus === 'active' ? 'désactiver' : 'activer'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} le premium pour cet établissement ?`)) return

    setActionLoading(establishmentId)
    try {
      if (currentStatus === 'active') {
        // Désactiver
        const { error } = await supabase
          .from('establishments')
          .update({ 
            subscription_status: 'expired',
            subscription_ends_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', establishmentId)
        if (error) throw error
      } else {
        // Activer manuellement (30 jours)
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)
        const { error } = await supabase
          .from('establishments')
          .update({ 
            subscription_status: 'active',
            subscription_ends_at: endDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', establishmentId)
        if (error) throw error
      }
      await loadEstablishments()
      await loadStats()
    } catch (err) {
      console.error('Erreur toggle premium:', err)
      alert('Erreur: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const resetMissionsUsed = async (establishmentId) => {
    if (!confirm('Remettre le compteur de missions à 0 ?')) return

    setActionLoading(establishmentId)
    try {
      const { error } = await supabase
        .from('establishments')
        .update({ missions_used: 0, updated_at: new Date().toISOString() })
        .eq('id', establishmentId)
      if (error) throw error
      await loadEstablishments()
    } catch (err) {
      console.error('Erreur reset missions:', err)
      alert('Erreur: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  // =====================
  // UTILITAIRES
  // =====================

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'En attente', bg: 'bg-yellow-100', text: 'text-yellow-700' },
      interested: { label: 'Intéressé', bg: 'bg-blue-100', text: 'text-blue-700' },
      accepted: { label: 'Acceptée', bg: 'bg-green-100', text: 'text-green-700' },
      rejected: { label: 'Refusée', bg: 'bg-red-100', text: 'text-red-700' },
      confirmed: { label: 'Confirmée', bg: 'bg-purple-100', text: 'text-purple-700' },
      active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-700' },
      open: { label: 'Ouverte', bg: 'bg-green-100', text: 'text-green-700' },
      completed: { label: 'Terminée', bg: 'bg-gray-100', text: 'text-gray-700' },
      cancelled: { label: 'Annulée', bg: 'bg-red-100', text: 'text-red-700' },
      closed: { label: 'Fermée', bg: 'bg-gray-100', text: 'text-gray-700' }
    }
    const config = statusConfig[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-700' }
    return <span className={`inline-flex px-2 py-1 text-xs font-medium ${config.bg} ${config.text} rounded-full`}>{config.label}</span>
  }

  // Filtres
  const filteredTalents = talents.filter(t => {
    const search = searchTerm.toLowerCase()
    return t.first_name?.toLowerCase().includes(search) || t.last_name?.toLowerCase().includes(search) || t.city?.toLowerCase().includes(search) || t.phone?.includes(search)
  })

  const filteredEstablishments = establishments.filter(e => {
    const search = searchTerm.toLowerCase()
    return e.name?.toLowerCase().includes(search) || e.address?.toLowerCase().includes(search) || e.phone?.includes(search)
  })

  const filteredMissions = missions.filter(m => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = m.position?.toLowerCase().includes(search) || m.establishment?.name?.toLowerCase().includes(search) || m.location_fuzzy?.toLowerCase().includes(search)
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const filteredApplications = applications.filter(a => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = a.talent?.first_name?.toLowerCase().includes(search) || a.talent?.last_name?.toLowerCase().includes(search) || a.mission?.establishment?.name?.toLowerCase().includes(search) || a.mission?.position?.toLowerCase().includes(search)
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // =====================
  // RENDER
  // =====================

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
          <button onClick={() => navigate('/admin')} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">
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
              <p className="text-sm text-gray-500">{currentUserEmail}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 text-sm">Déconnexion</button>
          </div>
        </div>
      </nav>

      {/* Onglets */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 md:gap-4">
            {[
              { id: 'stats', label: '📊 Stats', count: null },
              { id: 'talents', label: '👤 Talents', count: stats.totalTalents },
              { id: 'establishments', label: '🏢 Étab.', count: stats.totalEstablishments },
              { id: 'missions', label: '📋 Missions', count: stats.totalMissions },
              { id: 'applications', label: '✉️ Candidatures', count: stats.totalApplications },
              { id: 'admins', label: '👑 Admins', count: admins.length },
              { id: 'subscriptions', label: '💳 Abonnements', count: stats.premiumActive }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); setFilterStatus('all'); }}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label} {tab.count !== null && `(${tab.count})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* ==================== TAB STATS ==================== */}
        {activeTab === 'stats' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vue d'ensemble</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { value: stats.totalTalents, label: 'Talents', color: 'text-primary-600' },
                { value: stats.totalEstablishments, label: 'Établissements', color: 'text-primary-600' },
                { value: stats.totalMissions, label: 'Missions totales', color: 'text-green-600' },
                { value: stats.activeMissions, label: 'Missions ouvertes', color: 'text-green-600' },
                { value: stats.totalApplications, label: 'Candidatures', color: 'text-amber-600' },
                { value: stats.acceptedApplications, label: 'Acceptées', color: 'text-blue-600' },
                { value: stats.blockedUsers, label: 'Bloqués', color: 'text-red-600' },
                { value: stats.premiumActive, label: 'Premium actifs', color: 'text-purple-600' },
                { value: stats.freemium, label: 'Freemium', color: 'text-gray-600' }
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

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
                  {talents.length === 0 && <p className="text-gray-500 text-sm">Aucun talent inscrit</p>}
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
                  {establishments.length === 0 && <p className="text-gray-500 text-sm">Aucun établissement inscrit</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB TALENTS ==================== */}
        {activeTab === 'talents' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Liste des talents</h2>
              <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 max-w-xs" />
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
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTalents.map(talent => (
                      <tr key={talent.id} className={talent.is_blocked ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900">{talent.first_name} {talent.last_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{talent.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{talent.city || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{talent.position_types?.slice(0, 2).join(', ') || '-'}{talent.position_types?.length > 2 && '...'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(talent.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${talent.is_blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {talent.is_blocked ? 'Bloqué' : 'Actif'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 items-center">
                            <button onClick={() => toggleBlockTalent(talent.id, talent.is_blocked)} disabled={actionLoading === talent.id}
                              className={`text-sm font-medium disabled:opacity-50 ${talent.is_blocked ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'}`}>
                              {actionLoading === talent.id ? '...' : talent.is_blocked ? 'Débloquer' : 'Bloquer'}
                            </button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => deleteTalent(talent.id, talent.user_id, `${talent.first_name} ${talent.last_name}`)} disabled={actionLoading === talent.id}
                              className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50">
                              {actionLoading === talent.id ? '...' : '🗑️'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTalents.length === 0 && <p className="text-center text-gray-500 py-8">Aucun talent trouvé</p>}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB ESTABLISHMENTS ==================== */}
        {activeTab === 'establishments' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Liste des établissements</h2>
              <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 max-w-xs" />
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
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEstablishments.map(est => (
                      <tr key={est.id} className={est.is_blocked ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900">{est.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{est.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{est.address || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(est.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${est.is_blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {est.is_blocked ? 'Bloqué' : 'Actif'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 items-center">
                            <button onClick={() => toggleBlockEstablishment(est.id, est.is_blocked)} disabled={actionLoading === est.id}
                              className={`text-sm font-medium disabled:opacity-50 ${est.is_blocked ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'}`}>
                              {actionLoading === est.id ? '...' : est.is_blocked ? 'Débloquer' : 'Bloquer'}
                            </button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => deleteEstablishment(est.id, est.user_id, est.name)} disabled={actionLoading === est.id}
                              className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50">
                              {actionLoading === est.id ? '...' : '🗑️'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredEstablishments.length === 0 && <p className="text-center text-gray-500 py-8">Aucun établissement trouvé</p>}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB MISSIONS ==================== */}
        {activeTab === 'missions' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Liste des missions</h2>
              <div className="flex gap-2">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
                  <option value="all">Tous statuts</option>
                  <option value="open">Ouvertes</option>
                  <option value="active">Actives</option>
                  <option value="completed">Terminées</option>
                  <option value="cancelled">Annulées</option>
                  <option value="closed">Fermées</option>
                </select>
                <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
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
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date mission</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Créée le</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMissions.map(mission => (
                      <tr key={mission.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{mission.establishment?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{mission.position}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{mission.location_fuzzy || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(mission.start_date)}</td>
                        <td className="px-4 py-3">{getStatusBadge(mission.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(mission.created_at)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteMission(mission.id, mission.position)} disabled={actionLoading === mission.id}
                            className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50">
                            {actionLoading === mission.id ? '...' : '🗑️ Supprimer'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredMissions.length === 0 && <p className="text-center text-gray-500 py-8">Aucune mission trouvée</p>}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB APPLICATIONS ==================== */}
        {activeTab === 'applications' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Liste des candidatures</h2>
              <div className="flex gap-2">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
                  <option value="all">Tous statuts</option>
                  <option value="interested">Intéressé</option>
                  <option value="accepted">Acceptées</option>
                  <option value="rejected">Refusées</option>
                  <option value="confirmed">Confirmées</option>
                </select>
                <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
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
                    {filteredApplications.map(app => (
                      <tr key={app.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{app.talent?.first_name} {app.talent?.last_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{app.mission?.establishment?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{app.mission?.position || '-'}</td>
                        <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(app.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredApplications.length === 0 && <p className="text-center text-gray-500 py-8">Aucune candidature trouvée</p>}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB ADMINS ==================== */}
        {activeTab === 'admins' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gestion des administrateurs</h2>
            
            {/* Formulaire ajout admin */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Ajouter un administrateur</h3>
              <form onSubmit={addAdmin} className="flex flex-col md:flex-row gap-3">
                <input type="email" placeholder="Email *" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} required
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                <input type="text" placeholder="Nom (optionnel)" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                <button type="submit" disabled={addingAdmin}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 whitespace-nowrap">
                  {addingAdmin ? 'Ajout...' : '+ Ajouter'}
                </button>
              </form>
            </div>

            {/* Liste des admins */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ajouté le</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ajouté par</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {admins.map(admin => (
                      <tr key={admin.id} className={admin.email === currentUserEmail ? 'bg-primary-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {admin.email}
                          {admin.email === currentUserEmail && <span className="ml-2 text-xs text-primary-600">(vous)</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{admin.name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${admin.is_activated ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {admin.is_activated ? 'Activé' : 'En attente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(admin.created_at)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{admin.created_by || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {!admin.is_activated && (
                              <button onClick={() => resendInvite(admin)} disabled={actionLoading === admin.id}
                                className="text-sm font-medium text-primary-600 hover:text-primary-800 disabled:opacity-50">
                                {actionLoading === admin.id ? '...' : 'Renvoyer'}
                              </button>
                            )}
                            {admin.email !== currentUserEmail && (
                              <button onClick={() => removeAdmin(admin.id, admin.email)} disabled={actionLoading === admin.id}
                                className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50">
                                {actionLoading === admin.id ? '...' : 'Supprimer'}
                              </button>
                            )}
                            {admin.email === currentUserEmail && <span className="text-sm text-gray-400">-</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {admins.length === 0 && <p className="text-center text-gray-500 py-8">Aucun administrateur</p>}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB SUBSCRIPTIONS ==================== */}
        {activeTab === 'subscriptions' && (
          <div>
            {/* Stats abonnements */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { value: stats.premiumActive, label: 'Premium actifs', color: 'text-purple-600', bg: 'bg-purple-50' },
                { value: stats.freemium, label: 'Freemium', color: 'text-gray-600', bg: 'bg-gray-50' },
                { value: stats.expiredPremium, label: 'Expirés', color: 'text-red-600', bg: 'bg-red-50' },
                { value: `${(stats.premiumActive * 59.90).toFixed(0)}€`, label: 'Revenu mensuel est.', color: 'text-green-600', bg: 'bg-green-50' }
              ].map((stat, i) => (
                <div key={i} className={`${stat.bg} rounded-xl p-4 border border-gray-200`}>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Abonnements établissements</h2>
              <div className="flex gap-2">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
                  <option value="all">Tous</option>
                  <option value="active">Premium actif</option>
                  <option value="freemium">Freemium</option>
                  <option value="expired">Expiré</option>
                </select>
                <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Établissement</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ville</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Abonnement</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Missions</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fin abo.</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stripe</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Groupe</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {establishments
                      .filter(est => {
                        const search = searchTerm.toLowerCase()
                        const matchesSearch = est.name?.toLowerCase().includes(search) || est.city?.toLowerCase().includes(search)
                        if (filterStatus === 'all') return matchesSearch
                        if (filterStatus === 'active') return matchesSearch && est.subscription_status === 'active'
                        if (filterStatus === 'freemium') return matchesSearch && (!est.subscription_status || est.subscription_status === 'free' || est.subscription_status === 'trialing')
                        if (filterStatus === 'expired') return matchesSearch && est.subscription_status === 'expired'
                        return matchesSearch
                      })
                      .map(est => {
                        const isPremium = est.subscription_status === 'active'
                        const isExpired = est.subscription_status === 'expired'
                        const endDate = est.subscription_ends_at ? new Date(est.subscription_ends_at) : null
                        const isExpiringSoon = endDate && isPremium && (endDate - new Date()) < 7 * 24 * 60 * 60 * 1000

                        return (
                          <tr key={est.id} className={isPremium ? 'bg-purple-50/50' : isExpired ? 'bg-red-50/50' : ''}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{est.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{est.city || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                isPremium ? 'bg-purple-100 text-purple-700' :
                                isExpired ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {isPremium ? '⭐ Premium' : isExpired ? 'Expiré' : 'Freemium'}
                              </span>
                              {isExpiringSoon && (
                                <span className="ml-1 text-xs text-orange-600">⚠️ Expire bientôt</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`font-medium ${(est.missions_used || 0) >= 3 && !isPremium ? 'text-red-600' : 'text-gray-900'}`}>
                                {est.missions_used || 0}{!isPremium && '/3'}
                              </span>
                              {isPremium && <span className="text-xs text-purple-600 ml-1">∞</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {endDate ? formatDate(est.subscription_ends_at) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {est.stripe_customer_id ? (
                                <a
                                  href={`https://dashboard.stripe.com/customers/${est.stripe_customer_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                                >
                                  Voir Stripe ↗
                                </a>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {est.group_id ? (
                                <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                  {est.is_group_owner ? '👑 Propriétaire' : 'Membre'}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2 items-center">
                                <button
                                  onClick={() => togglePremium(est.id, est.subscription_status)}
                                  disabled={actionLoading === est.id}
                                  className={`text-xs font-medium disabled:opacity-50 ${
                                    isPremium ? 'text-red-600 hover:text-red-800' : 'text-purple-600 hover:text-purple-800'
                                  }`}
                                >
                                  {actionLoading === est.id ? '...' : isPremium ? 'Désactiver' : '⭐ Activer'}
                                </button>
                                {!isPremium && (est.missions_used || 0) > 0 && (
                                  <>
                                    <span className="text-gray-300">|</span>
                                    <button
                                      onClick={() => resetMissionsUsed(est.id)}
                                      disabled={actionLoading === est.id}
                                      className="text-xs font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
                                    >
                                      {actionLoading === est.id ? '...' : '🔄 Reset missions'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
                {establishments.length === 0 && <p className="text-center text-gray-500 py-8">Aucun établissement</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
