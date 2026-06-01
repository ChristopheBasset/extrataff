import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, generateFuzzyLocation } from '../../lib/supabase'

const TOP_POSITIONS = ['serveur', 'chef_de_partie', 'commis', 'plongeur', 'barman', 'runner']
const TOP_CONTRACTS = ['extra', 'cdd', 'cdi']

const parseShiftText = (txt) => {
  if (!txt) return { start: null, end: null }
  const cleaned = txt.toLowerCase().replace(/h/g, ':').replace(/\s+/g, '').replace(/à|->/g, '-')
  const parts = cleaned.split('-')
  if (parts.length !== 2) return { start: null, end: null }
  const toHHMMSS = (p) => {
    p = p.trim()
    if (!p) return null
    if (!p.includes(':')) p = p + ':00'
    const [h, m = '00'] = p.split(':')
    const hh = String(parseInt(h) || 0).padStart(2, '0')
    const mm = String(parseInt(m) || 0).padStart(2, '0')
    return `${hh}:${mm}:00`
  }
  return { start: toHHMMSS(parts[0]), end: toHHMMSS(parts[1]) }
}

const formatShiftFromTimes = (start, end) => {
  if (!start || !end) return ''
  const fmt = (t) => {
    const [h, m] = t.split(':')
    return m === '00' ? `${parseInt(h)}h` : `${parseInt(h)}h${m}`
  }
  return `${fmt(start)}-${fmt(end)}`
}

export default function EditMissionForm() {
  const navigate = useNavigate()
  const { missionId } = useParams()
  const [loading, setLoading] = useState(false)
  const [loadingMission, setLoadingMission] = useState(true)
  const [error, setError] = useState(null)
  const [showPositionsPicker, setShowPositionsPicker] = useState(false)
  const [showContractsPicker, setShowContractsPicker] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dateMode, setDateMode] = useState('precise')
  const [establishment, setEstablishment] = useState(null)

  const [formData, setFormData] = useState({
    position: '',
    start_date: '',
    end_date: '',
    shift_text: '',
    contract_type: 'extra',
    salary_mode: 'hourly',
    hourly_rate: '',
    monthly_rate: '',
    salary_text: '',
    comment: '',
    service_continu: true,
    nb_postes: 1,
    cv_required: false
  })

  useEffect(() => { loadMission() }, [missionId])

  const loadMission = async () => {
    try {
      const { data: mission, error } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single()
      if (error) throw error

      // Infer salary_mode
      let salary_mode = 'hourly'
      if (mission.monthly_rate) salary_mode = 'monthly'
      else if (mission.salary_text) salary_mode = 'other'

      // Reconstituer shift_text si pas présent
      let shift_text = mission.shift_text || ''
      if (!shift_text && mission.shift_start_time && mission.shift_end_time) {
        shift_text = formatShiftFromTimes(mission.shift_start_time, mission.shift_end_time)
      }

      setFormData({
        position: mission.position || '',
        start_date: '', // Laisser vide : l'utilisateur doit choisir une nouvelle date pour relancer
        end_date: '',
        shift_text,
        contract_type: mission.contract_type || 'extra',
        salary_mode,
        hourly_rate: mission.hourly_rate || '',
        monthly_rate: mission.monthly_rate || '',
        salary_text: mission.salary_text || '',
        comment: mission.comment || '',
        service_continu: mission.service_continu !== false,
        nb_postes: mission.nb_postes || 1,
        cv_required: mission.cv_required || false
      })
    } catch (err) {
      console.error('Erreur chargement mission:', err)
      setError('Mission introuvable')
    } finally {
      setLoadingMission(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const setQuickDate = (mode) => {
    setDateMode(mode)
    const today = new Date()
    const fmt = (d) => d.toISOString().split('T')[0]
    if (mode === 'today') setFormData(prev => ({ ...prev, start_date: fmt(today) }))
    else if (mode === 'tomorrow') {
      const t = new Date(today); t.setDate(t.getDate() + 1)
      setFormData(prev => ({ ...prev, start_date: fmt(t) }))
    } else if (mode === 'thisweek') {
      const t = new Date(today)
      const day = t.getDay()
      const target = day < 5 ? 5 - day : (day === 5 ? 1 : 6)
      t.setDate(t.getDate() + target)
      setFormData(prev => ({ ...prev, start_date: fmt(t) }))
    } else if (mode === 'precise') {
      setFormData(prev => ({ ...prev, start_date: '' }))
    }
  }

  const isUrgent = useMemo(() => {
    if (!formData.start_date) return false
    const now = new Date()
    const startDate = new Date(formData.start_date)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)
    startDate.setHours(0, 0, 0, 0)
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    return startDate >= todayStart && startDate <= tomorrow
  }, [formData.start_date])

  const durationDays = useMemo(() => {
    if (!formData.start_date) return null
    if (!formData.end_date) return 1
    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 1
  }, [formData.start_date, formData.end_date])

  const extractDepartmentFromAddress = (address) => {
    if (!address) return null
    const match = address.match(/\b(\d{5})\b/)
    if (match) {
      const postalCode = match[1]
      const dept = postalCode.substring(0, 2)
      if (dept === '20') return parseInt(postalCode) < 20200 ? '2A' : '2B'
      return dept
    }
    return null
  }

  const notifyMatchingTalents = async (mission, establishmentName, establishmentAddress) => {
    try {
      const missionDepartment = extractDepartmentFromAddress(establishmentAddress)
      const { data: matchingTalents } = await supabase
        .from('talents')
        .select('id, user_id, first_name, position_types, preferred_departments')
        .contains('position_types', [mission.position])
      if (!matchingTalents || matchingTalents.length === 0) return

      const talentsInDepartment = matchingTalents.filter(talent => {
        if (!talent.preferred_departments || talent.preferred_departments.length === 0) return true
        return missionDepartment && talent.preferred_departments.includes(missionDepartment)
      })
      if (talentsInDepartment.length === 0) return

      const positionLabel = POSITION_TYPES.find(p => p.value === mission.position)?.label || mission.position
      const notifications = talentsInDepartment.map(talent => ({
        user_id: talent.user_id,
        type: 'new_mission',
        title: '🎯 Mission relancée !',
        content: `Une mission "${positionLabel}" correspond à votre profil - ${establishmentName}`,
        link: '/talent/missions',
        read: false
      }))
      await supabase.from('notifications').insert(notifications)
    } catch (err) {
      console.error('Erreur notification talents:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (!formData.start_date) throw new Error('Veuillez définir une date de début pour la mission')

      const { data: { user } } = await supabase.auth.getUser()
      const { data: est } = await supabase
        .from('establishments')
        .select('id, name, address')
        .eq('user_id', user.id)
        .single()
      if (!est) throw new Error('Profil établissement introuvable')
      if (!est.address) throw new Error("Adresse de l'établissement manquante. Veuillez compléter votre profil.")

      const fuzzyLocation = generateFuzzyLocation(est.address)
      const { start: shift_start, end: shift_end } = parseShiftText(formData.shift_text)

      const { data: updatedMission, error } = await supabase
        .from('missions')
        .update({
          position: formData.position,
          location_fuzzy: fuzzyLocation,
          location_exact: est.address,
          duration_type: durationDays === 1 ? 'ponctuelle' : 'courte',
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          shift_start_time: shift_start,
          shift_end_time: shift_end,
          shift_text: formData.shift_text || null,
          hourly_rate: formData.salary_mode === 'hourly' && formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          monthly_rate: formData.salary_mode === 'monthly' && formData.monthly_rate ? parseFloat(formData.monthly_rate) : null,
          salary_text: formData.salary_mode === 'other' ? formData.salary_text : null,
          contract_type: formData.contract_type,
          urgency_level: isUrgent ? 'urgent' : 'a_venir',
          is_urgent: isUrgent,
          comment: formData.comment || null,
          service_continu: formData.service_continu,
          nb_postes: parseInt(formData.nb_postes) || 1,
          cv_required: formData.cv_required || false,
          status: 'open',
          archived_at: null
        })
        .eq('id', missionId)
        .select().single()

      if (error) throw error
      await notifyMatchingTalents(updatedMission, est.name, est.address)
      alert('Mission relancée avec succès ! 🎉')
      navigate('/establishment/missions')
    } catch (err) {
      console.error('Erreur modification mission:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Helpers UI ───
  const getPositionLabel = (value) => POSITION_TYPES.find(p => p.value === value)?.label || ''
  const getContractLabel = (value) => CONTRACT_TYPES.find(c => c.value === value)?.label || ''
  const topPositions = POSITION_TYPES.filter(p => TOP_POSITIONS.includes(p.value))
  const topContracts = CONTRACT_TYPES.filter(c => TOP_CONTRACTS.includes(c.value))
  const otherContracts = CONTRACT_TYPES.filter(c => !TOP_CONTRACTS.includes(c.value))

  const sharedStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
      .edit-mission-v8 { font-family: 'Montserrat', system-ui, sans-serif; letter-spacing: -0.005em; }
      .edit-mission-v8 * { font-family: 'Montserrat', system-ui, sans-serif; }
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
      .btn-primary-gradient:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
      .dash-input { transition: all 0.2s ease; }
      .dash-input:focus {
        border-color: #1D4ED8;
        box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.12);
        outline: none;
      }
      .chip-v8 { transition: all 0.2s ease; }
      .chip-v8:hover { transform: translateY(-1px); }
      .salaire-input-big {
        font-size: 28px; font-weight: 800;
        letter-spacing: -0.02em; text-align: center; color: #1D4ED8;
      }
    `}</style>
  )

  if (loadingMission) {
    return (
      <>
        {sharedStyles}
        <div className="edit-mission-v8 min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)', boxShadow: '0 12px 32px rgba(29, 78, 216, 0.35)' }}>
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
            <p className="text-slate-600 font-semibold">Chargement de la mission…</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {sharedStyles}
      <div className="edit-mission-v8 min-h-screen"
           style={{ background: `radial-gradient(ellipse 80% 30% at 50% 0%, rgba(186, 230, 253, 0.4) 0%, transparent 60%), #F8FAFF` }}>

        {/* HEADER */}
        <header className="bg-white/85 backdrop-blur-xl border-b border-blue-100/70 sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <button onClick={() => navigate('/establishment/missions')} className="text-blue-700 hover:text-blue-800 font-bold inline-flex items-center gap-1.5 text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              Retour
            </button>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-sm"
                    style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)', boxShadow: '0 4px 12px rgba(29, 78, 216, 0.3)' }}>E</span>
              <span className="font-extrabold text-base tracking-tight text-slate-900">Extra<span className="text-blue-700">Taff</span></span>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          {/* Titre */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.03em' }}>
              🔄 Relancer la <span className="gradient-text">mission</span>
            </h1>
            <p className="text-slate-600 text-sm font-medium mt-1">Modifiez les détails et republiez votre annonce</p>
          </div>

          {/* Bannière info */}
          <div className="mb-4 rounded-xl p-4 border-2"
               style={{ background: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)', borderColor: '#93C5FD' }}>
            <p className="text-sm font-medium text-blue-900">
              ℹ️ Cette mission sera <strong>republiée</strong> et les Extras correspondants seront notifiés.
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-blue-100 p-5 sm:p-6 space-y-6"
                style={{ boxShadow: '0 8px 32px rgba(10, 37, 64, 0.06)' }}>

            {/* === 1 · POSTE === */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                1 · Poste recherché
              </label>
              <div className="flex flex-wrap gap-2">
                {topPositions.map(pos => (
                  <button
                    key={pos.value} type="button"
                    onClick={() => setFormData(prev => ({ ...prev, position: pos.value }))}
                    className={`chip-v8 px-4 py-2.5 rounded-full text-sm font-bold border-2 transition-all ${
                      formData.position === pos.value
                        ? 'text-white border-transparent shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                    style={formData.position === pos.value ? { background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' } : {}}
                  >
                    {pos.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowPositionsPicker(true)}
                  className={`chip-v8 px-4 py-2.5 rounded-full text-sm font-bold border-2 transition-all ${
                    formData.position && !TOP_POSITIONS.includes(formData.position)
                      ? 'text-white border-transparent shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 border-dashed hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  style={formData.position && !TOP_POSITIONS.includes(formData.position) ? { background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' } : {}}
                >
                  {formData.position && !TOP_POSITIONS.includes(formData.position)
                    ? `✓ ${getPositionLabel(formData.position)}`
                    : '+ Voir tous les postes'}
                </button>
              </div>
            </div>

            {/* === 2 · TYPE DE CONTRAT === */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                2 · Type de contrat
              </label>
              <div className="flex flex-wrap gap-2">
                {topContracts.map(c => {
                  const active = formData.contract_type === c.value
                  let bg = 'linear-gradient(135deg, #10B981, #059669)'
                  if (c.value === 'cdd') bg = 'linear-gradient(135deg, #F59E0B, #EAB308)'
                  if (c.value === 'cdi') bg = 'linear-gradient(135deg, #7C3AED, #A855F7)'
                  const icon = c.value === 'extra' ? '⚡' : c.value === 'cdd' ? '📅' : '💼'
                  return (
                    <button
                      key={c.value} type="button"
                      onClick={() => setFormData(prev => ({ ...prev, contract_type: c.value }))}
                      className={`chip-v8 flex-1 min-w-[100px] px-3 py-3 rounded-full text-sm font-bold border-2 transition-all inline-flex items-center justify-center gap-1.5 ${
                        active ? 'text-white border-transparent shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      style={active ? { background: bg } : {}}
                    >
                      <span>{icon}</span> {c.label}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setShowContractsPicker(true)}
                  className={`chip-v8 px-3 py-3 rounded-full text-sm font-bold border-2 border-dashed transition-all ${
                    formData.contract_type && !TOP_CONTRACTS.includes(formData.contract_type)
                      ? 'text-white border-transparent shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  style={formData.contract_type && !TOP_CONTRACTS.includes(formData.contract_type) ? { background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' } : {}}
                >
                  {formData.contract_type && !TOP_CONTRACTS.includes(formData.contract_type)
                    ? `✓ ${getContractLabel(formData.contract_type)}`
                    : '+ Autre'}
                </button>
              </div>
            </div>

            {/* === 3 · QUAND === */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                3 · Nouvelle date de début
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { value: 'today', label: '🌙 Aujourd\'hui' },
                  { value: 'tomorrow', label: '📅 Demain' },
                  { value: 'thisweek', label: '📆 Cette semaine' },
                  { value: 'precise', label: '🗓️ Date précise' },
                ].map(opt => (
                  <button
                    key={opt.value} type="button"
                    onClick={() => setQuickDate(opt.value)}
                    className={`chip-v8 px-3 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                      dateMode === opt.value
                        ? 'text-white border-transparent shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                    style={dateMode === opt.value ? { background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {(dateMode === 'precise' || !formData.start_date) && (
                <input
                  type="date" name="start_date" value={formData.start_date} onChange={handleChange}
                  className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                  required
                />
              )}
              {formData.start_date && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    📅 {new Date(formData.start_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                  {isUrgent && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold animate-pulse"
                          style={{ background: 'linear-gradient(135deg, #FEE2E2, #FECACA)', color: '#991B1B', border: '1px solid #FCA5A5' }}>
                      ⚡ Mission urgente
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* === 4 · HORAIRES === */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                4 · Horaires
              </label>
              <input
                type="text" name="shift_text" value={formData.shift_text} onChange={handleChange}
                placeholder="ex : 19h-23h"
                className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
              />
              <p className="text-xs text-slate-500 font-medium mt-1.5">Tape comme tu veux : "19h-23h", "8h30-12h"…</p>
            </div>

            {/* === 5 · SALAIRE === */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                5 · Salaire proposé
              </label>
              <div className="flex bg-slate-100 rounded-xl p-1 mb-3 gap-1">
                {[
                  { value: 'hourly', label: '🕐 À l\'heure' },
                  { value: 'monthly', label: '📅 Au mois' },
                  { value: 'other', label: '📝 Autre' },
                ].map(m => (
                  <button
                    key={m.value} type="button"
                    onClick={() => setFormData(prev => ({ ...prev, salary_mode: m.value }))}
                    className={`flex-1 px-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                      formData.salary_mode === m.value
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {formData.salary_mode === 'hourly' && (
                <div className="flex items-center gap-3">
                  <input
                    type="number" name="hourly_rate" value={formData.hourly_rate} onChange={handleChange}
                    placeholder="15" step="0.50" min="0"
                    className="dash-input salaire-input-big flex-1 min-w-0 px-4 py-4 border-2 border-slate-200 rounded-xl bg-white"
                  />
                  <span className="text-base font-bold text-slate-600 whitespace-nowrap">€ / h</span>
                </div>
              )}
              {formData.salary_mode === 'monthly' && (
                <div className="flex items-center gap-3">
                  <input
                    type="number" name="monthly_rate" value={formData.monthly_rate} onChange={handleChange}
                    placeholder="2200" step="50" min="0"
                    className="dash-input salaire-input-big flex-1 min-w-0 px-4 py-4 border-2 border-slate-200 rounded-xl bg-white"
                  />
                  <span className="text-base font-bold text-slate-600 whitespace-nowrap">€ NET / mois</span>
                </div>
              )}
              {formData.salary_mode === 'other' && (
                <input
                  type="text" name="salary_text" value={formData.salary_text} onChange={handleChange}
                  placeholder="Ex : 150€/jour, À négocier…"
                  className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                  required={formData.salary_mode === 'other'}
                />
              )}
            </div>

            {/* === 6 · DÉTAILS === */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                6 · Détails (optionnel)
              </label>
              <textarea
                name="comment" value={formData.comment} onChange={handleChange}
                rows={3} maxLength={200}
                placeholder="Tape comme sur WhatsApp : tenue, ambiance, exigences…"
                className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white resize-none"
              />
              <p className="text-xs text-slate-500 font-medium mt-1.5 text-right">{formData.comment.length} / 200</p>
            </div>

            {/* === PLUS D'OPTIONS === */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700 inline-flex items-center justify-center gap-2 transition-all"
            >
              <span className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>▼</span>
              {showAdvanced ? 'Moins d\'options' : 'Plus d\'options'}
            </button>

            {showAdvanced && (
              <div className="rounded-xl p-5 space-y-4"
                   style={{ background: 'linear-gradient(180deg, #F8FAFF, #FFFFFF)', border: '2px solid #DBEAFE' }}>
                <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">⚙️ Options avancées</div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Nombre de postes à pourvoir</label>
                  <select name="nb_postes" value={formData.nb_postes} onChange={handleChange}
                          className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white">
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {n > 1 ? 'personnes' : 'personne'}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Date de fin (mission multi-jours)</label>
                  <input
                    type="date" name="end_date" value={formData.end_date} onChange={handleChange}
                    min={formData.start_date || undefined}
                    className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                  />
                  {formData.end_date && durationDays > 1 && (
                    <p className="text-xs text-slate-500 font-medium mt-1.5">📅 Durée : {durationDays} jours</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, service_continu: true }))}
                    className={`chip-v8 flex-1 px-3 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                      formData.service_continu
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    ⏱️ Service continu
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, service_continu: false }))}
                    className={`chip-v8 flex-1 px-3 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                      !formData.service_continu
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    ☕ Avec coupure
                  </button>
                </div>

                <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 bg-white cursor-pointer hover:border-blue-300 transition-all">
                  <input
                    type="checkbox" name="cv_required" checked={formData.cv_required} onChange={handleChange}
                    className="w-5 h-5 rounded border-2 border-slate-300 text-blue-700 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900">📄 CV obligatoire</div>
                    <div className="text-xs text-slate-500 font-medium">Seuls les Extras avec CV pourront postuler</div>
                  </div>
                </label>
              </div>
            )}

            {/* === BOUTONS === */}
            <div className="flex gap-3 pt-2">
              <button
                type="button" onClick={() => navigate('/establishment/missions')}
                className="flex-1 px-5 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Annuler
              </button>
              <button
                type="submit" disabled={loading}
                className="btn-primary-gradient flex-1 px-5 py-3 rounded-xl text-white font-bold inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Mise à jour…
                  </>
                ) : (
                  <>🔄 Relancer la mission</>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* === PICKER POSTES === */}
        {showPositionsPicker && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
               style={{ background: 'rgba(10, 37, 64, 0.4)', backdropFilter: 'blur(8px)' }}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Choisir un poste</h3>
                <button onClick={() => setShowPositionsPicker(false)} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">×</button>
              </div>
              <div className="overflow-y-auto flex-1 p-5 space-y-5">
                {['cuisine', 'service', 'hotellerie', 'management'].map(cat => {
                  const catPositions = POSITION_TYPES.filter(p => p.category === cat)
                  if (catPositions.length === 0) return null
                  const catLabel = { cuisine: '🍳 Cuisine', service: '🍷 Service', hotellerie: '🏨 Hôtellerie', management: '👔 Management' }[cat]
                  return (
                    <div key={cat}>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{catLabel}</div>
                      <div className="flex flex-wrap gap-2">
                        {catPositions.map(p => (
                          <button
                            key={p.value} type="button"
                            onClick={() => { setFormData(prev => ({ ...prev, position: p.value })); setShowPositionsPicker(false) }}
                            className={`chip-v8 px-3 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                              formData.position === p.value
                                ? 'text-white border-transparent shadow-md'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                            style={formData.position === p.value ? { background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' } : {}}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* === PICKER CONTRATS === */}
        {showContractsPicker && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
               style={{ background: 'rgba(10, 37, 64, 0.4)', backdropFilter: 'blur(8px)' }}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Autres contrats</h3>
                <button onClick={() => setShowContractsPicker(false)} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">×</button>
              </div>
              <div className="overflow-y-auto flex-1 p-5">
                <div className="flex flex-wrap gap-2">
                  {otherContracts.map(c => (
                    <button
                      key={c.value} type="button"
                      onClick={() => { setFormData(prev => ({ ...prev, contract_type: c.value })); setShowContractsPicker(false) }}
                      className={`chip-v8 px-4 py-2.5 rounded-full text-sm font-bold border-2 transition-all ${
                        formData.contract_type === c.value
                          ? 'text-white border-transparent shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      style={formData.contract_type === c.value ? { background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' } : {}}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
