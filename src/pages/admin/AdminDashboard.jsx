import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const ITEMS_PER_PAGE = 20

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

  // Sélection multiple
  const [selectedTalents, setSelectedTalents] = useState([])
  const [selectedEstablishments, setSelectedEstablishments] = useState([])
  const [selectedMissions, setSelectedMissions] = useState([])
  const [selectedApplications, setSelectedApplications] = useState([])

  // Tri
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  
  // Formulaire nouvel admin
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)

  // Reset page et sélection quand on change d'onglet
  useEffect(() => {
    setCurrentPage(1)
    setSearchTerm('')
    setFilterStatus('all')
    setSortConfig({ key: 'created_at', direction: 'desc' })
    setSelectedTalents([])
    setSelectedEstablishments([])
    setSelectedMissions([])
    setSelectedApplications([])
  }, [activeTab])

  useEffect(() => {
    checkAdmin()
  }, [])

  // Reset page quand recherche ou filtre change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus])

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
        .eq('is_activated', true)
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
        .select('id, user_id, name, phone, address, city, is_blocked, created_at, subscription_status, subscription_plan, subscription_ends_at, stripe_customer_id, stripe_subscription_id, missions_used, missions_included_used, trial_ends_at, group_id, is_group_owner')
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
          id, position, location_fuzzy, status, start_date, is_urgent, payment_status, created_at,
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
      await supabase.from('applications').delete().eq('mission_id', missionId)
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
    if (!confirm(`⚠️ SUPPRIMER DÉFINITIVEMENT le compte de ${talentName} ?\n\nCette action est IRRÉVERSIBLE.`)) return

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
    if (!confirm(`⚠️ SUPPRIMER DÉFINITIVEMENT le compte de ${establishmentName} ?\n\nCette action est IRRÉVERSIBLE.`)) return

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
  // SUPPRESSIONS EN MASSE
  // =====================

  const deleteSelectedTalents = async () => {
    if (selectedTalents.length === 0) return
    if (!confirm(`⚠️ SUPPRIMER ${selectedTalents.length} talent(s) et tous leurs comptes ?\n\nCette action est IRRÉVERSIBLE.`)) return

    setActionLoading('bulk')
    try {
      for (const talentId of selectedTalents) {
        const talent = talents.find(t => t.id === talentId)
        if (talent) {
          await supabase.functions.invoke('delete-user', { body: { userId: talent.user_id, userType: 'talent' } })
        }
      }
      setSelectedTalents([])
      await loadTalents()
      await loadApplications()
      await loadStats()
      alert(`✅ ${selectedTalents.length} talent(s) supprimé(s)`)
    } catch (err) {
      console.error('Erreur suppression en masse talents:', err)
      alert('Erreur: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteSelectedEstablishments = async () => {
    if (selectedEstablishments.length === 0) return
    if (!confirm(`⚠️ SUPPRIMER ${selectedEstablishments.length} établissement(s) et tous leurs comptes ?\n\nCette action est IRRÉVERSIBLE.`)) return

    setActionLoading('bulk')
    try {
      for (const estId of selectedEstablishments) {
        const est = establishments.find(e => e.id === estId)
        if (est) {
          await supabase.functions.invoke('delete-user', { body: { userId: est.user_id, userType: 'establishment' } })
        }
      }
      setSelectedEstablishments([])
      await loadEstablishments()
      await loadMissions()
      await loadApplications()
      await loadStats()
      alert(`✅ ${selectedEstablishments.length} établissement(s) supprimé(s)`)
    } catch (err) {
      console.error('Erreur suppression en masse:', err)
      alert('Erreur: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteSelectedMissions = async () => {
    if (selectedMissions.length === 0) return
    if (!confirm(`⚠️ SUPPRIMER ${selectedMissions.length} mission(s) et toutes les candidatures associées ?`)) return

    setActionLoading('bulk')
    try {
      for (const missionId of selectedMissions) {
        await supabase.from('applications').delete().eq('mission_id', missionId)
        await supabase.from('missions').delete().eq('id', missionId)
      }
      setSelectedMissions([])
      await loadMissions()
      await loadApplications()
      await loadStats()
      alert(`✅ ${selectedMissions.length} mission(s) supprimée(s)`)
    } catch (err) {
      console.error('Erreur suppression en masse missions:', err)
      alert('Erreur: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteSelectedApplications = async () => {
    if (selectedApplications.length === 0) return
    if (!confirm(`⚠️ SUPPRIMER ${selectedApplications.length} candidature(s) ?`)) return

    setActionLoading('bulk')
    try {
      for (const appId of selectedApplications) {
        await supabase.from('applications').delete().eq('id', appId)
      }
      setSelectedApplications([])
      await loadApplications()
      await loadStats()
      alert(`✅ ${selectedApplications.length} candidature(s) supprimée(s)`)
    } catch (err) {
      console.error('Erreur suppression en masse candidatures:', err)
      alert('Erreur: ' + err.message)
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

  // =====================
  // FONCTIONS ABONNEMENTS
  // =====================

  const togglePremium = async (establishmentId, currentStatus) => {
    const action = currentStatus === 'active' ? 'désactiver' : 'activer'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} le Club pour cet établissement ?`)) return

    setActionLoading(establishmentId)
    try {
      if (currentStatus === 'active') {
        const { error } = await supabase
          .from('establishments')
          .update({ 
            subscription_status: 'expired',
            subscription_plan: null,
            subscription_ends_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', establishmentId)
        if (error) throw error
      } else {
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)
        const { error } = await supabase
          .from('establishments')
          .update({ 
            subscription_status: 'active',
            subscription_plan: 'club',
            missions_included_used: false,
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin')
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

  // =====================
  // TRI
  // =====================

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const sortData = (data, config) => {
    return [...data].sort((a, b) => {
      let aVal = config.key.split('.').reduce((obj, k) => obj?.[k], a)
      let bVal = config.key.split('.').reduce((obj, k) => obj?.[k], b)
      
      if (aVal == null) aVal = ''
      if (bVal == null) bVal = ''
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      
      if (aVal < bVal) return config.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return config.direction === 'asc' ? 1 : -1
      return 0
    })
  }

  const SortHeader = ({ label, sortKey, className = '' }) => (
    <th
      className={`text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none ${className}`}
      onClick={() => handleSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey ? (
          <span className="text-primary-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        ) : (
          <span className="text-gray-300">↕</span>
        )}
      </span>
    </th>
  )

  // =====================
  // PAGINATION
  // =====================

  const paginate = (data) => {
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE)
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const paginated = data.slice(start, start + ITEMS_PER_PAGE)
    return { paginated, totalPages, total: data.length }
  }

  const Pagination = ({ totalPages, total }) => {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">
          {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, total)} sur {total}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ←
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let page
            if (totalPages <= 5) {
              page = i + 1
            } else if (currentPage <= 3) {
              page = i + 1
            } else if (currentPage >= totalPages - 2) {
              page = totalPages - 4 + i
            } else {
              page = currentPage - 2 + i
            }
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm border rounded ${currentPage === page ? 'bg-primary-600 text-white border-primary-600' : 'hover:bg-gray-100'}`}
              >
                {page}
              </button>
            )
          })}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </div>
    )
  }

  // =====================
  // SÉLECTION
  // =====================

  const toggleSelect = (id, selected, setSelected) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = (items, selected, setSelected) => {
    if (selected.length === items.length && items.length > 0) {
      setSelected([])
    } else {
      setSelected(items.map(i => i.id))
    }
  }

  const BulkActions = ({ count, onDelete, label }) => {
    if (count === 0) return null
    return (
      <div className="flex items-center gap-3 mb-3 p-3 bg-primary-50 border border-primary-200 rounded-xl">
        <span className="text-sm font-medium text-primary-700">
          {count} {label} sélectionné{count > 1 ? 's' : ''}
        </span>
        <button
          onClick={onDelete}
          disabled={actionLoading === 'bulk'}
          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          {actionLoading === 'bulk' ? 'Suppression...' : `🗑️ Supprimer (${count})`}
        </button>
      </div>
    )
  }

  // =====================
  // EXPORT CSV
  // =====================

  const exportCSV = (data, filename, headers) => {
    const BOM = '\uFEFF'
    const headerRow = headers.map(h => h.label).join(';')
    const rows = data.map(item => 
      headers.map(h => {
        let val = h.getValue(item)
        if (val === null || val === undefined) val = ''
        val = String(val).replace(/"/g, '""')
        if (val.includes(';') || val.includes('"') || val.includes('\n')) val = `"${val}"`
        return val
      }).join(';')
    )
    const csv = BOM + [headerRow, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportTalentsCSV = () => {
    exportCSV(filteredTalents, 'talents', [
      { label: 'Prénom', getValue: t => t.first_name },
      { label: 'Nom', getValue: t => t.last_name },
      { label: 'Téléphone', getValue: t => t.phone },
      { label: 'Ville', getValue: t => t.city },
      { label: 'Postes', getValue: t => t.position_types?.join(', ') },
      { label: 'Statut', getValue: t => t.is_blocked ? 'Bloqué' : 'Actif' },
      { label: 'Inscrit le', getValue: t => formatDate(t.created_at) }
    ])
  }

  const exportEstablishmentsCSV = () => {
    exportCSV(filteredEstablishments, 'etablissements', [
      { label: 'Nom', getValue: e => e.name },
      { label: 'Téléphone', getValue: e => e.phone },
      { label: 'Adresse', getValue: e => e.address },
      { label: 'Ville', getValue: e => e.city },
      { label: 'Abonnement', getValue: e => e.subscription_status === 'active' ? 'Club' : e.subscription_status },
      { label: 'Missions utilisées', getValue: e => e.missions_used },
      { label: 'Statut', getValue: e => e.is_blocked ? 'Bloqué' : 'Actif' },
      { label: 'Inscrit le', getValue: e => formatDate(e.created_at) }
    ])
  }

  const exportMissionsCSV = () => {
    exportCSV(filteredMissions, 'missions', [
      { label: 'Établissement', getValue: m => m.establishment?.name },
      { label: 'Poste', getValue: m => m.position },
      { label: 'Localisation', getValue: m => m.location_fuzzy },
      { label: 'Date mission', getValue: m => formatDate(m.start_date) },
      { label: 'Urgente', getValue: m => m.is_urgent ? 'Oui' : 'Non' },
      { label: 'Statut', getValue: m => m.status },
      { label: 'Paiement', getValue: m => m.payment_status },
      { label: 'Créée le', getValue: m => formatDate(m.created_at) }
    ])
  }

  const exportApplicationsCSV = () => {
    exportCSV(filteredApplications, 'candidatures', [
      { label: 'Talent', getValue: a => `${a.talent?.first_name} ${a.talent?.last_name}` },
      { label: 'Établissement', getValue: a => a.mission?.establishment?.name },
      { label: 'Poste', getValue: a => a.mission?.position },
      { label: 'Statut', getValue: a => a.status },
      { label: 'Date', getValue: a => formatDate(a.created_at) }
    ])
  }

  // =====================
  // FILTRES + TRI
  // =====================

  const filteredTalents = useMemo(() => {
    const search = searchTerm.toLowerCase()
    const filtered = talents.filter(t =>
      t.first_name?.toLowerCase().includes(search) || t.last_name?.toLowerCase().includes(search) || t.city?.toLowerCase().includes(search) || t.phone?.includes(search)
    )
    return sortData(filtered, sortConfig)
  }, [talents, searchTerm, sortConfig])

  const filteredEstablishments = useMemo(() => {
    const search = searchTerm.toLowerCase()
    const filtered = establishments.filter(e =>
      e.name?.toLowerCase().includes(search) || e.address?.toLowerCase().includes(search) || e.city?.toLowerCase().includes(search) || e.phone?.includes(search)
    )
    return sortData(filtered, sortConfig)
  }, [establishments, searchTerm, sortConfig])

  const filteredMissions = useMemo(() => {
    const search = searchTerm.toLowerCase()
    const filtered = missions.filter(m => {
      const matchesSearch = m.position?.toLowerCase().includes(search) || m.establishment?.name?.toLowerCase().includes(search) || m.location_fuzzy?.toLowerCase().includes(search)
      const matchesStatus = filterStatus === 'all' || m.status === filterStatus
      return matchesSearch && matchesStatus
    })
    return sortData(filtered, sortConfig)
  }, [missions, searchTerm, filterStatus, sortConfig])

  const filteredApplications = useMemo(() => {
    const search = searchTerm.toLowerCase()
    const filtered = applications.filter(a => {
      const matchesSearch = a.talent?.first_name?.toLowerCase().includes(search) || a.talent?.last_name?.toLowerCase().includes(search) || a.mission?.establishment?.name?.toLowerCase().includes(search) || a.mission?.position?.toLowerCase().includes(search)
      const matchesStatus = filterStatus === 'all' || a.status === filterStatus
      return matchesSearch && matchesStatus
    })
    return sortData(filtered, sortConfig)
  }, [applications, searchTerm, filterStatus, sortConfig])

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
              { id: 'subscriptions', label: '💳 Abonnements', count: stats.premiumActive },
              { id: 'analytics', label: '📈 Analytics', count: null }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
                { value: stats.premiumActive, label: 'Club actifs', color: 'text-purple-600' },
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
        {activeTab === 'talents' && (() => {
          const { paginated, totalPages, total } = paginate(filteredTalents)
          return (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Liste des talents</h2>
                <div className="flex gap-2">
                  <button onClick={exportTalentsCSV} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium">📥 Export CSV</button>
                  <input type="text" placeholder="🔍 Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 max-w-xs" />
                </div>
              </div>
              <BulkActions count={selectedTalents.length} onDelete={deleteSelectedTalents} label="talent" />
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input type="checkbox" checked={selectedTalents.length === paginated.length && paginated.length > 0}
                            onChange={() => toggleSelectAll(paginated, selectedTalents, setSelectedTalents)}
                            className="rounded border-gray-300" />
                        </th>
                        <SortHeader label="Nom" sortKey="first_name" />
                        <SortHeader label="Téléphone" sortKey="phone" />
                        <SortHeader label="Ville" sortKey="city" />
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Postes</th>
                        <SortHeader label="Inscrit le" sortKey="created_at" />
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginated.map(talent => (
                        <tr key={talent.id} className={`${talent.is_blocked ? 'bg-red-50' : ''} ${selectedTalents.includes(talent.id) ? 'bg-primary-50' : ''}`}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selectedTalents.includes(talent.id)}
                              onChange={() => toggleSelect(talent.id, selectedTalents, setSelectedTalents)}
                              className="rounded border-gray-300" />
                          </td>
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
                  {paginated.length === 0 && <p className="text-center text-gray-500 py-8">Aucun talent trouvé</p>}
                </div>
                <Pagination totalPages={totalPages} total={total} />
              </div>
            </div>
          )
        })()}

        {/* ==================== TAB ESTABLISHMENTS ==================== */}
        {activeTab === 'establishments' && (() => {
          const { paginated, totalPages, total } = paginate(filteredEstablishments)
          return (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Liste des établissements</h2>
                <div className="flex gap-2">
                  <button onClick={exportEstablishmentsCSV} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium">📥 Export CSV</button>
                  <input type="text" placeholder="🔍 Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 max-w-xs" />
                </div>
              </div>
              <BulkActions count={selectedEstablishments.length} onDelete={deleteSelectedEstablishments} label="établissement" />
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input type="checkbox" checked={selectedEstablishments.length === paginated.length && paginated.length > 0}
                            onChange={() => toggleSelectAll(paginated, selectedEstablishments, setSelectedEstablishments)}
                            className="rounded border-gray-300" />
                        </th>
                        <SortHeader label="Nom" sortKey="name" />
                        <SortHeader label="Téléphone" sortKey="phone" />
                        <SortHeader label="Adresse" sortKey="address" />
                        <SortHeader label="Inscrit le" sortKey="created_at" />
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginated.map(est => (
                        <tr key={est.id} className={`${est.is_blocked ? 'bg-red-50' : ''} ${selectedEstablishments.includes(est.id) ? 'bg-primary-50' : ''}`}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selectedEstablishments.includes(est.id)}
                              onChange={() => toggleSelect(est.id, selectedEstablishments, setSelectedEstablishments)}
                              className="rounded border-gray-300" />
                          </td>
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
                  {paginated.length === 0 && <p className="text-center text-gray-500 py-8">Aucun établissement trouvé</p>}
                </div>
                <Pagination totalPages={totalPages} total={total} />
              </div>
            </div>
          )
        })()}

        {/* ==================== TAB MISSIONS ==================== */}
        {activeTab === 'missions' && (() => {
          const { paginated, totalPages, total } = paginate(filteredMissions)
          return (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Liste des missions</h2>
                <div className="flex gap-2">
                  <button onClick={exportMissionsCSV} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium">📥 Export CSV</button>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
                    <option value="all">Tous statuts</option>
                    <option value="open">Ouvertes</option>
                    <option value="pending">En attente</option>
                    <option value="closed">Fermées</option>
                    <option value="cancelled">Annulées</option>
                  </select>
                  <input type="text" placeholder="🔍 Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <BulkActions count={selectedMissions.length} onDelete={deleteSelectedMissions} label="mission" />
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input type="checkbox" checked={selectedMissions.length === paginated.length && paginated.length > 0}
                            onChange={() => toggleSelectAll(paginated, selectedMissions, setSelectedMissions)}
                            className="rounded border-gray-300" />
                        </th>
                        <SortHeader label="Établissement" sortKey="establishment.name" />
                        <SortHeader label="Poste" sortKey="position" />
                        <SortHeader label="Localisation" sortKey="location_fuzzy" />
                        <SortHeader label="Date mission" sortKey="start_date" />
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Urgente</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                        <SortHeader label="Créée le" sortKey="created_at" />
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginated.map(mission => (
                        <tr key={mission.id} className={selectedMissions.includes(mission.id) ? 'bg-primary-50' : ''}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selectedMissions.includes(mission.id)}
                              onChange={() => toggleSelect(mission.id, selectedMissions, setSelectedMissions)}
                              className="rounded border-gray-300" />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{mission.establishment?.name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{mission.position}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{mission.location_fuzzy || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDate(mission.start_date)}</td>
                          <td className="px-4 py-3 text-sm">
                            {mission.is_urgent ? <span className="text-red-600 font-medium">⚡ Oui</span> : <span className="text-gray-400">Non</span>}
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(mission.status)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(mission.created_at)}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => deleteMission(mission.id, mission.position)} disabled={actionLoading === mission.id}
                              className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50">
                              {actionLoading === mission.id ? '...' : '🗑️'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {paginated.length === 0 && <p className="text-center text-gray-500 py-8">Aucune mission trouvée</p>}
                </div>
                <Pagination totalPages={totalPages} total={total} />
              </div>
            </div>
          )
        })()}

        {/* ==================== TAB APPLICATIONS ==================== */}
        {activeTab === 'applications' && (() => {
          const { paginated, totalPages, total } = paginate(filteredApplications)
          return (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Liste des candidatures</h2>
                <div className="flex gap-2">
                  <button onClick={exportApplicationsCSV} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium">📥 Export CSV</button>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
                    <option value="all">Tous statuts</option>
                    <option value="interested">Intéressé</option>
                    <option value="accepted">Acceptées</option>
                    <option value="rejected">Refusées</option>
                    <option value="confirmed">Confirmées</option>
                  </select>
                  <input type="text" placeholder="🔍 Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <BulkActions count={selectedApplications.length} onDelete={deleteSelectedApplications} label="candidature" />
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input type="checkbox" checked={selectedApplications.length === paginated.length && paginated.length > 0}
                            onChange={() => toggleSelectAll(paginated, selectedApplications, setSelectedApplications)}
                            className="rounded border-gray-300" />
                        </th>
                        <SortHeader label="Talent" sortKey="talent.first_name" />
                        <SortHeader label="Établissement" sortKey="mission.establishment.name" />
                        <SortHeader label="Poste" sortKey="mission.position" />
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                        <SortHeader label="Candidature le" sortKey="created_at" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginated.map(app => (
                        <tr key={app.id} className={selectedApplications.includes(app.id) ? 'bg-primary-50' : ''}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selectedApplications.includes(app.id)}
                              onChange={() => toggleSelect(app.id, selectedApplications, setSelectedApplications)}
                              className="rounded border-gray-300" />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{app.talent?.first_name} {app.talent?.last_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{app.mission?.establishment?.name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{app.mission?.position || '-'}</td>
                          <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(app.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {paginated.length === 0 && <p className="text-center text-gray-500 py-8">Aucune candidature trouvée</p>}
                </div>
                <Pagination totalPages={totalPages} total={total} />
              </div>
            </div>
          )
        })()}

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
                { value: stats.premiumActive, label: 'Club actifs', color: 'text-purple-600', bg: 'bg-purple-50' },
                { value: stats.freemium, label: 'Freemium', color: 'text-gray-600', bg: 'bg-gray-50' },
                { value: stats.expiredPremium, label: 'Expirés', color: 'text-red-600', bg: 'bg-red-50' },
                { value: `${(stats.premiumActive * 24).toFixed(0)}€`, label: 'MRR Club ExtraTaff', color: 'text-green-600', bg: 'bg-green-50' }
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
                  <option value="active">Club actif</option>
                  <option value="freemium">Freemium</option>
                  <option value="expired">Expiré</option>
                </select>
                <input type="text" placeholder="🔍 Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
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
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mission incluse</th>
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
                        if (filterStatus === 'freemium') return matchesSearch && (!est.subscription_status || est.subscription_status === 'freemium')
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
                                {isPremium ? '🏆 Club' : isExpired ? 'Expiré' : 'Freemium'}
                              </span>
                              {isExpiringSoon && (
                                <span className="ml-1 text-xs text-orange-600">⚠️ Expire bientôt</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`font-medium ${(est.missions_used || 0) >= 1 && !isPremium ? 'text-red-600' : 'text-gray-900'}`}>
                                {est.missions_used || 0}{!isPremium && '/1'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {isPremium ? (
                                <span className={`font-medium ${est.missions_included_used ? 'text-gray-500' : 'text-green-600'}`}>
                                  {est.missions_included_used ? '✗ Utilisée' : '✓ Disponible'}
                                </span>
                              ) : '-'}
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
                                  {actionLoading === est.id ? '...' : isPremium ? 'Désactiver' : '🏆 Activer Club'}
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

        {/* ==================== TAB ANALYTICS ==================== */}
        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 Analytics</h2>

            {/* KPIs principaux */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {(() => {
                const inactiveEstabs = establishments.filter(e => (e.missions_used || 0) === 0).length
                const hotProspects = establishments.filter(e => (e.missions_used || 0) >= 1 && e.subscription_status !== 'active').length
                const talentsWithApps = new Set(applications.map(a => a.talent?.id)).size
                const dormantTalents = talents.length - talentsWithApps
                const conversionRate = establishments.length > 0 ? ((stats.premiumActive / establishments.length) * 100).toFixed(1) : 0

                return [
                  { value: `${conversionRate}%`, label: 'Taux conversion Club', color: 'text-purple-600', bg: 'bg-purple-50' },
                  { value: hotProspects, label: '🔥 Prospects chauds (1/1)', color: 'text-orange-600', bg: 'bg-orange-50' },
                  { value: inactiveEstabs, label: 'Étab. inactifs (0 mission)', color: 'text-red-600', bg: 'bg-red-50' },
                  { value: dormantTalents, label: 'Talents dormants', color: 'text-gray-600', bg: 'bg-gray-50' }
                ].map((stat, i) => (
                  <div key={i} className={`${stat.bg} rounded-xl p-4 border border-gray-200`}>
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                ))
              })()}
            </div>

            {/* Inscriptions par mois + Funnel */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">📊 Inscriptions par mois</h3>
                {(() => {
                  const months = {}
                  const allUsers = [
                    ...talents.map(t => ({ ...t, type: 'talent' })),
                    ...establishments.map(e => ({ ...e, type: 'establishment' }))
                  ]
                  allUsers.forEach(u => {
                    if (!u.created_at) return
                    const month = new Date(u.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                    if (!months[month]) months[month] = { talents: 0, establishments: 0 }
                    months[month][u.type === 'talent' ? 'talents' : 'establishments']++
                  })
                  const sorted = Object.entries(months).slice(-6)
                  const maxVal = Math.max(...sorted.map(([, v]) => v.talents + v.establishments), 1)

                  return sorted.length > 0 ? (
                    <div className="space-y-3">
                      {sorted.map(([month, counts]) => (
                        <div key={month}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{month}</span>
                            <span className="text-gray-900 font-medium">{counts.talents + counts.establishments} inscrits</span>
                          </div>
                          <div className="flex gap-1 h-4">
                            <div
                              className="bg-primary-500 rounded-l"
                              style={{ width: `${(counts.talents / maxVal) * 100}%` }}
                              title={`${counts.talents} talents`}
                            />
                            <div
                              className="bg-amber-500 rounded-r"
                              style={{ width: `${(counts.establishments / maxVal) * 100}%` }}
                              title={`${counts.establishments} établissements`}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-4 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary-500"></span> Talents</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500"></span> Établissements</span>
                      </div>
                    </div>
                  ) : <p className="text-gray-500 text-sm">Aucune donnée</p>
                })()}
              </div>

              {/* Funnel conversion */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">🔄 Funnel établissements</h3>
                {(() => {
                  const total = establishments.length
                  const withMissions = establishments.filter(e => (e.missions_used || 0) > 0).length
                  const at3Missions = establishments.filter(e => (e.missions_used || 0) >= 1).length
                  const premium = stats.premiumActive

                  const steps = [
                    { label: 'Inscrits', value: total, color: 'bg-gray-400' },
                    { label: '≥1 mission créée', value: withMissions, color: 'bg-blue-500' },
                    { label: 'Mission gratuite épuisée', value: at3Missions, color: 'bg-orange-500' },
                    { label: 'Club ExtraTaff', value: premium, color: 'bg-purple-600' }
                  ]

                  return (
                    <div className="space-y-3">
                      {steps.map((step, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{step.label}</span>
                            <span className="text-gray-900 font-medium">
                              {step.value}
                              {i > 0 && total > 0 && (
                                <span className="text-gray-400 ml-1">({((step.value / total) * 100).toFixed(0)}%)</span>
                              )}
                            </span>
                          </div>
                          <div className="h-4 bg-gray-100 rounded overflow-hidden">
                            <div
                              className={`h-full ${step.color} rounded transition-all`}
                              style={{ width: `${total > 0 ? (step.value / total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Prospects chauds */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">🔥 Prospects Club chauds</h3>
              <p className="text-sm text-gray-500 mb-3">Établissements ayant utilisé leur mission gratuite (non abonnés Club)</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Établissement</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Ville</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Missions utilisées</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Inscrit le</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {establishments
                      .filter(e => (e.missions_used || 0) >= 1 && e.subscription_status !== 'active')
                      .map(est => (
                        <tr key={est.id} className="bg-orange-50/50">
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{est.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{est.city || '-'}</td>
                          <td className="px-4 py-2 text-sm text-red-600 font-medium">{est.missions_used}/1</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{formatDate(est.created_at)}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{est.phone || '-'}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
                {establishments.filter(e => (e.missions_used || 0) >= 1 && e.subscription_status !== 'active').length === 0 && (
                  <p className="text-center text-gray-500 py-4 text-sm">Aucun prospect chaud pour le moment</p>
                )}
              </div>
            </div>

            {/* Talents dormants */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">😴 Talents sans candidature</h3>
              <p className="text-sm text-gray-500 mb-3">Talents inscrits qui n'ont jamais postulé</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Ville</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Postes</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Inscrit le</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      const talentIdsWithApps = new Set(applications.map(a => a.talent?.id))
                      return talents
                        .filter(t => !talentIdsWithApps.has(t.id))
                        .slice(0, 20)
                        .map(t => (
                          <tr key={t.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{t.first_name} {t.last_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{t.city || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{t.position_types?.slice(0, 2).join(', ') || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{formatDate(t.created_at)}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{t.phone || '-'}</td>
                          </tr>
                        ))
                    })()}
                  </tbody>
                </table>
                {(() => {
                  const talentIdsWithApps = new Set(applications.map(a => a.talent?.id))
                  const count = talents.filter(t => !talentIdsWithApps.has(t.id)).length
                  return count === 0
                    ? <p className="text-center text-gray-500 py-4 text-sm">Tous les talents ont postulé !</p>
                    : count > 20 && <p className="text-center text-gray-400 py-2 text-xs">... et {count - 20} autres</p>
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
