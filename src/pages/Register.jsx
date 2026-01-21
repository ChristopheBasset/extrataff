import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const userType = searchParams.get('type') // 'talent' ou 'establishment'
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    // Rediriger si pas de type
    if (!userType || (userType !== 'talent' && userType !== 'establishment')) {
      navigate('/')
    }
  }, [userType, navigate])

  const handleSubmit = async (e) => {
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

      // Rediriger vers le formulaire de profil complet
      if (userType === 'talent') {
        navigate('/talent/profile-form')
      } else {
        navigate('/establishment/profile-form')
      }

    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

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
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center text-primary-600">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-600 text-white font-bold">
                  1
                </div>
                <span className="ml-2 font-medium">Compte</span>
              </div>
              <div className="w-16 h-1 mx-4 bg-gray-300"></div>
              <div className="flex items-center text-gray-400">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-600 font-bold">
                  2
                </div>
                <span className="ml-2 font-medium">Profil</span>
              </div>
            </div>
          </div>

          {/* Titre */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">{userType === 'talent' ? '👤' : '🏪'}</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Créer mon compte {userType === 'talent' ? 'talent' : 'établissement'}
            </h2>
            <p className="text-gray-600 text-sm">
              Étape 1 : Créez votre compte
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
        </div>
      </div>
    </div>
  )
}
