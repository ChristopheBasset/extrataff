import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const initialRole = searchParams.get('role') || 'talent'
  
  const [role, setRole] = useState(initialRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role
        }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Rediriger directement vers le dashboard selon le rôle
    if (role === 'establishment') {
      navigate('/establishment')
    } else {
      navigate('/talent')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">⚡ ExtraTaff</h1>
          <p className="text-gray-600 mt-2">Créer votre compte</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Je suis un(e)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('establishment')}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    role === 'establishment'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">🏪</div>
                  <div className="font-medium">Établissement</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('talent')}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    role === 'talent'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">👤</div>
                  <div className="font-medium">Talent</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}