import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Subscribe() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [establishment, setEstablishment] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadEstablishment()
  }, [])

  const loadEstablishment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setEstablishment(data)

      // Si déjà premium, rediriger
      if (data.subscription_status === 'active') {
        navigate('/establishment')
      }
    } catch (err) {
      console.error('Erreur:', err)
      setError('Erreur lors du chargement')
    }
  }

  const handleSubscribe = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            establishment_id: establishment.id
          })
        }
      )

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Rediriger vers Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      console.error('Erreur:', err)
      setError(err.message || 'Erreur lors de la création du paiement')
    } finally {
      setLoading(false)
    }
  }

  // Calcul des jours restants
  const getDaysRemaining = () => {
    if (!establishment?.trial_ends_at) return 0
    const now = new Date()
    const trialEnd = new Date(establishment.trial_ends_at)
    const diff = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const daysRemaining = getDaysRemaining()
  const isTrialExpired = daysRemaining <= 0
  const missionsUsed = establishment?.missions_used || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Passez à Premium ⚡
          </h1>
          <p className="text-gray-600">
            Publiez des missions illimitées et accédez à tous les talents
          </p>
        </div>

        {/* Statut actuel */}
        {establishment && (
          <div className={`rounded-xl p-4 mb-6 ${isTrialExpired ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{isTrialExpired ? '⏰' : '🎁'}</span>
              <div>
                <p className="font-medium text-gray-900">
                  {isTrialExpired ? 'Période d\'essai terminée' : `${daysRemaining} jours restants`}
                </p>
                <p className="text-sm text-gray-600">
                  {missionsUsed}/3 missions utilisées
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Carte Premium */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-primary-500">
          {/* Badge */}
          <div className="bg-primary-500 text-white text-center py-2 text-sm font-medium">
            ✨ Recommandé
          </div>

          <div className="p-8">
            {/* Prix */}
            <div className="text-center mb-6">
              <span className="text-5xl font-bold text-gray-900">59,90€</span>
              <span className="text-gray-500 text-lg">/mois</span>
            </div>

            {/* Avantages */}
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-gray-700">Missions <strong>illimitées</strong></span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-gray-700">Accès à <strong>tous les établissements</strong></span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-gray-700">Notifications <strong>prioritaires</strong></span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-gray-700">Support <strong>dédié</strong></span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-gray-700"><strong>Sans engagement</strong> - Annulez quand vous voulez</span>
              </li>
            </ul>

            {/* Erreur */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Bouton */}
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Chargement...
                </span>
              ) : (
                'Souscrire maintenant'
              )}
            </button>

            {/* Sécurité */}
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Paiement sécurisé par Stripe
            </div>
          </div>
        </div>

        {/* Retour */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/establishment')}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            ← Retour au dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
