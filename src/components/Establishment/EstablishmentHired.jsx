import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES } from '../../lib/supabase'

export default function EstablishmentHired({ establishmentId, onBack }) {
  const navigate = useNavigate()
  const [hires, setHires] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (establishmentId) loadHires()
  }, [establishmentId])

  const loadHires = async () => {
    setLoading(true)
    try {
      // Récupérer toutes les missions de l'établissement
      const { data: missions } = await supabase
        .from('missions')
        .select('id, position, start_date, end_date, shift_start_time, shift_end_time, hourly_rate, salary_text, service_continu')
        .eq('establishment_id', establishmentId)

      if (!missions || missions.length === 0) {
        setHires([])
        setLoading(false)
        return
      }

      const missionIds = missions.map(m => m.id)

      // Récupérer les candidatures confirmées
      const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .in('mission_id', missionIds)
        .eq('status', 'confirmed')
        .order('updated_at', { ascending: false })

      if (error) throw error

      if (!apps || apps.length === 0) {
        setHires([])
        setLoading(false)
        return
      }

      // Récupérer les infos des talents
      const talentIds = [...new Set(apps.map(a => a.talent_id))]
      const { data: talents } = await supabase
        .from('talents')
        .select('id, first_name, last_name, phone, email, years_experience')
        .in('id', talentIds)

      // Enrichir
      const enriched = apps.map(app => {
        const mission = missions.find(m => m.id === app.mission_id)
        const talent = talents?.find(t => t.id === app.talent_id)
        return { ...app, mission, talent }
      })

      setHires(enriched)
    } catch (err) {
      console.error('Erreur chargement embauches:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChat = (applicationId) => {
    navigate(`/establishment/chat/${applicationId}`)
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
        <p className="text-gray-600">Chargement des embauches...</p>
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
        <h2 className="text-3xl font-bold text-gray-900">Mes Embauches</h2>
        <button
          onClick={loadHires}
          className="ml-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
        >
          🔄
        </button>
      </div>

      {/* Liste vide */}
      {hires.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune embauche confirmée</h3>
          <p className="text-gray-600">Les talents validés apparaîtront ici après confirmation dans le chat.</p>
        </div>
      )}

      {/* Liste des embauches */}
      <div className="space-y-4">
        {hires.map(hire => (
          <div
            key={hire.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Info talent + mission */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-lg">
                      {hire.talent?.first_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {hire.talent?.first_name || '—'} {hire.talent?.last_name || ''}
                    </h3>
                    <div className="flex gap-3 text-sm text-gray-500">
                      {hire.talent?.phone && <span>📞 {hire.talent.phone}</span>}
                      {hire.talent?.email && <span>✉️ {hire.talent.email}</span>}
                      {hire.talent?.years_experience > 0 && (
                        <span>⭐ {hire.talent.years_experience} an{hire.talent.years_experience > 1 ? 's' : ''} d'exp.</span>
                      )}
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-auto">
                    ✅ Confirmé
                  </span>
                </div>

                {/* Mission */}
                {hire.mission && (
                  <div className="p-3 bg-green-50 rounded-lg text-sm">
                    <p className="font-medium text-gray-900">
                      {getPositionLabel(hire.mission.position)}
                    </p>
                    <p className="text-gray-600 mt-1">
                      📅 {formatDate(hire.mission.start_date)}
                      {hire.mission.end_date && ` → ${formatDate(hire.mission.end_date)}`}
                    </p>
                    {(hire.mission.shift_start_time || hire.mission.shift_end_time) && (
                      <p className="text-gray-600">
                        🕐 {formatTime(hire.mission.shift_start_time)}
                        {hire.mission.shift_end_time && ` - ${formatTime(hire.mission.shift_end_time)}`}
                        {hire.mission.service_continu ? ' (continu)' : ' (avec coupure)'}
                      </p>
                    )}
                    {hire.mission.hourly_rate ? (
                      <p className="text-gray-600">💰 {parseFloat(hire.mission.hourly_rate).toFixed(2)} €/h</p>
                    ) : hire.mission.salary_text ? (
                      <p className="text-gray-600">💰 {hire.mission.salary_text}</p>
                    ) : null}
                  </div>
                )}

                {/* Date de confirmation */}
                <p className="text-xs text-gray-400 mt-2">
                  Confirmé le {new Date(hire.updated_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>

              {/* Action */}
              <div>
                <button
                  onClick={() => handleOpenChat(hire.id)}
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
