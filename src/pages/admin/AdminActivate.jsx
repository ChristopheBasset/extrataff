import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminActivate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState(null)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (token) {
      verifyToken()
    } else {
      setError('Lien d\'invitation invalide')
      setLoading(false)
    }
  }, [token])

  const verifyToken = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id, email, name, is_activated')
        .eq('activation_token', token)
        .single()

      if (error || !data) {
        setError('Lien d\'invitation invalide ou expiré')
        return
      }

      if (data.is_activated) {
        setError('Ce compte a déjà été activé. Connectez-vous via la page admin.')
        return
      }

      setAdmin(data)
    } catch (err) {
      console.error('Erreur vérification token:', err)
      setError('Erreur lors de la vérification')
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setSubmitting(true)
    try {
      // Créer le compte utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: admin.email,
        password: password,
        options: {
          data: {
            role: 'admin',
            name: admin.name
          }
        }
      })

      if (authError) {
        // Si l'utilisateur existe déjà, on essaie de se connecter
        if (authError.message.includes('already registered')) {
          setError('Un compte existe déjà avec cet email. Utilisez la page de connexion admin.')
          return
        }
        throw authError
      }

      // Marquer l'admin comme activé
      const { error: updateError } = await supabase
        .from('admins')
        .update({ 
          is_activated: true, 
          activated_at: new Date().toISOString() 
        })
        .eq('id', admin.id)

      if (updateError) throw updateError

      setSuccess(true)
    } catch (err) {
      console.error('Erreur activation:', err)
      setError(err.message || 'Erreur lors de l\'activation')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification du lien...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Compte activé !</h1>
          <p className="text-gray-600 mb-6">
            Votre compte administrateur a été créé avec succès.
          </p>
          <button
            onClick={() => navigate('/admin')}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            Se connecter
          </button>
        </div>
      </div>
    )
  }

  if (error && !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/admin')}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            Aller à la page admin
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🛠️</div>
          <h1 className="text-2xl font-bold text-gray-900">Activation Admin</h1>
          <p className="text-gray-600 mt-2">
            Bienvenue <strong>{admin?.name || admin?.email}</strong> !<br />
            Créez votre mot de passe pour activer votre compte.
          </p>
        </div>

        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={admin?.email || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              required
              minLength={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez votre mot de passe"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Activation...' : 'Activer mon compte'}
          </button>
        </form>
      </div>
    </div>
  )
}
