import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, generateFuzzyLocation } from '../../lib/supabase'
import HelpBubble from '../../components/HelpBubble'

// Postes les plus courants à afficher en chips (les autres dans le picker)
const TOP_POSITIONS = ['serveur', 'chef_de_partie', 'commis', 'plongeur', 'barman', 'runner']
// Contrats principaux affichés en chips (les autres dans le picker)
const TOP_CONTRACTS = ['extra', 'cdd', 'cdi']

// Parse un texte d'horaires libre type "19h-23h", "19h00-23h30", "19:00 à 23:00" → { start, end } au format HH:MM:SS
const parseShiftText = (txt) => {
  if (!txt) return { start: null, end: null }
  const cleaned = txt.toLowerCase().replace(/h/g, ':').replace(/\s+/g, '').replace(/à|->/g, '-')
  const parts = cleaned.split('-')
  if (parts.length !== 2) return { start: null, end: null }
  const toHHMMSS = (p) => {
    p = p.trim()
    if (!p) return null
    // Cas "19" → "19:00:00", "19:30" → "19:30:00"
    if (!p.includes(':')) p = p + ':00'
    const [h, m = '00'] = p.split(':')
    const hh = String(parseInt(h) || 0).padStart(2, '0')
    const mm = String(parseInt(m) || 0).padStart(2, '0')
    return `${hh}:${mm}:00`
  }
  return { start: toHHMMSS(parts[0]), end: toHHMMSS(parts[1]) }
}

export default function MissionForm({ onMissionCreated }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [establishment, setEstablishment] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPositionsPicker, setShowPositionsPicker] = useState(false)
  const [showContractsPicker, setShowContractsPicker] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dateMode, setDateMode] = useState('') // 'today' | 'tomorrow' | 'thisweek' | 'precise'

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { navigate('/login'); return }
        const { data: est } = await supabase
          .from('establishments')
          .select('id, name, address, city, postal_code, subscription_status, subscription_plan, trial_ends_at')
          .eq('user_id', user.id)
          .single()
        if (!est) { navigate('/establishment'); return }
        setEstablishment(est)
        setCheckingAccess(false)
      } catch (err) {
        console.error('Erreur vérification accès:', err)
        setCheckingAccess(false)
      }
    }
    checkAccess()
  }, [])

  const [formData, setFormData] = useState({
    position: '',
    start_date: '',
    end_date: '',
    shift_text: '',
    contract_type: 'extra',
    salary_mode: 'hourly', // 'hourly' | 'monthly' | 'other'
    hourly_rate: '',
    monthly_rate: '',
    salary_text: '',
    comment: '',
    service_continu: true,
    nb_postes: 1,
    cv_required: false
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  // ─── Helpers de saisie rapide ───
  const setQuickDate = (mode) => {
    setDateMode(mode)
    const today = new Date()
    const fmt = (d) => d.toISOString().split('T')[0]
    if (mode === 'today') {
      setFormData(prev => ({ ...prev, start_date: fmt(today) }))
    } else if (mode === 'tomorrow') {
      const t = new Date(today); t.setDate(t.getDate() + 1)
      setFormData(prev => ({ ...prev, start_date: fmt(t) }))
    } else if (mode === 'thisweek') {
      // Vendredi ou samedi qui arrive
      const t = new Date(today)
      const day = t.getDay() // 0=dim, 5=ven, 6=sam
      const target = day < 5 ? 5 - day : (day === 5 ? 1 : 6)
      t.setDate(t.getDate() + target)
      setFormData(prev => ({ ...prev, start_date: fmt(t) }))
    } else if (mode === 'precise') {
      // Reset, l'utilisateur va saisir
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

  const isClubMember = establishment?.subscription_status === 'active' && establishment?.subscription_plan === 'club'
  const isTrialActive = (() => {
    if (!establishment?.trial_ends_at) return false
    return new Date(establishment.trial_ends_at) > new Date()
  })()
  const trialDaysLeft = (() => {
    if (!establishment?.trial_ends_at) return 0
    const diff = Math.ceil((new Date(establishment.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  })()

  const paymentInfo = useMemo(() => {
    if (!establishment) return null
    if (isClubMember) return { type: 'club', price: 0, label: '🏆 Membre Club ExtraTaff', description: "Missions illimitées comprises dans votre abonnement", canCreate: true }
    if (isTrialActive) return { type: 'trial', price: 0, label: `🎁 Période d'essai active`, description: `Il vous reste ${trialDaysLeft} jour${trialDaysLeft > 1 ? 's' : ''} d'essai gratuit`, canCreate: true }
    return { type: 'pay_per_mission', price: 19.90, label: 'Mission ponctuelle', description: 'Publication à 19,90€', canCreate: false, clubSaving: "Passez au Club à 39€/mois pour des missions illimitées" }
  }, [establishment, isClubMember, isTrialActive, trialDaysLeft])

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
      const { data: matchingTalents, error: talentsError } = await supabase
        .from('talents')
        .select('id, user_id, first_name, email, notif_email, position_types, preferred_departments')
        .contains('position_types', [mission.position])
      if (talentsError || !matchingTalents || matchingTalents.length === 0) return

      const talentsInDepartment = matchingTalents.filter(talent => {
        if (!talent.preferred_departments || talent.preferred_departments.length === 0) return true
        return missionDepartment && talent.preferred_departments.includes(missionDepartment)
      })
      if (talentsInDepartment.length === 0) return

      const positionLabel = POSITION_TYPES.find(p => p.value === mission.position)?.label || mission.position
      const urgentPrefix = mission.is_urgent ? '🔴 URGENT — ' : '🎯 '

      const notifications = talentsInDepartment.map(talent => ({
        user_id: talent.user_id,
        type: 'new_mission',
        title: `${urgentPrefix}Nouvelle mission disponible !`,
        content: `Une mission "${positionLabel}" correspond à votre profil - ${establishmentName}`,
        link: '/talent/missions',
        read: false
      }))
      await supabase.from('notifications').insert(notifications)

      const talentsAvecEmail = talentsInDepartment.filter(t => t.notif_email && t.email)
      if (talentsAvecEmail.length > 0) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        for (const talent of talentsAvecEmail) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}` },
              body: JSON.stringify({
                type: 'new_mission', to: talent.email,
                data: {
                  talent_name: talent.first_name, position: positionLabel,
                  establishment_name: establishmentName,
                  start_date: new Date(mission.start_date).toLocaleDateString('fr-FR'),
                  hourly_rate: mission.hourly_rate, is_urgent: mission.is_urgent
                }
              })
            })
          } catch (emailErr) {
            console.error('Erreur envoi email:', talent.email, emailErr)
          }
        }
      }
    } catch (err) {
      console.error('Erreur notification talents:', err)
    }
  }

  const createMission = async (status = 'open') => {
    if (!establishment.address) throw new Error("Adresse de l'établissement manquante. Veuillez compléter votre profil.")
    const fuzzyLocation = generateFuzzyLocation(establishment.address)
    const { start: shift_start, end: shift_end } = parseShiftText(formData.shift_text)

    const { data: newMission, error } = await supabase
      .from('missions')
      .insert({
        establishment_id: establishment.id,
        position: formData.position,
        location_fuzzy: fuzzyLocation,
        location_exact: establishment.address,
        search_radius: 10,
        duration_type: durationDays === 1 ? 'ponctuelle' : 'courte',
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        shift_start_time: shift_start,
        shift_end_time: shift_end,
        shift_text: formData.shift_text || null,
        break_duration: 0,
        work_days: [],
        hourly_rate: formData.salary_mode === 'hourly' && formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        monthly_rate: formData.salary_mode === 'monthly' && formData.monthly_rate ? parseFloat(formData.monthly_rate) : null,
        salary_text: formData.salary_mode === 'other' ? formData.salary_text : null,
        contract_type: formData.contract_type,
        urgency_level: isUrgent ? 'urgent' : 'a_venir',
        is_urgent: isUrgent,
        comment: formData.comment || null,
        service_continu: formData.service_continu,
        nb_postes: parseInt(formData.nb_postes) || 1,
        nb_postes_pourvus: 0,
        cv_required: formData.cv_required || false,
        status: status,
        payment_status: status === 'open' ? 'paid' : 'pending'
      })
      .select().single()
    if (error) throw error
    return newMission
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!paymentInfo) return
    if (!paymentInfo.canCreate) { setShowPaymentModal(true); return }
    await handleDirectCreate()
  }

  const handleDirectCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const newMission = await createMission('open')
      await notifyMatchingTalents(newMission, establishment.name, establishment.address)
      if (onMissionCreated) onMissionCreated()
      alert('Mission créée avec succès ! 🎉')
      navigate('/establishment')
    } catch (err) {
      console.error('Erreur création mission:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePaidCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const newMission = await createMission('pending')
      const { data: { session } } = await supabase.auth.refreshSession()
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ establishment_id: establishment.id, plan_type: 'mission', mission_id: newMission.id })
      })
      const data = await response.json()
      if (!response.ok || data.error) {
        await supabase.from('missions').delete().eq('id', newMission.id)
        throw new Error(data.error || 'Erreur lors de la création du paiement')
      }
      if (!data.url) {
        await supabase.from('missions').delete().eq('id', newMission.id)
        throw new Error('URL de paiement non reçue')
      }
      window.location.href = data.url
    } catch (err) {
      console.error('Erreur paiement:', err)
      setError(err.message)
      setShowPaymentModal(false)
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
      .mission-form-v8 { font-family: 'Montserrat', system-ui, sans-serif; letter-spacing: -0.005em; }
      .mission-form-v8 * { font-family: 'Montserrat', system-ui, sans-serif; }
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

  if (checkingAccess) {
    return (
      <>
        {sharedStyles}
        <div className="mission-form-v8 min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)', boxShadow: '0 12px 32px rgba(29, 78, 216, 0.35)' }}>
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
            <p className="text-slate-600 font-semibold">Vérification…</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {sharedStyles}
      <div className="mission-form-v8 min-h-screen"
           style={{
             background: `radial-gradient(ellipse 80% 30% at 50% 0%, rgba(186, 230, 253, 0.4) 0%, transparent 60%), #F8FAFF`
           }}>

        {/* HEADER */}
        <header className="bg-white/85 backdrop-blur-xl border-b border-blue-100/70 sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <button onClick={() => navigate('/establishment')} className="text-blue-700 hover:text-blue-800 font-bold inline-flex items-center gap-1.5 text-sm">
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

        {/* CONTENU */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          {/* Titre */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.03em' }}>
              Nouvelle <span className="gradient-text">mission</span>
            </h1>
            <p className="text-slate-600 text-sm font-medium mt-1">Quelques infos, on s'occupe du matching ⚡</p>
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
              <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                1 · Poste recherché
                <HelpBubble text="Sélectionnez le poste à pourvoir. Le matching se fera sur ce critère." />
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
                  let bg = 'linear-gradient(135deg, #10B981, #059669)' // extra = vert
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
                3 · Quand ?
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
              <p className="text-xs text-slate-500 font-medium mt-1.5">Tape comme tu veux : "19h-23h", "8h30-12h", "18h00 - 23h30"…</p>
            </div>

            {/* === 5 · SALAIRE === */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                5 · Salaire proposé
              </label>
              {/* Toggle mode */}
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
                    className="dash-input salaire-input-big flex-1 px-4 py-4 border-2 border-slate-200 rounded-xl bg-white"
                  />
                  <span className="text-base font-bold text-slate-600 whitespace-nowrap">€ / h</span>
                </div>
              )}
              {formData.salary_mode === 'monthly' && (
                <div className="flex items-center gap-3">
                  <input
                    type="number" name="monthly_rate" value={formData.monthly_rate} onChange={handleChange}
                    placeholder="2200" step="50" min="0"
                    className="dash-input salaire-input-big flex-1 px-4 py-4 border-2 border-slate-200 rounded-xl bg-white"
                  />
                  <span className="text-base font-bold text-slate-600 whitespace-nowrap">€ NET / mois</span>
                </div>
              )}
              {formData.salary_mode === 'other' && (
                <input
                  type="text" name="salary_text" value={formData.salary_text} onChange={handleChange}
                  placeholder="Ex : 150€/jour, À négocier, Selon profil…"
                  className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                  required={formData.salary_mode === 'other'}
                />
              )}
            </div>

            {/* === 6 · ADRESSE (pré-remplie) === */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                6 · Adresse de la mission
              </label>
              <div className="flex items-center gap-3 p-4 rounded-xl"
                   style={{ background: 'linear-gradient(135deg, #F8FAFF, #EFF6FF)', border: '2px solid #DBEAFE' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, #DBEAFE, #BAE6FD)' }}>📍</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Votre établissement</div>
                  <div className="text-sm font-bold text-slate-900 truncate">{establishment?.name}</div>
                  <div className="text-xs text-slate-600 font-medium truncate">{establishment?.address}</div>
                </div>
              </div>
            </div>

            {/* === 7 · DÉTAILS LIBRES === */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                7 · Détails (optionnel)
              </label>
              <textarea
                name="comment" value={formData.comment} onChange={handleChange}
                rows={3} maxLength={200}
                placeholder="Tape comme sur WhatsApp : tenue, ambiance, exigences spécifiques…"
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

                {/* Nb postes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Nombre de postes à pourvoir</label>
                  <select name="nb_postes" value={formData.nb_postes} onChange={handleChange}
                          className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white">
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {n > 1 ? 'personnes' : 'personne'}</option>)}
                  </select>
                </div>

                {/* Date de fin */}
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

                {/* Service continu / coupure */}
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

                {/* CV obligatoire */}
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

            {/* === ENCART PAIEMENT === */}
            {paymentInfo && (
              <div className="rounded-xl p-4 border-2"
                   style={paymentInfo.price === 0
                     ? { background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', borderColor: '#6EE7B7' }
                     : isUrgent
                       ? { background: 'linear-gradient(135deg, #FEE2E2, #FECACA)', borderColor: '#FCA5A5' }
                       : { background: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)', borderColor: '#93C5FD' }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${paymentInfo.price === 0 ? 'text-emerald-800' : isUrgent ? 'text-red-800' : 'text-blue-800'}`}>{paymentInfo.label}</p>
                    <p className={`text-xs font-medium mt-0.5 ${paymentInfo.price === 0 ? 'text-emerald-600' : isUrgent ? 'text-red-600' : 'text-blue-600'}`}>{paymentInfo.description}</p>
                  </div>
                  {paymentInfo.price > 0 && (
                    <span className={`text-2xl font-extrabold ${isUrgent ? 'text-red-700' : 'text-blue-700'}`}>{paymentInfo.price.toFixed(2)}€</span>
                  )}
                </div>
                {paymentInfo.clubSaving && (
                  <div className="mt-3 pt-3 border-t border-amber-200 -mx-4 -mb-4 px-4 py-3 rounded-b-xl"
                       style={{ background: 'linear-gradient(135deg, #FEF3C7, #FFFBEB)' }}>
                    <p className="text-xs text-amber-800 font-medium">
                      💡 <strong>Astuce :</strong> {paymentInfo.clubSaving}
                      <button type="button" onClick={() => navigate('/establishment/subscribe')} className="ml-2 text-blue-700 font-bold underline">Voir le Club</button>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* === BOUTONS === */}
            <div className="flex gap-3 pt-2">
              <button
                type="button" onClick={() => navigate('/establishment')}
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
                    Publication…
                  </>
                ) : (
                  <>🚀 {paymentInfo?.price > 0 ? `Publier — ${paymentInfo.price.toFixed(2)}€` : 'Publier ma mission'}</>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* === PICKER POSTES (modal plein écran) === */}
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

        {/* === PICKER CONTRATS (modal) === */}
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

        {/* === MODALE PAIEMENT === */}
        {showPaymentModal && paymentInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
               style={{ background: 'rgba(10, 37, 64, 0.4)', backdropFilter: 'blur(8px)' }}>
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
              <div className="text-center mb-5">
                <div className="text-5xl mb-3">{isUrgent ? '⚡' : '📋'}</div>
                <h3 className="text-2xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Confirmer la publication</h3>
              </div>
              <div className="rounded-xl p-4 mb-4 space-y-2" style={{ background: '#F8FAFF', border: '1px solid #DBEAFE' }}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Poste</span>
                  <span className="font-bold text-slate-900">{getPositionLabel(formData.position) || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Date</span>
                  <span className="font-bold text-slate-900">
                    {formData.start_date && new Date(formData.start_date).toLocaleDateString('fr-FR')}
                    {formData.end_date && ` → ${new Date(formData.end_date).toLocaleDateString('fr-FR')}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Durée</span>
                  <span className="font-bold text-slate-900">{durationDays} jour{durationDays > 1 ? 's' : ''}</span>
                </div>
                {isUrgent && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Type</span>
                    <span className="font-extrabold text-red-600">⚡ Urgente</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-2xl font-extrabold gradient-text">{paymentInfo.price.toFixed(2)}€</span>
                </div>
              </div>
              {paymentInfo.clubSaving && (
                <div className="rounded-xl p-3 mb-4" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FFFBEB)', border: '1px solid #FCD34D' }}>
                  <p className="text-xs text-amber-800 font-medium">💡 <strong>Avec le Club :</strong> {paymentInfo.clubSaving}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowPaymentModal(false)} disabled={loading}
                        className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all">
                  Annuler
                </button>
                <button onClick={handlePaidCreate} disabled={loading}
                        className="btn-primary-gradient flex-1 py-3 rounded-xl text-white font-bold inline-flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Paiement…
                    </>
                  ) : `Payer ${paymentInfo.price.toFixed(2)}€`}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
