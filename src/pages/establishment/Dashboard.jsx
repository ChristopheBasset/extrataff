import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, ESTABLISHMENT_TYPES } from '../../lib/supabase'
import MyMissions from '../../components/Establishment/MyMissions'
import ApplicationsReceived from '../../components/Establishment/ApplicationsReceived'
import EstablishmentHired from '../../components/Establishment/EstablishmentHired'
import AddressAutocomplete from '../../components/shared/AddressAutocomplete'

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

  const getMissionsLeft = () => {
    const max = 2
    const used = profile?.missions_used || 0
    return Math.max(0, max - used)
  }

  const getSubscriptionBadge = () => {
    const status = profile?.subscription_status
    if (status === 'premium' || status === 'active') {
      return { label: '🟢 Premium', color: 'bg-green-100 text-green-800' }
    }
    if (status === 'trial') {
      return { label: '🟡 Essai', color: 'bg-yellow-100 text-yellow-800' }
    }
    return { label: '🟡 Freemium', color: 'bg-yellow-100 text-yellow-800' }
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
  const trialDays = getTrialDaysLeft()
  const missionsLeft = getMissionsLeft()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header enrichi */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-start">
            {/* Gauche : tout regroupé */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-primary-600">⚡ ExtraTaff</h1>
                <span className="text-gray-400">|</span>
                <span className="text-sm font-medium text-gray-900">{profile.name}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
              {profile.subscription_status !== 'premium' && profile.subscription_status !== 'active' && (
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                  {trialDays !== null && (
                    <span className={`font-medium ${trialDays <= 7 ? 'text-red-600' : 'text-amber-700'}`}>
                      ⏳ {trialDays} jour{trialDays > 1 ? 's' : ''} d'essai restant{trialDays > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-gray-600">
                    📝 {missionsLeft} mission{missionsLeft > 1 ? 's' : ''} gratuite{missionsLeft > 1 ? 's' : ''} restante{missionsLeft > 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => navigate('/establishment/subscribe')}
                    className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Passer Premium →
                  </button>
                </div>
              )}
            </div>

            {/* Droite : déconnexion */}
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 text-sm mt-1"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ========== HOME ========== */}
        {view === 'home' && (
          <>
            {/* Bouton créer mission */}
            <div className="mb-8">
              <button
                onClick={handleCreateMission}
                className="w-full sm:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-xl">+</span>
                Créer une mission
              </button>
            </div>

            {/* Grille 4 boutons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mes Missions */}
              <div
                onClick={() => setView('missions')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">📝</div>
                <h2 className="text-2xl font-bold text-gray-900">Mes Missions</h2>
                <p className="text-gray-600 mt-2">Missions créées et gérées</p>
                <div className="mt-6 text-5xl font-bold text-primary-600">{counts.missions}</div>
              </div>

              {/* Mes Candidats */}
              <div
                onClick={() => setView('candidates')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">👥</div>
                <h2 className="text-2xl font-bold text-gray-900">Mes Candidats</h2>
                <p className="text-gray-600 mt-2">Candidatures reçues</p>
                <div className="mt-6 text-5xl font-bold text-primary-600">{counts.candidates}</div>
              </div>

              {/* Mes Embauches */}
              <div
                onClick={() => setView('hired')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-gray-900">Mes Embauches</h2>
                <p className="text-gray-600 mt-2">Candidats validés</p>
                <div className="mt-6 text-5xl font-bold text-primary-600">{counts.hired}</div>
              </div>

              {/* Mon Profil */}
              <div
                onClick={() => setView('profile')}
                className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">⚙️</div>
                <h2 className="text-2xl font-bold text-gray-900">Mon Profil</h2>
                <p className="text-gray-600 mt-2">Gérer mon établissement</p>
                <div className="mt-6">
                  <span className="text-sm text-gray-500">Paramètres & infos</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========== MES MISSIONS ========== */}
        {view === 'missions' && (
          <MyMissions 
            establishmentId={profile.id} 
            onBack={() => setView('home')} 
          />
        )}

        {/* ========== MES CANDIDATS ========== */}
        {view === 'candidates' && (
          <ApplicationsReceived
            establishmentId={profile.id}
            onBack={() => setView('home')}
          />
        )}

        {/* ========== MES EMBAUCHES ========== */}
        {view === 'hired' && (
          <EstablishmentHired
            establishmentId={profile.id}
            onBack={() => setView('home')}
          />
        )}

        {/* ========== MON PROFIL ========== */}
        {view === 'profile' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => { setView('home'); setEditProfile(false) }}
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
                    {trialDays !== null && profile.subscription_status !== 'premium' && profile.subscription_status !== 'active' && (
                      <p className="text-sm text-gray-500 mt-2">
                        ⏳ {trialDays} jour{trialDays > 1 ? 's' : ''} restant{trialDays > 1 ? 's' : ''} 
                        • 📝 {missionsLeft} mission{missionsLeft > 1 ? 's' : ''} gratuite{missionsLeft > 1 ? 's' : ''} 
                      </p>
                    )}
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
                    />
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
                          description: profile.description || ''
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
