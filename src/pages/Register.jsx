import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const userType = searchParams.get('type') // 'talent' ou 'establishment'
  
  const [step, setStep] = useState(1) // 1: auth, 2: profil
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Données auth
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  // Données profil talent
  const [talentData, setTalentData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    position_types: [],
    years_experience: 1,
    min_hourly_rate: 15
  })

  // Données profil établissement
  const [establishmentData, setEstablishmentData] = useState({
    name: '',
    phone: '',
    address: '',
    type: 'restaurant'
  })

  useEffect(() => {
    // Rediriger si pas de type
    if (!userType || (userType !== 'talent' && userType !== 'establishment')) {
      navigate('/')
    }
  }, [userType, navigate])

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (authData.password !== authData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    if (authData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      setLoading(false)
      return
    }

    try {
      // Créer le compte auth
      const { data, error } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password
      })

      if (error) throw error

      // Passer à l'étape profil
      setStep(2)
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (userType === 'talent') {
        // Créer le profil talent
        const { error } = await supabase
          .from('talents')
          .insert({
            user_id: user.id,
            first_name: talentData.first_name,
            last_name: talentData.last_name,
            phone: talentData.phone,
            position_types: talentData.position_types,
            years_experience: parseInt(talentData.years_experience),
            min_hourly_rate: parseFloat(talentData.min_hourly_rate)
          })

        if (error) throw error
        
        // Rediriger vers dashboard talent
        window.location.href = '/talent'

      } else {
        // Créer le profil établissement
        const { error } = await supabase
          .from('establishments')
          .insert({
            user_id: user.id,
            name: establishmentData.name,
            phone: establishmentData.phone,
            address: establishmentData.address,
            type: establishmentData.type
          })

        if (error) throw error
        
        // Rediriger vers dashboard établissement
        window.location.href = '/establishment'
      }

    } catch (err) {
      setError(err.message || 'Erreur lors de la création du profil')
    } finally {
      setLoading(false)
    }
  }

  const positionTypes = [
    { value: 'serveur', label: 'Serveur/Serveuse' },
    { value: 'barman', label: 'Barman/Barmaid' },
    { value: 'cuisinier', label: 'Cuisinier' },
    { value: 'commis', label: 'Commis de cuisine' },
    { value: 'plongeur', label: 'Plongeur' },
    { value: 'runner', label: 'Runner' }
  ]

  const establishmentTypes = [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'bar', label: 'Bar' },
    { value: 'hotel', label: 'Hôtel' },
    { value: 'cafe', label: 'Café' },
    { value: 'brasserie', label: 'Brasserie' },
    { value: 'traiteur', label: 'Traiteur' }
  ]

  if (!userType) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Retour
            </button>
            <h1 className="text-xl font-bold text-primary-600">⚡ ExtraTaff</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className={`flex items-center ${step === 1 ? 'text-primary-600' : 'text-green-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 1 ? 'bg-primary-600' : 'bg-green-600'} text-white font-bold`}>
                  {step === 1 ? '1' : '✓'}
                </div>
                <span className="ml-2 font-medium">Compte</span>
              </div>
              <div className={`w-16 h-1 mx-4 ${step === 2 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center ${step === 2 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 2 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'} font-bold`}>
                  2
                </div>
                <span className="ml-2 font-medium">Profil</span>
              </div>
            </div>
          </div>

          {/* Titre */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">{userType === 'talent' ? '👤' : '🏪'}</div>
            <h2 className="text-2xl font-bold text-gray-900">
              {userType === 'talent' ? 'Créer mon compte talent' : 'Créer mon compte établissement'}
            </h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* ÉTAPE 1 : Création compte */}
          {step === 1 && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  className="input"
                  placeholder="email@exemple.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe * (min 6 caractères)
                </label>
                <input
                  type="password"
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe *
                </label>
                <input
                  type="password"
                  value={authData.confirmPassword}
                  onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-6"
              >
                {loading ? 'Création...' : 'Continuer'}
              </button>
            </form>
          )}

          {/* ÉTAPE 2 : Profil TALENT */}
          {step === 2 && userType === 'talent' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={talentData.first_name}
                    onChange={(e) => setTalentData({ ...talentData, first_name: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={talentData.last_name}
                    onChange={(e) => setTalentData({ ...talentData, last_name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  value={talentData.phone}
                  onChange={(e) => setTalentData({ ...talentData, phone: e.target.value })}
                  className="input"
                  placeholder="06 12 34 56 78"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postes recherchés * (sélectionnez au moins un)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {positionTypes.map(pos => (
                    <label key={pos.value} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={talentData.position_types.includes(pos.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTalentData({ ...talentData, position_types: [...talentData.position_types, pos.value] })
                          } else {
                            setTalentData({ ...talentData, position_types: talentData.position_types.filter(p => p !== pos.value) })
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{pos.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Années d'expérience *
                  </label>
                  <input
                    type="number"
                    value={talentData.years_experience}
                    onChange={(e) => setTalentData({ ...talentData, years_experience: e.target.value })}
                    className="input"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tarif horaire minimum (€) *
                  </label>
                  <input
                    type="number"
                    value={talentData.min_hourly_rate}
                    onChange={(e) => setTalentData({ ...talentData, min_hourly_rate: e.target.value })}
                    className="input"
                    min="11"
                    step="0.5"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || talentData.position_types.length === 0}
                className="btn-primary w-full mt-6"
              >
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            </form>
          )}

          {/* ÉTAPE 2 : Profil ÉTABLISSEMENT */}
          {step === 2 && userType === 'establishment' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'établissement *
                </label>
                <input
                  type="text"
                  value={establishmentData.name}
                  onChange={(e) => setEstablishmentData({ ...establishmentData, name: e.target.value })}
                  className="input"
                  placeholder="Le Petit Bistrot"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type d'établissement *
                </label>
                <select
                  value={establishmentData.type}
                  onChange={(e) => setEstablishmentData({ ...establishmentData, type: e.target.value })}
                  className="input"
                  required
                >
                  {establishmentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse complète *
                </label>
                <input
                  type="text"
                  value={establishmentData.address}
                  onChange={(e) => setEstablishmentData({ ...establishmentData, address: e.target.value })}
                  className="input"
                  placeholder="12 Rue de Rivoli, 75001 Paris"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  value={establishmentData.phone}
                  onChange={(e) => setEstablishmentData({ ...establishmentData, phone: e.target.value })}
                  className="input"
                  placeholder="01 23 45 67 89"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-6"
              >
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
