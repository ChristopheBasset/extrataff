import { useState, useEffect } from 'react'
import { supabase, formatDate } from '../../lib/supabase'

export default function EstablishmentAgenda({ establishmentId }) {
  const [confirmedMissions, setConfirmedMissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConfirmedMissions()
  }, [establishmentId])

  const loadConfirmedMissions = async () => {
    try {
      // Récupérer les missions de l'établissement
      const { data: missions } = await supabase
        .from('missions')
        .select('id')
        .eq('establishment_id', establishmentId)

      if (!missions || missions.length === 0) {
        setConfirmedMissions([])
        setLoading(false)
        return
      }

      const missionIds = missions.map(m => m.id)

      // Récupérer les candidatures confirmées
      const { data } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          confirmed_at,
          missions (
            id,
            position,
            location_fuzzy,
            start_date,
            end_date,
            hourly_rate,
            shift_start_time,
            shift_end_time
          ),
          talents!talent_id (
            first_name,
            last_name,
            phone,
            email
          )
        `)
        .in('mission_id', missionIds)
        .eq('status', 'confirmed')
        .order('confirmed_at', { ascending: false })

      setConfirmedMissions(data || [])
    } catch (err) {
      console.error('Erreur chargement missions confirmées:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Missions Confirmées</h2>
        <p className="text-gray-600 mt-1">{confirmedMissions.length} mission(s) confirmée(s) des deux côtés</p>
      </div>

      {confirmedMissions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
          <p className="text-xl text-gray-600 mb-4">📅 Aucune mission confirmée</p>
          <p className="text-gray-500">Les missions confirmées des deux côtés apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-4">
          {confirmedMissions.map(app => {
            const mission = app.missions
            const talent = app.talents
            
            return (
              <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{mission.position}</h3>
                    <p className="text-purple-600 font-medium">
                      ✅ Confirmée le {formatDate(app.confirmed_at)}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    🎉 Confirmée
                  </span>
                </div>

                {/* Infos talent */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">👤 Talent assigné</p>
                  <p className="font-semibold text-gray-900">{talent.first_name} {talent.last_name}</p>
                  {talent.phone && <p className="text-sm text-gray-600 mt-1">📱 {talent.phone}</p>}
                  {talent.email && <p className="text-sm text-gray-600">📧 {talent.email}</p>}
                </div>

                {/* Infos mission */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">📍 Lieu</p>
                    <p className="font-medium">{mission.location_fuzzy || 'Non précisé'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">📅 Début</p>
                    <p className="font-medium">{formatDate(mission.start_date)}</p>
                  </div>
                  {mission.hourly_rate && (
                    <div>
                      <p className="text-sm text-gray-600">💰 Tarif</p>
                      <p className="font-medium text-primary-600">{mission.hourly_rate}€/h</p>
                    </div>
                  )}
                  {mission.shift_start_time && mission.shift_end_time && (
                    <div>
                      <p className="text-sm text-gray-600">🕐 Horaires</p>
                      <p className="font-medium">{mission.shift_start_time.slice(0,5)} - {mission.shift_end_time.slice(0,5)}</p>
                    </div>
                  )}
                </div>

                {mission.end_date && mission.end_date !== mission.start_date && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">📅 Fin prévue: {formatDate(mission.end_date)}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">✅ Confirmée des deux côtés • Talent et établissement ont accepté</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
