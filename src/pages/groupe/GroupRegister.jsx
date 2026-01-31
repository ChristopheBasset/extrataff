import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ESTABLISHMENT_TYPES, FRENCH_DEPARTMENTS } from '../../utils/constants'

export default function GroupRegister() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialCount = parseInt(searchParams.get('count')) || 2

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

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

  // Calcul du prix
  const calculatePrice = (count) => {
    if (count === 1) return 59.90
    return 59.90 + (count - 1) * 39.90
  }

  const totalPrice = calculatePrice(formData.establishmentCount)

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

  // Étape 3 : Création finale
  const handleFinalSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      })

      if (authError) throw authError

      const userId = authData.user.id

      // 2. Créer le groupe
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: formData.groupName,
          owner_user_id: userId,
          management_type: formData.managementType,
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
          // Freemium par défaut
          subscription_status: 'freemium',
          missions_used: 0,
          trial_ends_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // +60 jours
        })

      if (estError) throw estError

      // Succès ! Rediriger vers le dashboard
      navigate('/establishment/dashboard')

    } catch (err) {
      console.error('Erreur inscription groupe:', err)
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
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
        
        {/* ==================== ÉTAPE 1 : Mode de gestion ==================== */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🏢</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Comment gérez-vous vos {formData.establishmentCount} établissements ?
              </h2>
              <p className="text-gray-600">
                Choisissez le mode qui vous correspond
              </p>
            </div>

            <div className="space-y-4">
              {/* Option 1 : Je gère seul */}
              <button
                onClick={() => handleModeSelect('single')}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">👤</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">
                      Je gère tout seul
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Un seul compte pour gérer tous vos établissements. 
                      Vous pourrez switcher facilement entre eux.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        ✓ 1 compte
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        ✓ Switch rapide
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        ✓ Vue globale
                      </span>
                    </div>
                  </div>
                  <div className="text-gray-400 group-hover:text-blue-500">→</div>
                </div>
              </button>

              {/* Option 2 : Plusieurs responsables */}
              <button
                onClick={() => handleModeSelect('multiple')}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">👥</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">
                      Plusieurs responsables
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Chaque établissement a son propre responsable avec son compte. 
                      Vous inviterez vos équipes après l'inscription.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        ✓ Comptes séparés
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        ✓ Invitations email
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        ✓ Autonomie
                      </span>
                    </div>
                  </div>
                  <div className="text-gray-400 group-hover:text-blue-500">→</div>
                </div>
              </button>
            </div>

            {/* Récap prix */}
            <div className="mt-8 p-4 bg-gray-50 rounded-xl text-center">
              <p className="text-gray-600">
                {formData.establishmentCount} établissements = {' '}
                <span className="font-bold text-gray-900">
                  {totalPrice.toFixed(2).replace('.', ',')}€/mois
                </span>
                <span className="text-sm text-gray-500 ml-2">(après essai gratuit)</span>
              </p>
            </div>
          </div>
        )}

        {/* ==================== ÉTAPE 2 : Création compte ==================== */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Créez votre compte
              </h2>
              <p className="text-gray-600">
                {formData.managementType === 'single' 
                  ? 'Ce compte vous permettra de gérer tous vos établissements'
                  : 'Ce sera le compte administrateur du groupe'
                }
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

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
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700"
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
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="12 rue de la Paix"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code postal *
                      </label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="75001"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville *
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Paris"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Département *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Sélectionnez...</option>
                      {FRENCH_DEPARTMENTS && FRENCH_DEPARTMENTS.map(dept => (
                        <option key={dept.value} value={dept.value}>{dept.label}</option>
                      ))}
                    </select>
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
                  <span className="text-gray-600">Établissements :</span>
                  <span className="font-medium">{formData.establishmentCount}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <span className="text-gray-600">Total après essai :</span>
                  <span className="font-bold text-blue-600">{totalPrice.toFixed(2).replace('.', ',')}€/mois</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Création en cours...' : 'Créer mon compte Groupe ✓'}
              </button>

              <p className="text-center text-xs text-gray-500">
                En créant votre compte, vous acceptez nos conditions d'utilisation.<br />
                Vous bénéficiez de 2 mois d'essai gratuit.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
