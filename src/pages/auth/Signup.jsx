import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import TurnstileCaptcha from '../../components/shared/TurnstileCaptcha'

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialRole = searchParams.get('type') || searchParams.get('role') || 'talent'

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaError, setCaptchaError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation captcha
    if (!captchaToken) {
      setCaptchaError('Veuillez compléter le captcha')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)

    try {
      // 1. Créer le compte utilisateur
      const { data, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: initialRole
          }
        }
      })

      if (signupError) {
        setError(signupError.message)
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Erreur lors de la création du compte')
        setLoading(false)
        return
      }

      const userId = data.user.id

      // 2. Rafraîchir la session
      await supabase.auth.refreshSession()

      // 3. Appeler l'Edge Function pour créer le profil
      try {
        const response = await fetch(
          'https://yixuosrfwrxhttbhqelj.supabase.co/functions/v1/create-profile',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: userId,
              role: initialRole
            })
          }
        )

        const profileResult = await response.json()

        if (!response.ok) {
          console.error('Profile creation failed:', profileResult)
          setError('Erreur lors de la création du profil')
          setLoading(false)
          return
        }
      } catch (fetchError) {
        console.error('Fetch error:', fetchError)
        setError('Erreur de connexion: ' + fetchError.message)
        setLoading(false)
        return
      }

      // 4. Rediriger selon le rôle
      if (initialRole === 'establishment') {
        navigate('/establishment')
      } else {
        navigate('/talent')
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError(err.message || 'Une erreur est survenue')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">⚡ ExtraTaff</h1>
          <p className="text-gray-600">Créer un compte</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="votre@email.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <TurnstileCaptcha
            onSuccess={setCaptchaToken}
            onError={setCaptchaError}
            error={captchaError}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            {loading ? 'Création en cours...' : 'S\'inscrire'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Vous avez un compte ?{' '}
            <a href="/login" className="text-blue-600 hover:underline font-medium">
              Se connecter
            </a>
          </p>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4">
          Role sélectionné: <strong>{initialRole === 'establishment' ? '🏪 Établissement' : '👤 Talent'}</strong>
        </p>
      </div>
    </div>
  )
}