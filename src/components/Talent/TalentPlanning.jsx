import { useState, useEffect } from 'react'
import { supabase, POSITION_TYPES } from '../../lib/supabase'

export default function TalentPlanning({ talentId, onBack }) {
  const [loading, setLoading] = useState(true)
  const [planningData, setPlanningData] = useState({})

  useEffect(() => {
    if (talentId) loadPlanning()
  }, [talentId])

  const loadPlanning = async () => {
    try {
      // Missions acceptées/confirmées
      const { data: applications } = await supabase
        .from('applications')
        .select(`
          id, status,
          missions!mission_id (
            id, position, start_date, end_date,
            shift_start_time, shift_end_time,
            hourly_rate, location_fuzzy,
            establishments ( name )
          )
        `)
        .eq('talent_id', talentId)
        .in('status', ['accepted', 'confirmed'])
        .order('created_at', { ascending: true })

      // RDV confirmés pour ce talent
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id, scheduled_at, address, note, status,
          applications!application_id (
            talent_id,
            missions ( position, establishments ( name ) )
          )
        `)
        .in('status', ['confirmed', 'done'])
        .order('scheduled_at', { ascending: true })

      // Filtrer les RDV qui appartiennent à ce talent
      const myAppointments = (appointments || []).filter(appt => {
        return appt.applications?.talent_id === talentId
      })

      const grouped = {}

      // Ajouter les missions
      if (applications) {
        applications.forEach(app => {
          const mission = app.missions
          if (!mission || !mission.start_date) return

          const date = new Date(mission.start_date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

          if (!grouped[monthKey]) {
            grouped[monthKey] = {
              label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
              items: []
            }
          }

          grouped[monthKey].items.push({
            type: 'mission',
            applicationId: app.id,
            status: app.status,
            position: getPositionLabel(mission.position),
            startDate: mission.start_date,
            endDate: mission.end_date,
            shiftStart: mission.shift_start_time,
            shiftEnd: mission.shift_end_time,
            hourlyRate: mission.hourly_rate,
            location: mission.location_fuzzy,
            establishmentName: mission.establishments?.name || '—'
          })
        })
      }

      // Ajouter les RDV confirmés
      myAppointments.forEach(appt => {
        const date = new Date(appt.scheduled_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
            items: []
          }
        }

        const mission = appt.applications?.missions
        grouped[monthKey].items.push({
          type: 'rdv',
          id: appt.id,
          scheduledAt: appt.scheduled_at,
          address: appt.address,
          note: appt.note,
          status: appt.status,
          position: getPositionLabel(mission?.position),
          establishmentName: mission?.establishments?.name || '—'
        })
      })

      // Trier par date
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
    return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
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

  const getStatusBadge = (status) => {
    if (status === 'confirmed') return { label: '✅ Confirmé', color: 'bg-green-100 text-green-700' }
    if (status === 'accepted') return { label: '⏳ En attente', color: 'bg-amber-100 text-amber-700' }
    return { label: status, color: 'bg-gray-100 text-gray-600' }
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
        <h2 className="text-3xl font-bold text-gray-900">📅 Mon Planning</h2>
      </div>

      {monthKeys.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune mission planifiée</h3>
          <p className="text-gray-600">Vos missions et rendez-vous confirmés apparaîtront ici.</p>
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
                              <p className="text-sm font-medium text-primary-600 mb-1">
                                🏪 {item.establishmentName} — {item.position}
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
                    const badge = getStatusBadge(item.status)
                    return (
                      <div key={`mission-${item.applicationId}`} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-900">{item.position}</h4>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-sm text-primary-600 font-medium mb-1">
                              🏪 {item.establishmentName}
                            </p>
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
                              {item.location && <span>📍 {item.location}</span>}
                            </div>
                          </div>
                          {item.hourlyRate && (
                            <div className="sm:text-right">
                              <span className="text-lg font-bold text-primary-600">
                                {parseFloat(item.hourlyRate).toFixed(2)}€/h
                              </span>
                            </div>
                          )}
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
