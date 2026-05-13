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
          id, status, hire_status,
          missions!mission_id (
            id, position, start_date, end_date,
            shift_start_time, shift_end_time, shift_text,
            hourly_rate, monthly_rate, salary_text,
            location_fuzzy,
            establishments ( name, address, phone )
          )
        `)
        .eq('talent_id', talentId)
        .in('status', ['accepted', 'confirmed'])
        .order('created_at', { ascending: true })

      // RDV confirmés
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id, scheduled_at, address, note, status,
          applications!application_id (
            talent_id,
            missions ( position, establishments ( name, phone ) )
          )
        `)
        .in('status', ['confirmed', 'done'])
        .order('scheduled_at', { ascending: true })

      const myAppointments = (appointments || []).filter(appt => appt.applications?.talent_id === talentId)

      const grouped = {}

      if (applications) {
        applications.forEach(app => {
          const mission = app.missions
          if (!mission || !mission.start_date) return

          const date = new Date(mission.start_date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

          if (!grouped[monthKey]) {
            grouped[monthKey] = { label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), items: [] }
          }

          grouped[monthKey].items.push({
            type: 'mission',
            applicationId: app.id,
            status: app.status,
            hireStatus: app.hire_status,
            position: getPositionLabel(mission.position),
            startDate: mission.start_date,
            endDate: mission.end_date,
            shiftStart: mission.shift_start_time,
            shiftEnd: mission.shift_end_time,
            shiftText: mission.shift_text,
            hourlyRate: mission.hourly_rate,
            monthlyRate: mission.monthly_rate,
            salaryText: mission.salary_text,
            // Si embauche validée → adresse exacte ; sinon location_fuzzy
            location: app.hire_status === 'hired' ? mission.establishments?.address : mission.location_fuzzy,
            establishmentName: mission.establishments?.name || '—',
            establishmentPhone: app.hire_status === 'hired' ? mission.establishments?.phone : null
          })
        })
      }

      myAppointments.forEach(appt => {
        const date = new Date(appt.scheduled_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

        if (!grouped[monthKey]) {
          grouped[monthKey] = { label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), items: [] }
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
          establishmentName: mission?.establishments?.name || '—',
          establishmentPhone: mission?.establishments?.phone || null
        })
      })

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
      + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    return timeStr.substring(0, 5)
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    const clean = phone.replace(/\D/g, '')
    if (clean.length === 10) return clean.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
    if (clean.length === 11 && clean.startsWith('33')) return '+33 ' + clean.substring(1).replace(/(\d{2})(?=\d)/g, '$1 ').trim()
    return phone
  }

  const getShiftDisplay = (item) => {
    if (item.shiftText) return item.shiftText
    if (item.shiftStart && item.shiftEnd) return `${formatTime(item.shiftStart)} - ${formatTime(item.shiftEnd)}`
    if (item.shiftStart) return formatTime(item.shiftStart)
    return null
  }

  const getSalaryDisplay = (item) => {
    if (item.monthlyRate) return `${parseFloat(item.monthlyRate).toFixed(0)} € net/mois`
    if (item.hourlyRate) return `${parseFloat(item.hourlyRate).toFixed(2)} €/h`
    if (item.salaryText) return item.salaryText
    return null
  }

  const sharedStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
      .planning-v8 { font-family: 'Montserrat', system-ui, sans-serif; letter-spacing: -0.005em; }
      .planning-v8 * { font-family: 'Montserrat', system-ui, sans-serif; }
      .gradient-text {
        background: linear-gradient(120deg, #1D4ED8 0%, #0EA5E9 60%, #3B82F6 100%);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      .planning-card { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
      .planning-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(10, 37, 64, 0.10); }
      .phone-link {
        transition: all 0.2s ease;
        text-decoration: none;
      }
      .phone-link:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(16, 185, 129, 0.30); }
    `}</style>
  )

  if (loading) {
    return (
      <>
        {sharedStyles}
        <div className="planning-v8 text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)', boxShadow: '0 12px 32px rgba(29, 78, 216, 0.35)' }}>
            <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
          <p className="text-slate-600 font-semibold">Chargement du planning…</p>
        </div>
      </>
    )
  }

  const monthKeys = Object.keys(planningData).sort()

  return (
    <>
      {sharedStyles}
      <div className="planning-v8">
        <div className="mb-5">
          <button onClick={onBack} className="text-blue-700 hover:text-blue-800 font-bold inline-flex items-center gap-1.5 text-sm mb-3">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Retour
          </button>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.03em' }}>
            📅 Mon <span className="gradient-text">Planning</span>
          </h2>
        </div>

        {monthKeys.length === 0 ? (
          <div className="bg-white rounded-2xl border border-blue-100 p-10 text-center"
               style={{ boxShadow: '0 4px 16px rgba(10, 37, 64, 0.04)' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl"
                 style={{ background: 'linear-gradient(135deg, #DBEAFE, #BAE6FD)' }}>📅</div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2" style={{ letterSpacing: '-0.025em' }}>
              Aucune mission planifiée
            </h3>
            <p className="text-slate-600 text-sm font-medium">
              Vos missions et rendez-vous confirmés apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            {monthKeys.map(monthKey => {
              const month = planningData[monthKey]
              const rdvCount = month.items.filter(i => i.type === 'rdv').length
              const missionCount = month.items.filter(i => i.type === 'mission').length
              return (
                <div key={monthKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="px-4 py-1.5 rounded-xl font-extrabold text-sm text-white capitalize"
                         style={{ background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)', boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)', letterSpacing: '-0.015em' }}>
                      📅 {month.label}
                    </div>
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-xs text-slate-500 font-bold whitespace-nowrap">
                      {missionCount > 0 && `${missionCount} mission${missionCount > 1 ? 's' : ''}`}
                      {missionCount > 0 && rdvCount > 0 && ' · '}
                      {rdvCount > 0 && `${rdvCount} RDV`}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {month.items.map(item => {

                      // ─── Carte RDV ───
                      if (item.type === 'rdv') {
                        return (
                          <div key={`rdv-${item.id}`}
                               className="planning-card rounded-2xl border-2 p-4"
                               style={{ background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', borderColor: '#FCD34D' }}>
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg flex-shrink-0 shadow-sm">🗓️</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-sm font-extrabold text-amber-900">Entretien</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-amber-700">
                                    {item.status === 'done' ? '✅ Effectué' : '✅ Confirmé'}
                                  </span>
                                </div>
                                <p className="text-sm font-bold text-blue-700 mb-1">
                                  🏪 {item.establishmentName} <span className="text-slate-500 font-medium">— {item.position}</span>
                                </p>
                                <div className="text-xs text-amber-800 font-semibold capitalize mb-1">
                                  📆 {formatDateTime(item.scheduledAt)}
                                </div>
                                {item.address && (
                                  <div className="text-xs text-amber-700 font-medium">📍 {item.address}</div>
                                )}
                                {item.note && (
                                  <p className="text-xs text-amber-700 italic mt-1.5 font-medium">💬 {item.note}</p>
                                )}
                                {item.establishmentPhone && (
                                  <a href={`tel:${item.establishmentPhone.replace(/\D/g, '')}`}
                                     className="phone-link inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                     style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)' }}>
                                    📞 {formatPhone(item.establishmentPhone)}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      }

                      // ─── Carte Mission ───
                      const isHired = item.hireStatus === 'hired'
                      const shift = getShiftDisplay(item)
                      const salary = getSalaryDisplay(item)

                      // Status badge
                      let statusBadge
                      if (isHired) {
                        statusBadge = { label: '🎉 Embauche validée', bg: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)', color: '#1E40AF', border: '#93C5FD' }
                      } else if (item.status === 'confirmed') {
                        statusBadge = { label: '✅ Confirmé', bg: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', color: '#065F46', border: '#A7F3D0' }
                      } else {
                        statusBadge = { label: '⏳ En attente', bg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', color: '#92400E', border: '#FCD34D' }
                      }

                      return (
                        <div key={`mission-${item.applicationId}`}
                             className="planning-card bg-white rounded-2xl border border-blue-100 p-4 sm:p-5"
                             style={{ boxShadow: '0 2px 8px rgba(10, 37, 64, 0.04)' }}>
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <h4 className="font-extrabold text-slate-900 text-base" style={{ letterSpacing: '-0.015em' }}>
                                  {item.position}
                                </h4>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                      style={{ background: statusBadge.bg, color: statusBadge.color, borderColor: statusBadge.border }}>
                                  {statusBadge.label}
                                </span>
                              </div>

                              <p className="text-sm text-blue-700 font-bold mb-2">
                                🏪 {item.establishmentName}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-semibold">
                                <span>📆 {formatDate(item.startDate)}{item.endDate && item.endDate !== item.startDate && ` → ${formatDate(item.endDate)}`}</span>
                                {shift && <span>🕐 {shift}</span>}
                                {item.location && <span>📍 {item.location}</span>}
                              </div>
                            </div>
                            {salary && (
                              <div className="text-right flex-shrink-0">
                                <span className="text-lg font-extrabold gradient-text" style={{ letterSpacing: '-0.02em' }}>
                                  {salary}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* ZONE CONTACT ÉTABLISSEMENT (Phase 5) */}
                          {isHired && (
                            <div className="mt-3 pt-3 border-t border-blue-100">
                              <div className="rounded-xl p-3"
                                   style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', border: '2px solid #6EE7B7' }}>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 mb-0.5">
                                      🔓 Contact direct
                                    </div>
                                    <p className="text-sm font-bold text-emerald-900">
                                      {item.establishmentName}
                                    </p>
                                  </div>
                                  {item.establishmentPhone ? (
                                    <a href={`tel:${item.establishmentPhone.replace(/\D/g, '')}`}
                                       className="phone-link inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold text-white"
                                       style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.30)' }}>
                                      📞 {formatPhone(item.establishmentPhone)}
                                    </a>
                                  ) : (
                                    <span className="text-xs text-emerald-700 font-medium italic">
                                      Téléphone non renseigné
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
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
    </>
  )
}
