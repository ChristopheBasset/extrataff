// GroupJoinPage.jsx - Rejoindre un groupe via lien d'invitation
import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ESTABLISHMENT_TYPES } from '../../utils/constants'
import AddressAutocomplete from '../../components/shared/AddressAutocomplete'

const TURNSTILE_SITE_KEY = '0x4AAAAAACU7qpGVX9XhKmW1'

export default function GroupJoinPage() {
  const { groupId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [step, setStep] = useState('verify') // verify -> create_account -> details -> success
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [group, setGroup] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [turnstileLoaded, setTurnstileLoaded] = useState(false)

  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
    passwordConfirm: ''
  })

  const [restaurantData, setRestaurantData] = useState({
    address: '',
    city: '',
    postal_code: '',
    department: '',
    coordinates: null,
    phone: '',
    description: ''
  })

  // Charger le script Turnstile
  useEffect(() => {
    if (window.turnstile) {
      setTurnstileLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.onload = () => setTurnstileLoaded(true)
    document.head.appendChild(script)
  }, [])

  // Rendre le captcha
  useEffect(() => {
    if (step === 'create_account' && turnstileLoaded && window.turnstile) {
      const turnstileRef = document.getElementById('turnstile-container')
      if (turnstileRef && !turnstileRef.hasChildNodes()) {
        window.turnstile.render(turnstileRef, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: setTurnstileToken,
          'expired-callback': () => setTurnstileToken(null)
        })
      }
    }
  }, [step, turnstileLoaded])

  // Vérifier le token et l'invitation
  useEffect(() => {
    verifyInvitation()
  }, [groupId, token])

  const verifyInvitation = async () => {
    try {console.log('groupId:', groupId)
console.log('token:', token)
      setLoading(true)

      if (!groupId || !token) {
        setError('Lien d\'invitation invalide')
        setStep('error')
        return
      }

      // Récupérer le groupe
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (groupError) throw new Error('Groupe non trouvé')

      setGroup(groupData)

      // Vérifier le token d'invitation
      const { data: inviteData, error: inviteError } = await supabase
        .from('group_invitations')
        .select('*')
        .eq('token', token)
        .eq('group_id', groupId)
        .single()

      if (inviteError) {
        setError('Token d\'invitation invalide')
        setStep('error')
        return
      }

      if (inviteData.status !== 'pending') {
        setError('Cette invitation a déjà été utilisée')
        setStep('error')
        return
      }

      const expiresAt = new Date(inviteData.expires_at)
      if (expiresAt < new Date()) {
        setError('Cette invitation a expiré (validité: 7 jours)')
        setStep('error')
        return
      }

      setInvitation(inviteData)
      setAccountData(prev => ({ ...prev, email: inviteData.manager_email }))
      setStep('create_account')

    } catch (err) {
      console.error('Erreur vérification:', err)
      setError(err.message || 'Erreur lors de la vérification')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()

    if (!turnstileToken) {
      setError('Veuillez valider le captcha')
      return
    }

    if (accountData.password !== accountData.passwordConfirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (accountData.password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountData.email,
        password: accountData.password,
        options: {
          data: {
            role: 'establishment'
          }
        }
      })

      if (authError) throw authError

      // Passer à l'étape détails du restaurant
      setStep('details')

    } catch (err) {
      console.error('Erreur création compte:', err)
      setError(err.message || 'Erreur lors de la création du compte')
      if (window.turnstile) {
        window.turnstile.reset()
        setTurnstileToken(null)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Gestion de l'adresse avec autocomplete (MÊME PATTERN QUE EstablishmentProfileForm)
  const handleAddressChange = (addressData) => {
    setRestaurantData(prev => ({
      ...prev,
      address: addressData.address,
      city: addressData.city,
      postal_code: addressData.postcode,
      department: addressData.department,
      coordinates: addressData.coordinates
    }))
  }

  // Normaliser le numéro de téléphone
  const normalizePhone = (phone) => {
    return phone.replace(/[\s\-\.]/g, '').trim()
  }

  // Vérifier si le téléphone existe déjà
  const checkPhoneExists = async (phone) => {
    const normalizedPhone = normalizePhone(phone)
    
    const { data, error } = await supabase
      .from('establishments')
      .select('id, name')
      .or(`phone.eq.${normalizedPhone},phone.eq.${phone}`)
      .limit(1)

    if (error) {
      console.error('Erreur vérification téléphone:', error)
      return false
    }

    return data && data.length > 0
  }

  // Vérifier si l'adresse existe déjà
  const checkAddressExists = async (address) => {
    if (!address || address.trim() === '') return false
    
    const { data, error } = await supabase
      .from('establishments')
      .select('id, name')
      .eq('address', address.trim())
      .limit(1)

    if (error) {
      console.error('Erreur vérification adresse:', error)
      return false
    }

    return data && data.length > 0
  }

  const handleCompleteRestaurant = async (e) => {
    e.preventDefault()

    if (!restaurantData.address || !restaurantData.phone) {
      setError('Tous les champs obligatoires doivent être remplis')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Vérifier si le téléphone existe déjà
      const phoneExists = await checkPhoneExists(restaurantData.phone)
      if (phoneExists) {
        throw new Error('Ce numéro de téléphone est déjà associé à un établissement')
      }

      // Vérifier si l'adresse existe déjà
      const addressExists = await checkAddressExists(restaurantData.address)
      if (addressExists) {
        throw new Error('Cette adresse est déjà associée à un établissement')
      }

      // Récupérer l'user actuel
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Erreur de session')
      }

      // Créer la location PostGIS POINT (MÊME PATTERN QUE EstablishmentProfileForm)
      let location = 'POINT(2.3522 48.8566)' // Paris par défaut
      if (restaurantData.coordinates && restaurantData.coordinates.length === 2) {
        // L'API retourne [lng, lat]
        location = `POINT(${restaurantData.coordinates[0]} ${restaurantData.coordinates[1]})`
      }

      // Normaliser le téléphone
      const normalizedPhone = normalizePhone(restaurantData.phone)

      // Créer l'établissement
      const { error: estabError } = await supabase
        .from('establishments')
        .insert({
          user_id: user.id,
          group_id: groupId,
          is_group_owner: false,
          name: invitation.restaurant_name,
          type: invitation.restaurant_type,
          address: restaurantData.address,
          city: restaurantData.city,
          postal_code: restaurantData.postal_code,
          department: restaurantData.department,
          location: location,
          phone: normalizedPhone,
          description: restaurantData.description || null,
          subscription_status: 'freemium',
          missions_used: 0,
          trial_ends_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
        })

      if (estabError) throw estabError

      // Marquer l'invitation comme utilisée
      const { error: updateError } = await supabase
        .from('group_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)

      if (updateError) throw updateError

      setStep('success')

    } catch (err) {
      console.error('Erreur finalisation:', err)
      setError(err.message || 'Erreur lors de la finalisation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field) => (e) => {
    setAccountData(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleRestaurantChange = (field) => (e) => {
    setRestaurantData(prev => ({ ...prev, [field]: e.target.value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'invitation...</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Erreur</h1>
          <p className="text-gray-600 mb-6">{error || 'Une erreur est survenue'}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">⚡ ExtraTaff</h1>
          <p className="text-gray-600 mt-2">Rejoindre un groupe</p>
        </div>

        {group && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-primary-700">
              Vous êtes invité à rejoindre le groupe
            </p>
            <p className="text-lg font-bold text-primary-900 mt-1">
              📦 {group.name}
            </p>
            {invitation && (
              <p className="text-sm text-primary-600 mt-2">
                Restaurant: <span className="font-semibold">{invitation.restaurant_name}</span>
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {/* ÉTAPE 1: Créer le compte */}
          {step === 'create_account' && (
            <form onSubmit={handleCreateAccount} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Créez votre compte</h2>
                <p className="text-gray-600 mt-2">Ce compte vous permettra de gérer votre restaurant</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={accountData.email}
                  onChange={handleChange('email')}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                />
                <p className="text-xs text-gray-500 mt-1">Email d'invitation (non modifiable)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={accountData.password}
                  onChange={handleChange('password')}
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={accountData.passwordConfirm}
                  onChange={handleChange('passwordConfirm')}
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">Vérification de sécurité</label>
                <div className="flex justify-center bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div id="turnstile-container"></div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !turnstileToken}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Création...' : 'Créer mon compte'}
              </button>
            </form>
          )}

          {/* ÉTAPE 2: Détails du restaurant */}
          {step === 'details' && (
            <form onSubmit={handleCompleteRestaurant} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Infos du restaurant</h2>
                <p className="text-gray-600 mt-2">Complétez les informations de votre établissement</p>
              </div>

              <div className="bg-primary-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-primary-900">
                  🏪 {invitation?.restaurant_name}
                </p>
                <p className="text-xs text-primary-600 mt-1">
                  {invitation?.restaurant_type}
                </p>
              </div>

              {/* Adresse avec autocomplete (MÊME PATTERN QUE EstablishmentProfileForm) */}
              <AddressAutocomplete
                value={restaurantData.address}
                onChange={handleAddressChange}
                label="Adresse complète *"
                placeholder="Tapez une adresse..."
                required
              />
              <p className="text-xs text-gray-500 -mt-4">
                L'adresse exacte ne sera pas affichée publiquement.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <input
                  type="tel"
                  value={restaurantData.phone}
                  onChange={handleRestaurantChange('phone')}
                  placeholder="01 23 45 67 89"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
                <textarea
                  value={restaurantData.description}
                  onChange={handleRestaurantChange('description')}
                  placeholder="Décrivez votre restaurant..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Finalisation...' : 'Finaliser mon inscription'}
              </button>
            </form>
          )}

          {/* ÉTAPE 3: Succès */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Bienvenue !</h2>
              <p className="text-gray-600 mb-6">
                Votre compte a été créé avec succès. Vous pouvez maintenant gérer votre restaurant.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 font-semibold"
              >
                Se connecter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
