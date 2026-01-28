import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function SubscribeSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (sessionId) {
      verifyAndActivate(sessionId)
    } else {
      setError('Session invalide')
      setLoading(false)
    }
  }, [searchParams])

  const verifyAndActivate = async (sessionId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Appeler l'Edge Function pour vérifier et activer
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ session_id: sessionId })
        }
      )

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Succès !
      setLoading(false)
    } catch (err) {
      console.error('Erreur:', err)
      setError(err.message || 'Erreur lors de la vérification')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Activation de votre abonnement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/establishment/subscribe')}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* Animation de succès */}
        <div className="relative mb-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="absolute -top-2 -right-2 text-4xl animate-bounce">🎉</div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bienvenue Premium !
        </h1>
        
        <p className="text-gray-600 mb-6">
          Votre abonnement est maintenant actif. Vous pouvez publier des missions illimitées !
        </p>

        {/* Avantages débloqués */}
        <div className="bg-green-50 rounded-xl p-4 mb-6 text-left">
          <p className="font-medium text-green-800 mb-2">✨ Avantages débloqués :</p>
          <ul className="text-sm text-green-700 space-y-1">
            <li>✓ Missions illimitées</li>
            <li>✓ Accès à tous les talents</li>
            <li>✓ Notifications prioritaires</li>
            <li>✓ Support dédié</li>
          </ul>
        </div>

        <button
          onClick={() => navigate('/establishment')}
          className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
        >
          Accéder à mon dashboard
        </button>

        <p className="text-sm text-gray-500 mt-4">
          Un email de confirmation vous a été envoyé.
        </p>
      </div>
    </div>
  )
}
