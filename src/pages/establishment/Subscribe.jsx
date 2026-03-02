import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Subscribe() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [establishment, setEstablishment] = useState(null)
  const [error, setError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(null)

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

      if (data.subscription_status === 'active' && data.subscription_plan === 'club') {
        navigate('/establishment')
      }
    } catch (err) {
      console.error('Erreur:', err)
      setError('Erreur lors du chargement')
    }
  }

  const handleCheckout = async (planType) => {
    setLoading(true)
    setError('')

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
      
      if (sessionError || !session) {
        throw new Error('Session expirée. Veuillez vous reconnecter.')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('Configuration manquante. Contactez le support.')
      }

      const body = {
        establishment_id: establishment.id,
        plan_type: planType
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(body)
        }
      )

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erreur lors de la création du paiement')
      }

      if (!data.url) {
        throw new Error('URL de paiement non reçue')
      }

      window.location.href = data.url
    } catch (err) {
      console.error('Erreur:', err)
      setError(err.message || 'Erreur lors de la création du paiement')
    } finally {
      setLoading(false)
    }
  }

  // Vérifier si on est dans la période de lancement (avant fin mars 2026)
  const isLaunchOffer = new Date() <= new Date('2026-03-31T23:59:59')

  // Spinner réutilisable
  const Spinner = ({ text }) => (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      {text || 'Redirection vers Stripe...'}
    </span>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choisissez votre formule 🏆</h1>
          <p className="text-gray-600">
            Simple, transparent, sans engagement.
          </p>
        </div>

        {/* Offre de lancement */}
        {isLaunchOffer && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-4 mb-6 text-center shadow-lg">
            <p className="text-lg font-bold">
              🚀 Offre de lancement — 1er mois GRATUIT !
            </p>
            <p className="text-sm opacity-90">
              Inscrivez-vous avant fin mars 2026
            </p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Cards de choix */}
        <div className="grid gap-5 mb-6 md:grid-cols-2">
          
          {/* Option 1 : Club ExtraTaff */}
          <div 
            onClick={() => setSelectedPlan('club')}
            className={`relative bg-white rounded-2xl p-6 cursor-pointer transition-all ${
              selectedPlan === 'club' 
                ? 'ring-2 ring-primary-600 shadow-lg' 
                : 'border border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-3xl">🏆</span>
              <span className="bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1 rounded-full">
                RECOMMANDÉ
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Club ExtraTaff</h3>
            <div className="mb-1">
              <span className="text-4xl font-extrabold text-primary-600">39€</span>
              <span className="text-gray-500">/mois</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Sans engagement • Résiliable à tout moment</p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Missions illimitées</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Accès à tous les talents</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Matching & messagerie instantanée</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Notifications SMS & push temps réel</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Sans engagement</strong> — résiliable à tout moment</span>
              </li>
            </ul>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700 text-center font-medium">
                💡 Dès 2 missions/mois, le Club est plus avantageux
              </p>
            </div>
          </div>

          {/* Option 2 : Mission ponctuelle */}
          <div 
            onClick={() => setSelectedPlan('mission')}
            className={`bg-white rounded-2xl p-6 cursor-pointer transition-all ${
              selectedPlan === 'mission' 
                ? 'ring-2 ring-primary-600 shadow-lg' 
                : 'border border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Mission ponctuelle</h3>
            <div className="mb-1">
              <span className="text-4xl font-extrabold text-primary-600">19,90€</span>
              <span className="text-gray-500">/mission</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Sans abonnement • Payez à l'usage</p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>1 mission publiée</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Accès à tous les talents</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Matching & messagerie instantanée</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Aucun engagement</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-500 italic">
                <span className="text-gray-400 mt-0.5">—</span>
                <span>2 missions = 39,80€ → le Club est plus avantageux !</span>
              </li>
            </ul>
            <p className="text-xs text-gray-500 text-center">Idéal pour les besoins occasionnels</p>
          </div>
        </div>

        {/* Zone d'action - Club ExtraTaff */}
        {selectedPlan === 'club' && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-4">
            <h4 className="text-lg font-bold text-gray-900 mb-4">📋 Récapitulatif — Club ExtraTaff</h4>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Abonnement Club ExtraTaff</span>
                <span className="text-xl font-bold text-gray-900">39€/mois</span>
              </div>
              <p className="text-sm text-gray-500">Missions illimitées • Sans engagement</p>
              {isLaunchOffer && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">🎁 Offre de lancement : votre 1er mois est offert !</p>
                </div>
              )}
            </div>
            <button
              onClick={() => handleCheckout('club')}
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Spinner />
              ) : (
                isLaunchOffer ? '🚀 Commencer gratuitement — puis 39€/mois' : '🏆 Rejoindre le Club — 39€/mois'
              )}
            </button>
          </div>
        )}

        {/* Zone d'action - Mission ponctuelle */}
        {selectedPlan === 'mission' && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-4">
            <h4 className="text-lg font-bold text-gray-900 mb-4">📋 Mission ponctuelle</h4>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">1 mission publiée</span>
                <span className="text-xl font-bold text-gray-900">19,90€</span>
              </div>
              <p className="text-sm text-gray-500">Paiement unique • Sans abonnement</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-amber-800">
                💡 <strong>Astuce :</strong> Avec le Club à 39€/mois, vos missions sont illimitées.
                <button onClick={() => setSelectedPlan('club')} className="ml-2 text-primary-600 font-semibold underline">
                  Voir le Club
                </button>
              </p>
            </div>
            <button
              onClick={() => navigate('/establishment')}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-lg transition-colors"
            >
              Continuer sans abonnement
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              Le paiement de 19,90€ sera demandé lors de la publication de votre mission.
            </p>
          </div>
        )}

        {/* Message si rien sélectionné */}
        {!selectedPlan && (
          <div className="text-center">
            <p className="text-gray-500 text-sm">👆 Sélectionnez une formule pour continuer</p>
          </div>
        )}

        {/* Footer confiance */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex justify-center gap-6 text-sm text-gray-500">
            <span>🔒 Paiement sécurisé</span>
            <span>📧 Facture par email</span>
            <span>❌ Sans engagement</span>
          </div>
          <p className="text-xs text-gray-400">
            Paiement géré par Stripe. Vos données bancaires ne sont jamais stockées sur nos serveurs.
          </p>
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
