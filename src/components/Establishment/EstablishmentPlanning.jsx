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
        .select('id, position, start_date, end_date, shift_start_time, shift_end_time, shift_text, status, nb_postes, nb_postes_pourvus')
        .eq('establishment_id', establishmentId)
        .in('status', ['open', 'filled', 'closed'])
        .order('start_date', { ascending: true })

      // RDV confirmés
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id, scheduled_at, address, note, status,
          applications (
            id,
            talents!talent_id ( first_name, last_name, phone ),
            missions ( position )
          )
        `)
        .in('status', ['confirmed', 'done'])
        .order('scheduled_at', { ascending: true })

      const grouped = {}

      // Ajouter les missions
      if (missions) {
        const missionIds = missions.map(m => m.id)
        // Récupérer aussi le phone et hire_status
        const { data: applications } = await supabase
          .from('applications')
          .select(`id, mission_id, status, hire_status, talents!talent_id ( first_name, last_name, phone )`)
          .in('mission_id', missionIds)
          .in('status', ['accepted', 'confirmed'])

        missions.forEach(mission => {
          if (!mission.start_date) return
          const date = new Date(mission.start_date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

          if (!grouped[monthKey]) {
            grouped[monthKey] = { label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), items: [] }
          }

          const missionApps = applications ? applications.filter(a => a.mission_id === mission.id) : []
          const talents = missionApps.map(a => ({
            name: `${a.talents?.first_name || '?'} ${a.talents?.last_name || ''}`.trim(),
            shortName: `${a.talents?.first_name || '?'} ${a.talents?.last_name?.charAt(0) || '?'}.`,
            phone: a.talents?.phone || null,
            status: a.status,
            hireStatus: a.hire_status
          }))
          const hiredTalent = talents.find(t => t.hireStatus === 'hired')

          grouped[monthKey].items.push({
            type: 'mission',
            id: mission.id,
            position: getPositionLabel(mission.position),
            startDate: mission.start_date,
            endDate: mission.end_date,
            shiftStart: mission.shift_start_time,
            shiftEnd: mission.shift_end_time,
            shiftText: mission.shift_text,
            status: mission.status,
            nb_postes: mission.nb_postes,
            nb_postes_pourvus: mission.nb_postes_pourvus,
            talents,
            hiredTalent
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
            grouped[monthKey] = { label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), items: [] }
          }

          grouped[monthKey].items.push({
            type: 'rdv',
            id: appt.id,
            scheduledAt: appt.scheduled_at,
            address: appt.address,
            note: appt.note,
            status: appt.status,
            talentName: `${app.talents?.first_name || '?'} ${app.talents?.last_name || '?'}`,
            talentPhone: app.talents?.phone || null,
            position: getPositionLabel(app.missions?.position)
          })
        })
      }

      // Tri par date
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

  // Formatte un numéro français "0612345678" → "06 12 34 56 78"
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

  const sharedStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
      .planning-v8 { font-family: 'Montserrat', system-ui, sans-serif; letter-spacing: -0.005em; }
      .planning-v8 * { font-family: 'Montserrat', system-ui, sans-serif; }
      .gradient-text {
        background: linear-gradient(120deg, #1D4ED8 0%, #0EA5E9 60%, #3B82F6 100%);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      .btn-primary-gradient {
        background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
        box-shadow: 0 8px 24px rgba(29, 78, 216, 0.20);
        transition: all 0.25s ease;
      }
      .btn-primary-gradient:hover { transform: translateY(-1px); box-shadow: 0 16px 40px rgba(29, 78, 216, 0.30); }
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
            <p className="text-slate-600 text-sm font-medium mb-5">
              Créez votre première mission pour la voir apparaître dans le planning.
            </p>
            <button
              onClick={() => navigate('/establishment/create-mission')}
              className="btn-primary-gradient px-5 py-3 rounded-xl text-white font-bold inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Créer une mission
            </button>
          </div>
        ) : (
          <div className="space-y-7">
            {monthKeys.map(monthKey => {
              const month = planningData[monthKey]
              const rdvCount = month.items.filter(i => i.type === 'rdv').length
              const missionCount = month.items.filter(i => i.type === 'mission').length
              return (
                <div key={monthKey}>
                  {/* Header de mois */}
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
                                <p className="text-sm font-bold text-slate-900 mb-1">
                                  {item.talentName} <span className="text-slate-500 font-medium">— {item.position}</span>
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
                                {item.talentPhone && (
                                  <a href={`tel:${item.talentPhone.replace(/\D/g, '')}`}
                                     className="phone-link inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                     style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)' }}>
                                    📞 {formatPhone(item.talentPhone)}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      }

                      // ─── Carte Mission ───
                      const isHired = !!item.hiredTalent
                      const isFilled = item.status === 'filled'
                      const shift = getShiftDisplay(item)

                      // Status badge
                      let statusBadge
                      if (isFilled) {
                        statusBadge = { label: '🎉 Embauche validée', bg: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)', color: '#1E40AF', border: '#93C5FD' }
                      } else if (item.status === 'closed') {
                        statusBadge = { label: 'Clôturée', bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' }
                      } else if (item.nb_postes_pourvus > 0 && item.nb_postes_pourvus < item.nb_postes) {
                        statusBadge = { label: `${item.nb_postes_pourvus}/${item.nb_postes}`, bg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', color: '#92400E', border: '#FCD34D' }
                      } else {
                        statusBadge = { label: '🟢 Ouverte', bg: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', color: '#065F46', border: '#A7F3D0' }
                      }

                      return (
                        <div key={`mission-${item.id}`}
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
                                {item.nb_postes > 1 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: '#EEF2FF', color: '#4338CA' }}>
                                    👥 {item.nb_postes} postes
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-semibold mb-2">
                                <span>📆 {formatDate(item.startDate)}{item.endDate && item.endDate !== item.startDate && ` → ${formatDate(item.endDate)}`}</span>
                                {shift && <span>🕐 {shift}</span>}
                              </div>

                              {/* Talents affectés */}
                              {item.talents.length > 0 && !isHired && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {item.talents.map((t, i) => (
                                    <span key={i}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                                          style={t.status === 'confirmed'
                                            ? { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }
                                            : { background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                                      {t.status === 'confirmed' ? '✅' : '⏳'} {t.shortName}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ZONE CONTACT EMBAUCHÉ (le cœur de la Phase 5) */}
                          {isHired && item.hiredTalent && (
                            <div className="mt-3 pt-3 border-t border-blue-100">
                              <div className="rounded-xl p-3"
                                   style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', border: '2px solid #6EE7B7' }}>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 mb-0.5">
                                      🔓 Contact direct
                                    </div>
                                    <p className="text-sm font-bold text-emerald-900">
                                      {item.hiredTalent.name}
                                    </p>
                                  </div>
                                  {item.hiredTalent.phone ? (
                                    <a href={`tel:${item.hiredTalent.phone.replace(/\D/g, '')}`}
                                       className="phone-link inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold text-white"
                                       style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.30)' }}>
                                      📞 {formatPhone(item.hiredTalent.phone)}
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
