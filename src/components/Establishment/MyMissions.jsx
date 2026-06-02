import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, DURATION_TYPES, URGENCY_LEVELS } from '../../lib/supabase'

export default function MyMissions({ establishmentId, onBack }) {
  const navigate = useNavigate()
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open') // 'open', 'closed', 'all'
  const [establishment, setEstablishment] = useState(null)

  useEffect(() => {
    if (establishmentId) loadMissions()
  }, [establishmentId, filter])

  // Charger l'abonnement de l'établissement (pour savoir si membre Club ou non)
  useEffect(() => {
    if (!establishmentId) return
    ;(async () => {
      try {
        const { data } = await supabase
          .from('establishments')
          .select('id, subscription_status, subscription_plan')
          .eq('id', establishmentId)
          .single()
        setEstablishment(data)
      } catch (e) {
        console.error('Erreur chargement abonnement établissement:', e)
      }
    })()
  }, [establishmentId])

  const loadMissions = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('missions')
        .select('*')
        .eq('establishment_id', establishmentId)
        .order('created_at', { ascending: false })

      if (filter === 'open') {
        query = query.eq('status', 'open')
      } else if (filter === 'closed') {
        query = query.in('status', ['closed', 'filled', 'archived'])
      }

      const { data, error } = await query
      if (error) throw error

      // Charger le nombre de candidatures par mission
      if (data && data.length > 0) {
        const missionIds = data.map(m => m.id)
        const { data: apps } = await supabase
          .from('applications')
          .select('mission_id, status')
          .in('mission_id', missionIds)

        // Enrichir chaque mission avec les compteurs
        const enriched = data.map(mission => {
          const missionApps = apps ? apps.filter(a => a.mission_id === mission.id) : []
          return {
            ...mission,
            candidatesCount: missionApps.filter(a => a.status === 'interested').length,
            hiredCount: missionApps.filter(a => a.status === 'confirmed' || a.status === 'accepted').length
          }
        })
        setMissions(enriched)
      } else {
        setMissions([])
      }
    } catch (err) {
      console.error('Erreur chargement missions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseMission = async (missionId) => {
    if (!confirm('Êtes-vous sûr de vouloir clôturer cette mission ?')) return

    try {
      const { error } = await supabase
        .from('missions')
        .update({ 
          status: 'closed', 
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', missionId)

      if (error) throw error
      loadMissions()
    } catch (err) {
      console.error('Erreur clôture mission:', err)
      alert('Erreur lors de la clôture de la mission')
    }
  }

  const handleReopenMission = async (missionId) => {
    const isClubMember =
      establishment?.subscription_status === 'active' &&
      establishment?.subscription_plan === 'club'

    // Membre Club → réouverture gratuite (missions illimitées)
    if (isClubMember) {
      try {
        const { error } = await supabase
          .from('missions')
          .update({
            status: 'open',
            closed_at: null,
            nb_postes_pourvus: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', missionId)

        if (error) throw error
        loadMissions()
      } catch (err) {
        console.error('Erreur réouverture mission:', err)
        alert('Erreur lors de la réouverture')
      }
      return
    }

    // Non-membre → paiement obligatoire (19,90€) pour réouvrir
    if (!confirm('Réouvrir cette mission coûte 19,90 €. Pour des missions illimitées, devenez membre du Club (bouton « Devenir membre » en haut). Continuer vers le paiement ?')) return

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const { data: { session } } = await supabase.auth.refreshSession()
      if (!session) { alert('Session expirée, reconnectez-vous.'); return }

      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          establishment_id: establishmentId,
          plan_type: 'mission',
          mission_id: missionId
        })
      })
      const data = await response.json()
      if (!response.ok || data.error || !data.url) {
        throw new Error(data.error || 'Erreur lors de la création du paiement')
      }

      // On repasse la mission en attente de paiement : le webhook Stripe
      // la fera passer en "open" une fois le paiement confirmé.
      const { error: pendErr } = await supabase
        .from('missions')
        .update({
          status: 'pending',
          payment_status: 'pending',
          closed_at: null,
          nb_postes_pourvus: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', missionId)
      if (pendErr) throw pendErr

      window.location.href = data.url
    } catch (err) {
      console.error('Erreur réouverture payante:', err)
      alert(err.message || 'Erreur lors de la réouverture')
    }
  }

  const handleDeleteMission = async (missionId) => {
    if (!confirm('Supprimer définitivement cette mission ? Cette action est irréversible.')) return

    try {
      // Supprimer d'abord les candidatures liées
      await supabase
        .from('applications')
        .delete()
        .eq('mission_id', missionId)

      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId)

      if (error) throw error
      loadMissions()
    } catch (err) {
      console.error('Erreur suppression mission:', err)
      alert('Erreur lors de la suppression')
    }
  }

  // Helper pour les labels
  const getPositionLabel = (value) => {
    const found = POSITION_TYPES?.find(p => p.value === value)
    return found ? found.label : value || '—'
  }

  const getContractLabel = (value) => {
    const found = CONTRACT_TYPES?.find(c => c.value === value)
    return found ? found.label : value || '—'
  }

  const getDurationLabel = (value) => {
    const found = DURATION_TYPES?.find(d => d.value === value)
    return found ? found.label : value || '—'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    return timeStr.substring(0, 5) // "08:00:00" → "08:00"
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement des missions...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Retour
          </button>
          <h2 className="text-3xl font-bold text-gray-900">Mes Missions</h2>
        </div>

        <div className="sm:ml-auto flex flex-wrap items-center gap-2">
          {/* Filtres */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('open')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'open' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ouvertes
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'closed' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Clôturées
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Toutes
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadMissions}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
            >
              🔄
            </button>

            <button
              onClick={() => navigate('/establishment/create-mission')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors text-sm whitespace-nowrap"
            >
              + Nouvelle mission
            </button>
          </div>
        </div>
      </div>

      {/* Liste vide */}
      {missions.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {filter === 'open' ? 'Aucune mission ouverte' : 'Aucune mission'}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'open' 
              ? 'Créez votre première mission pour recevoir des candidatures !'
              : 'Aucune mission trouvée avec ce filtre.'
            }
          </p>
          {filter === 'open' && (
            <button
              onClick={() => navigate('/establishment/create-mission')}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              + Créer une mission
            </button>
          )}
        </div>
      )}

      {/* Liste des missions */}
      <div className="space-y-4">
        {missions.map(mission => (
          <div
            key={mission.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              {/* Info principale */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {/* Badge urgence */}
                  {mission.urgency_level === 'urgent' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      🔴 Urgent
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      🟢 Normal
                    </span>
                  )}

                  {/* Badge status */}
                  {mission.status === 'open' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Ouverte
                    </span>
                  ) : mission.status === 'filled' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✅ Pourvue
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Clôturée
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900">
                  {getPositionLabel(mission.position)}
                </h3>

                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>
                    📅 {formatDate(mission.start_date)}
                    {mission.end_date && ` → ${formatDate(mission.end_date)}`}
                  </p>
                  {(mission.shift_start_time || mission.shift_end_time) && (
                    <p>
                      🕐 {formatTime(mission.shift_start_time)}
                      {mission.shift_end_time && ` - ${formatTime(mission.shift_end_time)}`}
                      {mission.service_continu ? ' (continu)' : ' (avec coupure)'}
                    </p>
                  )}
                  <p>
                    📋 {getContractLabel(mission.contract_type)} • {getDurationLabel(mission.duration_type)}
                  </p>
                  {mission.hourly_rate ? (
                    <p>💰 {parseFloat(mission.hourly_rate).toFixed(2)} €/h</p>
                  ) : mission.salary_text ? (
                    <p>💰 {mission.salary_text}</p>
                  ) : null}
                  {mission.comment && (
                    <p className="text-gray-500 italic mt-1">"{mission.comment}"</p>
                  )}
                </div>
              </div>

              {/* Compteurs candidats */}
              <div className="flex lg:flex-col gap-4 lg:gap-2 lg:text-right">
                <div className="bg-purple-50 rounded-lg px-4 py-2 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {mission.hiredCount}/{mission.nb_postes || 1}
                  </div>
                  <div className="text-xs text-purple-600">Poste{(mission.nb_postes || 1) > 1 ? 's' : ''} pourvu{mission.hiredCount > 1 ? 's' : ''}</div>
                </div>
                <div className="bg-blue-50 rounded-lg px-4 py-2 text-center">
                  <div className="text-2xl font-bold text-blue-600">{mission.candidatesCount}</div>
                  <div className="text-xs text-blue-600">En attente</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t flex gap-2">
              <button
                onClick={() => navigate(`/establishment/edit-mission/${mission.id}`)}
                className="flex-1 px-3 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-xs sm:text-sm font-medium transition-colors text-center"
              >
                ✏️ Modifier
              </button>

              {mission.status === 'open' ? (
                <button
                  onClick={() => handleCloseMission(mission.id)}
                  className="flex-1 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs sm:text-sm font-medium transition-colors text-center"
                >
                  🔒 Clôturer
                </button>
              ) : (
                <button
                  onClick={() => handleReopenMission(mission.id)}
                  className="flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs sm:text-sm font-medium transition-colors text-center"
                >
                  🔓 Réouvrir
                </button>
              )}

              <button
                onClick={() => handleDeleteMission(mission.id)}
                className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs sm:text-sm font-medium transition-colors text-center"
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
