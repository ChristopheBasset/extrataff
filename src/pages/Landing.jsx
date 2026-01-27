import { ArrowRightIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import lightningSvg from '../assets/lightning.svg';
import { useState } from 'react';

export default function Landing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

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
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-blue-700 text-white flex flex-col justify-center items-center px-6 py-12">
      
      {/* Header */}
      <h1 className="text-4xl font-bold mb-2">ExtraTaff</h1>
      <img src={lightningSvg} alt="Lightning" className="w-20 h-20 mb-6" />
      
      {/* Subtitle */}
      <h2 className="text-3xl font-semibold mb-6">Bienvenue</h2>
      
      {/* Tagline */}
      <p className="text-xl mb-4 text-center">
        Staff & Taff en temps réel!
      </p>
      
      {/* Description */}
      <p className="text-center mb-12 max-w-md opacity-90">
        La plateforme qui connecte en instantanée les établissements CHR et les Talents!
      </p>

      {/* CTA Buttons */}
      <div className="w-full max-w-md space-y-4 mb-12">
        
        {/* Recruter */}
        <button
          onClick={() => navigate('/register?role=establishment')}
          className="w-full bg-white text-blue-700 font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:bg-gray-100 transition"
        >
          <span>→ Je recrute</span>
          <ArrowRightIcon className="w-5 h-5" />
        </button>

        {/* Chercher */}
        <button
          onClick={() => navigate('/register?role=talent')}
          className="w-full bg-white text-blue-700 font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:bg-gray-100 transition"
        >
          <span>→ Je cherche</span>
          <ArrowRightIcon className="w-5 h-5" />
        </button>

        {/* Login */}
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-white bg-opacity-20 text-white font-bold py-3 rounded-full hover:bg-opacity-30 transition border-2 border-white"
        >
          Je me connecte
        </button>
      </div>

      {/* Features */}
      <div className="space-y-3 text-center text-lg mb-12">
        <p>⚡ Ultra rapide</p>
        <p>⚡ Matching intelligent</p>
        <p>⚡ Messagerie en direct</p>
      </div>

      {/* FAQ Section */}
      <div className="bg-white py-16 w-full">
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
              className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700"
            >
              Contactez-nous
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}