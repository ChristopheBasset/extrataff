import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Subscribe() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [establishment, setEstablishment] = useState(null)
  const [error, setError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(null)

  // Prix TTC (affichés au client)
  const clubPriceTTC = 24.00
  const clubPriceHT = 20.00
  const missionNormalTTC = 21.60
  const missionNormalHT = 18.00
  const missionUrgentTTC = 30.00
  const missionUrgentHT = 25.00
  const missionSuppTTC = 10.80
  const missionSuppHT = 9.00

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

  const missionsUsed = establishment?.missions_used || 0

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rejoignez le Club ExtraTaff 🏆</h1>
          <p className="text-gray-600">
            Recrutez vos extras en quelques clics. <strong>30 jours d'essai gratuit</strong>, puis choisissez la formule qui vous convient.
          </p>
        </div>

        {/* Statut freemium épuisé */}
        {establishment && missionsUsed >= 1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <p className="font-medium text-gray-900">Votre mission d'essai est épuisée</p>
                <p className="text-sm text-gray-600">{missionsUsed}/1 mission gratuite utilisée</p>
              </div>
            </div>
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
            className={`bg-white rounded-2xl p-6 cursor-pointer transition-all ${
              selectedPlan === 'club' 
                ? 'ring-2 ring-primary-600 shadow-lg' 
                : 'border border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-3xl">🏆</span>
              <div className="flex gap-2">
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                  30 JOURS GRATUITS
                </span>
                <span className="bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1 rounded-full">
                  RECOMMANDÉ
                </span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Club ExtraTaff</h3>
            <div className="mb-1">
              <span className="text-4xl font-extrabold text-primary-600">{clubPriceTTC}€</span>
              <span className="text-gray-500">/mois</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">{clubPriceHT}€ HT/mois • Sans engagement • 30 jours gratuits</p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>1 mission incluse</strong> chaque mois <span className="text-gray-400">(valeur {missionNormalTTC}€)</span></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Missions supplémentaires à <strong>{missionSuppTTC}€</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Missions urgentes à <strong>{missionSuppTTC}€</strong> <span className="text-red-500 line-through text-xs">{missionUrgentTTC}€</span></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Matching & messagerie</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Sans engagement</strong></span>
              </li>
            </ul>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700 text-center font-medium">
                💡 1 urgence suffit pour rentabiliser l'abonnement
              </p>
            </div>
          </div>

          {/* Option 2 : Sans abonnement */}
          <div 
            onClick={() => setSelectedPlan('no_sub')}
            className={`bg-white rounded-2xl p-6 cursor-pointer transition-all ${
              selectedPlan === 'no_sub' 
                ? 'ring-2 ring-primary-600 shadow-lg' 
                : 'border border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Sans abonnement</h3>
            <div className="mb-1">
              <span className="text-4xl font-extrabold text-primary-600">{missionNormalTTC}€</span>
              <span className="text-gray-500">/mission</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">{missionNormalHT}€ HT • Payez à l'usage</p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Payez ce que vous utilisez</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Mission normale : <strong>{missionNormalTTC}€</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-amber-500 mt-0.5">⚡</span>
                <span>Mission urgente : <strong>{missionUrgentTTC}€</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Matching & messagerie</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Aucun engagement</strong></span>
              </li>
            </ul>
            <p className="text-xs text-gray-500 text-center">Idéal pour les besoins occasionnels</p>
          </div>
        </div>

        {/* Tableau comparatif */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h4 className="font-bold text-gray-900">📊 Comparer les formules</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium"></th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Sans abo</th>
                  <th className="text-center px-4 py-3 font-medium text-primary-700 bg-primary-50">Club ExtraTaff</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="px-6 py-3 text-gray-700">1ère mission du mois</td>
                  <td className="text-center px-4 py-3 text-gray-700">{missionNormalTTC}€</td>
                  <td className="text-center px-4 py-3 font-bold text-green-600 bg-primary-50">Incluse ✓</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="px-6 py-3 text-gray-700">Mission supplémentaire</td>
                  <td className="text-center px-4 py-3 text-gray-700">{missionNormalTTC}€</td>
                  <td className="text-center px-4 py-3 font-bold text-primary-600 bg-primary-50">{missionSuppTTC}€</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="px-6 py-3 text-gray-700">Mission urgente ⚡</td>
                  <td className="text-center px-4 py-3 text-gray-700">{missionUrgentTTC}€</td>
                  <td className="text-center px-4 py-3 font-bold text-primary-600 bg-primary-50">{missionSuppTTC}€</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-gray-700">Économie sur 2 missions</td>
                  <td className="text-center px-4 py-3 text-gray-400">—</td>
                  <td className="text-center px-4 py-3 font-bold text-green-600 bg-primary-50">-7,20€</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Zone d'action - Club ExtraTaff */}
        {selectedPlan === 'club' && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-4">
            <h4 className="text-lg font-bold text-gray-900 mb-4">📋 Récapitulatif — Club ExtraTaff</h4>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Abonnement Club ExtraTaff</span>
                <span className="text-xl font-bold text-gray-900">{clubPriceTTC}€/mois</span>
              </div>
              <p className="text-sm text-gray-500">{clubPriceHT}€ HT • 1 mission incluse • Sans engagement</p>
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">🎁 30 jours d'essai gratuit — votre carte ne sera débitée qu'à l'issue de la période d'essai</p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Missions supplémentaires</span>
                  <span>{missionSuppTTC}€ / mission</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Missions urgentes</span>
                  <span>{missionSuppTTC}€ / mission <span className="text-red-400 line-through ml-1">{missionUrgentTTC}€</span></span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleCheckout('club_subscription')}
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Spinner />
              ) : (
                `🏆 Essai gratuit 30 jours — puis ${clubPriceTTC}€/mois`
              )}
            </button>
          </div>
        )}

        {/* Zone d'action - Sans abonnement */}
        {selectedPlan === 'no_sub' && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-4">
            <h4 className="text-lg font-bold text-gray-900 mb-4">📋 Sans abonnement</h4>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Vous paierez au moment de publier chaque mission :
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Mission normale</span>
                  <span className="font-bold text-gray-900">{missionNormalTTC}€ TTC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Mission urgente ⚡</span>
                  <span className="font-bold text-gray-900">{missionUrgentTTC}€ TTC</span>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-amber-800">
                💡 <strong>Astuce :</strong> Avec le Club à {clubPriceTTC}€/mois, votre 1ère mission est incluse et les suivantes ne coûtent que {missionSuppTTC}€.
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
              Le paiement sera demandé lors de la publication d'une mission.
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
