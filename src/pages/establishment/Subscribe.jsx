import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Subscribe() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [establishment, setEstablishment] = useState(null)
  const [error, setError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [missionCount, setMissionCount] = useState(1)
  const [postsPerMission, setPostsPerMission] = useState(1)

  const pricePerPost = 9.90
  const monthlyPrice = 49.90
  const totalMissionPrice = (missionCount * postsPerMission * pricePerPost).toFixed(2)

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
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
      
      if (sessionError || !session) {
        throw new Error('Session expirée. Veuillez vous reconnecter.')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('Configuration manquante. Contactez le support.')
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            establishment_id: establishment.id,
            plan_type: 'monthly'
          })
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

  const handleBuyMissions = async () => {
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

      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            establishment_id: establishment.id,
            plan_type: 'per_mission',
            mission_count: missionCount,
            posts_per_mission: postsPerMission,
            total_amount: parseFloat(totalMissionPrice)
          })
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choisissez votre formule ⚡</h1>
          <p className="text-gray-600">
            Vos {missionsUsed} mission{missionsUsed > 1 ? 's' : ''} d'essai ont été utilisées. Continuez à recruter avec ExtraTaff !
          </p>
        </div>

        {/* Statut actuel */}
        {establishment && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <p className="font-medium text-gray-900">Période d'essai terminée</p>
                <p className="text-sm text-gray-600">
                  {missionsUsed}/2 missions gratuites utilisées
                </p>
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
        <div className="grid md:grid-cols-2 gap-5 mb-6">
          
          {/* Option 1 : Abonnement mensuel */}
          <div 
            onClick={() => setSelectedPlan('monthly')}
            className={`bg-white rounded-2xl p-6 cursor-pointer transition-all ${
              selectedPlan === 'monthly' 
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

            <h3 className="text-xl font-bold text-gray-900 mb-1">Abonnement mensuel</h3>
            <div className="mb-4">
              <span className="text-4xl font-extrabold text-primary-600">49,90€</span>
              <span className="text-gray-500">/mois</span>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Missions illimitées</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Postes illimités</strong> par mission</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Matching intelligent & notifications</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Messagerie directe avec les talents</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Sans engagement</strong> — résiliez quand vous voulez</span>
              </li>
            </ul>

            <p className="text-xs text-gray-500 text-center">
              💡 Rentable dès 6 postes/mois
            </p>
          </div>

          {/* Option 2 : À la mission */}
          <div 
            onClick={() => setSelectedPlan('per_mission')}
            className={`bg-white rounded-2xl p-6 cursor-pointer transition-all ${
              selectedPlan === 'per_mission' 
                ? 'ring-2 ring-primary-600 shadow-lg' 
                : 'border border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="mb-4">
              <span className="text-3xl">⚡</span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-1">À la mission</h3>
            <div className="mb-4">
              <span className="text-4xl font-extrabold text-primary-600">9,90€</span>
              <span className="text-gray-500">/poste</span>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Payez uniquement</strong> ce que vous utilisez</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Idéal pour les <strong>besoins occasionnels</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Matching intelligent & notifications</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Messagerie directe avec les talents</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Aucun engagement</strong> ni abonnement</span>
              </li>
            </ul>

            <p className="text-xs text-gray-500 text-center">
              💡 Parfait pour 1 à 5 extras/mois
            </p>
          </div>
        </div>

        {/* Zone d'action - Abonnement mensuel */}
        {selectedPlan === 'monthly' && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-4">
            <h4 className="text-lg font-bold text-gray-900 mb-4">📋 Récapitulatif — Abonnement mensuel</h4>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Abonnement ExtraTaff Premium</span>
                <span className="text-xl font-bold text-gray-900">49,90€/mois</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Missions et postes illimités • Sans engagement</p>
            </div>

            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                '🚀 Souscrire à l\'abonnement'
              )}
            </button>
          </div>
        )}

        {/* Zone d'action - Achat missions */}
        {selectedPlan === 'per_mission' && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-4">
            <h4 className="text-lg font-bold text-gray-900 mb-4">📋 Configurez votre achat</h4>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de missions
                </label>
                <select
                  value={missionCount}
                  onChange={(e) => setMissionCount(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>{n} mission{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postes par mission
                </label>
                <select
                  value={postsPerMission}
                  onChange={(e) => setPostsPerMission(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n} poste{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Récap prix */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{missionCount} mission{missionCount > 1 ? 's' : ''} × {postsPerMission} poste{postsPerMission > 1 ? 's' : ''} × {pricePerPost.toFixed(2)}€</span>
                  <span>{totalMissionPrice}€</span>
                </div>
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-extrabold text-primary-600">{totalMissionPrice}€</span>
                </div>
              </div>
            </div>

            {/* Astuce si plus cher que l'abonnement */}
            {parseFloat(totalMissionPrice) > monthlyPrice && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-amber-800">
                  💡 <strong>Astuce :</strong> Pour ce volume, l'abonnement à {monthlyPrice}€/mois serait plus avantageux !
                  <button 
                    onClick={() => setSelectedPlan('monthly')} 
                    className="ml-2 text-primary-600 font-semibold underline"
                  >
                    Voir l'abonnement
                  </button>
                </p>
              </div>
            )}

            <button
              onClick={handleBuyMissions}
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                `💳 Acheter ${missionCount} mission${missionCount > 1 ? 's' : ''} — ${totalMissionPrice}€`
              )}
            </button>
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
