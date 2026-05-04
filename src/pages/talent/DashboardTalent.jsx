import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES, FRENCH_DEPARTMENTS, extractDepartment } from '../../lib/supabase'
import NotificationBell from '../../components/shared/NotificationBell'
import MatchedMissions from '../../components/Talent/MatchedMissions'
import TalentApplications from '../../components/Talent/TalentApplications'
import TalentConfirmed from '../../components/Talent/TalentConfirmed'
import TalentPlanning from '../../components/Talent/TalentPlanning'
import HelpBubble from '../../components/HelpBubble'

export default function DashboardTalent() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('home')
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({
    matched: 0,
    interested: 0,
    confirmed: 0
  })

  // État pour l'édition du profil
  const [editProfile, setEditProfile] = useState(false)
  const [deptSearch, setDeptSearch] = useState('')
  const [profileForm, setProfileForm] = useState({})
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [cvUploading, setCvUploading] = useState(false)
  const [cvDeleting, setCvDeleting] = useState(false)
  const [talentRating, setTalentRating] = useState({ avg: 0, count: 0 })

  // ---- Navigation avec historique (bouton retour smartphone) ----
  const changeView = useCallback((newView) => {
    setView(newView)
    if (newView !== 'home') {
      window.history.pushState({ view: newView }, '')
    }
  }, [])

  const handleBack = useCallback(() => {
    window.history.back()
  }, [])

  useEffect(() => {
    window.history.replaceState({ view: 'home' }, '')
    window.history.pushState({ view: 'home' }, '')

    const onPopState = (event) => {
      const newView = event.state?.view || 'home'
      setView(newView)
      setEditProfile(false)
      if (newView === 'home') {
        window.history.pushState({ view: 'home' }, '')
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    checkProfile()
  }, [])

  useEffect(() => {
    if (profile && view === 'home') {
      loadCounts(profile.id, profile)
    }
  }, [profile, view])

  const checkProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data } = await supabase
        .from('talents')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setProfile(data)
      if (data) {
        loadTalentRating(user.id)
        setProfileForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          bio: data.bio || '',
          min_hourly_rate: data.min_hourly_rate || '',
          years_experience: data.years_experience || 0,
          accepts_coupure: data.accepts_coupure ?? true,
          position_types: data.position_types || [],
          contract_preferences: data.contract_preferences || [],
          preferred_departments: data.preferred_departments || []
        })
      }
    } catch (err) {
      console.error('Erreur chargement profil:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCounts = async (talentId, talentProfile) => {
    try {
      const { data: allMissions, error: missErr } = await supabase
        .from('missions')
        .select('*')
        .eq('status', 'open')

      if (missErr) {
        console.error('[loadCounts] Erreur requête missions:', missErr)
        return
      }

      const { data: allApps } = await supabase
        .from('applications')
        .select('status, mission_id')
        .eq('talent_id', talentId)

      let matchedCount = 0
      let interestedCount = 0
      let confirmedCount = 0

      if (allApps) {
        interestedCount = allApps.filter(a => a.status === 'interested' || a.status === 'accepted').length
        confirmedCount = allApps.filter(a => a.status === 'confirmed').length
      }

      if (allMissions && allMissions.length > 0 && talentProfile) {
        const appliedMissionIds = new Set((allApps || []).map(a => a.mission_id))

        const matched = allMissions.filter(mission => {
          if (appliedMissionIds.has(mission.id)) return false

          if (talentProfile.position_types && talentProfile.position_types.length > 0) {
            if (!talentProfile.position_types.includes(mission.position_type)) {
              return false
            }
          }

          if (talentProfile.preferred_departments && talentProfile.preferred_departments.length > 0) {
            const missionDept = extractDepartment(mission.postal_code)
            if (missionDept && !talentProfile.preferred_departments.includes(missionDept)) {
              return false
            }
          }

          if (mission.cv_required && !talentProfile.cv_url) {
            return false
          }

          return true
        })

        if (talentProfile.min_hourly_rate) {
          const minRate = parseFloat(talentProfile.min_hourly_rate)
          for (let i = matched.length - 1; i >= 0; i--) {
            const m = matched[i]
            if (m.hourly_rate && parseFloat(m.hourly_rate) < minRate) {
              matched.splice(i, 1)
            }
          }
        }

        matchedCount = matched.length
      }

      setCounts({
        matched: matchedCount,
        interested: interestedCount,
        confirmed: confirmedCount
      })
    } catch (err) {
      console.error('[loadCounts] Erreur:', err)
    }
  }

  const loadTalentRating = async (userId) => {
    try {
      const { data: ratings } = await supabase
        .from('ratings')
        .select('overall_score')
        .eq('rated_id', userId)
        .eq('rating_type', 'establishment_to_talent')

      if (ratings && ratings.length > 0) {
        const avg = ratings.reduce((sum, r) => sum + Number(r.overall_score), 0) / ratings.length
        setTalentRating({ avg: Math.round(avg * 10) / 10, count: ratings.length })
      }
    } catch (err) {
      console.error('Erreur chargement notes:', err)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // ---- Gestion édition profil ----
  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target
    setProfileForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const togglePositionType = (posValue) => {
    setProfileForm(prev => {
      const current = prev.position_types || []
      if (current.includes(posValue)) {
        return { ...prev, position_types: current.filter(p => p !== posValue) }
      } else {
        return { ...prev, position_types: [...current, posValue] }
      }
    })
  }

  const toggleDepartment = (deptValue) => {
    setProfileForm(prev => {
      const current = prev.preferred_departments || []
      if (current.includes(deptValue)) {
        return { ...prev, preferred_departments: current.filter(d => d !== deptValue) }
      } else {
        return { ...prev, preferred_departments: [...current, deptValue] }
      }
    })
  }

  const handleProfileSave = async () => {
    setProfileSaving(true)
    setProfileError(null)
    setProfileSuccess(false)

    try {
      const { error } = await supabase
        .from('talents')
        .update({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          phone: profileForm.phone.replace(/[\s\-\.]/g, '').trim(),
          address: profileForm.address,
          city: profileForm.city,
          postal_code: profileForm.postal_code,
          bio: profileForm.bio,
          min_hourly_rate: profileForm.min_hourly_rate ? parseFloat(profileForm.min_hourly_rate) : null,
          years_experience: parseInt(profileForm.years_experience) || 0,
          accepts_coupure: profileForm.accepts_coupure,
          position_types: profileForm.position_types,
          preferred_departments: profileForm.preferred_departments,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error

      const { data: updated } = await supabase
        .from('talents')
        .select('*')
        .eq('id', profile.id)
        .single()

      setProfile(updated)
      setEditProfile(false)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      console.error('Erreur sauvegarde profil:', err)
      setProfileError(err.message)
    } finally {
      setProfileSaving(false)
    }
  }

  // ---- Gestion du CV ----
  const handleCvUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      setProfileError('Format accepté : PDF ou Word (.doc, .docx)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Le fichier ne doit pas dépasser 5 Mo')
      return
    }

    setCvUploading(true)
    setProfileError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/cv_${Date.now()}.${fileExt}`

      if (profile.cv_url) {
        await supabase.storage.from('CV').remove([profile.cv_url])
      }

      const { error: uploadError } = await supabase.storage
        .from('CV')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('talents')
        .update({ cv_url: filePath, updated_at: new Date().toISOString() })
        .eq('id', profile.id)

      if (updateError) throw updateError

      const { data: updated } = await supabase
        .from('talents')
        .select('*')
        .eq('id', profile.id)
        .single()

      setProfile(updated)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      console.error('Erreur upload CV:', err)
      setProfileError('Erreur lors de l\'envoi du CV : ' + err.message)
    } finally {
      setCvUploading(false)
    }
  }

  const handleCvDelete = async () => {
    if (!profile.cv_url) return
    if (!confirm('Supprimer votre CV ?')) return

    setCvDeleting(true)
    setProfileError(null)

    try {
      await supabase.storage.from('CV').remove([profile.cv_url])

      const { error } = await supabase
        .from('talents')
        .update({ cv_url: null, updated_at: new Date().toISOString() })
        .eq('id', profile.id)

      if (error) throw error

      const { data: updated } = await supabase
        .from('talents')
        .select('*')
        .eq('id', profile.id)
        .single()

      setProfile(updated)
    } catch (err) {
      console.error('Erreur suppression CV:', err)
      setProfileError('Erreur lors de la suppression du CV')
    } finally {
      setCvDeleting(false)
    }
  }

  const getPositionLabel = (value) => {
    const found = POSITION_TYPES?.find(p => p.value === value)
    return found ? found.label : value || '—'
  }

  // Style block partagé
  const sharedStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

      .talent-dashboard {
        font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
        letter-spacing: -0.005em;
      }
      .talent-dashboard * {
        font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
      }

      .gradient-text {
        background: linear-gradient(120deg, #1D4ED8 0%, #0EA5E9 60%, #3B82F6 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        display: inline-block;
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
      .btn-primary-gradient:disabled {
        opacity: 0.55; cursor: not-allowed;
        box-shadow: none;
      }

      /* ROW CARD — pavé compact horizontal */
      .row-card {
        position: relative; overflow: hidden;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .row-card::before {
        content: ''; position: absolute; top: 0; left: 0; bottom: 0;
        width: 4px;
        background: linear-gradient(180deg, #1D4ED8, #0EA5E9);
        transform: scaleY(0); transform-origin: top;
        transition: transform 0.35s ease;
      }
      .row-card:hover::before { transform: scaleY(1); }
      .row-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(10, 37, 64, 0.10);
        border-color: #BAE6FD !important;
      }
      .row-card:hover .row-icon { transform: scale(1.06); }
      .row-icon { transition: transform 0.3s ease; }
      .row-card:hover .row-arrow { transform: translateX(4px); }
      .row-arrow { transition: transform 0.3s ease; }

      .dash-input { transition: all 0.2s ease; }
      .dash-input:focus {
        border-color: #1D4ED8;
        box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.12);
        outline: none;
      }

      .chip-toggle {
        transition: all 0.2s ease;
      }
      .chip-toggle:hover { transform: translateY(-1px); }
    `}</style>
  )

  if (loading) {
    return (
      <>
        {sharedStyles}
        <div className="talent-dashboard min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                 style={{
                   background: 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)',
                   boxShadow: '0 12px 32px rgba(29, 78, 216, 0.35)'
                 }}>
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
            <p className="text-slate-600 font-semibold">Chargement…</p>
          </div>
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        {sharedStyles}
        <div className="talent-dashboard min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 mb-4 font-bold">Profil non trouvé</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary-gradient px-6 py-3 rounded-xl text-white font-semibold"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {sharedStyles}
      <div className="talent-dashboard min-h-screen"
           style={{
             background: `
               radial-gradient(ellipse 80% 30% at 50% 0%, rgba(186, 230, 253, 0.4) 0%, transparent 60%),
               #F8FAFF
             `
           }}>

        {/* ===== HEADER ===== */}
        <header className="bg-white/85 backdrop-blur-xl border-b border-blue-100/70 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
            {/* Ligne 1 : Logo + Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-extrabold text-base"
                      style={{
                        background: 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)',
                        boxShadow: '0 4px 12px rgba(29, 78, 216, 0.3)'
                      }}>
                  E
                </span>
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  Extra<span className="text-blue-700 font-bold">Taff</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                  title="Déconnexion"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Ligne 2 : Nom + Badge Extra + Note */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-sm font-bold text-slate-900">
                {profile.first_name} {profile.last_name}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-blue-100 text-blue-700 border-blue-200">
                ✨ Extra
              </span>
              {talentRating.count >= 3 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-amber-100 text-amber-700 border-amber-200">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span key={s} className={s <= Math.round(talentRating.avg) ? 'text-amber-500' : 'text-slate-300'}>★</span>
                  ))}
                  <span className="ml-0.5">{talentRating.avg}/5 ({talentRating.count})</span>
                </span>
              ) : talentRating.count > 0 ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-slate-100 text-slate-500 border-slate-200">
                  ⭐ {talentRating.count}/3 avis requis
                </span>
              ) : null}
            </div>

            {/* Ligne 3 : Postes recherchés */}
            {profile.position_types && profile.position_types.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.position_types.map(pos => (
                  <span
                    key={pos}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600"
                  >
                    {getPositionLabel(pos)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ===== CONTENU ===== */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          {/* ========== HOME ========== */}
          {view === 'home' && (
            <>
              {/* Bandeau CV manquant */}
              {!profile?.cv_url && (
                <div className="mb-6 rounded-2xl border-2 p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row"
                     style={{
                       background: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)',
                       borderColor: '#FCD34D'
                     }}>
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl flex-shrink-0">
                      📄
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">
                        Téléchargez votre CV pour augmenter vos chances&nbsp;!
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                        Certaines missions exigent un CV. Les candidats avec CV sont mis en avant par les établissements.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => changeView('profile')}
                    className="shrink-0 w-full sm:w-auto px-4 py-2 rounded-lg text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
                    }}
                  >
                    Modifier mon profil
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Liste verticale de pavés compacts */}
              <div className="space-y-3">

                {/* Missions Matchées */}
                <button
                  onClick={() => changeView('matched')}
                  className="row-card w-full bg-white rounded-2xl border border-blue-100 p-5 flex items-center gap-4 text-left"
                  style={{ boxShadow: '0 2px 8px rgba(10, 37, 64, 0.04)' }}
                >
                  <div className="row-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                       style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)' }}>
                    🎯
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5" style={{ letterSpacing: '-0.015em' }}>
                      Missions Matchées
                      <HelpBubble text="Ici vous trouverez les missions qui correspondent à votre profil (postes, départements, disponibilités)." />
                    </h3>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">Missions proposées</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-3xl font-extrabold gradient-text" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {counts.matched}
                    </span>
                    <svg className="row-arrow w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </button>

                {/* Missions Intéressées */}
                <button
                  onClick={() => changeView('interested')}
                  className="row-card w-full bg-white rounded-2xl border border-blue-100 p-5 flex items-center gap-4 text-left"
                  style={{ boxShadow: '0 2px 8px rgba(10, 37, 64, 0.04)' }}
                >
                  <div className="row-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                       style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)' }}>
                    ❤️
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5" style={{ letterSpacing: '-0.015em' }}>
                      Missions Intéressées
                      <HelpBubble text="Vos candidatures en cours. Vous serez notifié dès qu'un établissement accepte votre candidature et pourrez converser avec lui." />
                    </h3>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">Candidatures en cours</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-3xl font-extrabold gradient-text" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {counts.interested}
                    </span>
                    <svg className="row-arrow w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </button>

                {/* Mes Missions Validées */}
                <button
                  onClick={() => changeView('confirmed')}
                  className="row-card w-full bg-white rounded-2xl border border-blue-100 p-5 flex items-center gap-4 text-left"
                  style={{ boxShadow: '0 2px 8px rgba(10, 37, 64, 0.04)' }}
                >
                  <div className="row-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                       style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)' }}>
                    ✅
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5" style={{ letterSpacing: '-0.015em' }}>
                      Mes Missions Validées
                      <HelpBubble text="Vos missions acceptées par l'établissement. Vous pourrez continuer à converser avec lui pour l'organisation." />
                    </h3>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">Embauches confirmées</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-3xl font-extrabold gradient-text" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {counts.confirmed}
                    </span>
                    <svg className="row-arrow w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </button>

                {/* Mon Planning */}
                <button
                  onClick={() => changeView('planning')}
                  className="row-card w-full bg-white rounded-2xl border border-blue-100 p-5 flex items-center gap-4 text-left"
                  style={{ boxShadow: '0 2px 8px rgba(10, 37, 64, 0.04)' }}
                >
                  <div className="row-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                       style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)' }}>
                    📅
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5" style={{ letterSpacing: '-0.015em' }}>
                      Mon Planning
                      <HelpBubble text="Visualisez vos missions confirmées sur un calendrier mensuel." />
                    </h3>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">Mes missions à venir</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Voir</span>
                    <svg className="row-arrow w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </button>

                {/* Mon Profil */}
                <button
                  onClick={() => changeView('profile')}
                  className="row-card w-full bg-white rounded-2xl border border-blue-100 p-5 flex items-center gap-4 text-left"
                  style={{ boxShadow: '0 2px 8px rgba(10, 37, 64, 0.04)' }}
                >
                  <div className="row-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                       style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)' }}>
                    ⚙️
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5" style={{ letterSpacing: '-0.015em' }}>
                      Mon Profil
                      <HelpBubble text="Remplissez toutes les informations pour un match parfait avec les missions proposées." />
                    </h3>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">Paramètres &amp; infos</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Gérer</span>
                    <svg className="row-arrow w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </button>

              </div>
            </>
          )}

          {/* ========== MISSIONS MATCHÉES ========== */}
          {view === 'matched' && (
            <MatchedMissions
              talentId={profile.id}
              talentProfile={profile}
              onBack={() => handleBack()}
              onCountChange={(count) => setCounts(prev => ({ ...prev, matched: count }))}
            />
          )}

          {/* ========== MISSIONS INTÉRESSÉES ========== */}
          {view === 'interested' && (
            <TalentApplications
              talentId={profile.id}
              onBack={() => handleBack()}
            />
          )}

          {/* ========== MISSIONS VALIDÉES ========== */}
          {view === 'confirmed' && (
            <TalentConfirmed
              talentId={profile.id}
              onBack={() => handleBack()}
            />
          )}

          {/* ========== PLANNING ========== */}
          {view === 'planning' && (
            <TalentPlanning
              talentId={profile.id}
              onBack={() => handleBack()}
            />
          )}

          {/* ========== MON PROFIL ========== */}
          {view === 'profile' && (
            <div>
              <div className="mb-5">
                <button
                  onClick={() => handleBack()}
                  className="text-blue-700 hover:text-blue-800 font-bold inline-flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"/>
                    <polyline points="12 19 5 12 12 5"/>
                  </svg>
                  Retour
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 sm:p-8 max-w-2xl"
                   style={{ boxShadow: '0 8px 32px rgba(10, 37, 64, 0.06)' }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.025em' }}>
                    Mon Profil
                  </h2>
                  {!editProfile && (
                    <button
                      onClick={() => setEditProfile(true)}
                      className="btn-primary-gradient px-4 py-2 rounded-lg text-white text-sm font-semibold inline-flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Modifier
                    </button>
                  )}
                </div>

                {profileSuccess && (
                  <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Profil mis à jour avec succès&nbsp;!
                  </div>
                )}

                {profileError && (
                  <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium mb-4">
                    {profileError}
                  </div>
                )}

                {/* MODE LECTURE */}
                {!editProfile && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Prénom</label>
                        <p className="text-base text-slate-900 font-semibold">{profile.first_name}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nom</label>
                        <p className="text-base text-slate-900 font-semibold">{profile.last_name}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Téléphone</label>
                      <p className="text-base text-slate-900 font-semibold">{profile.phone || 'Non renseigné'}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Adresse</label>
                      <p className="text-base text-slate-900 font-semibold">{profile.address || 'Non renseignée'}</p>
                      {(profile.city || profile.postal_code) && (
                        <p className="text-sm text-slate-500 mt-0.5">{profile.postal_code} {profile.city}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Postes recherchés</label>
                      <div className="flex flex-wrap gap-2">
                        {profile.position_types && profile.position_types.length > 0 ? (
                          profile.position_types.map(pos => (
                            <span
                              key={pos}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              {getPositionLabel(pos)}
                            </span>
                          ))
                        ) : (
                          <p className="text-slate-500 text-sm">Non renseigné</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Départements de recherche</label>
                      <div className="flex flex-wrap gap-2">
                        {profile.preferred_departments && profile.preferred_departments.length > 0 ? (
                          profile.preferred_departments.map(dept => {
                            const deptInfo = FRENCH_DEPARTMENTS.find(d => d.value === dept)
                            return (
                              <span
                                key={dept}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-sky-50 text-sky-700 border border-sky-200"
                              >
                                {deptInfo?.label || dept}
                              </span>
                            )
                          })
                        ) : (
                          <p className="text-slate-500 text-sm">Tous les départements</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Expérience</label>
                        <p className="text-base text-slate-900 font-semibold">{profile.years_experience || 0} an{profile.years_experience > 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Tarif minimum</label>
                        <p className="text-base text-slate-900 font-semibold">
                          {profile.min_hourly_rate ? `${parseFloat(profile.min_hourly_rate).toFixed(2)} €/h` : 'Non renseigné'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Service avec coupure</label>
                      <p className="text-base text-slate-900 font-semibold">{profile.accepts_coupure ? '✅ Accepté' : '❌ Non'}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Bio</label>
                      <p className="text-slate-700 leading-relaxed">{profile.bio || 'Non renseignée'}</p>
                    </div>

                    {/* CV */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">CV</label>
                      {profile.cv_url ? (
                        <div className="flex items-center flex-wrap gap-3">
                          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-bold border border-emerald-200">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            CV enregistré
                          </span>
                          <button
                            onClick={handleCvDelete}
                            disabled={cvDeleting}
                            className="text-red-500 hover:text-red-700 text-sm font-semibold transition-colors"
                          >
                            {cvDeleting ? '...' : '🗑️ Supprimer'}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-slate-500 text-sm mb-2">Aucun CV enregistré</p>
                          <label className="btn-primary-gradient inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold cursor-pointer">
                            {cvUploading ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                Envoi…
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="17 8 12 3 7 8"/>
                                  <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                Ajouter mon CV
                              </>
                            )}
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={handleCvUpload}
                              disabled={cvUploading}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs text-slate-500 mt-2 font-medium">PDF ou Word, 5 Mo max</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* MODE ÉDITION */}
                {editProfile && (
                  <div className="space-y-4">
                    {/* Prénom + Nom */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                          Prénom <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="first_name"
                          value={profileForm.first_name}
                          onChange={handleProfileChange}
                          className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                          Nom <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="last_name"
                          value={profileForm.last_name}
                          onChange={handleProfileChange}
                          className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                          required
                        />
                      </div>
                    </div>

                    {/* Téléphone */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={profileForm.phone}
                        onChange={handleProfileChange}
                        className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                        required
                      />
                    </div>

                    {/* Adresse */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Adresse
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={profileForm.address}
                        onChange={handleProfileChange}
                        className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                        placeholder="Votre adresse"
                      />
                    </div>

                    {/* CP + Ville */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Code postal</label>
                        <input
                          type="text"
                          name="postal_code"
                          value={profileForm.postal_code}
                          onChange={handleProfileChange}
                          className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Ville</label>
                        <input
                          type="text"
                          name="city"
                          value={profileForm.city}
                          onChange={handleProfileChange}
                          className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                        />
                      </div>
                    </div>

                    {/* Postes recherchés - chips toggle */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Postes recherchés</label>
                      <div className="flex flex-wrap gap-2">
                        {POSITION_TYPES?.map(pos => {
                          const active = profileForm.position_types?.includes(pos.value)
                          return (
                            <button
                              key={pos.value}
                              type="button"
                              onClick={() => togglePositionType(pos.value)}
                              className={`chip-toggle px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
                                active
                                  ? 'text-white border-transparent shadow-md'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                              style={active ? { background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' } : {}}
                            >
                              {pos.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Départements de recherche */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Départements de recherche</label>
                      <p className="text-xs text-slate-500 mb-3 font-medium">Sélectionnez les départements où vous cherchez des missions</p>

                      {/* Départements sélectionnés */}
                      {profileForm.preferred_departments?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {profileForm.preferred_departments.map(dept => {
                            const deptInfo = FRENCH_DEPARTMENTS.find(d => d.value === dept)
                            return (
                              <button
                                key={dept}
                                type="button"
                                onClick={() => toggleDepartment(dept)}
                                className="chip-toggle inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white shadow-md border-2 border-transparent"
                                style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}
                              >
                                {deptInfo?.label || dept}
                                <span className="text-white/80 hover:text-white">×</span>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Recherche */}
                      <div className="relative mb-2">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"/>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                          type="text"
                          placeholder="Rechercher un département (ex: 33, Gironde…)"
                          value={deptSearch}
                          onChange={(e) => setDeptSearch(e.target.value)}
                          className="dash-input w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 bg-white"
                        />
                      </div>

                      {/* Liste filtrée */}
                      <div className="max-h-44 overflow-y-auto border-2 border-slate-200 rounded-xl p-3 bg-slate-50">
                        <div className="flex flex-wrap gap-1.5">
                          {FRENCH_DEPARTMENTS
                            .filter(dept => {
                              if (!deptSearch.trim()) return true
                              const search = deptSearch.toLowerCase()
                              return dept.value.includes(search) || dept.label.toLowerCase().includes(search)
                            })
                            .map(dept => {
                              const active = profileForm.preferred_departments?.includes(dept.value)
                              return (
                                <button
                                  key={dept.value}
                                  type="button"
                                  onClick={() => toggleDepartment(dept.value)}
                                  className={`chip-toggle px-2.5 py-1 rounded-full text-xs font-bold border-2 transition-all ${
                                    active
                                      ? 'text-white border-transparent shadow-sm'
                                      : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50'
                                  }`}
                                  style={active ? { background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' } : {}}
                                >
                                  {dept.label}
                                </button>
                              )
                            })
                          }
                        </div>
                      </div>
                    </div>

                    {/* Expérience + Tarif */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Années d'expérience</label>
                        <input
                          type="number"
                          name="years_experience"
                          value={profileForm.years_experience}
                          onChange={handleProfileChange}
                          min="0"
                          className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Tarif min (€/h)</label>
                        <input
                          type="number"
                          name="min_hourly_rate"
                          value={profileForm.min_hourly_rate}
                          onChange={handleProfileChange}
                          step="0.50"
                          min="0"
                          className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                        />
                      </div>
                    </div>

                    {/* Coupure */}
                    <div className="rounded-xl border-2 border-blue-100 bg-blue-50/40 p-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="accepts_coupure"
                          checked={profileForm.accepts_coupure}
                          onChange={handleProfileChange}
                          className="w-5 h-5 rounded border-2 border-slate-300 text-blue-700 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-slate-900 font-semibold text-sm">J'accepte le service avec coupure</span>
                      </label>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Bio</label>
                      <textarea
                        name="bio"
                        value={profileForm.bio}
                        onChange={handleProfileChange}
                        rows={3}
                        className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white resize-none"
                        placeholder="Présentez-vous en quelques mots…"
                      />
                    </div>

                    {/* CV Upload (mode édition) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">CV</label>
                      {profile.cv_url ? (
                        <div className="flex items-center flex-wrap gap-3 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                          <span className="inline-flex items-center gap-2 text-emerald-700 text-sm font-bold">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            CV enregistré
                          </span>
                          <label className="text-blue-700 hover:text-blue-800 text-sm font-bold cursor-pointer transition-colors">
                            {cvUploading ? '⏳ Envoi…' : '🔄 Remplacer'}
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={handleCvUpload}
                              disabled={cvUploading}
                              className="hidden"
                            />
                          </label>
                          <button
                            onClick={handleCvDelete}
                            disabled={cvDeleting}
                            className="text-red-500 hover:text-red-700 text-sm font-bold transition-colors"
                          >
                            {cvDeleting ? '...' : '🗑️ Supprimer'}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <label className="btn-primary-gradient inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold cursor-pointer">
                            {cvUploading ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                Envoi…
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="17 8 12 3 7 8"/>
                                  <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                Ajouter mon CV
                              </>
                            )}
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={handleCvUpload}
                              disabled={cvUploading}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs text-slate-500 mt-2 font-medium">PDF ou Word, 5 Mo max</p>
                        </div>
                      )}
                    </div>

                    {/* Boutons actions */}
                    <div className="flex gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditProfile(false)
                          setProfileForm({
                            first_name: profile.first_name || '',
                            last_name: profile.last_name || '',
                            phone: profile.phone || '',
                            address: profile.address || '',
                            city: profile.city || '',
                            postal_code: profile.postal_code || '',
                            bio: profile.bio || '',
                            min_hourly_rate: profile.min_hourly_rate || '',
                            years_experience: profile.years_experience || 0,
                            accepts_coupure: profile.accepts_coupure ?? true,
                            position_types: profile.position_types || [],
                            contract_preferences: profile.contract_preferences || [],
                            preferred_departments: profile.preferred_departments || []
                          })
                          setProfileError(null)
                        }}
                        className="flex-1 px-5 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleProfileSave}
                        disabled={profileSaving}
                        className="btn-primary-gradient flex-1 px-5 py-3 rounded-xl text-white font-semibold inline-flex items-center justify-center gap-2"
                      >
                        {profileSaving ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            Sauvegarde…
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                              <polyline points="17 21 17 13 7 13 7 21"/>
                              <polyline points="7 3 7 8 15 8"/>
                            </svg>
                            Enregistrer
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
