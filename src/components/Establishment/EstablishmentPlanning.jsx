import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES } from '../../lib/supabase'

export default function EstablishmentPlanning({ establishmentId, onBack }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [planningData, setPlanningData] = useState({})

  useEffect(() => {
    if (establishmentId) loadPlanning()
  }, [establishmentId])

  const loadPlanning = async () => {
    try {
      // Récupérer toutes les missions de l'établissement
      const { data: missions } = await supabase
        .from('missions')
        .select('id, position, start_date, end_date, shift_start_time, shift_end_time, status, nb_postes, nb_postes_pourvus')
        .eq('establishment_id', establishmentId)
        .in('status', ['open', 'filled', 'closed'])
        .order('start_date', { ascending: true })

      if (!missions || missions.length === 0) {
        setPlanningData({})
        setLoading(false)
        return
      }

      const missionIds = missions.map(m => m.id)

      // Récupérer les candidatures acceptées/confirmées avec infos talents
      const { data: applications } = await supabase
        .from('applications')
        .select(`
          id,
          mission_id,
          status,
          talents!talent_id (
            first_name,
            last_name
          )
        `)
        .in('mission_id', missionIds)
        .in('status', ['accepted', 'confirmed'])

      // Grouper par mois
      const grouped = {}
      
      missions.forEach(mission => {
        if (!mission.start_date) return
        
        const date = new Date(mission.start_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        
        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
            missions: []
          }
        }

        // Trouver les talents affectés à cette mission
        const missionApps = applications 
          ? applications.filter(a => a.mission_id === mission.id)
          : []

        const talents = missionApps.map(a => ({
          name: `${a.talents?.first_name || '?'} ${a.talents?.last_name?.charAt(0) || '?'}.`,
          status: a.status
        }))

        grouped[monthKey].missions.push({
          ...mission,
          positionLabel: getPositionLabel(mission.position),
          talents
        })
      })

      setPlanningData(grouped)
    } catch (err) {
      console.error('Erreur chargement planning:', err)
    } finally {
      setLoading(false)
    }
  }

  const getPositionLabel = (value) => {
    const found = POSITION_TYPES?.find(p => p.value === value)
    return found ? found.label : value || '—'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    return timeStr.substring(0, 5)
  }

  const getStatusColor = (status) => {
    if (status === 'confirmed') return 'text-green-600'
    if (status === 'accepted') return 'text-amber-600'
    return 'text-gray-500'
  }

  const getStatusIcon = (status) => {
    if (status === 'confirmed') return '✅'
    if (status === 'accepted') return '⏳'
    return '—'
  }

  const getMissionStatusBadge = (mission) => {
    if (mission.status === 'filled') {
      return { label: 'Complet', color: 'bg-green-100 text-green-700' }
    }
    if (mission.status === 'closed') {
      return { label: 'Clôturée', color: 'bg-gray-100 text-gray-600' }
    }
    const pourvus = mission.nb_postes_pourvus || 0
    const total = mission.nb_postes || 1
    if (pourvus > 0 && pourvus < total) {
      return { label: `${pourvus}/${total}`, color: 'bg-amber-100 text-amber-700' }
    }
    return { label: 'Ouverte', color: 'bg-blue-100 text-blue-700' }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement du planning...</p>
      </div>
    )
  }

  const monthKeys = Object.keys(planningData).sort()

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
        <h2 className="text-3xl font-bold text-gray-900">📅 Planning</h2>
      </div>

      {monthKeys.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune mission planifiée</h3>
          <p className="text-gray-600 mb-6">
            Créez votre première mission pour la voir apparaître dans le planning.
          </p>
          <button
            onClick={() => navigate('/establishment/create-mission')}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            + Créer une mission
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {monthKeys.map(monthKey => {
            const month = planningData[monthKey]
            return (
              <div key={monthKey}>
                {/* Titre du mois */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm">
                    📅 {month.label}
                  </div>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-sm text-gray-500">
                    {month.missions.length} mission{month.missions.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Missions du mois */}
                <div className="space-y-3">
                  {month.missions.map(mission => {
                    const statusBadge = getMissionStatusBadge(mission)
                    return (
                      <div key={mission.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          {/* Infos mission */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-900">{mission.positionLabel}</h4>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge.color}`}>
                                {statusBadge.label}
                              </span>
                              {mission.nb_postes > 1 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                  👥 {mission.nb_postes} postes
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                              <span>
                                📆 {formatDate(mission.start_date)}
                                {mission.end_date && ` → ${formatDate(mission.end_date)}`}
                              </span>
                              {mission.shift_start_time && (
                                <span>
                                  🕐 {formatTime(mission.shift_start_time)}
                                  {mission.shift_end_time && ` - ${formatTime(mission.shift_end_time)}`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Talents affectés */}
                          <div className="sm:text-right">
                            {mission.talents.length > 0 ? (
                              <div className="space-y-1">
                                {mission.talents.map((talent, i) => (
                                  <div key={i} className={`text-sm font-medium ${getStatusColor(talent.status)}`}>
                                    {getStatusIcon(talent.status)} {talent.name}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 italic">Aucun talent affecté</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
