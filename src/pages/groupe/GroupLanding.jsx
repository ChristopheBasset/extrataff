import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function GroupLanding() {
  const navigate = useNavigate()
  const [establishmentCount, setEstablishmentCount] = useState(2)

  // Calcul du prix (Club ExtraTaff Groupe)
  // 1er établissement : 24€ TTC/mois (20€ HT)
  // Supplémentaires : -10% soit 21,60€ TTC/mois (18€ HT)
  const calculatePrice = (count) => {
    if (count === 1) return 24.00
    return 24.00 + (count - 1) * 21.60
  }

  const totalPrice = calculatePrice(establishmentCount)
  const totalPriceHT = (totalPrice / 1.2).toFixed(2).replace('.', ',')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 to-blue-900">
      {/* Header */}
      <nav className="bg-white/10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/')}
              className="text-white/80 hover:text-white flex items-center gap-2"
            >
              ← Retour
            </button>
            <h1 className="text-xl font-bold text-white">⚡ ExtraTaff</h1>
            <button
              onClick={() => navigate('/login')}
              className="text-white/80 hover:text-white"
            >
              Connexion
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-white">
        <div className="text-6xl mb-6">🏢</div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Offre Groupe
        </h1>
        <p className="text-xl text-white/80 mb-6 max-w-2xl mx-auto">
          Gérez plusieurs établissements depuis un seul compte.<br />
          Tarifs Club ExtraTaff avec -10% sur les établissements supplémentaires.
        </p>
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 mb-8">
          <span className="text-xl">🎁</span>
          <span className="text-white font-semibold">1ère mission offerte • Puis Club ExtraTaff 30 jours gratuits</span>
        </div>
      </div>

      {/* Pricing Calculator */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          
          {/* Selector */}
          <div className="p-8 bg-gray-50 border-b">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Combien d'établissements gérez-vous ?
            </h2>
            
            <div className="flex justify-center gap-3 flex-wrap">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  onClick={() => setEstablishmentCount(num)}
                  className={`w-14 h-14 rounded-xl text-xl font-bold transition ${
                    establishmentCount === num
                      ? 'bg-blue-600 text-white shadow-lg scale-110'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => window.location.href = 'mailto:contact@extrataff.fr?subject=Offre Groupe 6+ établissements'}
                className="px-6 h-14 rounded-xl text-lg font-bold bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200 transition"
              >
                6+ → Devis
              </button>
            </div>
          </div>

          {/* Price Display */}
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-gray-900 mb-2">
                {totalPrice.toFixed(2).replace('.', ',')}€
                <span className="text-xl text-gray-500 font-normal">/mois</span>
              </div>
              <p className="text-gray-600">
                {establishmentCount === 1 
                  ? '1 établissement' 
                  : `${establishmentCount} établissements`}
              </p>
              <p className="text-sm text-gray-400 mt-1">{totalPriceHT}€ HT</p>
            </div>

            {/* Price Breakdown */}
            {establishmentCount > 1 && (
              <div className="bg-blue-50 rounded-xl p-4 mb-8">
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>1er établissement</span>
                    <span className="font-medium">24,00€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{establishmentCount - 1} établissement{establishmentCount > 2 ? 's' : ''} supplémentaire{establishmentCount > 2 ? 's' : ''} <span className="text-green-600">(-10%)</span></span>
                    <span className="font-medium">{((establishmentCount - 1) * 21.60).toFixed(2).replace('.', ',')}€</span>
                  </div>
                  <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between font-bold text-blue-700">
                    <span>Total</span>
                    <span>{totalPrice.toFixed(2).replace('.', ',')}€ TTC/mois</span>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <span className="text-2xl">👤</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Je gère tout seul</h3>
                  <p className="text-sm text-gray-600">Un compte unique pour switcher entre vos établissements</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <span className="text-2xl">👥</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Plusieurs responsables</h3>
                  <p className="text-sm text-gray-600">Chaque établissement a son propre compte, facturation commune</p>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-green-500 text-xl">✓</span>
                <span>1 mois d'essai gratuit — 1 mission offerte</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-green-500 text-xl">✓</span>
                <span>1 mission incluse par établissement et par mois</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-green-500 text-xl">✓</span>
                <span>Sans engagement, résiliable à tout moment</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-green-500 text-xl">✓</span>
                <span>Une seule facture pour tout le groupe</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-green-500 text-xl">✓</span>
                <span>Support prioritaire</span>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-4">
              <button
                onClick={() => navigate('/groupe/register?count=' + establishmentCount)}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg"
              >
                Créer mon compte Groupe →
              </button>
              
              <p className="text-center text-sm text-gray-500">
                Vous avez déjà un compte ? {' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:underline"
                >
                  Connectez-vous
                </button>
                {' '} pour ajouter des établissements.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-8">
          <p className="text-white/70 mb-2">Des questions sur l'offre Groupe ?</p>
          <a 
            href="mailto:contact@extrataff.fr" 
            className="text-white font-semibold hover:underline"
          >
            Contactez-nous →
          </a>
        </div>
      </div>
    </div>
  )
}
