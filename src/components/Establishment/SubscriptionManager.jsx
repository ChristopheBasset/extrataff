import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const SUBSCRIPTION_PRICE = 59.90

export default function SubscriptionManager() {
  const navigate = useNavigate()
  const [establishment, setEstablishment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    loadEstablishment()
  }, [])

  const loadEstablishment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setEstablishment(data)
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  const openCustomerPortal = async () => {
    if (!establishment?.stripe_customer_id) {
      alert('Aucun abonnement actif')
      return
    }

    setPortalLoading(true)
    try {
      const { data: { session } } = await supabase.auth.refreshSession()
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            customer_id: establishment.stripe_customer_id
          })
        }
      )

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Erreur')
      }
    } catch (err) {
      console.error('Erreur:', err)
      alert('Erreur lors de l\'ouverture du portail')
    } finally {
      setPortalLoading(false)
    }
  }

  // Calculs
  const isFreemium = establishment?.subscription_status === 'freemium'
  const isActive = establishment?.subscription_status === 'active'
  const trialEndsAt = establishment?.trial_ends_at ? new Date(establishment.trial_ends_at) : null
  const subscriptionEndsAt = establishment?.subscription_ends_at ? new Date(establishment.subscription_ends_at) : null
  const isTrialExpired = trialEndsAt && trialEndsAt < new Date()
  const missionsUsed = establishment?.missions_used || 0

  const getDaysRemaining = (date) => {
    if (!date) return 0
    const now = new Date()
    const diff = date - now
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/establishment')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Retour
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon abonnement</h1>

        {/* Carte statut */}
        <div className={`rounded-2xl p-6 mb-6 ${
          isActive 
            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white' 
            : isTrialExpired 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {isActive ? (
                  <>
                    <span className="text-3xl">⭐</span>
                    <span className="text-2xl font-bold">Premium</span>
                  </>
                ) : isTrialExpired ? (
                  <>
                    <span className="text-3xl">⚠️</span>
                    <span className="text-2xl font-bold text-red-800">Essai terminé</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl">🎁</span>
                    <span className="text-2xl font-bold text-amber-800">Freemium</span>
                  </>
                )}
              </div>
              
              {isActive && (
                <p className="opacity-90">
                  Renouvellement le {formatDate(subscriptionEndsAt)}
                  <span className="ml-2 text-sm opacity-75">
                    ({getDaysRemaining(subscriptionEndsAt)} jours)
                  </span>
                </p>
              )}
              
              {isFreemium && !isTrialExpired && (
                <p className="text-amber-700">
                  {getDaysRemaining(trialEndsAt)} jours restants (jusqu'au {formatDate(trialEndsAt)})
                </p>
              )}
              
              {isFreemium && isTrialExpired && (
                <p className="text-red-700">
                  Votre période d'essai est terminée
                </p>
              )}
            </div>

            {isActive && (
              <div className="text-right">
                <p className="text-3xl font-bold">{SUBSCRIPTION_PRICE}€</p>
                <p className="text-sm opacity-75">/mois</p>
              </div>
            )}
          </div>
        </div>

        {/* Infos détaillées */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {/* Missions */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Missions créées</p>
                <p className="text-sm text-gray-500">
                  {isActive ? 'Illimitées' : `${missionsUsed} / 3 utilisées`}
                </p>
              </div>
            </div>
            {isActive && (
              <span className="text-green-600 font-medium">∞ Illimité</span>
            )}
            {isFreemium && (
              <span className={`font-medium ${3 - missionsUsed > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                {3 - missionsUsed} restante{3 - missionsUsed > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Statut */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Statut</p>
                <p className="text-sm text-gray-500">
                  {isActive ? 'Abonnement actif' : isTrialExpired ? 'Essai expiré' : 'Période d\'essai'}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isActive 
                ? 'bg-green-100 text-green-700' 
                : isTrialExpired 
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
            }`}>
              {isActive ? 'Premium' : isTrialExpired ? 'Expiré' : 'Freemium'}
            </span>
          </div>

          {/* Date inscription */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-purple-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Membre depuis</p>
                <p className="text-sm text-gray-500">{formatDate(establishment?.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {isActive && establishment?.stripe_customer_id && (
            <button
              onClick={openCustomerPortal}
              disabled={portalLoading}
              className="w-full py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              {portalLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Chargement...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                  Gérer mon abonnement
                </>
              )}
            </button>
          )}

          {!isActive && (
            <button
              onClick={() => navigate('/establishment/subscribe')}
              className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
            >
              {isTrialExpired ? 'Souscrire maintenant' : 'Passer à Premium'}
            </button>
          )}
        </div>

        {/* Info légale */}
        {isActive && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Votre abonnement sera automatiquement renouvelé. Vous pouvez l'annuler à tout moment.
          </p>
        )}
      </div>
    </div>
  )
}
