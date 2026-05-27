import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, DURATION_TYPES } from '../../lib/supabase'

export default function MyMissions({ establishmentId, onBack }) {
  const navigate = useNavigate()
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'open', 'filled', 'alert', 'closed', 'expired'
  const [search, setSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState(null) // { type, missionId, missionTitle }
  const [subscriptionPlan, setSubscriptionPlan] = useState(null)

  useEffect(() => {
    if (establishmentId) {
      loadMissions()
      loadSubscription()
    }
  }, [establishmentId])

  const loadSubscription = async () => {
    try {
      const { data } = await supabase
        .from('establishments')
        .select('subscription_plan')
        .eq('id', establishmentId)
        .single()
      if (data) setSubscriptionPlan(data.subscription_plan)
    } catch (err) {
      console.error('Erreur chargement abonnement:', err)
    }
  }

  const isClubMember = subscriptionPlan === 'club'

  const loadMissions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('establishment_id', establishmentId)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        const missionIds = data.map(m => m.id)
        const { data: apps } = await supabase
          .from('applications')
          .select('mission_id, status, hire_status, talent_id')
          .in('mission_id', missionIds)

        // Récupérer les noms des talents embauchés
        const hiredTalentIds = (apps || [])
          .filter(a => a.hire_status === 'hired')
          .map(a => a.talent_id)
        let hiredTalentsMap = {}
        if (hiredTalentIds.length > 0) {
          const { data: talents } = await supabase
            .from('talents')
            .select('id, first_name, last_name')
            .in('id', hiredTalentIds)
          if (talents) {
            hiredTalentsMap = talents.reduce((acc, t) => {
              acc[t.id] = `${t.first_name} ${t.last_name || ''}`.trim()
              return acc
            }, {})
          }
        }

        const enriched = data.map(mission => {
          const missionApps = apps ? apps.filter(a => a.mission_id === mission.id) : []
          const hiredApp = missionApps.find(a => a.hire_status === 'hired')
          return {
            ...mission,
            candidatesCount: missionApps.filter(a => a.status === 'interested').length,
            acceptedCount: missionApps.filter(a => a.status === 'accepted').length,
            hiredCount: missionApps.filter(a => a.hire_status === 'hired').length,
            hiredTalentName: hiredApp ? hiredTalentsMap[hiredApp.talent_id] : null
          }
        })
        setMissions(enriched)
      } else {
        setMissions([])
      }
    } catch (err) {
      console.error('Erreur chargement missions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculer l'état visuel de chaque mission
  const getMissionState = (mission) => {
    if (mission.status === 'expired') return 'expired'
    if (mission.status === 'filled') return 'filled'
    if (mission.status === 'closed' || mission.status === 'cancelled') return 'closed'
    if (mission.status === 'pending') return 'pending'

    // status === 'open' ou 'active' → check date alert
    const refDate = mission.end_date || mission.start_date
    if (refDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const ref = new Date(refDate)
      ref.setHours(0, 0, 0, 0)
      if (ref < today) return 'alert'
    }
    return 'open'
  }

  // Compteurs par état
  const counts = useMemo(() => {
    const c = { all: missions.length, open: 0, filled: 0, alert: 0, closed: 0, expired: 0 }
    missions.forEach(m => {
      const state = getMissionState(m)
      if (state === 'open') c.open++
      else if (state === 'filled') c.filled++
      else if (state === 'alert') c.alert++
      else if (state === 'closed') c.closed++
      else if (state === 'expired') c.expired++
    })
    return c
  }, [missions])

  // Filtrer + rechercher
  const filteredMissions = useMemo(() => {
    return missions.filter(m => {
      const state = getMissionState(m)
      if (filter !== 'all' && state !== filter) return false
      if (search.trim()) {
        const positionLabel = getPositionLabel(m.position).toLowerCase()
        const term = search.trim().toLowerCase()
        if (!positionLabel.includes(term) && !(m.comment || '').toLowerCase().includes(term)) return false
      }
      return true
    })
  }, [missions, filter, search])

  // Missions en alerte (toujours affichées en haut si on est sur 'all')
  const alertMissions = useMemo(() => {
    return missions.filter(m => getMissionState(m) === 'alert')
  }, [missions])

  const handleCloseMission = async (missionId) => {
    try {
      const { error } = await supabase
        .from('missions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', missionId)
      if (error) throw error
      setConfirmAction(null)
      loadMissions()
    } catch (err) {
      console.error('Erreur clôture mission:', err)
      alert('Erreur lors de la clôture de la mission')
    }
  }

  const handleReopenMission = async (missionId) => {
    try {
      const { error } = await supabase
        .from('missions')
        .update({
          status: 'open',
          closed_at: null,
          nb_postes_pourvus: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', missionId)
      if (error) throw error
      loadMissions()
    } catch (err) {
      console.error('Erreur réouverture mission:', err)
    }
  }

  // Relance d'une mission expirée
  // Membre Club → relance gratuite directe (repart pour 1 mois)
  // Non-membre → redirection vers l'abonnement Club
  const handleRelaunchMission = async (missionId) => {
    if (!isClubMember) {
      navigate('/establishment/subscribe')
      return
    }
    try {
      const { error } = await supabase
        .from('missions')
        .update({
          status: 'open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', missionId)
      if (error) throw error
      loadMissions()
    } catch (err) {
      console.error('Erreur relance mission:', err)
      alert('Erreur lors de la relance de la mission')
    }
  }

  const handleDeleteMission = async (missionId) => {
    try {
      await supabase.from('applications').delete().eq('mission_id', missionId)
      const { error } = await supabase.from('missions').delete().eq('id', missionId)
      if (error) throw error
      setConfirmAction(null)
      loadMissions()
    } catch (err) {
      console.error('Erreur suppression mission:', err)
      alert('Erreur lors de la suppression')
    }
  }

  // Helpers
  function getPositionLabel(value) {
    const found = POSITION_TYPES?.find(p => p.value === value)
    return found ? found.label : value || '—'
  }
  function getContractLabel(value) {
    const found = CONTRACT_TYPES?.find(c => c.value === value)
    return found ? found.label : value || '—'
  }
  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  function formatShortDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  function formatTime(timeStr) {
    if (!timeStr) return ''
    return timeStr.substring(0, 5)
  }
  function getShiftDisplay(mission) {
    if (mission.shift_text) return mission.shift_text
    if (mission.shift_start_time && mission.shift_end_time) {
      return `${formatTime(mission.shift_start_time)} - ${formatTime(mission.shift_end_time)}`
    }
    return null
  }
  function getSalaryDisplay(mission) {
    if (mission.monthly_rate) return `${parseFloat(mission.monthly_rate).toFixed(0)} € net/mois`
    if (mission.hourly_rate) return `${parseFloat(mission.hourly_rate).toFixed(2)} €/h`
    if (mission.salary_text) return mission.salary_text
    return null
  }
  function getContractColor(contract) {
    if (contract === 'extra') return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
    if (contract === 'cdd') return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' }
    if (contract === 'cdi') return { bg: '#F5F3FF', text: '#5B21B6', border: '#C4B5FD' }
    return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' }
  }
  function getContractIcon(contract) {
    if (contract === 'extra') return '⚡'
    if (contract === 'cdd') return '📅'
    if (contract === 'cdi') return '💼'
    return ''
  }

  const sharedStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
      .my-missions-v8 { font-family: 'Montserrat', system-ui, sans-serif; letter-spacing: -0.005em; }
      .my-missions-v8 * { font-family: 'Montserrat', system-ui, sans-serif; }
      .gradient-text {
        background: linear-gradient(120deg, #1D4ED8 0%, #0EA5E9 60%, #3B82F6 100%);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      .btn-primary-gradient {
        background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
        position: relative; overflow: hidden;
        box-shadow: 0 8px 24px rgba(29, 78, 216, 0.20);
        transition: all 0.25s ease;
      }
      .btn-primary-gradient::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, #0EA5E9 0%, #1D4ED8 100%);
        opacity: 0; transition: opacity 0.25s;
      }
      .btn-primary-gradient:hover:not(:disabled)::before { opacity: 1; }
      .btn-primary-gradient > * { position: relative; z-index: 1; }
      .btn-primary-gradient:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 16px 40px rgba(29, 78, 216, 0.30);
      }
      .mission-card-v8 {
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .mission-card-v8:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(10, 37, 64, 0.10);
      }
      @keyframes pulse-red {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
        50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
      }
      .pastille-alert { animation: pulse-red 2s infinite; }
      .chip-filter { transition: all 0.2s ease; }
      .chip-filter:hover { transform: translateY(-1px); }
      .search-input { transition: all 0.2s ease; }
      .search-input:focus {
        border-color: #1D4ED8;
        box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.12);
        outline: none;
      }
    `}</style>
  )

  if (loading) {
    return (
      <>
        {sharedStyles}
        <div className="my-missions-v8 text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)', boxShadow: '0 12px 32px rgba(29, 78, 216, 0.35)' }}>
            <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
          <p className="text-slate-600 font-semibold">Chargement des missions…</p>
        </div>
      </>
    )
  }

  return (
    <>
      {sharedStyles}
      <div className="my-missions-v8">

        {/* HEADER */}
        <div className="mb-5">
          <button onClick={onBack} className="text-blue-700 hover:text-blue-800 font-bold inline-flex items-center gap-1.5 text-sm mb-3">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Retour
          </button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.03em' }}>
              Mes <span className="gradient-text">Missions</span>
            </h2>
            <button
              onClick={() => navigate('/establishment/create-mission')}
              className="btn-primary-gradient px-4 py-2.5 rounded-xl text-white font-bold text-sm inline-flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nouvelle mission
            </button>
          </div>
        </div>

        {/* ALERTE GLOBALE si missions en alerte */}
        {alertMissions.length > 0 && filter === 'all' && (
          <div className="mb-5 rounded-2xl p-4 border-2 flex items-center gap-3"
               style={{ background: 'linear-gradient(135deg, #FEE2E2, #FECACA)', borderColor: '#FCA5A5' }}>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl flex-shrink-0 shadow-sm">🚨</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-900">
                {alertMissions.length} mission{alertMissions.length > 1 ? 's' : ''} non validée{alertMissions.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-700 font-medium mt-0.5">
                Date dépassée sans embauche. Pensez à valider ou clôturer.
              </p>
            </div>
            <button
              onClick={() => setFilter('alert')}
              className="px-3 py-2 rounded-lg bg-white text-red-700 text-xs font-bold border-2 border-red-300 hover:bg-red-50 transition-all whitespace-nowrap"
            >
              Voir →
            </button>
          </div>
        )}

        {/* RECHERCHE + FILTRES */}
        <div className="mb-5 space-y-3">
          {/* Recherche */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par poste ou commentaire…"
              className="search-input w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 bg-white"
            />
          </div>

          {/* Filtres chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Toutes', count: counts.all, color: 'slate' },
              { value: 'open', label: '🟢 Ouvertes', count: counts.open, color: 'green' },
              { value: 'filled', label: '🔵 Validées', count: counts.filled, color: 'blue' },
              { value: 'alert', label: '🔴 Alerte', count: counts.alert, color: 'red' },
              { value: 'closed', label: 'Clôturées', count: counts.closed, color: 'slate' },
              { value: 'expired', label: '⏳ Expirées', count: counts.expired, color: 'amber' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`chip-filter px-3 py-2 rounded-full text-sm font-bold border-2 transition-all inline-flex items-center gap-1.5 ${
                  filter === f.value
                    ? 'text-white border-transparent shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
                style={filter === f.value ? { background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' } : {}}
              >
                <span>{f.label}</span>
                <span className={`text-[10px] font-bold px-1.5 rounded ${filter === f.value ? 'bg-white/25' : 'bg-slate-100'}`}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* LISTE VIDE */}
        {filteredMissions.length === 0 && (
          <div className="bg-white rounded-2xl border border-blue-100 p-10 text-center"
               style={{ boxShadow: '0 4px 16px rgba(10, 37, 64, 0.04)' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl"
                 style={{ background: 'linear-gradient(135deg, #DBEAFE, #BAE6FD)' }}>📝</div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2" style={{ letterSpacing: '-0.025em' }}>
              {search ? 'Aucun résultat' : filter === 'open' ? 'Aucune mission ouverte' : 'Aucune mission'}
            </h3>
            <p className="text-slate-600 text-sm font-medium mb-5">
              {search
                ? 'Essayez d\'autres mots-clés'
                : filter === 'all'
                  ? 'Créez votre première mission pour recevoir des candidatures !'
                  : 'Aucune mission avec ce filtre.'
              }
            </p>
            {!search && filter === 'all' && (
              <button
                onClick={() => navigate('/establishment/create-mission')}
                className="btn-primary-gradient px-5 py-3 rounded-xl text-white font-bold inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Créer une mission
              </button>
            )}
          </div>
        )}

        {/* LISTE DES MISSIONS */}
        <div className="space-y-3">
          {filteredMissions.map(mission => {
            const state = getMissionState(mission)
            const contractColor = getContractColor(mission.contract_type)
            const shift = getShiftDisplay(mission)
            const salary = getSalaryDisplay(mission)

            // Pastille styling
            let pastilleBg, pastilleIcon, pastilleClass = ''
            if (state === 'open') {
              pastilleBg = 'linear-gradient(135deg, #10B981, #059669)'
              pastilleIcon = '🟢'
            } else if (state === 'filled') {
              pastilleBg = 'linear-gradient(135deg, #1D4ED8, #0EA5E9)'
              pastilleIcon = '✅'
            } else if (state === 'alert') {
              pastilleBg = 'linear-gradient(135deg, #EF4444, #DC2626)'
              pastilleIcon = '🚨'
              pastilleClass = 'pastille-alert'
            } else if (state === 'pending') {
              pastilleBg = 'linear-gradient(135deg, #F59E0B, #D97706)'
              pastilleIcon = '⏳'
            } else if (state === 'expired') {
              pastilleBg = 'linear-gradient(135deg, #F59E0B, #B45309)'
              pastilleIcon = '⏳'
            } else {
              pastilleBg = 'linear-gradient(135deg, #94A3B8, #64748B)'
              pastilleIcon = '🔒'
            }

            return (
              <div
                key={mission.id}
                className="mission-card-v8 bg-white rounded-2xl border border-blue-100 p-4 sm:p-5"
                style={{ boxShadow: '0 2px 8px rgba(10, 37, 64, 0.04)' }}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* PASTILLE */}
                  <div className={`${pastilleClass} w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl sm:text-2xl flex-shrink-0`}
                       style={{ background: pastilleBg }}>
                    {pastilleIcon}
                  </div>

                  {/* INFO MISSION */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight" style={{ letterSpacing: '-0.015em' }}>
                        {getPositionLabel(mission.position)}
                      </h3>
                      {mission.urgency_level === 'urgent' && state === 'open' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse"
                              style={{ background: 'linear-gradient(135deg, #FEE2E2, #FECACA)', color: '#991B1B', border: '1px solid #FCA5A5' }}>
                          ⚡ URGENT
                        </span>
                      )}
                    </div>

                    {/* État + nom embauché (si validée) */}
                    {state === 'filled' && mission.hiredTalentName && (
                      <p className="text-xs text-blue-700 font-bold mt-1 inline-flex items-center gap-1">
                        🎉 Embauché : {mission.hiredTalentName}
                      </p>
                    )}
                    {state === 'alert' && (
                      <p className="text-xs text-red-700 font-bold mt-1">
                        ⚠️ Date dépassée — Pensez à valider ou clôturer
                      </p>
                    )}
                    {state === 'expired' && (
                      <p className="text-xs text-amber-700 font-bold mt-1">
                        ⏳ Expirée après 1 mois — Relancez-la pour la republier
                      </p>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
                            style={{ background: contractColor.bg, color: contractColor.text, borderColor: contractColor.border }}>
                        {getContractIcon(mission.contract_type)} {getContractLabel(mission.contract_type)}
                      </span>
                      <span className="text-[11px] text-slate-600 font-semibold inline-flex items-center gap-1">
                        📅 {formatShortDate(mission.start_date)}
                        {mission.end_date && mission.end_date !== mission.start_date && (
                          <> → {formatShortDate(mission.end_date)}</>
                        )}
                      </span>
                      {shift && (
                        <span className="text-[11px] text-slate-600 font-semibold inline-flex items-center gap-1">
                          🕐 {shift}
                        </span>
                      )}
                      {salary && (
                        <span className="text-[11px] text-blue-700 font-bold inline-flex items-center gap-1">
                          💰 {salary}
                        </span>
                      )}
                    </div>

                    {mission.comment && (
                      <p className="text-xs text-slate-500 italic mt-2 line-clamp-2 font-medium">
                        "{mission.comment}"
                      </p>
                    )}

                    {/* Compteurs candidats */}
                    {(state === 'open' || state === 'alert') && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {mission.candidatesCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                                style={{ background: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)', color: '#1E40AF' }}>
                            👥 {mission.candidatesCount} candidat{mission.candidatesCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {mission.acceptedCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                                style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', color: '#92400E' }}>
                            💬 {mission.acceptedCount} conversation{mission.acceptedCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {mission.candidatesCount === 0 && mission.acceptedCount === 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                            En attente de candidats…
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2 flex-wrap">
                  {state === 'open' || state === 'alert' ? (
                    <>
                      <button
                        onClick={() => navigate(`/establishment/edit-mission/${mission.id}`)}
                        className="flex-1 min-w-[100px] px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5"
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'close', missionId: mission.id, missionTitle: getPositionLabel(mission.position) })}
                        className="flex-1 min-w-[100px] px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5"
                      >
                        🔒 Clôturer
                      </button>
                    </>
                  ) : state === 'filled' ? (
                    <>
                      <button
                        onClick={() => navigate(`/establishment/edit-mission/${mission.id}`)}
                        className="flex-1 min-w-[100px] px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5"
                      >
                        🔄 Relancer
                      </button>
                    </>
                  ) : state === 'expired' ? (
                    <>
                      <button
                        onClick={() => handleRelaunchMission(mission.id)}
                        className="flex-1 min-w-[140px] px-3 py-2 rounded-xl text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 6px 18px rgba(245, 158, 11, 0.25)' }}
                      >
                        {isClubMember ? '🔄 Relancer (gratuit)' : '🔄 Relancer la mission'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleReopenMission(mission.id)}
                        className="flex-1 min-w-[100px] px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5"
                      >
                        🔓 Réouvrir
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setConfirmAction({ type: 'delete', missionId: mission.id, missionTitle: getPositionLabel(mission.position) })}
                    className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all inline-flex items-center justify-center gap-1"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* MODALE DE CONFIRMATION */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
               style={{ background: 'rgba(10, 37, 64, 0.4)', backdropFilter: 'blur(8px)' }}>
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">{confirmAction.type === 'delete' ? '🗑️' : '🔒'}</div>
                <h3 className="text-xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.025em' }}>
                  {confirmAction.type === 'delete' ? 'Supprimer la mission ?' : 'Clôturer la mission ?'}
                </h3>
                <p className="text-sm text-slate-600 font-medium mt-2">
                  <strong>{confirmAction.missionTitle}</strong>
                </p>
                <p className="text-xs text-slate-500 mt-3">
                  {confirmAction.type === 'delete'
                    ? '⚠️ Cette action est irréversible. Les candidatures liées seront aussi supprimées.'
                    : 'La mission ne sera plus visible par les Extras. Vous pourrez la réouvrir plus tard.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (confirmAction.type === 'delete') handleDeleteMission(confirmAction.missionId)
                    else handleCloseMission(confirmAction.missionId)
                  }}
                  className="flex-1 py-3 rounded-xl text-white font-bold transition-all hover:-translate-y-0.5"
                  style={confirmAction.type === 'delete'
                    ? { background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)' }
                    : { background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)' }}
                >
                  {confirmAction.type === 'delete' ? 'Supprimer' : 'Clôturer'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
