import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, ESTABLISHMENT_TYPES, FRENCH_DEPARTMENTS } from '../../lib/supabase'
import AddressAutocomplete from '../../components/shared/AddressAutocomplete'

export default function GroupRegister() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialCount = parseInt(searchParams.get('count')) || 2

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [acceptCGV, setAcceptCGV] = useState(false)

  // Données du formulaire
  const [formData, setFormData] = useState({
    // Étape 1 : Mode de gestion
    managementType: '', // 'single' ou 'multiple'
    establishmentCount: initialCount,
    
    // Étape 2 : Compte
    email: '',
    password: '',
    confirmPassword: '',
    
    // Étape 3 : Groupe + 1er établissement
    groupName: '',
    establishmentName: '',
    establishmentType: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    department: ''
  })

  // Calcul du prix (Club ExtraTaff Groupe)
  const calculatePrice = (count) => {
    if (count === 1) return 39.00
    return 39.00 + (count - 1) * 35.10
  }

  const totalPrice = calculatePrice(formData.establishmentCount)
  // Prix TTC affichés directement

  // Étape 1 : Choix du mode
  const handleModeSelect = (mode) => {
    setFormData({ ...formData, managementType: mode })
    setStep(2)
  }

  // Étape 2 : Validation compte
  const handleAccountSubmit = (e) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setStep(3)
  }

  // Étape 2 : Google Sign-In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      // Stocker les infos du groupe pour après le callback
      sessionStorage.setItem('oauth_flow', 'group_register')
      sessionStorage.setItem('group_management_type', formData.managementType)
      sessionStorage.setItem('group_establishment_count', formData.establishmentCount.toString())

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error
    } catch (err) {
      setError(err.message || 'Erreur connexion Google')
      setGoogleLoading(false)
    }
  }

  // Étape 3 : Création finale
  const handleFinalSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!acceptCGV) {
      setError('Vous devez accepter les Conditions Générales de Vente pour vous inscrire')
      setLoading(false)
      return
    }

    try {
      // 1. Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'establishment'
          }
        }
      })

      if (authError) throw authError

      const userId = authData.user.id

      // 2. Créer le groupe
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: formData.groupName,
          owner_id: userId,
          management_mode: formData.managementType,
          establishment_count: formData.establishmentCount
        })
        .select()
        .single()

      if (groupError) throw groupError

      // 3. Créer le premier établissement
      const { error: estError } = await supabase
        .from('establishments')
        .insert({
          user_id: userId,
          group_id: groupData.id,
          is_group_owner: true,
          name: formData.establishmentName,
          type: formData.establishmentType,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
          department: formData.department,
          subscription_status: 'freemium',
          missions_used: 0,
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })

      if (estError) throw estError

      // Afficher succès puis rediriger
      setSuccess(true)
      setTimeout(() => {
        navigate('/group-admin')
      }, 2000)

    } catch (err) {
      console.error('Erreur inscription groupe:', err)
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  // Écran de succès
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Groupe créé avec succès !</h2>
          <p className="text-gray-600 mb-4">
            Votre groupe et votre premier établissement sont prêts. Bienvenue sur ExtraTaff !
          </p>
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span className="text-sm">Redirection vers votre espace groupe...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : navigate('/groupe')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Retour
            </button>
            <h1 className="text-xl font-bold text-primary-600">⚡ ExtraTaff Groupe</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((num) => (
            <div key={num} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= num 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step > num ? '✓' : num}
              </div>
              {num < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  step > num ? 'bg-blue-600' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8 text-sm text-gray-600 mb-8">
          <span className={step === 1 ? 'text-blue-600 font-medium' : ''}>Mode</span>
          <span className={step === 2 ? 'text-blue-600 font-medium' : ''}>Compte</span>
          <span className={step === 3 ? 'text-blue-600 font-medium' : ''}>Établissement</span>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-2xl mx-auto px-4 pb-12">

        {/* Bandeau offre */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="font-semibold text-green-900">1ère mission offerte pour chaque établissement</p>
              <p className="text-sm text-green-700">Puis rejoignez le Club ExtraTaff — Missions illimitées, sans engagement</p>
            </div>
          </div>
        </div>

        {/* ==================== ÉTAPE 1 : Choix du mode ==================== */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🏢</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Comment gérez-vous vos établissements ?
              </h2>
              <p className="text-gray-600">
                Choisissez le mode de gestion adapté à votre organisation
              </p>
            </div>

            {/* Option 1 : Je gère seul */}
            <button
              onClick={() => handleModeSelect('single')}
              className="w-full bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-blue-500 transition text-left"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">👤</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Je gère seul</h3>
                  <p className="text-gray-600">Un seul compte pour gérer tous vos établissements</p>
                  <p className="text-sm text-blue-600 mt-2">Idéal pour les propriétaires multi-sites</p>
                </div>
              </div>
            </button>

            {/* Option 2 : Plusieurs responsables */}
            <button
              onClick={() => handleModeSelect('multiple')}
              className="w-full bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-blue-500 transition text-left"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">👥</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Plusieurs responsables</h3>
                  <p className="text-gray-600">Chaque établissement a son propre responsable</p>
                  <p className="text-sm text-blue-600 mt-2">Idéal pour les franchises et chaînes</p>
                </div>
              </div>
            </button>

            {/* Nombre d'établissements */}
            <div className="bg-white rounded-xl shadow-lg p-6 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre d'établissements
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setFormData({ ...formData, establishmentCount: Math.max(2, formData.establishmentCount - 1) })}
                  className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="text-2xl font-bold text-blue-600 w-12 text-center">
                  {formData.establishmentCount}
                </span>
                <button
                  onClick={() => setFormData({ ...formData, establishmentCount: Math.min(20, formData.establishmentCount + 1) })}
                  className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
                >
                  +
                </button>
                <div className="text-right flex-1">
                  <span className="text-lg font-bold text-blue-600">{totalPrice.toFixed(2).replace('.', ',')}€ TTC/mois</span>
                  <span className="block text-xs text-gray-400"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ÉTAPE 2 : Compte ==================== */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Créer votre compte
              </h2>
              <p className="text-gray-600">
                Ce compte sera l'administrateur du groupe
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* ========== Bouton Google ========== */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {googleLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continuer avec Google
            </button>

            {/* Séparateur */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">ou par email</span>
              </div>
            </div>

            {/* ========== Formulaire classique ========== */}
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="email@exemple.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe * (min 6 caractères)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe *
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition mt-6"
              >
                Continuer →
              </button>
            </form>
          </div>
        )}

        {/* ==================== ÉTAPE 3 : Groupe + Établissement ==================== */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🏪</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Informations du groupe
              </h2>
              <p className="text-gray-600">
                Renseignez les infos de votre groupe et de votre premier établissement
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleFinalSubmit} className="space-y-6">
              
              {/* Nom du groupe */}
              <div className="p-4 bg-blue-50 rounded-xl">
                <label className="block text-sm font-medium text-blue-900 mb-1">
                  Nom du groupe *
                </label>
                <input
                  type="text"
                  value={formData.groupName}
                  onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                  className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  placeholder="Ex: Groupe Bertrand, Mes Restaurants..."
                  required
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Premier établissement</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de l'établissement *
                    </label>
                    <input
                      type="text"
                      value={formData.establishmentName}
                      onChange={(e) => setFormData({ ...formData, establishmentName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Le Café du Centre"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type d'établissement *
                    </label>
                    <select
                      value={formData.establishmentType}
                      onChange={(e) => setFormData({ ...formData, establishmentType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Sélectionnez...</option>
                      {ESTABLISHMENT_TYPES && ESTABLISHMENT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="06 12 34 56 78"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse *
                    </label>
                    <AddressAutocomplete
                      value={formData.address}
                      onChange={(addressData) => {
                        setFormData({
                          ...formData,
                          address: addressData.address || formData.address,
                          city: addressData.city || formData.city,
                          postalCode: addressData.postalCode || formData.postalCode,
                          department: addressData.department || formData.department
                        })
                      }}
                      onLocationChange={(lat, lon) => {}}
                    />
                  </div>
                </div>
              </div>

              {/* Récap */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Mode :</span>
                  <span className="font-medium">
                    {formData.managementType === 'single' ? '👤 Je gère seul' : '👥 Plusieurs responsables'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-600">1er établissement :</span>
                  <span className="font-medium">39,00€</span>
                </div>
                {formData.establishmentCount > 1 && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-600">{formData.establishmentCount - 1} établissement{formData.establishmentCount > 2 ? 's' : ''} supplémentaire{formData.establishmentCount > 2 ? 's' : ''} (-10%) :</span>
                    <span className="font-medium">{((formData.establishmentCount - 1) * 35.10).toFixed(2).replace('.', ',')}€</span>
                  </div>
                )}
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <span className="text-gray-600">Total après essai :</span>
                  <div className="text-right">
                    <span className="font-bold text-blue-600">{totalPrice.toFixed(2).replace('.', ',')}€ TTC/mois</span>
                    <span className="block text-xs text-gray-400"></span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="cgv"
                  checked={acceptCGV}
                  onChange={(e) => setAcceptCGV(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="cgv" className="text-sm text-gray-600 cursor-pointer">
                  J'accepte les{' '}
                  <a href="/cgv" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                    Conditions Générales de Vente
                  </a>{' '}
                  et la{' '}
                  <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                    Politique de Confidentialité
                  </a>
                  {' '}<span className="text-red-500">*</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !acceptCGV}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Création en cours...' : 'Créer mon compte Groupe ✓'}
              </button>

              <p className="text-center text-xs text-gray-500">
                Vous bénéficiez de 30 jours d'essai gratuit avec missions illimitées.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
