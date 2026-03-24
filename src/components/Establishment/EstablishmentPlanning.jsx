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
      // Missions de l'établissement
      const { data: missions } = await supabase
        .from('missions')
        .select('id, position, start_date, end_date, shift_start_time, shift_end_time, status, nb_postes, nb_postes_pourvus')
        .eq('establishment_id', establishmentId)
        .in('status', ['open', 'filled', 'closed'])
        .order('start_date', { ascending: true })

      // RDV confirmés pour cet établissement
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id, scheduled_at, address, note, status,
          applications (
            id,
            talents!talent_id ( first_name, last_name ),
            missions ( position )
          )
        `)
        .in('status', ['confirmed', 'done'])
        .order('scheduled_at', { ascending: true })

      const grouped = {}

      // Ajouter les missions
      if (missions) {
        const missionIds = missions.map(m => m.id)
        const { data: applications } = await supabase
          .from('applications')
          .select(`id, mission_id, status, talents!talent_id ( first_name, last_name )`)
          .in('mission_id', missionIds)
          .in('status', ['accepted', 'confirmed'])

        missions.forEach(mission => {
          if (!mission.start_date) return
          const date = new Date(mission.start_date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

          if (!grouped[monthKey]) {
            grouped[monthKey] = {
              label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
              items: []
            }
          }

          const missionApps = applications ? applications.filter(a => a.mission_id === mission.id) : []
          const talents = missionApps.map(a => ({
            name: `${a.talents?.first_name || '?'} ${a.talents?.last_name?.charAt(0) || '?'}.`,
            status: a.status
          }))

          grouped[monthKey].items.push({
            type: 'mission',
            id: mission.id,
            position: getPositionLabel(mission.position),
            startDate: mission.start_date,
            endDate: mission.end_date,
            shiftStart: mission.shift_start_time,
            shiftEnd: mission.shift_end_time,
            status: mission.status,
            nb_postes: mission.nb_postes,
            nb_postes_pourvus: mission.nb_postes_pourvus,
            talents
          })
        })
      }

      // Ajouter les RDV confirmés
      if (appointments) {
        appointments.forEach(appt => {
          const app = appt.applications
          if (!app) return
          const date = new Date(appt.scheduled_at)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

          if (!grouped[monthKey]) {
            grouped[monthKey] = {
              label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
              items: []
            }
          }

          grouped[monthKey].items.push({
            type: 'rdv',
            id: appt.id,
            scheduledAt: appt.scheduled_at,
            address: appt.address,
            note: appt.note,
            status: appt.status,
            talentName: `${app.talents?.first_name || '?'} ${app.talents?.last_name || '?'}`,
            position: getPositionLabel(app.missions?.position)
          })
        })
      }

      // Trier les items par date dans chaque mois
      Object.keys(grouped).forEach(key => {
        grouped[key].items.sort((a, b) => {
          const dateA = new Date(a.startDate || a.scheduledAt)
          const dateB = new Date(b.startDate || b.scheduledAt)
          return dateA - dateB
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
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      + ' · '
      + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
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

  const getMissionStatusBadge = (item) => {
    if (item.status === 'filled') return { label: 'Complet', color: 'bg-green-100 text-green-700' }
    if (item.status === 'closed') return { label: 'Clôturée', color: 'bg-gray-100 text-gray-600' }
    const pourvus = item.nb_postes_pourvus || 0
    const total = item.nb_postes || 1
    if (pourvus > 0 && pourvus < total) return { label: `${pourvus}/${total}`, color: 'bg-amber-100 text-amber-700' }
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
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onBack} className="text-primary-600 hover:text-primary-700 font-medium">
          ← Retour
        </button>
        <h2 className="text-3xl font-bold text-gray-900">📅 Planning</h2>
      </div>

      {monthKeys.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune mission planifiée</h3>
          <p className="text-gray-600 mb-6">Créez votre première mission pour la voir apparaître dans le planning.</p>
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
            const rdvCount = month.items.filter(i => i.type === 'rdv').length
            const missionCount = month.items.filter(i => i.type === 'mission').length
            return (
              <div key={monthKey}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm">
                    📅 {month.label}
                  </div>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-sm text-gray-500">
                    {missionCount > 0 && `${missionCount} mission${missionCount > 1 ? 's' : ''}`}
                    {missionCount > 0 && rdvCount > 0 && ' · '}
                    {rdvCount > 0 && `${rdvCount} RDV`}
                  </span>
                </div>

                <div className="space-y-3">
                  {month.items.map(item => {

                    // ── Carte RDV ──
                    if (item.type === 'rdv') {
                      return (
                        <div key={`rdv-${item.id}`} className="bg-amber-50 rounded-lg border-2 border-amber-200 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-amber-600 font-bold text-sm">🗓 Entretien</span>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                  {item.status === 'done' ? '✅ Effectué' : '✅ Confirmé'}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                {item.talentName} — {item.position}
                              </p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                <span className="capitalize">📆 {formatDateTime(item.scheduledAt)}</span>
                                {item.address && <span>📍 {item.address}</span>}
                              </div>
                              {item.note && (
                                <p className="text-xs text-amber-600 italic mt-1">💬 {item.note}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // ── Carte Mission ──
                    const statusBadge = getMissionStatusBadge(item)
                    return (
                      <div key={`mission-${item.id}`} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-900">{item.position}</h4>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge.color}`}>
                                {statusBadge.label}
                              </span>
                              {item.nb_postes > 1 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                  👥 {item.nb_postes} postes
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                              <span>
                                📆 {formatDate(item.startDate)}
                                {item.endDate && ` → ${formatDate(item.endDate)}`}
                              </span>
                              {item.shiftStart && (
                                <span>
                                  🕐 {formatTime(item.shiftStart)}
                                  {item.shiftEnd && ` - ${formatTime(item.shiftEnd)}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="sm:text-right">
                            {item.talents.length > 0 ? (
                              <div className="space-y-1">
                                {item.talents.map((talent, i) => (
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
