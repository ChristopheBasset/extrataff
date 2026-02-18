import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES, FRENCH_DEPARTMENTS } from '../../lib/supabase'
import NotificationBell from '../../components/shared/NotificationBell'
import MatchedMissions from '../../components/Talent/MatchedMissions'
import TalentApplications from '../../components/Talent/TalentApplications'
import TalentConfirmed from '../../components/Talent/TalentConfirmed'
import TalentPlanning from '../../components/Talent/TalentPlanning'

export default function TalentDashboard() {
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

  useEffect(() => {
    checkProfile()
  }, [])

  useEffect(() => {
    if (profile && view === 'home') {
      loadCounts(profile.id)
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
        loadCounts(data.id)
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

  const loadCounts = async (talentId) => {
    try {
      // Récupérer les missions ouvertes avec les infos établissement (pour le filtre département)
      const { data: allMissions } = await supabase
        .from('missions')
        .select('id, position, department, start_date, end_date, establishment_id, establishments:establishment_id(department)')
        .eq('status', 'open')

      // Toutes les applications du talent (toutes missions confondues)
      const { data: allApps } = await supabase
        .from('applications')
        .select('status, mission_id')
        .eq('talent_id', talentId)

      let matchedCount = 0
      let interestedCount = 0
      let confirmedCount = 0

      // Interested + accepted
      interestedCount = allApps ? allApps.filter(a => a.status === 'interested' || a.status === 'accepted').length : 0

      // Confirmed
      confirmedCount = allApps ? allApps.filter(a => a.status === 'confirmed').length : 0

      // Matched = missions ouvertes sans candidature du talent
      if (allMissions && allMissions.length > 0) {
        const appliedMissionIds = new Set(allApps?.map(a => a.mission_id) || [])

        // Commencer par exclure les missions déjà candidatées
        let matched = allMissions.filter(m => !appliedMissionIds.has(m.id))

        // Filtrage par position_types si dispo
        if (profile?.position_types && profile.position_types.length > 0) {
          matched = matched.filter(m => profile.position_types.includes(m.position))
        }

        // Filtrage par départements préférés (même logique que MatchedMissions)
        if (profile?.preferred_departments && profile.preferred_departments.length > 0) {
          matched = matched.filter(m => {
            const estDept = m.establishments?.department
            const missionDept = m.department
            return profile.preferred_departments.some(dept =>
              dept === estDept || dept === missionDept
            )
          })
        }

        // Anti-chevauchement : exclure les missions qui chevauchent des missions confirmées/acceptées
        const bookedApps = allApps?.filter(a => a.status === 'confirmed' || a.status === 'accepted') || []
        if (bookedApps.length > 0) {
          const bookedMissionIds = bookedApps.map(a => a.mission_id)
          const { data: bookedMissions } = await supabase
            .from('missions')
            .select('id, start_date, end_date')
            .in('id', bookedMissionIds)

          if (bookedMissions && bookedMissions.length > 0) {
            const bookedRanges = bookedMissions
              .filter(bm => bm.start_date)
              .map(bm => ({
                start: new Date(bm.start_date),
                end: bm.end_date ? new Date(bm.end_date) : new Date(bm.start_date)
              }))

            if (bookedRanges.length > 0) {
              matched = matched.filter(m => {
                if (!m.start_date) return true
                const mStart = new Date(m.start_date)
                const mEnd = m.end_date ? new Date(m.end_date) : new Date(m.start_date)
                return !bookedRanges.some(b => mStart <= b.end && mEnd >= b.start)
              })
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
      console.error('Erreur chargement counts:', err)
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

      // Recharger le profil
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

    // Vérifier le type de fichier
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      setProfileError('Format accepté : PDF ou Word (.doc, .docx)')
      return
    }

    // Vérifier la taille (5MB max)
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

      // Supprimer l'ancien CV si existant
      if (profile.cv_url) {
        await supabase.storage.from('CV').remove([profile.cv_url])
      }

      // Uploader le nouveau CV
      const { error: uploadError } = await supabase.storage
        .from('CV')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Mettre à jour le profil
      const { error: updateError } = await supabase
        .from('talents')
        .update({ cv_url: filePath, updated_at: new Date().toISOString() })
        .eq('id', profile.id)

      if (updateError) throw updateError

      // Recharger le profil
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
      // Supprimer le fichier du storage
      await supabase.storage.from('CV').remove([profile.cv_url])

      // Mettre à jour le profil
      const { error } = await supabase
        .from('talents')
        .update({ cv_url: null, updated_at: new Date().toISOString() })
        .eq('id', profile.id)

      if (error) throw error

      // Recharger le profil
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

  // Helpers
  const getPositionLabel = (value) => {
    const found = POSITION_TYPES?.find(p => p.value === value)
    return found ? found.label : value || '—'
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Ligne 1 : Logo + Actions */}
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary-600">⚡ ExtraTaff</h1>
            <div className="flex items-center gap-2">
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
          {/* Ligne 2 : Nom + Badge + Note */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm font-medium text-gray-900">
              {profile.first_name} {profile.last_name}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Talent
            </span>
            {talentRating.count >= 3 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} className={s <= Math.round(talentRating.avg) ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                ))}
                {talentRating.avg}/5 ({talentRating.count})
              </span>
            ) : talentRating.count > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                ⭐ {talentRating.count}/3 avis requis
              </span>
            ) : null}
          </div>
          {/* Ligne 3 : Postes */}
          {profile.position_types && profile.position_types.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {profile.position_types.map(pos => (
                <span
                  key={pos}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                >
                  {getPositionLabel(pos)}
                </span>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ========== HOME ========== */}
        {view === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Missions Matchées */}
            <div
              onClick={() => setView('matched')}
              className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-gray-900">Missions Matchées</h2>
              <p className="text-gray-600 mt-2">Missions proposées</p>
              <div className="mt-6 text-5xl font-bold text-primary-600">{counts.matched}</div>
            </div>

            {/* Missions Intéressées */}
            <div
              onClick={() => setView('interested')}
              className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">❤️</div>
              <h2 className="text-2xl font-bold text-gray-900">Missions Intéressées</h2>
              <p className="text-gray-600 mt-2">Candidatures en cours</p>
              <div className="mt-6 text-5xl font-bold text-primary-600">{counts.interested}</div>
            </div>

            {/* Mes Missions Validées */}
            <div
              onClick={() => setView('confirmed')}
              className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-900">Mes Missions Validées</h2>
              <p className="text-gray-600 mt-2">Embauches confirmées</p>
              <div className="mt-6 text-5xl font-bold text-primary-600">{counts.confirmed}</div>
            </div>

            {/* Mon Profil */}
            <div
              onClick={() => setView('profile')}
              className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">⚙️</div>
              <h2 className="text-2xl font-bold text-gray-900">Mon Profil</h2>
              <p className="text-gray-600 mt-2">Gérer mon profil</p>
              <div className="mt-6">
                <span className="text-sm text-gray-500">Paramètres & infos</span>
              </div>
            </div>

            {/* Planning */}
            <div
              onClick={() => setView('planning')}
              className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">📅</div>
              <h2 className="text-2xl font-bold text-gray-900">Mon Planning</h2>
              <p className="text-gray-600 mt-2">Mes missions à venir</p>
              <div className="mt-6">
                <span className="text-sm text-gray-500">Vue par mois</span>
              </div>
            </div>
          </div>
        )}

        {/* ========== MISSIONS MATCHÉES ========== */}
        {view === 'matched' && (
          <MatchedMissions
            talentId={profile.id}
            talentProfile={profile}
            onBack={() => setView('home')}
            onCountChange={(count) => setCounts(prev => ({ ...prev, matched: count }))}
          />
        )}

        {/* ========== MISSIONS INTÉRESSÉES ========== */}
        {view === 'interested' && (
          <TalentApplications
            talentId={profile.id}
            onBack={() => setView('home')}
          />
        )}

        {/* ========== MISSIONS VALIDÉES ========== */}
        {view === 'confirmed' && (
          <TalentConfirmed
            talentId={profile.id}
            onBack={() => setView('home')}
          />
        )}

        {/* ========== PLANNING ========== */}
        {view === 'planning' && (
          <TalentPlanning
            talentId={profile.id}
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
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                      <p className="text-lg text-gray-900">{profile.first_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                      <p className="text-lg text-gray-900">{profile.last_name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <p className="text-lg text-gray-900">{profile.phone || 'Non renseigné'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <p className="text-lg text-gray-900">{profile.address || 'Non renseignée'}</p>
                    {(profile.city || profile.postal_code) && (
                      <p className="text-sm text-gray-500">{profile.postal_code} {profile.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postes recherchés</label>
                    <div className="flex flex-wrap gap-2">
                      {profile.position_types && profile.position_types.length > 0 ? (
                        profile.position_types.map(pos => (
                          <span
                            key={pos}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                          >
                            {getPositionLabel(pos)}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-500">Non renseigné</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Départements de recherche</label>
                    <div className="flex flex-wrap gap-2">
                      {profile.preferred_departments && profile.preferred_departments.length > 0 ? (
                        profile.preferred_departments.map(dept => {
                          const deptInfo = FRENCH_DEPARTMENTS.find(d => d.value === dept)
                          return (
                            <span
                              key={dept}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                            >
                              {deptInfo?.label || dept}
                            </span>
                          )
                        })
                      ) : (
                        <p className="text-gray-500">Tous les départements</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expérience</label>
                      <p className="text-lg text-gray-900">{profile.years_experience || 0} an{profile.years_experience > 1 ? 's' : ''}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tarif minimum</label>
                      <p className="text-lg text-gray-900">
                        {profile.min_hourly_rate ? `${parseFloat(profile.min_hourly_rate).toFixed(2)} €/h` : 'Non renseigné'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service avec coupure</label>
                    <p className="text-lg text-gray-900">{profile.accepts_coupure ? '✅ Accepté' : '❌ Non'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <p className="text-gray-900">{profile.bio || 'Non renseignée'}</p>
                  </div>

                  {/* CV */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CV</label>
                    {profile.cv_url ? (
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
                          📄 CV enregistré
                        </span>
                        <button
                          onClick={handleCvDelete}
                          disabled={cvDeleting}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          {cvDeleting ? '...' : '🗑️ Supprimer'}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-500 mb-2">Aucun CV enregistré</p>
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors">
                          {cvUploading ? '⏳ Envoi...' : '📤 Ajouter mon CV'}
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleCvUpload}
                            disabled={cvUploading}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">PDF ou Word, 5 Mo max</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODE ÉDITION */}
              {editProfile && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                      <input
                        type="text"
                        name="first_name"
                        value={profileForm.first_name}
                        onChange={handleProfileChange}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                      <input
                        type="text"
                        name="last_name"
                        value={profileForm.last_name}
                        onChange={handleProfileChange}
                        className="input"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <input
                      type="text"
                      name="address"
                      value={profileForm.address}
                      onChange={handleProfileChange}
                      className="input"
                      placeholder="Votre adresse"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                      <input
                        type="text"
                        name="postal_code"
                        value={profileForm.postal_code}
                        onChange={handleProfileChange}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                      <input
                        type="text"
                        name="city"
                        value={profileForm.city}
                        onChange={handleProfileChange}
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Postes recherchés - toggle chips */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Postes recherchés</label>
                    <div className="flex flex-wrap gap-2">
                      {POSITION_TYPES?.map(pos => (
                        <button
                          key={pos.value}
                          type="button"
                          onClick={() => togglePositionType(pos.value)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            profileForm.position_types?.includes(pos.value)
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Départements de recherche */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Départements de recherche</label>
                    <p className="text-xs text-gray-500 mb-2">Sélectionnez les départements où vous cherchez des missions</p>
                    
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
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium"
                            >
                              {deptInfo?.label || dept} ×
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Recherche */}
                    <input
                      type="text"
                      placeholder="🔍 Rechercher un département (ex: 33, Gironde...)"
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      className="input mb-2"
                    />

                    {/* Liste filtrée */}
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      <div className="flex flex-wrap gap-1.5">
                        {FRENCH_DEPARTMENTS
                          .filter(dept => {
                            if (!deptSearch.trim()) return true
                            const search = deptSearch.toLowerCase()
                            return dept.value.includes(search) || dept.label.toLowerCase().includes(search)
                          })
                          .map(dept => (
                            <button
                              key={dept.value}
                              type="button"
                              onClick={() => toggleDepartment(dept.value)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                profileForm.preferred_departments?.includes(dept.value)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {dept.label}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Années d'expérience</label>
                      <input
                        type="number"
                        name="years_experience"
                        value={profileForm.years_experience}
                        onChange={handleProfileChange}
                        min="0"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tarif minimum (€/h)</label>
                      <input
                        type="number"
                        name="min_hourly_rate"
                        value={profileForm.min_hourly_rate}
                        onChange={handleProfileChange}
                        step="0.50"
                        min="0"
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="accepts_coupure"
                        checked={profileForm.accepts_coupure}
                        onChange={handleProfileChange}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-gray-900">J'accepte le service avec coupure</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea
                      name="bio"
                      value={profileForm.bio}
                      onChange={handleProfileChange}
                      rows={3}
                      className="input"
                      placeholder="Présentez-vous en quelques mots..."
                    />
                  </div>

                  {/* CV Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CV</label>
                    {profile.cv_url ? (
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <span className="text-green-700 text-sm font-medium">📄 CV enregistré</span>
                        <label className="text-primary-600 hover:text-primary-700 text-sm font-medium cursor-pointer">
                          {cvUploading ? '⏳ Envoi...' : '🔄 Remplacer'}
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
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          {cvDeleting ? '...' : '🗑️ Supprimer'}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors">
                          {cvUploading ? '⏳ Envoi en cours...' : '📤 Ajouter mon CV'}
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleCvUpload}
                            disabled={cvUploading}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">PDF ou Word, 5 Mo max</p>
                      </div>
                    )}
                  </div>

                  {/* Boutons */}
                  <div className="flex gap-4 pt-4">
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
