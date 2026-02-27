import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const userType = searchParams.get('type') // 'talent' ou 'establishment'
  
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptCGV, setAcceptCGV] = useState(false)

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

  // Inscription classique email/password
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (!acceptCGV) {
      setError('Vous devez accepter les Conditions Générales de Vente pour vous inscrire')
      setLoading(false)
      return
    }

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
      const { data, error } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password
      })

      if (error) throw error

      if (!data.user) {
        throw new Error('Erreur lors de la création du compte')
      }

      console.log('✅ Compte créé avec succès:', data.user.id)

      // Attendre que la session soit active
      if (!data.session) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await supabase.auth.refreshSession()
      }

      // Stocker le type pour la page profil
      sessionStorage.setItem('registration_type', userType)
      sessionStorage.setItem('registration_success', 'true')

      // Afficher le message de succès puis rediriger
      setSuccess(true)
      setTimeout(() => {
        if (userType === 'talent') {
          window.location.href = '/talent/profile-form'
        } else {
          window.location.href = '/establishment/profile-form'
        }
      }, 2000)

    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  // Inscription avec Google
  const handleGoogleSignIn = async () => {
    if (!acceptCGV) {
      setError('Vous devez accepter les Conditions Générales de Vente pour vous inscrire')
      return
    }

    setGoogleLoading(true)
    setError(null)

    try {
      // Stocker le type et le flag avant la redirection OAuth
      sessionStorage.setItem('registration_type', userType)
      sessionStorage.setItem('registration_success', 'true')
      sessionStorage.setItem('oauth_flow', 'register')

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

  if (!userType) return null

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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Compte créé avec succès !</h2>
          <p className="text-gray-600 mb-4">
            {userType === 'talent' 
              ? 'Complétez maintenant votre profil talent pour recevoir des missions.'
              : 'Complétez maintenant votre profil établissement pour publier des missions.'}
          </p>
          <div className="flex items-center justify-center gap-2 text-primary-600">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span className="text-sm">Redirection en cours...</span>
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

          {/* Bandeau offre pour les établissements */}
          {userType === 'establishment' && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <div>
                  <p className="font-semibold text-green-900">1ère mission offerte</p>
                  <p className="text-sm text-green-700">Puis rejoignez le Club ExtraTaff avec 30 jours d'essai gratuit</p>
                </div>
              </div>
            </div>
          )}

          {/* ========== Bouton Google ========== */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || !acceptCGV}
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
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">ou par email</span>
            </div>
          </div>

          {/* ========== Formulaire classique ========== */}
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  className="input pr-12"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={authData.confirmPassword}
                  onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                  className="input pr-12"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !acceptCGV}
              className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          {/* CGV — en dessous des deux méthodes */}
          <div className="flex items-start gap-3 mt-6 pt-4 border-t border-gray-100">
            <input
              type="checkbox"
              id="cgv"
              checked={acceptCGV}
              onChange={(e) => setAcceptCGV(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
            <label htmlFor="cgv" className="text-sm text-gray-600 cursor-pointer">
              J'accepte les{' '}
              <a href="/cgv" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline hover:text-primary-800">
                Conditions Générales de Vente
              </a>{' '}
              et la{' '}
              <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline hover:text-primary-800">
                Politique de Confidentialité
              </a>
              {' '}<span className="text-red-500">*</span>
            </label>
          </div>

          {/* Lien login */}
          <div className="mt-6 text-center text-sm text-gray-600">
            Déjà un compte ?{' '}
            <button onClick={() => navigate('/login')} className="text-primary-600 hover:text-primary-700 font-medium">
              Se connecter
            </button>
          </div>

          {/* Lien discret offre Groupe (uniquement pour établissement) */}
          {userType === 'establishment' && (
            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <button
                onClick={() => navigate('/groupe')}
                className="text-sm text-gray-500 hover:text-primary-600 transition"
              >
                🏢 Vous gérez plusieurs établissements ? <span className="underline">Voir l'offre Groupe →</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
