import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES } from '../../lib/supabase'

export default function TalentConfirmed({ talentId, onBack }) {
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (talentId) loadConfirmed()
  }, [talentId])

  const loadConfirmed = async () => {
    setLoading(true)
    try {
      const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .eq('talent_id', talentId)
        .eq('status', 'confirmed')
        .order('confirmed_at', { ascending: false })

      if (error) throw error

      if (!apps || apps.length === 0) {
        setConfirmed([])
        setLoading(false)
        return
      }

      // Récupérer les missions
      const missionIds = [...new Set(apps.map(a => a.mission_id))]
      const { data: missions } = await supabase
        .from('missions')
        .select('id, position, start_date, end_date, shift_start_time, shift_end_time, hourly_rate, salary_text, service_continu, establishment_id, location_exact')
        .in('id', missionIds)

      // Récupérer les établissements
      const estabIds = [...new Set(missions?.map(m => m.establishment_id) || [])]
      const { data: establishments } = await supabase
        .from('establishments')
        .select('id, name, city, address, phone')
        .in('id', estabIds)

      // Enrichir
      const enriched = apps.map(app => {
        const mission = missions?.find(m => m.id === app.mission_id)
        const establishment = mission ? establishments?.find(e => e.id === mission.establishment_id) : null
        return { ...app, mission, establishment }
      })

      setConfirmed(enriched)
    } catch (err) {
      console.error('Erreur chargement confirmées:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChat = (applicationId) => {
    navigate(`/talent/chat/${applicationId}`)
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
        <p className="text-gray-600">Chargement des missions validées...</p>
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
        <h2 className="text-3xl font-bold text-gray-900">Mes Missions Validées</h2>
        <button
          onClick={loadConfirmed}
          className="ml-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
        >
          🔄
        </button>
      </div>

      {/* Liste vide */}
      {confirmed.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune mission validée</h3>
          <p className="text-gray-600">Vos missions confirmées par les établissements apparaîtront ici.</p>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-4">
        {confirmed.map(item => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✅ Confirmé
                  </span>
                </div>

                {item.mission && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {getPositionLabel(item.mission.position)}
                    </h3>

                    {/* Établissement - infos complètes après confirmation */}
                    {item.establishment && (
                      <div className="mt-2 p-3 bg-green-50 rounded-lg">
                        <p className="font-medium text-gray-900">🏪 {item.establishment.name}</p>
                        {item.establishment.address && (
                          <p className="text-sm text-gray-600">📍 {item.establishment.address}</p>
                        )}
                        {item.establishment.city && (
                          <p className="text-sm text-gray-600">{item.establishment.city}</p>
                        )}
                        {item.establishment.phone && (
                          <p className="text-sm text-gray-600">📞 {item.establishment.phone}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-3 space-y-1 text-sm text-gray-600">
                      <p>
                        📅 {formatDate(item.mission.start_date)}
                        {item.mission.end_date && ` → ${formatDate(item.mission.end_date)}`}
                      </p>
                      {(item.mission.shift_start_time || item.mission.shift_end_time) && (
                        <p>
                          🕐 {formatTime(item.mission.shift_start_time)}
                          {item.mission.shift_end_time && ` - ${formatTime(item.mission.shift_end_time)}`}
                          {item.mission.service_continu ? ' (continu)' : ' (avec coupure)'}
                        </p>
                      )}
                      {item.mission.hourly_rate ? (
                        <p className="text-lg font-semibold text-green-700">💰 {parseFloat(item.mission.hourly_rate).toFixed(2)} €/h</p>
                      ) : item.mission.salary_text ? (
                        <p className="text-lg font-semibold text-green-700">💰 {item.mission.salary_text}</p>
                      ) : null}
                    </div>
                  </div>
                )}

                {item.confirmed_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    Confirmé le {new Date(item.confirmed_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>

              {/* Action */}
              <div>
                <button
                  onClick={() => handleOpenChat(item.id)}
                  className="px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-sm font-medium transition-colors"
                >
                  💬 Conversation
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
