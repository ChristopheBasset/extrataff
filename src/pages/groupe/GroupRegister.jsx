// GroupRegister.jsx - Inscription Groupe avec role establishment
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ESTABLISHMENT_TYPES } from '../../utils/constants'

const TURNSTILE_SITE_KEY = '0x4AAAAAACU7qpGVX9XhKmW1'

export default function GroupRegister() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [turnstileToken, setTurnstileToken] = useState(null)
  const turnstileRef = useRef(null)
  
  const [formData, setFormData] = useState({
    // Mode gestion
    managementMode: '', // 'solo' ou 'multiple'
    
    // Compte
    email: '',
    password: '',
    passwordConfirm: '',
    
    // Groupe
    groupName: '',
    
    // Premier établissement
    establishmentName: '',
    establishmentType: '',
    address: '',
    phone: '',
    description: ''
  })

  useEffect(() => {
    // Charger le script Turnstile
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      if (window.turnstile && turnstileRef.current) {
        window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(null),
        })
      }
    }

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!turnstileToken) {
      setError('Veuillez valider le captcha')
      return
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Créer le compte utilisateur AVEC LE ROLE ESTABLISHMENT
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'establishment'  // ← IMPORTANT pour la redirection login
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
          management_mode: formData.managementMode
        })
        .select()
        .single()

      if (groupError) throw groupError

      // 3. Créer le premier établissement
      const { error: estabError } = await supabase
        .from('establishments')
        .insert({
          user_id: userId,
          group_id: groupData.id,
          is_group_owner: true,
          name: formData.establishmentName,
          type: formData.establishmentType,
          address: formData.address,
          phone: formData.phone,
          description: formData.description || null,
          subscription_status: 'freemium',
          missions_used: 0,
          trial_ends_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 jours
        })

      if (estabError) throw estabError

      // 4. Rediriger vers le dashboard
      navigate('/establishment')

    } catch (err) {
      console.error('Erreur inscription:', err)
      setError(err.message || 'Une erreur est survenue')
      
      // Reset Turnstile
      if (window.turnstile) {
        window.turnstile.reset()
        setTurnstileToken(null)
      }
    } finally {
      setLoading(false)
    }
  }

  // Étape 1 : Choix du mode de gestion
  const Step1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Comment gérez-vous vos établissements ?</h2>
        <p className="text-gray-600 mt-2">Choisissez le mode qui correspond à votre organisation</p>
      </div>

      <div className="grid gap-4">
        <button
          type="button"
          onClick={() => {
            setFormData({ ...formData, managementMode: 'solo' })
            setStep(2)
          }}
          className="p-6 border-2 border-gray-200 rounded-2xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Je gère seul</h3>
              <p className="text-gray-600 mt-1">
                Vous êtes le seul responsable de tous vos établissements.
                Vous pourrez basculer facilement entre eux.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setFormData({ ...formData, managementMode: 'multiple' })
            setStep(2)
          }}
          className="p-6 border-2 border-gray-200 rounded-2xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">
              👥
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Plusieurs responsables</h3>
              <p className="text-gray-600 mt-1">
                Chaque établissement a son propre responsable.
                Vous pourrez inviter des gestionnaires par email.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )

  // Étape 2 : Création du compte
  const Step2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Créez votre compte</h2>
        <p className="text-gray-600 mt-2">
          {formData.managementMode === 'solo' 
            ? 'Ce compte vous permettra de gérer tous vos établissements'
            : 'Ce sera le compte administrateur principal du groupe'
          }
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          minLength={6}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
        <input
          type="password"
          value={formData.passwordConfirm}
          onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          minLength={6}
          required
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={() => {
            if (formData.email && formData.password && formData.password === formData.passwordConfirm) {
              setStep(3)
            } else if (formData.password !== formData.passwordConfirm) {
              setError('Les mots de passe ne correspondent pas')
            }
          }}
          className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
        >
          Continuer
        </button>
      </div>
    </div>
  )

  // Étape 3 : Infos groupe + premier établissement
  const Step3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Votre groupe</h2>
        <p className="text-gray-600 mt-2">Donnez un nom à votre groupe et ajoutez votre premier établissement</p>
      </div>

      {/* Nom du groupe */}
      <div className="bg-primary-50 rounded-xl p-4">
        <label className="block text-sm font-medium text-primary-700 mb-1">
          Nom du groupe
        </label>
        <input
          type="text"
          value={formData.groupName}
          onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
          placeholder="Ex: Groupe Ducasse, Mes Restaurants..."
          className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
          required
        />
      </div>

      <div className="border-t pt-6">
        <h3 className="font-semibold text-gray-900 mb-4">Premier établissement</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'établissement</label>
            <input
              type="text"
              value={formData.establishmentName}
              onChange={(e) => setFormData({ ...formData, establishmentName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type d'établissement</label>
            <select
              value={formData.establishmentType}
              onChange={(e) => setFormData({ ...formData, establishmentType: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Sélectionner...</option>
              {ESTABLISHMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse complète</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 rue de Paris, 75001 Paris"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Décrivez votre établissement..."
            />
          </div>
        </div>
      </div>

      {/* Turnstile Captcha */}
      <div className="flex justify-center">
        <div ref={turnstileRef}></div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Retour
        </button>
        <button
          type="submit"
          disabled={loading || !turnstileToken}
          className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Création...' : 'Créer mon groupe'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">⚡ ExtraTaff</h1>
          <p className="text-gray-600 mt-2">Inscription Groupe Multi-Établissements</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? 'w-8 bg-primary-600' : s < step ? 'w-8 bg-primary-300' : 'w-8 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && <Step1 />}
            {step === 2 && <Step2 />}
            {step === 3 && <Step3 />}
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Déjà un compte ?{' '}
          <a href="/login" className="text-primary-600 hover:underline">Se connecter</a>
        </p>
      </div>
    </div>
  )
}
