import { ArrowRightIcon } from '@heroicons/react/24/solid';
import { useNavigate, Link } from 'react-router-dom';
import lightningSvg from '../assets/lightning.svg';
import { useState, useEffect } from 'react';

export default function Landing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // Header change on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const faqItems = [
    {
      question: "C'est quoi ExtraTaff ?",
      answer: "ExtraTaff est une plateforme de mise en relation entre les établissements CHR (Cafés, Hôtels, Restaurants) et les talents du secteur (extras, serveurs, cuisiniers, etc.). Notre objectif : vous faire gagner du temps en connectant les bonnes personnes au bon moment."
    },
    {
      question: "C'est gratuit ?",
      answer: "Pour les talents, c'est 100% gratuit ! Pour les établissements, nous offrons 1 mission gratuite pour tester la plateforme. Ensuite, vous pouvez rejoindre le Club ExtraTaff à 24€ TTC/mois (1 mission incluse, supplémentaires à 10,80€) ou publier à la mission sans abonnement (21,60€ la mission normale, 30€ en urgence). Sans engagement."
    },
    {
      question: "Comment créer un compte ?",
      answer: "C'est simple ! Cliquez sur \"Je recrute\" si vous êtes un établissement ou \"Je cherche des missions\" si vous êtes un talent. Remplissez le formulaire avec vos informations et votre profil est créé en quelques minutes."
    },
    {
      question: "Comment publier une mission ? (Recruteurs)",
      answer: "Une fois connecté à votre dashboard, cliquez sur \"Créer une mission\". Renseignez le poste recherché, les dates et horaires. Si la date de début est aujourd'hui ou demain, la mission sera automatiquement marquée comme urgente et les talents seront notifiés en priorité. Votre annonce sera visible immédiatement par les talents correspondants."
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
      question: "Qu'est-ce que le Club ExtraTaff ?",
      answer: "Le Club ExtraTaff est notre abonnement mensuel à 24€ TTC (20€ HT) pour les établissements. Il inclut 1 mission par mois, des missions supplémentaires à 10,80€ (au lieu de 21,60€), et surtout les missions urgentes au même tarif de 10,80€ (au lieu de 30€ sans abonnement). Sans engagement, résiliable à tout moment."
    },
    {
      question: "Qu'est-ce qu'une mission urgente ?",
      answer: "Une mission est automatiquement détectée comme urgente lorsque la date de début est aujourd'hui ou demain. Les talents sont notifiés en priorité et la mission apparaît en haut des résultats. Pour les membres du Club, le tarif reste le même qu'une mission classique (10,80€). Sans abonnement, une mission urgente coûte 30€."
    },
    {
      question: "Comment contacter un candidat ou un établissement ?",
      answer: "Une fois qu'une candidature est acceptée, un chat s'ouvre entre le talent et l'établissement. Vous pouvez échanger directement via la messagerie intégrée pour finaliser les détails de la mission."
    },
    {
      question: "Mes données sont-elles protégées ?",
      answer: "Oui ! Vos données personnelles sont sécurisées et ne sont jamais partagées avec des tiers. Les établissements ne voient que les informations nécessaires (prénom, expérience, disponibilités). Votre adresse exacte n'est jamais affichée. Consultez notre politique de confidentialité pour en savoir plus."
    },
    {
      question: "Comment installer ExtraTaff sur mon téléphone ?",
      answer: "ExtraTaff fonctionne comme une application ! Sur Android (Chrome) : ouvrez extrataff.fr, appuyez sur le menu (⋮) puis \"Ajouter à l'écran d'accueil\". Sur iPhone (Safari) : appuyez sur le bouton de partage puis \"Sur l'écran d'accueil\". L'icône ExtraTaff apparaîtra sur votre téléphone comme une vraie application !"
    },
    {
      question: "Comment recevoir les notifications ?",
      answer: "Pour ne manquer aucune mission ou message, activez les notifications ! Lors de votre première connexion, acceptez la demande de notifications. Pensez aussi à vérifier dans les réglages de votre téléphone que les notifications sont bien activées pour votre navigateur (Chrome ou Safari). Astuce : installez ExtraTaff sur votre écran d'accueil pour recevoir les notifications même quand l'application est fermée !"
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-800 via-blue-700 to-blue-600 text-white flex flex-col">
      
      {/* ===== HEADER STICKY ===== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white shadow-lg py-2' 
          : 'bg-transparent py-3'
      }`}>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-1.5 cursor-pointer" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img src={lightningSvg} alt="ExtraTaff" className="w-7 h-7" />
            <span className={`text-lg font-bold transition-colors duration-300 ${
              scrolled ? 'text-blue-700' : 'text-white'
            }`}>
              ExtraTaff
            </span>
          </div>

          {/* Bouton Connexion - TOUJOURS VISIBLE */}
          <button
            onClick={() => navigate('/login')}
            className={`font-bold px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base transition-all duration-300 ${
              scrolled
                ? 'bg-blue-700 text-white hover:bg-blue-800 shadow-md'
                : 'bg-white text-blue-700 hover:bg-gray-100 shadow-lg'
            }`}
          >
            Je me connecte
          </button>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="flex flex-col items-center justify-center px-6 pt-32 pb-16 text-center">
        
        {/* Logo principal */}
        <div className="mb-6">
          <img src={lightningSvg} alt="Lightning" className="w-20 h-20 mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-5xl font-extrabold tracking-tight mb-2">ExtraTaff</h1>
        </div>
        
        {/* Tagline */}
        <p className="text-2xl font-semibold mb-3 text-blue-100">
          Staff & Taff en temps réel !
        </p>
        
        {/* Description */}
        <p className="text-lg mb-10 max-w-lg opacity-90 leading-relaxed">
          La plateforme qui connecte en instantané les établissements CHR et les Talents !
        </p>

        {/* CTA Buttons */}
        <div className="w-full max-w-md space-y-4 mb-6">
          
          {/* Recruter */}
          <button
            onClick={() => navigate('/register?type=establishment')}
            className="w-full bg-white text-blue-700 font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-gray-100 hover:shadow-xl transition-all shadow-lg text-lg"
          >
            <span>🏪 Je recrute</span>
            <ArrowRightIcon className="w-5 h-5" />
          </button>

          {/* Chercher */}
          <button
            onClick={() => navigate('/register?type=talent')}
            className="w-full bg-white text-blue-700 font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-gray-100 hover:shadow-xl transition-all shadow-lg text-lg"
          >
            <span>🎯 Je cherche des missions</span>
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Séparateur + mention "Déjà inscrit ?" */}
        <p className="text-blue-200 text-sm mb-8">
          Déjà inscrit ? <button onClick={() => navigate('/login')} className="underline font-semibold text-white hover:text-blue-100 transition">Connectez-vous ici</button>
        </p>

        {/* Lien Offre Groupe */}
        <button
          onClick={() => navigate('/groupe')}
          className="text-blue-200 hover:text-white underline underline-offset-4 flex items-center gap-2 transition text-sm"
        >
          <span>🏢</span>
          <span>Vous gérez plusieurs établissements ? Découvrir l'offre Groupe</span>
        </button>
      </section>

      {/* ===== FEATURES / AVANTAGES ===== */}
      <section className="py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-10">Pourquoi ExtraTaff ?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-white/15 transition">
              <div className="text-4xl mb-3">⚡</div>
              <h4 className="font-bold text-lg mb-2">Ultra rapide</h4>
              <p className="text-blue-100 text-sm">Publiez une mission, recevez des candidatures en quelques minutes.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-white/15 transition">
              <div className="text-4xl mb-3">🎯</div>
              <h4 className="font-bold text-lg mb-2">Matching intelligent</h4>
              <p className="text-blue-100 text-sm">Notre algorithme trouve les talents qui correspondent à vos besoins.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-white/15 transition">
              <div className="text-4xl mb-3">💬</div>
              <h4 className="font-bold text-lg mb-2">Messagerie en direct</h4>
              <p className="text-blue-100 text-sm">Échangez instantanément avec les candidats ou les établissements.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TARIFS RAPIDE ===== */}
      <section className="py-10 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
            <h3 className="text-xl font-bold mb-4">💰 Tarifs simples et transparents</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="bg-white/10 rounded-xl px-6 py-4 flex-1 max-w-xs">
                <p className="text-3xl font-extrabold">Gratuit</p>
                <p className="text-blue-200 text-sm mt-1">Pour les talents, toujours</p>
              </div>
              <div className="bg-white/10 rounded-xl px-6 py-4 flex-1 max-w-xs relative">
                <div className="absolute -top-2 right-2 bg-yellow-400 text-blue-900 text-xs font-bold px-2 py-0.5 rounded-full">RECOMMANDÉ</div>
                <p className="text-3xl font-extrabold">24€</p>
                <p className="text-blue-200 text-sm mt-1">/mois — Club ExtraTaff</p>
                <p className="text-blue-300 text-xs mt-1">1 mission incluse + supp. 10,80€</p>
              </div>
              <div className="bg-white/10 rounded-xl px-6 py-4 flex-1 max-w-xs">
                <p className="text-3xl font-extrabold">21,60€</p>
                <p className="text-blue-200 text-sm mt-1">Par mission, sans engagement</p>
              </div>
            </div>
            <p className="text-blue-200 text-sm mt-4">🎁 1ère mission offerte pour tester la plateforme !</p>
          </div>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section className="bg-white py-16 w-full">
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
                    className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-10 text-center">
            <p className="text-gray-600 mb-2">Vous avez d'autres questions ?</p>
            <a 
              href="mailto:christophe@comunecom.fr" 
              className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700"
            >
              Contactez-nous
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 w-full py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Colonne 1 — Marque */}
            <div>
              <div className="flex items-center gap-1.5 mb-4">
                <img src={lightningSvg} alt="ExtraTaff" className="h-6 w-6" />
                <span className="text-white font-bold text-lg">ExtraTaff</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                La plateforme de mise en relation entre établissements CHR et extras qualifiés.
              </p>
              <p className="text-gray-400 text-sm mt-3">L'extra qu'il te faut ⚡</p>
            </div>

            {/* Colonne 2 — Liens utiles */}
            <div>
              <h4 className="text-white font-semibold mb-4">Liens utiles</h4>
              <div className="space-y-2 text-sm">
                <button onClick={() => navigate('/register')} className="block text-gray-400 hover:text-white transition-colors">S'inscrire</button>
                <button onClick={() => navigate('/login')} className="block text-gray-400 hover:text-white transition-colors">Se connecter</button>
                <a href="#tarifs" className="block text-gray-400 hover:text-white transition-colors">Tarifs</a>
                <a href="#faq" className="block text-gray-400 hover:text-white transition-colors">FAQ</a>
              </div>
            </div>

            {/* Colonne 3 — Légal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Informations légales</h4>
              <div className="space-y-2 text-sm">
                <Link to="/mentions-legales" className="block text-gray-400 hover:text-white transition-colors">Mentions légales</Link>
                <Link to="/cgv" className="block text-gray-400 hover:text-white transition-colors">Conditions générales de vente</Link>
                <Link to="/confidentialite" className="block text-gray-400 hover:text-white transition-colors">Politique de confidentialité</Link>
              </div>
            </div>

            {/* Colonne 4 — Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p>CVBN CONSULTING</p>
                <p>1, sente aux Pruniers</p>
                <p>27120 Gadencourt</p>
                <a href="mailto:christophe@comunecom.fr" className="block hover:text-white transition-colors mt-2">
                  christophe@comunecom.fr
                </a>
              </div>
            </div>

          </div>

          {/* Séparateur + Copyright */}
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} ExtraTaff — CVBN CONSULTING SASU</p>
            <p className="mt-2 sm:mt-0">SIRET : 984 685 933 00017 — TVA : FR23984685933</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
