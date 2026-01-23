import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LandingPage() {
  const navigate = useNavigate()
  const [showLogin, setShowLogin] = useState(false)
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      })

      if (error) throw error

      // Rediriger selon le type de profil
      const { data: talent } = await supabase
        .from('talents')
        .select('id')
        .eq('user_id', data.user.id)
        .single()

      if (talent) {
        navigate('/talent')
      } else {
        navigate('/establishment')
      }
    } catch (err) {
      setError('Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  const faqItems = [
    {
      question: "C'est quoi ExtraTaff ?",
      answer: "ExtraTaff est une plateforme de mise en relation entre les établissements CHR (Cafés, Hôtels, Restaurants) et les talents du secteur (extras, serveurs, cuisiniers, etc.). Notre objectif : vous faire gagner du temps en connectant les bonnes personnes au bon moment."
    },
    {
      question: "C'est gratuit ?",
      answer: "Pour les talents, c'est 100% gratuit ! Pour les établissements, nous offrons 2 mois d'essai gratuits, puis l'abonnement est à 49,90€/mois, sans engagement."
    },
    {
      question: "Comment créer un compte ?",
      answer: "C'est simple ! Cliquez sur \"Je recrute\" si vous êtes un établissement ou \"Je cherche des missions\" si vous êtes un talent. Remplissez le formulaire avec vos informations et votre profil est créé en quelques minutes."
    },
    {
      question: "Comment publier une mission ? (Recruteurs)",
      answer: "Une fois connecté à votre dashboard, cliquez sur \"Créer une mission\". Renseignez le poste recherché, les dates, les horaires et le niveau d'urgence. Votre annonce sera visible immédiatement par les talents correspondants."
    },
    {
      question: "Comment postuler à une mission ? (Talents)",
      answer: "Dans votre dashboard, consultez les \"Missions matchées\" qui correspondent à votre profil et votre zone géographique. Cliquez sur une mission pour voir les détails, puis sur \"Postuler\". L'établissement recevra votre candidature instantanément."
    },
    {
      question: "Comment fonctionne le matching ?",
      answer: "Notre algorithme analyse votre profil (postes, expérience, localisation, disponibilités) et le compare aux missions disponibles. Vous ne voyez que les offres qui correspondent vraiment à ce que vous cherchez !"
    },
    {
      question: "Comment contacter un candidat ou un établissement ?",
      answer: "Une fois qu'une candidature est acceptée, un chat s'ouvre entre le talent et l'établissement. Vous pouvez échanger directement via la messagerie intégrée pour finaliser les détails de la mission."
    },
    {
      question: "Mes données sont-elles protégées ?",
      answer: "Oui ! Vos données personnelles sont sécurisées et ne sont jamais partagées avec des tiers. Les établissements ne voient que les informations nécessaires (prénom, expérience, disponibilités). Votre adresse exacte n'est jamais affichée."
    }
  ]

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-orange-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            <h1 className="text-2xl font-bold text-primary-600">⚡ ExtraTaff</h1>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* Slogan */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 px-4 leading-tight">
            Staff & taff en temps réel !
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto px-4">
            La plateforme qui connecte les établissements CHR et les talents en quelques clics
          </p>
        </div>

        {/* Pricing Badge pour établissements */}
        <div className="max-w-sm mx-auto mb-12 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl p-4 shadow-lg">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-wide mb-1">Offre de lancement</div>
            <div className="text-2xl font-bold mb-1">2 mois gratuits</div>
            <div className="text-sm opacity-90 mb-2">puis 49,90€/mois pour les établissements</div>
            <div className="text-xs opacity-75">Sans engagement • Annulable à tout moment</div>
          </div>
        </div>

        {/* Boutons principaux */}
        <div className="grid md:grid-cols-2 gap-6 mb-16 max-w-3xl mx-auto">
          {/* Bouton Recruteur */}
          <button
            onClick={() => navigate('/register?type=establishment')}
            className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border-2 border-transparent hover:border-primary-600"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🏪</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Je recrute</h3>
              <p className="text-gray-600 mb-4">
                Trouvez des talents qualifiés rapidement
              </p>
              <div className="inline-flex items-center text-primary-600 font-semibold group-hover:translate-x-2 transition-transform">
                Créer mon compte établissement
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>

          {/* Bouton Talent */}
          <button
            onClick={() => navigate('/register?type=talent')}
            className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border-2 border-transparent hover:border-orange-600"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Je cherche des missions</h3>
              <p className="text-gray-600 mb-4">
                Accédez à des opportunités partout en France
              </p>
              <div className="inline-flex items-center text-orange-600 font-semibold group-hover:translate-x-2 transition-transform">
                Créer mon compte talent
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Section Login */}
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setShowLogin(!showLogin)}
            className="w-full text-center text-gray-700 hover:text-gray-900 font-medium mb-4"
          >
            J'ai déjà un compte →
          </button>

          {showLogin && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                Connexion
              </h3>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email ou téléphone
                  </label>
                  <input
                    type="text"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="input"
                    placeholder="email@exemple.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="input"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-4xl mb-3">⚡</div>
            <h4 className="font-semibold text-gray-900 mb-2">Ultra rapide</h4>
            <p className="text-gray-600 text-sm">Recrutez ou trouvez une mission en quelques minutes</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h4 className="font-semibold text-gray-900 mb-2">Matching intelligent</h4>
            <p className="text-gray-600 text-sm">Notre algorithme trouve les meilleurs profils</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">💬</div>
            <h4 className="font-semibold text-gray-900 mb-2">Communication directe</h4>
            <p className="text-gray-600 text-sm">Discutez instantanément avec les candidats</p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Questions fréquentes
            </h3>
            <p className="text-gray-600">Tout ce que vous devez savoir sur ExtraTaff</p>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <div 
                key={index} 
                className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-100 transition-colors"
                >
                  <span className="font-medium text-gray-900 pr-4">{item.question}</span>
                  <svg 
                    className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-10 text-center">
            <p className="text-gray-600 mb-2">Vous avez d'autres questions ?</p>
            <a 
              href="mailto:contact@extrataff.fr" 
              className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700"
            >
              Contactez-nous
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-center text-gray-500 text-sm">
              © 2026 ExtraTaff - La plateforme de recrutement CHR en temps réel
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="/cgv" className="text-gray-600 hover:text-primary-600 transition-colors">
                CGV
              </a>
              <a href="/mentions-legales" className="text-gray-600 hover:text-primary-600 transition-colors">
                Mentions légales
              </a>
              <a href="/confidentialite" className="text-gray-600 hover:text-primary-600 transition-colors">
                Politique de confidentialité
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
