import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES } from '../../lib/supabase'

export default function TalentApplications({ talentId, onBack }) {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (talentId) loadApplications()
  }, [talentId])

  const loadApplications = async () => {
    setLoading(true)
    try {
      // Récupérer les candidatures interested + accepted du talent
      const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .eq('talent_id', talentId)
        .in('status', ['interested', 'accepted'])
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!apps || apps.length === 0) {
        setApplications([])
        setLoading(false)
        return
      }

      // Récupérer les missions
      const missionIds = [...new Set(apps.map(a => a.mission_id))]
      const { data: missions } = await supabase
        .from('missions')
        .select('id, position, start_date, end_date, shift_start_time, shift_end_time, hourly_rate, establishment_id, service_continu')
        .in('id', missionIds)

      // Récupérer les établissements
      const estabIds = [...new Set(missions?.map(m => m.establishment_id) || [])]
      const { data: establishments } = await supabase
        .from('establishments')
        .select('id, name, city')
        .in('id', estabIds)

      // Enrichir
      const enriched = apps.map(app => {
        const mission = missions?.find(m => m.id === app.mission_id)
        const establishment = mission ? establishments?.find(e => e.id === mission.establishment_id) : null
        return { ...app, mission, establishment }
      })

      setApplications(enriched)
    } catch (err) {
      console.error('Erreur chargement candidatures:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChat = (applicationId) => {
    navigate(`/talent/chat/${applicationId}`)
  }

  const handleWithdraw = async (applicationId) => {
    if (!confirm('Retirer votre candidature ?')) return

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId)

      if (error) throw error
      loadApplications()
    } catch (err) {
      console.error('Erreur retrait:', err)
      alert('Erreur lors du retrait')
    }
  }

  // Helpers
  const getPositionLabel = (value) => {
    const found = POSITION_TYPES?.find(p => p.value === value)
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
        <p className="text-gray-600">Chargement des candidatures...</p>
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
        <h2 className="text-3xl font-bold text-gray-900">Missions Intéressées</h2>
        <button
          onClick={loadApplications}
          className="ml-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
        >
          🔄
        </button>
      </div>

      {/* Liste vide */}
      {applications.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-5xl mb-4">❤️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune candidature en cours</h3>
          <p className="text-gray-600">Consultez les missions matchées pour postuler !</p>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-4">
        {applications.map(app => (
          <div
            key={app.id}
            className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${
              app.status === 'accepted' ? 'border-l-4 border-green-500' : 'border-l-4 border-yellow-400'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1">
                {/* Status badge */}
                <div className="flex items-center gap-2 mb-2">
                  {app.status === 'interested' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⏳ En attente de l'établissement
                    </span>
                  )}
                  {app.status === 'accepted' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✅ Établissement intéressé !
                    </span>
                  )}
                </div>

                {/* Mission */}
                {app.mission && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {getPositionLabel(app.mission.position)}
                    </h3>
                    {app.establishment && (
                      <p className="text-sm text-primary-600 font-medium mt-1">
                        🏪 {app.establishment.name}
                        {app.establishment.city && ` — ${app.establishment.city}`}
                      </p>
                    )}
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>
                        📅 {formatDate(app.mission.start_date)}
                        {app.mission.end_date && ` → ${formatDate(app.mission.end_date)}`}
                      </p>
                      {(app.mission.shift_start_time || app.mission.shift_end_time) && (
                        <p>
                          🕐 {formatTime(app.mission.shift_start_time)}
                          {app.mission.shift_end_time && ` - ${formatTime(app.mission.shift_end_time)}`}
                          {app.mission.service_continu ? ' (continu)' : ' (avec coupure)'}
                        </p>
                      )}
                      {app.mission.hourly_rate && (
                        <p className="font-semibold text-green-700">💰 {parseFloat(app.mission.hourly_rate).toFixed(2)} €/h</p>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-2">
                  Candidature envoyée le {new Date(app.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col gap-2">
                {app.status === 'accepted' && (
                  <button
                    onClick={() => handleOpenChat(app.id)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    💬 Ouvrir conversation
                  </button>
                )}
                <button
                  onClick={() => handleWithdraw(app.id)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors"
                >
                  🗑️ Retirer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
