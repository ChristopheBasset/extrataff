import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, ESTABLISHMENT_TYPES } from '../../lib/supabase'
import MyMissions from '../../components/Establishment/MyMissions'
import ApplicationsReceived from '../../components/Establishment/ApplicationsReceived'
import EstablishmentHired from '../../components/Establishment/EstablishmentHired'
import EstablishmentPlanning from '../../components/Establishment/EstablishmentPlanning'
import AddressAutocomplete from '../../components/shared/AddressAutocomplete'
import NotificationBell from '../../components/shared/NotificationBell'
import PushInvite from '../../components/shared/PushInvite'
import { detachPushOnLogout } from '../../lib/pushNotifications'
import HelpBubble from '../../components/HelpBubble'

// Première mission offerte pour toute inscription jusqu'au 30 novembre 2026 inclus (heure de Paris).
const FREE_FIRST_DEADLINE = new Date('2026-12-01T00:00:00+01:00')

export default function EstablishmentDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('home')
  const [loading, setLoading] = useState(true)
  const [freeFirstAvailable, setFreeFirstAvailable] = useState(false)
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
        // Première mission offerte : inscrit avant le 1er déc. 2026 et aucune mission déjà facturée
        // (affichage seulement : la décision finale est prise par le serveur)
        const { count: billedCount } = await supabase
          .from('missions')
          .select('id', { count: 'exact', head: true })
          .eq('establishment_id', data.id)
          .in('billing_kind', ['free_first', 'single', 'subscription', 'pack'])
        const registeredInTime = data.created_at && new Date(data.created_at) < FREE_FIRST_DEADLINE
        setFreeFirstAvailable(Boolean(registeredInTime) && (!billedCount || billedCount === 0))
        // Préparer le formulaire d'édition
        setProfileForm({
          name: data.name || '',
          type: data.type || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          department: data.department || '',
          phone: data.phone || '',
          description: data.description || '',
          notif_push: data.notif_push !== false,
          notif_email: data.notif_email !== false,
          notif_applications_mode: data.notif_applications_mode || 'each'
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
    await detachPushOnLogout()
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
          notif_push: profileForm.notif_push,
          notif_email: profileForm.notif_email,
          notif_applications_mode: profileForm.notif_applications_mode,
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
  const isSubscriber = () => {
    return profile?.subscription_status === 'active' &&
      ['club', 'annual'].includes(profile?.subscription_plan)
  }

  // Crédits du pack de missions (valables 2 mois)
  const packCredits = profile?.pack_credits || 0
  const packValid = packCredits > 0 && (!profile?.pack_expires_at || new Date(profile.pack_expires_at) > new Date())
  const packLabel = `🎟️ ${packCredits} mission${packCredits > 1 ? 's' : ''} restante${packCredits > 1 ? 's' : ''} dans votre pack`

  const getSubscriptionBadge = () => {
    if (isSubscriber()) {
      return { label: '✅ Abonné — missions illimitées', color: 'bg-green-100 text-green-800' }
    }
    if (freeFirstAvailable) {
      return { label: '🎁 Première mission offerte', color: 'bg-blue-100 text-blue-800' }
    }
    if (packValid) {
      return { label: `🎟️ Pack : ${packCredits} restante${packCredits > 1 ? 's' : ''}`, color: 'bg-blue-100 text-blue-800' }
    }
    return { label: 'Mission à 19,90 €', color: 'bg-gray-100 text-gray-700' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">Profil non trouvé</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  const badge = getSubscriptionBadge()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header enrichi */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Ligne 1 : Logo + Actions */}
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary-600">⚡ ExtraTaff</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/establishment/subscribe')}
                className="px-3 py-1 text-xs font-medium rounded-full border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors"
              >
                Formules
              </button>
              <NotificationBell />
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Déconnexion"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
          {/* Ligne 2 : Nom + Badge */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm font-medium text-gray-900">{profile.name}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
              {badge.label}
            </span>
          </div>
          {/* Ligne 3 : droits de publication et accès aux formules */}
          {!isSubscriber() && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {freeFirstAvailable && <span className="text-blue-700 font-medium">🎁 Votre première mission est offerte</span>}
              {packValid && <span className="text-blue-700 font-medium">{packLabel}</span>}
              {!freeFirstAvailable && !packValid && <span className="text-gray-500">Publication à 19,90 € la mission</span>}
              <button
                onClick={() => navigate('/establishment/subscribe')}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
              >
                Pack de 3 missions et abonnement →
              </button>
            </div>
          )}
          {isSubscriber() && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-green-600 font-medium">✅ Missions illimitées</span>
              <button
                onClick={() => navigate('/establishment/subscribe')}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
              >
                Mon abonnement →
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ========== HOME ========== */}
        {view === 'home' && (
          <>
            {/* Invitation à activer les alertes sur le téléphone */}
            <PushInvite role="establishment" />

            {/* Bandeau profil à compléter */}
            {profile && (!profile.description || !profile.type || profile.type === 'autre') && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">📋 Complétez votre profil</p>
                  <p className="text-sm text-amber-700">Un profil complet (type d'établissement, description) inspire confiance aux candidats et améliore vos matchs.</p>
                </div>
                <button
                  onClick={() => changeView('profile')}
                  className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors text-sm whitespace-nowrap"
                >
                  Compléter mon profil
                </button>
              </div>
            )}

            {/* Boutons : créer une mission, formules */}
            <div className="mb-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCreateMission}
                className="w-full sm:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-xl">+</span>
                Créer une mission
              </button>
              <button
                onClick={() => navigate('/establishment/subscribe')}
                className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-primary-600 text-primary-700 hover:bg-primary-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isSubscriber() ? '⭐ Mon abonnement' : 'Formule standard, pack et abonnement'}
              </button>
            </div>

            {/* Grille 4 boutons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mes Missions */}
              <div
                onClick={() => changeView('missions')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">📝</div>
                <h2 className="text-2xl font-bold text-gray-900">Mes Missions <HelpBubble text="Retrouvez ici toutes les missions que vous avez créées. Vous pouvez suivre leur statut et les gérer." /></h2>
                <p className="text-gray-600 mt-2">Missions créées et gérées</p>
                <div className="mt-6 text-5xl font-bold text-primary-600">{counts.missions}</div>
              </div>

              {/* Mes Candidats */}
              <div
                onClick={() => changeView('candidates')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">👥</div>
                <h2 className="text-2xl font-bold text-gray-900">Mes Candidats <HelpBubble text="Acceptez, refusez et conversez avec les candidats intéressés par vos missions." /></h2>
                <p className="text-gray-600 mt-2">Candidatures reçues</p>
                <div className="mt-6 text-5xl font-bold text-primary-600">{counts.candidates}</div>
              </div>

              {/* Mes Embauches */}
              <div
                onClick={() => changeView('hired')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-gray-900">Mes Embauches <HelpBubble text="Vos candidats confirmés. Conversez avec eux pour organiser leur arrivée." /></h2>
                <p className="text-gray-600 mt-2">Candidats validés</p>
                <div className="mt-6 text-5xl font-bold text-primary-600">{counts.hired}</div>
              </div>

              {/* Mon Profil */}
              <div
                onClick={() => changeView('profile')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">⚙️</div>
                <h2 className="text-2xl font-bold text-gray-900">Mon Profil <HelpBubble text="Complétez toutes vos informations pour un match parfait avec les candidats." /></h2>
                <p className="text-gray-600 mt-2">Gérer mon établissement</p>
                <div className="mt-6">
                  <span className="text-sm text-gray-500">Paramètres & infos</span>
                </div>
              </div>

              {/* Planning */}
              <div
                onClick={() => changeView('planning')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">📅</div>
                <h2 className="text-2xl font-bold text-gray-900">Planning <HelpBubble text="Visualisez vos missions et talents confirmés sur un calendrier mensuel." /></h2>
                <p className="text-gray-600 mt-2">Vue d'ensemble par mois</p>
                <div className="mt-6">
                  <span className="text-sm text-gray-500">Missions & talents</span>
                </div>
              </div>
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
            <div className="mb-6">
              <button
                onClick={() => handleBack()}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Retour
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Mon Profil</h2>
                {!editProfile && (
                  <button
                    onClick={() => setEditProfile(true)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    ✏️ Modifier
                  </button>
                )}
              </div>

              {profileSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                  ✅ Profil mis à jour avec succès !
                </div>
              )}

              {profileError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {profileError}
                </div>
              )}

              {/* MODE LECTURE */}
              {!editProfile && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom établissement</label>
                    <p className="text-lg text-gray-900">{profile.name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <p className="text-lg text-gray-900">{profile.type || 'Non renseigné'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <p className="text-lg text-gray-900">{profile.address || 'Non renseignée'}</p>
                    {(profile.city || profile.postal_code) && (
                      <p className="text-sm text-gray-500">{profile.postal_code} {profile.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <p className="text-lg text-gray-900">{profile.phone || 'Non renseigné'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-900">{profile.description || 'Non renseignée'}</p>
                  </div>

                  <div className="pt-4 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut abonnement</label>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    {/* Abonnés */}
                    {isSubscriber() && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-green-600 font-medium">✅ Missions illimitées</p>
                        <p className="text-sm text-gray-500">
                          {profile.subscription_plan === 'annual'
                            ? 'Engagement de 12 mois • Renouvelé automatiquement'
                            : 'Sans engagement • Résiliable à tout moment'}
                        </p>
                      </div>
                    )}
                    {/* Première mission offerte */}
                    {!isSubscriber() && freeFirstAvailable && (
                      <p className="text-sm text-blue-600 font-medium mt-2">
                        🎁 Votre première mission est offerte
                      </p>
                    )}
                    {/* Crédits du pack */}
                    {!isSubscriber() && packValid && (
                      <p className="text-sm text-blue-600 font-medium mt-2">
                        {packLabel}
                        {profile.pack_expires_at ? ` (jusqu'au ${new Date(profile.pack_expires_at).toLocaleDateString('fr-FR')})` : ''}
                      </p>
                    )}
                    {/* Publication à la mission */}
                    {!isSubscriber() && !freeFirstAvailable && !packValid && (
                      <p className="text-sm text-gray-500 mt-2">
                        Publication à 19,90 € la mission
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate('/establishment/subscribe')}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        {isSubscriber() ? '⚙️ Mon abonnement' : '🎟️ Pack de 3 missions et abonnement'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE ÉDITION */}
              {editProfile && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de l'établissement *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type d'établissement
                    </label>
                    <select
                      name="type"
                      value={profileForm.type}
                      onChange={handleProfileChange}
                      className="input"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse
                    </label>
                    <AddressAutocomplete
                      value={profileForm.address}
                      onChange={handleAddressChange}
                      placeholder="Tapez une adresse..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                      className="input"
                      required
                      placeholder="06 12 34 56 78"
                      maxLength={14}
                    />
                    <p className="text-xs text-gray-500 mt-1">Numéro mobile uniquement (06 ou 07)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={profileForm.description}
                      onChange={handleProfileChange}
                      rows={4}
                      className="input"
                      placeholder="Présentez votre établissement..."
                    />
                  </div>

                  {/* Mes alertes */}
                  <div className="pt-2">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">🔔 Mes alertes de candidature</h3>
                    <p className="text-xs text-gray-500 mb-3">Une mission urgente (mode Express, ou qui commence aujourd'hui ou demain) déclenche toujours une alerte immédiate.</p>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">Fréquence des alertes</p>
                        <label className="flex items-start gap-2 mb-2 cursor-pointer">
                          <input
                            type="radio"
                            name="notif_applications_mode"
                            value="each"
                            checked={profileForm.notif_applications_mode === 'each'}
                            onChange={handleProfileChange}
                            className="mt-1"
                          />
                          <span className="text-sm text-gray-700">À chaque candidature <span className="block text-xs text-gray-500">Une alerte dès qu'un candidat se déclare intéressé</span></span>
                        </label>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="notif_applications_mode"
                            value="daily"
                            checked={profileForm.notif_applications_mode === 'daily'}
                            onChange={handleProfileChange}
                            className="mt-1"
                          />
                          <span className="text-sm text-gray-700">Un résumé par jour <span className="block text-xs text-gray-500">Une seule alerte le matin, vers 9 h, avec le nombre de candidats</span></span>
                        </label>
                      </div>

                      <div className="border-t border-gray-200" />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Alertes sur le téléphone</p>
                          <p className="text-xs text-gray-500">Notifications même quand l'application est fermée</p>
                        </div>
                        <div
                          onClick={() => setProfileForm(prev => ({ ...prev, notif_push: !prev.notif_push }))}
                          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${profileForm.notif_push ? 'bg-primary-600' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${profileForm.notif_push ? 'translate-x-7' : 'translate-x-1'}`} />
                        </div>
                      </div>

                      <div className="border-t border-gray-200" />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Rappel par e-mail</p>
                          <p className="text-xs text-gray-500">Un e-mail si des candidats vous attendent et que vous n'avez pas ouvert l'application</p>
                        </div>
                        <div
                          onClick={() => setProfileForm(prev => ({ ...prev, notif_email: !prev.notif_email }))}
                          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${profileForm.notif_email ? 'bg-primary-600' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${profileForm.notif_email ? 'translate-x-7' : 'translate-x-1'}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Boutons actions */}
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditProfile(false)
                        // Reset le formulaire
                        setProfileForm({
                          name: profile.name || '',
                          type: profile.type || '',
                          address: profile.address || '',
                          city: profile.city || '',
                          postal_code: profile.postal_code || '',
                          department: profile.department || '',
                          phone: profile.phone || '',
                          description: profile.description || '',
                          notif_push: profile.notif_push !== false,
                          notif_email: profile.notif_email !== false,
                          notif_applications_mode: profile.notif_applications_mode || 'each'
                        })
                        setProfileError(null)
                      }}
                      className="btn-secondary flex-1"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleProfileSave}
                      disabled={profileSaving}
                      className="btn-primary flex-1"
                    >
                      {profileSaving ? 'Sauvegarde...' : '💾 Enregistrer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
