import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, ESTABLISHMENT_TYPES } from '../../lib/supabase'
import MyMissions from '../../components/Establishment/MyMissions'
import ApplicationsReceived from '../../components/Establishment/ApplicationsReceived'
import EstablishmentHired from '../../components/Establishment/EstablishmentHired'
import EstablishmentPlanning from '../../components/Establishment/EstablishmentPlanning'
import AddressAutocomplete from '../../components/shared/AddressAutocomplete'
import NotificationBell from '../../components/shared/NotificationBell'
import HelpBubble from '../../components/HelpBubble'

export default function EstablishmentDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('home')
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({
    missions: 0,
    candidates: 0,
    hired: 0
  })

  // État pour l'édition du profil
  const [editProfile, setEditProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({})
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

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
    // Initialiser l'état historique + bloquer la sortie de l'app
    window.history.replaceState({ view: 'home' }, '')
    window.history.pushState({ view: 'home' }, '')

    const onPopState = (event) => {
      const newView = event.state?.view || 'home'
      setView(newView)
      setEditProfile(false)
      // Si on revient à home, repousse une entrée pour ne jamais quitter l'app
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

  // Recalcule les compteurs quand on change de view ou de profil
  useEffect(() => {
    if (profile && view === 'home') {
      loadCounts(profile.id)
    }
  }, [profile, view])

  const checkProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data } = await supabase
        .from('establishments')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setProfile(data)
      if (data) {
        loadCounts(data.id)
        // Préparer le formulaire d'édition
        setProfileForm({
          name: data.name || '',
          type: data.type || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          department: data.department || '',
          phone: data.phone || '',
          description: data.description || ''
        })
      }
    } catch (err) {
      console.error('Erreur chargement profil:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCounts = async (establishmentId) => {
    try {
      // Missions ouvertes
      const { count: missCount } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('establishment_id', establishmentId)
        .eq('status', 'open')

      // Toutes les missions de l'établissement
      const { data: missions } = await supabase
        .from('missions')
        .select('id')
        .eq('establishment_id', establishmentId)

      let candCount = 0
      let hiredCount = 0

      if (missions && missions.length > 0) {
        const missionIds = missions.map(m => m.id)

        // Charger TOUTES les applications
        const { data: allApps } = await supabase
          .from('applications')
          .select('status')
          .in('mission_id', missionIds)

        // Compter en JavaScript — inclure accepted dans les candidats (ancien flux)
        candCount = allApps ? allApps.filter(a => a.status === 'interested' || a.status === 'accepted').length : 0
        hiredCount = allApps ? allApps.filter(a => a.status === 'confirmed').length : 0
      }

      setCounts({
        missions: missCount || 0,
        candidates: candCount,
        hired: hiredCount
      })
    } catch (err) {
      console.error('Erreur chargement counts:', err)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleCreateMission = () => {
    navigate('/establishment/create-mission')
  }

  const handleManageSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.refreshSession()
      if (!session) {
        navigate('/login')
        return
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(
        `${supabaseUrl}/functions/v1/customer-portal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Impossible d\'accéder au portail de gestion')
      }
    } catch (err) {
      console.error('Erreur portail:', err)
      alert('Erreur lors de l\'accès au portail de gestion')
    }
  }

  // ---- Gestion édition profil ----
  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileForm(prev => ({ ...prev, [name]: value }))
  }

  const handleAddressChange = (addressData) => {
    setProfileForm(prev => ({
      ...prev,
      address: addressData.address,
      city: addressData.city,
      postal_code: addressData.postcode,
      department: addressData.department
    }))
  }

  const handleProfileSave = async () => {
    setProfileSaving(true)
    setProfileError(null)
    setProfileSuccess(false)

    // Validation téléphone mobile FR (06 ou 07)
    const cleanPhone = profileForm.phone.replace(/[\s\-\.]/g, '').trim()
    if (!/^0[67]\d{8}$/.test(cleanPhone)) {
      setProfileError('Veuillez entrer un numéro de mobile valide (06 ou 07, 10 chiffres)')
      setProfileSaving(false)
      return
    }

    try {
      const { error } = await supabase
        .from('establishments')
        .update({
          name: profileForm.name,
          type: profileForm.type,
          address: profileForm.address,
          city: profileForm.city,
          postal_code: profileForm.postal_code,
          department: profileForm.department,
          phone: profileForm.phone.replace(/[\s\-\.]/g, '').trim(),
          description: profileForm.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error

      // Recharger le profil
      const { data: updated } = await supabase
        .from('establishments')
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

  // ---- Helpers header ----
  const getTrialDaysLeft = () => {
    if (!profile?.trial_ends_at) return null
    const now = new Date()
    const end = new Date(profile.trial_ends_at)
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  const isTrialActive = () => {
    const days = getTrialDaysLeft()
    return days !== null && days > 0
  }

  const isClubMember = () => {
    return profile?.subscription_status === 'active' && profile?.subscription_plan === 'club'
  }

  const getSubscriptionBadge = () => {
    const status = profile?.subscription_status
    const plan = profile?.subscription_plan
    if (status === 'active' && plan === 'club') {
      return { label: '🏆 Membre Club', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    }
    if (isTrialActive()) {
      const days = getTrialDaysLeft()
      return { label: `🎁 Essai — ${days}j restants`, color: 'bg-blue-100 text-blue-700 border-blue-200' }
    }
    if (status === 'expired') {
      return { label: '🔴 Expiré', color: 'bg-red-100 text-red-700 border-red-200' }
    }
    return { label: '🟡 Essai terminé', color: 'bg-amber-100 text-amber-700 border-amber-200' }
  }

  // Style block partagé
  const sharedStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

      .est-dashboard {
        font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
        letter-spacing: -0.005em;
      }
      .est-dashboard * {
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
    `}</style>
  )

  if (loading) {
    return (
      <>
        {sharedStyles}
        <div className="est-dashboard min-h-screen bg-white flex items-center justify-center">
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
        <div className="est-dashboard min-h-screen bg-white flex items-center justify-center">
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

  const badge = getSubscriptionBadge()
  const trialDays = getTrialDaysLeft()

  return (
    <>
      {sharedStyles}
      <div className="est-dashboard min-h-screen"
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

            {/* Ligne 2 : Nom + Badge */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-sm font-bold text-slate-900">{profile.name}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.color}`}>
                {badge.label}
              </span>
            </div>

            {/* Ligne 3 : Actions abonnement */}
            {!isClubMember() && isTrialActive() && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => navigate('/establishment/subscribe')}
                  className="btn-primary-gradient px-3 py-1.5 rounded-lg text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  Rejoindre le Club — 39€/mois
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>
            )}
            {!isClubMember() && !isTrialActive() && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-amber-600 font-bold text-xs">⏰ Essai terminé</span>
                <button
                  onClick={() => navigate('/establishment/subscribe')}
                  className="btn-primary-gradient px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                >
                  Rejoindre le Club — 39€/mois →
                </button>
                <span className="text-slate-400 text-xs">ou 19,90€/mission</span>
              </div>
            )}
            {isClubMember() && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-emerald-600 font-bold">✅ Missions illimitées</span>
                <button
                  onClick={handleManageSubscription}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  Gérer mon abonnement →
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ===== CONTENU ===== */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          {/* ========== HOME ========== */}
          {view === 'home' && (
            <>
              {/* Bouton créer mission */}
              <div className="mb-6">
                <button
                  onClick={handleCreateMission}
                  className="btn-primary-gradient w-full sm:w-auto px-6 py-3.5 rounded-xl text-white font-semibold text-[15px] inline-flex items-center justify-center gap-2.5"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Créer une mission
                </button>
              </div>

              {/* Liste verticale de pavés compacts */}
              <div className="space-y-3">

                {/* Mes Missions */}
                <button
                  onClick={() => changeView('missions')}
                  className="row-card w-full bg-white rounded-2xl border border-blue-100 p-5 flex items-center gap-4 text-left"
                  style={{ boxShadow: '0 2px 8px rgba(10, 37, 64, 0.04)' }}
                >
                  <div className="row-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                       style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)' }}>
                    📝
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5" style={{ letterSpacing: '-0.015em' }}>
                      Mes Missions
                      <HelpBubble text="Retrouvez ici toutes les missions que vous avez créées. Vous pouvez suivre leur statut et les gérer." />
                    </h3>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">Missions ouvertes</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-3xl font-extrabold gradient-text" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {counts.missions}
                    </span>
                    <svg className="row-arrow w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </button>

                {/* Mes Candidats */}
                <button
                  onClick={() => changeView('candidates')}
                  className="row-card w-full bg-white rounded-2xl border border-blue-100 p-5 flex items-center gap-4 text-left"
                  style={{ boxShadow: '0 2px 8px rgba(10, 37, 64, 0.04)' }}
                >
                  <div className="row-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                       style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)' }}>
                    👥
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5" style={{ letterSpacing: '-0.015em' }}>
                      Mes Candidats
                      <HelpBubble text="Acceptez, refusez et conversez avec les candidats intéressés par vos missions." />
                    </h3>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">Candidatures reçues</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-3xl font-extrabold gradient-text" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {counts.candidates}
                    </span>
                    <svg className="row-arrow w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </button>

                {/* Mes Embauches */}
                <button
                  onClick={() => changeView('hired')}
                  className="row-card w-full bg-white rounded-2xl border border-blue-100 p-5 flex items-center gap-4 text-left"
                  style={{ boxShadow: '0 2px 8px rgba(10, 37, 64, 0.04)' }}
                >
                  <div className="row-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                       style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)' }}>
                    ✅
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5" style={{ letterSpacing: '-0.015em' }}>
                      Mes Embauches
                      <HelpBubble text="Vos candidats confirmés. Conversez avec eux pour organiser leur arrivée." />
                    </h3>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">Candidats validés</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-3xl font-extrabold gradient-text" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {counts.hired}
                    </span>
                    <svg className="row-arrow w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </button>

                {/* Planning */}
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
                      Planning
                      <HelpBubble text="Visualisez vos missions et talents confirmés sur un calendrier mensuel." />
                    </h3>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">Vue d'ensemble par mois</p>
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
                      <HelpBubble text="Complétez toutes vos informations pour un match parfait avec les candidats." />
                    </h3>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">Paramètres & infos</p>
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

          {/* ========== MES MISSIONS ========== */}
          {view === 'missions' && (
            <MyMissions
              establishmentId={profile.id}
              onBack={() => handleBack()}
            />
          )}

          {/* ========== MES CANDIDATS ========== */}
          {view === 'candidates' && (
            <ApplicationsReceived
              establishmentId={profile.id}
              onBack={() => handleBack()}
            />
          )}

          {/* ========== MES EMBAUCHES ========== */}
          {view === 'hired' && (
            <EstablishmentHired
              establishmentId={profile.id}
              onBack={() => handleBack()}
            />
          )}

          {/* ========== PLANNING ========== */}
          {view === 'planning' && (
            <EstablishmentPlanning
              establishmentId={profile.id}
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
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nom établissement</label>
                      <p className="text-base text-slate-900 font-semibold">{profile.name}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Type</label>
                      <p className="text-base text-slate-900 font-semibold">{profile.type || 'Non renseigné'}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Adresse</label>
                      <p className="text-base text-slate-900 font-semibold">{profile.address || 'Non renseignée'}</p>
                      {(profile.city || profile.postal_code) && (
                        <p className="text-sm text-slate-500 mt-0.5">{profile.postal_code} {profile.city}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Téléphone</label>
                      <p className="text-base text-slate-900 font-semibold">{profile.phone || 'Non renseigné'}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Description</label>
                      <p className="text-slate-700 leading-relaxed">{profile.description || 'Non renseignée'}</p>
                    </div>

                    <div className="pt-5 border-t border-blue-100">
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Statut abonnement</label>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      {/* Info Club */}
                      {isClubMember() && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-emerald-600 font-bold">
                            ✅ Missions illimitées — 39€/mois
                          </p>
                          <p className="text-sm text-slate-500">
                            Sans engagement · Résiliable à tout moment
                          </p>
                        </div>
                      )}
                      {/* Info Freemium actif */}
                      {!isClubMember() && isTrialActive() && (
                        <div className="mt-2">
                          <p className="text-sm text-blue-700 font-bold">
                            🎁 Essai gratuit — {trialDays} jour{trialDays > 1 ? 's' : ''} restant{trialDays > 1 ? 's' : ''} · Missions illimitées
                          </p>
                        </div>
                      )}
                      {/* Info Freemium expiré */}
                      {!isClubMember() && !isTrialActive() && (
                        <p className="text-sm text-amber-600 font-semibold mt-2">
                          ⏰ Essai gratuit terminé — Rejoignez le Club ou publiez à 19,90€/mission
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {isClubMember() ? (
                          <button
                            onClick={handleManageSubscription}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
                          >
                            ⚙️ Gérer mon abonnement
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate('/establishment/subscribe')}
                            className="btn-primary-gradient px-4 py-2 rounded-lg text-white text-sm font-semibold"
                          >
                            🏆 Rejoindre le Club — 39€/mois
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE ÉDITION */}
                {editProfile && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Nom de l'établissement <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                        className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Type d'établissement
                      </label>
                      <select
                        name="type"
                        value={profileForm.type}
                        onChange={handleProfileChange}
                        className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                      >
                        <option value="">Sélectionnez un type</option>
                        {ESTABLISHMENT_TYPES?.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Adresse
                      </label>
                      <AddressAutocomplete
                        value={profileForm.address}
                        onChange={handleAddressChange}
                        placeholder="Tapez une adresse..."
                      />
                    </div>

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
                        placeholder="06 12 34 56 78"
                        maxLength={14}
                      />
                      <p className="text-xs text-slate-500 mt-1.5 font-medium">Numéro mobile uniquement (06 ou 07)</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={profileForm.description}
                        onChange={handleProfileChange}
                        rows={4}
                        className="dash-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white resize-none"
                        placeholder="Présentez votre établissement..."
                      />
                    </div>

                    {/* Boutons actions */}
                    <div className="flex gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditProfile(false)
                          setProfileForm({
                            name: profile.name || '',
                            type: profile.type || '',
                            address: profile.address || '',
                            city: profile.city || '',
                            postal_code: profile.postal_code || '',
                            department: profile.department || '',
                            phone: profile.phone || '',
                            description: profile.description || ''
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
