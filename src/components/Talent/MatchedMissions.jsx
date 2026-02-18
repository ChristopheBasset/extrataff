import { useState, useEffect } from 'react'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, DURATION_TYPES } from '../../lib/supabase'

export default function MatchedMissions({ talentId, talentProfile, onBack, onCountChange }) {
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [applyingId, setApplyingId] = useState(null)

  useEffect(() => {
    if (talentId) loadMatchedMissions()
  }, [talentId])

  const loadMatchedMissions = async () => {
    setLoading(true)
    try {
      // Récupérer toutes les missions ouvertes (sans jointure)
      const { data: allMissions, error: missError } = await supabase
        .from('missions')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (missError) throw missError

      if (!allMissions || allMissions.length === 0) {
        setMissions([])
        if (onCountChange) onCountChange(0)
        setLoading(false)
        return
      }

      // Récupérer les établissements liés aux missions
      const estIds = [...new Set(allMissions.map(m => m.establishment_id).filter(Boolean))]
      let estMap = {}
      if (estIds.length > 0) {
        const { data: establishments } = await supabase
          .from('establishments')
          .select('id, name, city, type, department, user_id')
          .in('id', estIds)
        if (establishments) {
          estMap = Object.fromEntries(establishments.map(e => [e.id, e]))
        }
      }

      // Attacher les établissements aux missions
      const missionsWithEst = allMissions.map(m => ({
        ...m,
        establishments: estMap[m.establishment_id] || null
      }))

      // Récupérer les candidatures existantes du talent
      const missionIds = missionsWithEst.map(m => m.id)
      const { data: existingApps } = await supabase
        .from('applications')
        .select('mission_id')
        .eq('talent_id', talentId)
        .in('mission_id', missionIds)

      const appliedMissionIds = new Set(existingApps?.map(a => a.mission_id) || [])

      // Filtrer : missions sans candidature du talent
      let matched = missionsWithEst.filter(m => !appliedMissionIds.has(m.id))

      // Filtrage par position_types du talent si disponible
      if (talentProfile?.position_types && talentProfile.position_types.length > 0) {
        matched = matched.filter(m => 
          talentProfile.position_types.includes(m.position)
        )
      }

      // Filtrage par départements préférés du talent
      if (talentProfile?.preferred_departments && talentProfile.preferred_departments.length > 0) {
        matched = matched.filter(m => {
          const estDept = m.establishments?.department
          const missionDept = m.department
          
          return talentProfile.preferred_departments.some(dept => 
            dept === estDept || dept === missionDept
          )
        })
      }

      // Anti-chevauchement : exclure les missions qui chevauchent des missions confirmées/acceptées
      const { data: bookedApps } = await supabase
        .from('applications')
        .select('mission_id')
        .eq('talent_id', talentId)
        .in('status', ['confirmed', 'accepted'])

      if (bookedApps && bookedApps.length > 0) {
        const bookedMissionIds = bookedApps.map(a => a.mission_id)
        const { data: bookedMissions } = await supabase
          .from('missions')
          .select('*')
          .in('id', bookedMissionIds)

        if (bookedMissions && bookedMissions.length > 0) {
          const bookedRanges = bookedMissions
            .filter(bm => bm.start_date)
            .map(bm => ({
              start: new Date(bm.start_date),
              end: bm.end_date ? new Date(bm.end_date) : new Date(bm.start_date)
            }))

          if (bookedRanges.length > 0) {
            matched = matched.filter(m => {
              if (!m.start_date) return true
              const mStart = new Date(m.start_date)
              const mEnd = m.end_date ? new Date(m.end_date) : new Date(m.start_date)
              return !bookedRanges.some(b => mStart <= b.end && mEnd >= b.start)
            })
          }
        }
      }

      setMissions(matched)
      if (onCountChange) onCountChange(matched.length)
    } catch (err) {
      console.error('Erreur chargement missions matchées:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInterested = async (missionId) => {
    setApplyingId(missionId)
    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          mission_id: missionId,
          talent_id: talentId,
          status: 'interested'
        })

      if (error) throw error

      // ✅ Envoyer une notification à l'établissement
      const mission = missions.find(m => m.id === missionId)
      if (mission?.establishments?.user_id) {
        const posLabel = getPositionLabel(mission.position)
        const talentName = talentProfile?.first_name || 'Un talent'
        await supabase.from('notifications').insert({
          user_id: mission.establishments.user_id,
          type: 'new_application',
          title: '📩 Nouvelle candidature',
          content: `${talentName} est intéressé(e) par votre mission ${posLabel}`,
          link: '/establishment/applications',
          read: false
        })
      }

      // Retirer la mission de la liste
      setMissions(prev => prev.filter(m => m.id !== missionId))
      if (onCountChange) onCountChange(missions.length - 1)
    } catch (err) {
      console.error('Erreur candidature:', err)
      alert('Erreur lors de la candidature')
    } finally {
      setApplyingId(null)
    }
  }

  const handleRefuse = (missionId) => {
    // Simplement retirer de la liste locale (pas de candidature créée)
    setMissions(prev => prev.filter(m => m.id !== missionId))
    if (onCountChange) onCountChange(missions.length - 1)
  }

  // Helpers
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
    return timeStr.substring(0, 5)
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
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Retour
        </button>
        <h2 className="text-3xl font-bold text-gray-900">Missions Matchées</h2>
        <button
          onClick={loadMatchedMissions}
          className="ml-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
        >
          🔄
        </button>
      </div>

      {/* Liste vide */}
      {missions.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune nouvelle mission</h3>
          <p className="text-gray-600">Les missions correspondant à votre profil apparaîtront ici.</p>
        </div>
      )}

      {/* Liste des missions */}
      <div className="space-y-4">
        {missions.map(mission => (
          <div
            key={mission.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Info mission */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {mission.urgency_level === 'urgent' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      🔴 Urgent
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      🟢 Normal
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900">
                  {getPositionLabel(mission.position)}
                </h3>

                {/* Établissement */}
                {mission.establishments && (
                  <p className="text-sm text-primary-600 font-medium mt-1">
                    🏪 {mission.establishments.name}
                    {mission.establishments.city && ` — ${mission.establishments.city}`}
                  </p>
                )}

                {/* Zone floue */}
                {mission.location_fuzzy && (
                  <p className="text-sm text-gray-500 mt-1">📍 {mission.location_fuzzy}</p>
                )}

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
                    <p className="text-lg font-semibold text-green-700">💰 {parseFloat(mission.hourly_rate).toFixed(2)} €/h</p>
                  ) : mission.salary_text ? (
                    <p className="text-lg font-semibold text-green-700">💰 {mission.salary_text}</p>
                  ) : null}
                  {mission.comment && (
                    <p className="text-gray-500 italic mt-1">"{mission.comment}"</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col gap-3">
                <button
                  onClick={() => handleInterested(mission.id)}
                  disabled={applyingId === mission.id}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {applyingId === mission.id ? '...' : '❤️ Intéressé'}
                </button>
                <button
                  onClick={() => handleRefuse(mission.id)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  ❌ Passer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
