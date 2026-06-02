import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Landing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [talentCount, setTalentCount] = useState(null);

  // Récupération du nombre de candidats via Edge Function
  useEffect(() => {
    const fetchTalentCount = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const res = await fetch(`${supabaseUrl}/functions/v1/get-talent-count`, {
          headers: { 'apikey': supabaseAnonKey }
        });
        const data = await res.json();
        if (data.count > 0) setTalentCount(data.count);
      } catch (e) {
        console.error('Erreur compteur talents:', e);
      }
    };
    fetchTalentCount();
  }, []);

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
      answer: "ExtraTaff est une plateforme de mise en relation entre les établissements CHR (Cafés, Hôtels, Restaurants) et les Extras du secteur (serveurs, cuisiniers, plongeurs, etc.). Notre objectif : vous faire gagner du temps en connectant les bonnes personnes au bon moment grâce à un matching instantané."
    },
    {
      question: "C'est gratuit ?",
      answer: "Pour les Extras, c'est 100% gratuit, à vie ! Pour les établissements, devenez membre du Club ExtraTaff à 39€/mois pour des missions illimitées. Vous pouvez aussi publier une mission ponctuelle à 19,90€ sans abonnement. Aucune commission sur le salaire de votre Extra."
    },
    {
      question: "Comment créer un compte ?",
      answer: "C'est simple ! Cliquez sur \"Je suis un établissement\" si vous recrutez ou \"Je suis un Extra\" si vous cherchez des missions. Remplissez le formulaire avec vos informations et votre profil est créé en quelques minutes."
    },
    {
      question: "Comment publier une mission ? (Établissements)",
      answer: "Une fois connecté à votre dashboard, cliquez sur \"Créer une mission\". Renseignez le poste recherché, les dates et horaires. Si la date de début est aujourd'hui ou demain, la mission sera automatiquement marquée comme urgente et les Extras seront notifiés en priorité. Votre annonce sera visible immédiatement par les candidats correspondants."
    },
    {
      question: "Comment postuler à une mission ? (Extras)",
      answer: "Dans votre dashboard, consultez les \"Missions matchées\" qui correspondent à votre profil et votre zone géographique. Cliquez sur une mission pour voir les détails, puis sur \"Postuler\". L'établissement recevra votre candidature instantanément."
    },
    {
      question: "Comment fonctionne le matching ?",
      answer: "Notre algorithme analyse votre profil (postes, expérience, localisation, disponibilités) et le compare aux missions disponibles. Vous ne voyez que les offres qui correspondent vraiment à ce que vous cherchez !"
    },
    {
      question: "Qu'est-ce que le Club ExtraTaff ?",
      answer: "Le Club ExtraTaff est notre abonnement mensuel à 39€/mois pour les établissements. En devenant membre, vous publiez des missions en illimité, accédez à tous les Extras et profitez de la messagerie instantanée. Sans engagement, résiliable à tout moment."
    },
    {
      question: "Qu'est-ce qu'une mission urgente ?",
      answer: "Une mission est automatiquement détectée comme urgente lorsque la date de début est aujourd'hui ou demain. Les Extras sont notifiés en priorité par SMS et notification push, et la mission apparaît en haut des résultats. Le tarif reste le même, que la mission soit urgente ou non."
    },
    {
      question: "Comment contacter un candidat ou un établissement ?",
      answer: "Une fois qu'une candidature est acceptée, un chat s'ouvre entre l'Extra et l'établissement. Vous pouvez échanger directement via la messagerie intégrée pour finaliser les détails de la mission."
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
    <>
      {/* ===== STYLES SPÉCIFIQUES À LA LANDING ===== */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

        .landing-page {
          font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
          letter-spacing: -0.005em;
        }
        .landing-page * {
          font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
        }

        /* Gradient text effect */
        .gradient-text {
          background: linear-gradient(120deg, #1D4ED8 0%, #0EA5E9 60%, #3B82F6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          display: inline-block;
        }

        /* Animated underline below ligne 3 */
        .hero-line-3-underline {
          position: relative;
        }
        .hero-line-3-underline::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 0; right: 30%;
          height: 4px;
          background: linear-gradient(90deg, #1D4ED8, #0EA5E9);
          border-radius: 2px;
          transform-origin: left;
          animation: drawLine 1.2s 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform: scaleX(0);
        }
        @keyframes drawLine { to { transform: scaleX(1); } }

        /* Pulse effects */
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.6); }
          50% { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
        }
        .pulse-green { animation: pulse-green 2s infinite; }

        @keyframes pulse-white {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
          50% { box-shadow: 0 0 0 6px rgba(255,255,255,0); }
        }
        .pulse-white { animation: pulse-white 2s infinite; }

        /* Fade-in animations */
        @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } }
        .fade-in {
          opacity: 0; transform: translateY(24px);
          animation: fadeIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .fade-in-1 { animation-delay: 0.05s; }
        .fade-in-2 { animation-delay: 0.18s; }
        .fade-in-3 { animation-delay: 0.30s; }
        .fade-in-4 { animation-delay: 0.42s; }
        .fade-in-5 { animation-delay: 0.54s; }
        .fade-in-6 { animation-delay: 0.66s; }

        /* Float anims for SVG decorations */
        @keyframes float-soft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .float-1 { animation: float-soft 4s ease-in-out infinite; }
        .float-2 { animation: float-soft 5s ease-in-out infinite 1s; }
        .float-3 { animation: float-soft 4.5s ease-in-out infinite 2s; }

        /* Hero grid pattern */
        .hero-grid-pattern {
          background-image:
            linear-gradient(rgba(29, 78, 216, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(29, 78, 216, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 80%);
        }

        /* Pilier card top accent */
        .pilier-card { position: relative; overflow: hidden; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .pilier-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #1D4ED8, #0EA5E9);
          transform: scaleX(0); transform-origin: left; transition: transform 0.4s ease;
        }
        .pilier-card:hover::before { transform: scaleX(1); }
        .pilier-icon-wrap { transition: transform 0.4s ease; }
        .pilier-card:hover .pilier-icon-wrap { transform: scale(1.08) rotate(-3deg); }

        /* Featured price card glow */
        .price-featured { position: relative; }
        .price-featured::before {
          content: ''; position: absolute; inset: 0;
          background:
            radial-gradient(circle at 80% 0%, rgba(14,165,233,0.25) 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, rgba(29,78,216,0.2) 0%, transparent 50%);
          border-radius: 28px; pointer-events: none;
        }
        .price-featured > * { position: relative; z-index: 1; }

        /* Stat card highlight border */
        .stat-card-fancy { position: relative; overflow: hidden; }
        .stat-card-fancy::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #1D4ED8, #0EA5E9, #3B82F6);
        }
        .stat-card-fancy::after {
          content: ''; position: absolute; top: -50%; right: -50%;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .stat-card-fancy > * { position: relative; }

        /* Hero CTA primary with gradient hover */
        .btn-primary-gradient {
          background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
          position: relative; overflow: hidden;
          box-shadow: 0 12px 40px rgba(29, 78, 216, 0.20);
          transition: all 0.25s ease;
        }
        .btn-primary-gradient::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, #0EA5E9 0%, #1D4ED8 100%);
          opacity: 0; transition: opacity 0.25s;
        }
        .btn-primary-gradient:hover::before { opacity: 1; }
        .btn-primary-gradient > * { position: relative; z-index: 1; }
        .btn-primary-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 60px rgba(29, 78, 216, 0.30);
        }
        .btn-primary-gradient .arrow { transition: transform 0.25s; }
        .btn-primary-gradient:hover .arrow { transform: translateX(4px); }

        /* Sky button (Club CTA) */
        .btn-sky-gradient {
          background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%);
          box-shadow: 0 8px 24px rgba(14,165,233,0.35);
          transition: all 0.25s ease;
        }
        .btn-sky-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(14,165,233,0.5);
        }

        /* Step number with gradient */
        .step-num {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #1D4ED8, #0EA5E9);
          border-radius: 10px;
          display: inline-flex; align-items: center; justify-content: center;
          color: white; font-weight: 800; font-size: 13px;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.25);
        }
      `}</style>

      <div className="landing-page min-h-screen bg-white text-slate-900 flex flex-col">

        {/* ===== BANDEAU TOP DYNAMIQUE ===== */}
        {talentCount !== null && talentCount > 0 && (
          <div className="relative overflow-hidden text-white text-center py-3 px-6"
               style={{ background: 'linear-gradient(90deg, #1D4ED8 0%, #0EA5E9 100%)' }}>
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 70%)' }} />
            <div className="relative inline-flex items-center gap-2.5 flex-wrap justify-center text-sm font-semibold">
              <span className="w-2 h-2 bg-white rounded-full pulse-white shrink-0" />
              <span>Plus de</span>
              <span className="font-extrabold text-base px-2.5 py-0.5 rounded-full backdrop-blur-sm"
                    style={{ background: 'rgba(255,255,255,0.2)' }}>
                {talentCount} candidats Extras
              </span>
              <span>à votre service&nbsp;!</span>
            </div>
          </div>
        )}

        {/* ===== HEADER STICKY ===== */}
        <header className={`sticky top-0 z-50 transition-all duration-300 border-b ${
          scrolled
            ? 'bg-white/85 backdrop-blur-xl border-blue-100/50 shadow-sm'
            : 'bg-white/75 backdrop-blur-xl border-blue-100/50'
        }`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between py-3">

            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-base"
                    style={{
                      background: 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)',
                      boxShadow: '0 4px 12px rgba(29, 78, 216, 0.3)'
                    }}>
                E
              </span>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Extra<span className="text-blue-700 font-bold">Taff</span>
              </span>
            </div>

            {/* Bouton Connexion */}
            <button
              onClick={() => navigate('/login')}
              className="font-semibold px-5 py-2.5 rounded-full text-sm transition-all duration-300 bg-slate-900 text-white border border-slate-900 hover:bg-blue-700 hover:border-blue-700 hover:shadow-lg hover:-translate-y-0.5"
            >
              Je me connecte
            </button>
          </div>
        </header>

        {/* ===== HERO SECTION ===== */}
        <section className="relative overflow-hidden py-16 sm:py-24 px-6"
                 style={{
                   background: `
                     radial-gradient(ellipse 80% 50% at 80% 20%, rgba(186, 230, 253, 0.6) 0%, transparent 60%),
                     radial-gradient(ellipse 60% 40% at 10% 80%, rgba(219, 234, 254, 0.5) 0%, transparent 60%),
                     #FFFFFF
                   `
                 }}>
          <div className="absolute inset-0 hero-grid-pattern pointer-events-none" />

          <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-20 items-center">

            {/* COLONNE GAUCHE — Texte */}
            <div>
              {/* Eyebrow */}
              <div className="fade-in fade-in-1 inline-flex items-center gap-2.5 pl-2 pr-4 py-1.5 bg-white border border-blue-100 rounded-full text-xs font-semibold text-blue-700 mb-7 shadow-sm">
                <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' }}>
                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                </span>
                Marketplace CHR · France
              </div>

              {/* Titre 3 lignes */}
              <h1 className="fade-in fade-in-2 flex flex-col gap-1 mb-7">
                <span className="font-bold tracking-tight leading-tight text-slate-900"
                      style={{ fontSize: 'clamp(24px, 3.5vw, 38px)' }}>
                  Je cherche un Extra.
                </span>
                <span className="font-semibold tracking-tight leading-tight text-slate-500"
                      style={{ fontSize: 'clamp(24px, 3.5vw, 38px)' }}>
                  Je crée le poste.
                </span>
                <span className="font-extrabold gradient-text hero-line-3-underline mt-2"
                      style={{ fontSize: 'clamp(40px, 6vw, 68px)', letterSpacing: '-0.045em', lineHeight: '1' }}>
                  Ça match en direct&nbsp;!
                </span>
              </h1>

              {/* Sous-titre */}
              <p className="fade-in fade-in-3 text-lg sm:text-xl text-slate-600 mb-7 max-w-xl leading-relaxed">
                Le tout en quelques clics. Pas de commission, pas d'intermédiaire — <strong className="font-bold text-slate-900">vous êtes en direct avec les candidats.</strong>
              </p>

              {/* Pill multi-device */}
              <div className="fade-in fade-in-3 inline-flex items-center gap-2.5 px-3.5 py-2 bg-blue-50 rounded-full text-sm font-semibold text-blue-700 mb-7">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="14" height="11" rx="1.5"/>
                  <line x1="2" y1="13" x2="16" y2="13"/>
                  <rect x="14" y="8" width="8" height="13" rx="1.5"/>
                </svg>
                Accessible sur mobile et ordinateur
              </div>

              {/* Cartouche stats avec compteur */}
              {talentCount !== null && talentCount > 0 && (
                <div className="fade-in fade-in-4 stat-card-fancy flex items-center gap-5 px-6 py-5 mb-9 max-w-md rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                  <div className="text-5xl font-extrabold gradient-text shrink-0"
                       style={{ letterSpacing: '-0.04em', lineHeight: '1' }}>
                    {talentCount}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-bold text-slate-900 leading-tight">candidats Extras à votre service</span>
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full pulse-green" />
                      en ligne en ce moment
                    </span>
                  </div>
                </div>
              )}
{/* NOUVEAU — Recruter en Express */}
              <div className="fade-in fade-in-5 mb-5">
                <button
                  onClick={() => navigate('/register?type=express')}
                  className="relative inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-white font-semibold text-[15px] tracking-tight transition-all duration-300 hover:-translate-y-0.5 w-full sm:w-auto"
                  style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)', boxShadow: '0 12px 40px rgba(245,158,11,0.28)' }}
                >
                  <span className="absolute -top-2.5 left-4 bg-white text-amber-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow uppercase tracking-wider">Nouveau</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>
                  Recruter en Express
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
                <p className="text-sm text-slate-500 mt-2 font-medium">Un extra pour ce soir ou demain, en quelques minutes.</p>
              </div>
              
              {/* CTA buttons */}
              <div className="fade-in fade-in-5 flex flex-col sm:flex-row gap-3.5 mb-7">
                <button
                  onClick={() => navigate('/register?type=establishment')}
                  className="btn-primary-gradient inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-white font-semibold text-[15px] tracking-tight"
                >
                  Je suis un établissement
                  <svg className="arrow w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>

                <button
                  onClick={() => navigate('/register?type=talent')}
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-white text-slate-900 font-semibold text-[15px] tracking-tight border-2 border-blue-100 hover:border-blue-700 hover:text-blue-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                >
                  Je suis un Extra
                </button>
              </div>

              {/* Lien Offre Groupe */}
              <button
                onClick={() => navigate('/groupe')}
                className="fade-in fade-in-6 text-slate-500 hover:text-blue-700 underline underline-offset-4 inline-flex items-center gap-2 transition text-sm font-medium"
              >
                <span>🏢</span>
                <span>Vous gérez plusieurs établissements ? Découvrir l'offre Groupe</span>
              </button>
            </div>

            {/* COLONNE DROITE — Illustration smartphone */}
            <div className="fade-in fade-in-3 relative max-w-md mx-auto lg:max-w-none aspect-square w-full"
                 style={{ filter: 'drop-shadow(0 30px 60px rgba(10, 37, 64, 0.12))' }}>
              <svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
                <defs>
                  <linearGradient id="bgBlob" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#DBEAFE"/>
                    <stop offset="100%" stopColor="#BAE6FD"/>
                  </linearGradient>
                  <linearGradient id="phoneFrame" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#102F5C"/>
                    <stop offset="100%" stopColor="#0A2540"/>
                  </linearGradient>
                  <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF"/>
                    <stop offset="100%" stopColor="#F8FAFF"/>
                  </linearGradient>
                  <linearGradient id="avatarGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1D4ED8"/>
                    <stop offset="100%" stopColor="#0EA5E9"/>
                  </linearGradient>
                  <linearGradient id="avatarGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0EA5E9"/>
                    <stop offset="100%" stopColor="#1D4ED8"/>
                  </linearGradient>
                </defs>

                <ellipse cx="320" cy="220" rx="180" ry="200" fill="url(#bgBlob)" opacity="0.65"/>
                <circle cx="100" cy="380" r="48" fill="#1D4ED8" opacity="0.08"/>
                <circle cx="60" cy="100" r="20" fill="#0EA5E9" opacity="0.15"/>

                {/* Phone */}
                <g transform="translate(140, 50)">
                  <rect x="0" y="0" width="200" height="400" rx="32" fill="url(#phoneFrame)"/>
                  <rect x="6" y="6" width="188" height="388" rx="28" fill="#FFFFFF"/>
                  <rect x="78" y="14" width="44" height="14" rx="7" fill="#0A2540"/>
                  <text x="22" y="46" fontFamily="Montserrat" fontSize="9" fontWeight="700" fill="#0A2540">9:41</text>
                  <text x="22" y="76" fontFamily="Montserrat" fontSize="13" fontWeight="800" fill="#0A2540" letterSpacing="-0.5">Candidats</text>
                  <text x="22" y="89" fontFamily="Montserrat" fontSize="9" fontWeight="500" fill="#94A3B8">3 nouveaux profils</text>

                  {/* Card 1 */}
                  <g transform="translate(14, 102)">
                    <rect width="172" height="76" rx="14" fill="url(#cardGrad)" stroke="#DBEAFE" strokeWidth="1"/>
                    <circle cx="22" cy="22" r="14" fill="url(#avatarGrad1)"/>
                    <text x="22" y="26" fontFamily="Montserrat" fontSize="9" fontWeight="700" fill="white" textAnchor="middle">SM</text>
                    <text x="44" y="20" fontFamily="Montserrat" fontSize="10" fontWeight="700" fill="#0A2540">Sophie M.</text>
                    <text x="44" y="32" fontFamily="Montserrat" fontSize="8" fontWeight="500" fill="#475569">Serveuse · 4 ans XP</text>
                    <rect x="120" y="18" width="44" height="16" rx="8" fill="#DCFCE7"/>
                    <text x="142" y="29" fontFamily="Montserrat" fontSize="7" fontWeight="700" fill="#166534" textAnchor="middle">EMBAUCHÉE</text>
                    <rect x="44" y="52" width="64" height="18" rx="9" fill="#1D4ED8"/>
                    <text x="76" y="64" fontFamily="Montserrat" fontSize="8" fontWeight="600" fill="white" textAnchor="middle">Voir profil</text>
                  </g>

                  {/* Card 2 */}
                  <g transform="translate(14, 192)">
                    <rect width="172" height="76" rx="14" fill="url(#cardGrad)" stroke="#DBEAFE" strokeWidth="1"/>
                    <circle cx="22" cy="22" r="14" fill="url(#avatarGrad2)"/>
                    <text x="22" y="26" fontFamily="Montserrat" fontSize="9" fontWeight="700" fill="white" textAnchor="middle">JD</text>
                    <text x="44" y="20" fontFamily="Montserrat" fontSize="10" fontWeight="700" fill="#0A2540">Jules D.</text>
                    <text x="44" y="32" fontFamily="Montserrat" fontSize="8" fontWeight="500" fill="#475569">Cuisinier · 6 ans XP</text>
                    <rect x="120" y="18" width="44" height="16" rx="8" fill="#FEF3C7"/>
                    <text x="142" y="29" fontFamily="Montserrat" fontSize="7" fontWeight="700" fill="#92400E" textAnchor="middle">EN ATTENTE</text>
                    <rect x="44" y="52" width="64" height="18" rx="9" fill="#1D4ED8"/>
                    <text x="76" y="64" fontFamily="Montserrat" fontSize="8" fontWeight="600" fill="white" textAnchor="middle">Voir profil</text>
                  </g>

                  {/* Card 3 partial */}
                  <g transform="translate(14, 282)" opacity="0.55">
                    <rect width="172" height="76" rx="14" fill="url(#cardGrad)" stroke="#DBEAFE" strokeWidth="1"/>
                    <circle cx="22" cy="22" r="14" fill="#1E40AF"/>
                    <text x="22" y="26" fontFamily="Montserrat" fontSize="9" fontWeight="700" fill="white" textAnchor="middle">ML</text>
                    <text x="44" y="20" fontFamily="Montserrat" fontSize="10" fontWeight="700" fill="#0A2540">Marc L.</text>
                    <text x="44" y="32" fontFamily="Montserrat" fontSize="8" fontWeight="500" fill="#475569">Plongeur · 2 ans XP</text>
                  </g>

                  <rect x="76" y="382" width="48" height="3" rx="1.5" fill="#0A2540"/>
                </g>

                {/* Floating notif */}
                <g transform="translate(20, 90)" className="float-1">
                  <rect x="0" y="0" width="118" height="44" rx="12" fill="#FFFFFF" stroke="#DBEAFE" strokeWidth="1"/>
                  <circle cx="18" cy="22" r="10" fill="#1D4ED8"/>
                  <text x="34" y="20" fontFamily="Montserrat" fontSize="9" fontWeight="700" fill="#0A2540">Matching instantané</text>
                  <text x="34" y="32" fontFamily="Montserrat" fontSize="8" fontWeight="500" fill="#475569">3 candidats trouvés</text>
                </g>

                {/* Floating pin */}
                <g transform="translate(388, 60)" className="float-2">
                  <circle cx="22" cy="22" r="22" fill="#FFFFFF" stroke="#DBEAFE" strokeWidth="1"/>
                  <path d="M 22 12 C 17 12 14 16 14 20 C 14 26 22 32 22 32 C 22 32 30 26 30 20 C 30 16 27 12 22 12 Z" fill="#1D4ED8"/>
                  <circle cx="22" cy="20" r="3" fill="#FFFFFF"/>
                </g>

                {/* Floating rating */}
                <g transform="translate(388, 360)" className="float-3">
                  <rect x="0" y="0" width="76" height="34" rx="17" fill="#FFFFFF" stroke="#DBEAFE" strokeWidth="1"/>
                  <path d="M 14 17 L 16 20 L 19 20 L 17 22 L 18 25 L 14 23 L 10 25 L 11 22 L 9 20 L 12 20 Z" fill="#F59E0B"/>
                  <text x="42" y="20" fontFamily="Montserrat" fontSize="11" fontWeight="700" fill="#0A2540">4,9</text>
                  <text x="42" y="29" fontFamily="Montserrat" fontSize="7" fontWeight="500" fill="#94A3B8">/5 moy.</text>
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* ===== PROBLEM STRIP ===== */}
        <div className="relative overflow-hidden py-10 px-6 text-white"
             style={{ background: '#0A2540' }}>
          <div className="absolute inset-0 pointer-events-none"
               style={{
                 background: `
                   radial-gradient(ellipse at 80% 50%, rgba(14,165,233,0.18) 0%, transparent 60%),
                   radial-gradient(ellipse at 20% 50%, rgba(29,78,216,0.15) 0%, transparent 60%)
                 `
               }} />
          <p className="relative max-w-4xl mx-auto text-center font-semibold tracking-tight leading-snug"
             style={{ fontSize: 'clamp(18px, 2.2vw, 26px)' }}>
            Service surchargé&nbsp;? Plongeur absent&nbsp;? Saison qui démarre&nbsp;?{' '}
            <strong className="font-extrabold gradient-text"
                    style={{ background: 'linear-gradient(120deg, #BAE6FD, #FFFFFF)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Trouvez votre Extra qualifié
            </strong>{' '}
            sans appeler trente connaissances.
          </p>
        </div>

        {/* ===== 3 PILIERS ===== */}
        <section id="piliers" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="inline-block text-xs font-bold tracking-widest uppercase text-blue-700 mb-5 px-3.5 py-1.5 bg-blue-50 rounded-full">
              Notre approche
            </div>
            <h2 className="font-extrabold tracking-tight leading-tight mb-6 max-w-3xl"
                style={{ fontSize: 'clamp(32px, 4.2vw, 52px)', letterSpacing: '-0.035em' }}>
              Trois différences <span className="gradient-text">qui changent tout</span><br/>
              pour votre établissement.
            </h2>

            <div className="grid md:grid-cols-3 gap-6 mt-16">
              {/* Pilier 1 */}
              <div className="pilier-card bg-white border border-blue-100 rounded-2xl p-9 hover:-translate-y-2 hover:shadow-2xl">
                <div className="pilier-icon-wrap w-14 h-14 rounded-2xl flex items-center justify-center mb-7 text-blue-700"
                     style={{ background: 'linear-gradient(135deg, #EFF6FF, #E0F2FE)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-3.5">Mise en relation directe</h3>
                <p className="text-slate-600 text-[15px] leading-relaxed">
                  Pas d'agence, pas d'intermédiaire. Vous échangez directement avec le candidat qui réalisera votre service. Vous gardez la main sur votre relation, du premier message au dernier service.
                </p>
              </div>

              {/* Pilier 2 */}
              <div className="pilier-card bg-white border border-blue-100 rounded-2xl p-9 hover:-translate-y-2 hover:shadow-2xl">
                <div className="pilier-icon-wrap w-14 h-14 rounded-2xl flex items-center justify-center mb-7 text-blue-700"
                     style={{ background: 'linear-gradient(135deg, #EFF6FF, #E0F2FE)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-3.5">Tarif fixe, jamais sur la valeur</h3>
                <p className="text-slate-600 text-[15px] leading-relaxed">
                  Un prix unique par mission ou un abonnement Club. Aucune commission sur le salaire de votre Extra : ce que vous lui versez, il le touche en intégralité.
                </p>
              </div>

              {/* Pilier 3 */}
              <div className="pilier-card bg-white border border-blue-100 rounded-2xl p-9 hover:-translate-y-2 hover:shadow-2xl">
                <div className="pilier-icon-wrap w-14 h-14 rounded-2xl flex items-center justify-center mb-7 text-blue-700"
                     style={{ background: 'linear-gradient(135deg, #EFF6FF, #E0F2FE)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                    <line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-3.5">Tout dans votre poche</h3>
                <p className="text-slate-600 text-[15px] leading-relaxed">
                  Matching, messagerie, validation d'embauche et planning : la plateforme tient dans votre poche. Aussi pratique pour vous que pour le candidat — un seul outil, tout le parcours.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== MÉTHODOLOGIE ===== */}
        <section id="methodologie" className="py-24 px-6"
                 style={{ background: 'linear-gradient(180deg, #F8FAFF 0%, #FFFFFF 100%)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="inline-block text-xs font-bold tracking-widest uppercase text-blue-700 mb-5 px-3.5 py-1.5 bg-blue-50 rounded-full">
              Comment ça marche
            </div>
            <h2 className="font-extrabold tracking-tight leading-tight mb-6 max-w-3xl"
                style={{ fontSize: 'clamp(32px, 4.2vw, 52px)', letterSpacing: '-0.035em' }}>
              Quatre étapes,<br/>
              <span className="gradient-text">de la mission au service.</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mb-16 leading-relaxed">
              De la publication de votre besoin jusqu'au planning intégré, chaque étape se fait dans la même app — pour vous comme pour le candidat.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { num: '01', title: 'Publiez votre mission', desc: 'Date, horaires, poste, salaire, exigences. Deux minutes pour cadrer votre besoin précisément.' },
                { num: '02', title: 'Matching instantané', desc: 'Les Extras qualifiés disponibles près de chez vous reçoivent une notification. Les bons candidats arrivent directement à vous.' },
                { num: '03', title: 'Échangez et validez', desc: 'Messagerie intégrée avec le candidat retenu : briefing, conditions, prise de poste. Vous confirmez l\'embauche en un clic.' },
                { num: '04', title: 'Planning intégré', desc: 'La mission s\'ajoute automatiquement au planning des deux parties. Rappels avant le service à venir prochainement.' }
              ].map((step) => (
                <div key={step.num}>
                  <div className="inline-flex items-center gap-3 mb-4">
                    <span className="step-num">{step.num}</span>
                  </div>
                  <h4 className="text-xl font-bold tracking-tight mb-3">{step.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TARIFS ===== */}
        <section id="tarifs" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="inline-block text-xs font-bold tracking-widest uppercase text-blue-700 mb-5 px-3.5 py-1.5 bg-blue-50 rounded-full">
              Tarification
            </div>
            <h2 className="font-extrabold tracking-tight leading-tight mb-6 max-w-3xl"
                style={{ fontSize: 'clamp(32px, 4.2vw, 52px)', letterSpacing: '-0.035em' }}>
              Une tarification <span className="gradient-text">claire,</span><br/>
              jamais sur la valeur.
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mb-16 leading-relaxed">
              Tarif fixe par mission ou abonnement Club. <strong className="font-bold text-slate-900">Aucune commission sur le salaire de votre Extra</strong> — le tarif que vous voyez est le tarif que vous payez. Pour les Extras, ExtraTaff est gratuit, à vie.
            </p>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Card À la mission */}
              <div className="bg-white border border-blue-100 rounded-3xl p-10 hover:-translate-y-1 hover:shadow-xl hover:border-blue-300 transition-all duration-300">
                <div className="text-xl font-bold tracking-tight mb-2">À la mission</div>
                <div className="text-sm text-slate-500 mb-7">Pour les besoins ponctuels</div>
                <div className="flex items-baseline gap-1.5 mb-8">
                  <span className="font-extrabold text-slate-900" style={{ fontSize: '56px', letterSpacing: '-0.04em', lineHeight: '1' }}>19,90&nbsp;€</span>
                  <span className="text-sm text-slate-500 font-medium">/ mission</span>
                </div>
                <ul className="space-y-0 mb-8">
                  {['Pas d\'abonnement', 'Tarif fixe, aucune commission sur le salaire', 'Paiement sécurisé Stripe'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 py-3 text-sm font-medium border-b border-blue-100 last:border-b-0">
                      <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/register?type=establishment')}
                  className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white text-slate-900 font-semibold text-[15px] border-2 border-blue-100 hover:border-blue-700 hover:text-blue-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
                >
                  Publier ma première mission
                </button>
              </div>

              {/* Card Club ExtraTaff (featured) */}
              <div className="price-featured rounded-3xl p-10 text-white shadow-2xl"
                   style={{ background: 'linear-gradient(160deg, #0A2540 0%, #0F2E5C 100%)' }}>
                <div className="absolute -top-3 right-6 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase text-white"
                     style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)', boxShadow: '0 6px 16px rgba(14,165,233,0.4)' }}>
                  Le plus populaire
                </div>
                <div className="text-xl font-bold tracking-tight mb-2 text-white">Club ExtraTaff</div>
                <div className="text-sm text-white/70 mb-7">Pour un usage régulier</div>
                <div className="flex items-baseline gap-1.5 mb-8">
                  <span className="font-extrabold text-white" style={{ fontSize: '56px', letterSpacing: '-0.04em', lineHeight: '1' }}>39&nbsp;€</span>
                  <span className="text-sm text-white/70 font-medium">/ mois</span>
                </div>
                <ul className="space-y-0 mb-8">
                  {['Missions illimitées', 'Sans engagement, résiliable à tout moment', 'Tarif fixe, aucune commission sur le salaire'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 py-3 text-sm font-medium border-b border-white/10 last:border-b-0">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/register?type=establishment')}
                  className="btn-sky-gradient w-full inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-white font-semibold text-[15px]"
                >
                  Rejoindre le Club
                </button>
              </div>
            </div>

            <p className="text-center mt-12 text-sm text-slate-600">
              💡 Vous gérez plusieurs établissements&nbsp;?{' '}
              <button
                onClick={() => navigate('/groupe')}
                className="text-blue-700 font-semibold border-b-2 border-transparent hover:border-blue-700 transition-colors"
              >
                Une offre Groupe existe pour vous.
              </button>
            </p>
          </div>
        </section>

        {/* ===== ESPACE EXTRAS ===== */}
        <section id="extras" className="relative overflow-hidden py-24 px-6"
                 style={{
                   background: `
                     radial-gradient(circle at 70% 30%, rgba(255,255,255,0.6) 0%, transparent 50%),
                     linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)
                   `
                 }}>
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 60%)' }} />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 60%)' }} />

          <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1.4fr_1fr] gap-16 items-center">
            <div>
              <div className="inline-block text-xs font-bold tracking-widest uppercase mb-5 px-3.5 py-1.5 rounded-full"
                   style={{ background: 'rgba(255,255,255,0.7)', color: '#1E40AF' }}>
                Espace Extras
              </div>
              <h2 className="font-extrabold tracking-tight leading-tight mb-5 text-slate-900"
                  style={{ fontSize: 'clamp(30px, 4.2vw, 48px)', letterSpacing: '-0.03em' }}>
                Vous travaillez en cuisine,<br/>
                en salle ou à <span className="gradient-text">l'accueil&nbsp;?</span>
              </h2>
              <p className="text-lg mb-8 max-w-xl leading-relaxed" style={{ color: '#1E3A5F' }}>
                Devenez candidat sur ExtraTaff. Recevez les missions qui matchent votre profil, échangez directement avec les établissements en messagerie, gérez votre planning depuis l'app. <strong className="font-bold text-slate-900">Inscription 100&nbsp;% gratuite, à vie.</strong>
              </p>
              <button
                onClick={() => navigate('/register?type=talent')}
                className="btn-primary-gradient inline-flex items-center gap-2.5 px-7 py-4 rounded-xl text-white font-semibold text-[15px] tracking-tight"
              >
                Créer mon profil Extra
                <svg className="arrow w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>

            {/* Mini phone illustration */}
            <div className="relative max-w-xs mx-auto aspect-square w-full"
                 style={{ filter: 'drop-shadow(0 20px 40px rgba(10, 37, 64, 0.15))' }}>
              <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                  <linearGradient id="phoneFrame2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#102F5C"/>
                    <stop offset="100%" stopColor="#0A2540"/>
                  </linearGradient>
                </defs>

                <circle cx="160" cy="160" r="140" fill="#FFFFFF" opacity="0.5"/>
                <circle cx="240" cy="80" r="32" fill="#1D4ED8" opacity="0.15"/>
                <circle cx="60" cy="260" r="24" fill="#0EA5E9" opacity="0.25"/>

                <g transform="translate(95, 30)">
                  <rect x="0" y="0" width="130" height="260" rx="22" fill="url(#phoneFrame2)"/>
                  <rect x="4" y="4" width="122" height="252" rx="19" fill="#FFFFFF"/>
                  <rect x="51" y="10" width="28" height="9" rx="4.5" fill="#0A2540"/>

                  <text x="14" y="36" fontFamily="Montserrat" fontSize="10" fontWeight="800" fill="#0A2540" letterSpacing="-0.3">Missions</text>
                  <text x="14" y="46" fontFamily="Montserrat" fontSize="6" fontWeight="500" fill="#94A3B8">5 près de chez vous</text>

                  {/* Mission 1 - urgent */}
                  <g transform="translate(10, 56)">
                    <rect width="110" height="56" rx="10" fill="#F8FAFF" stroke="#DBEAFE" strokeWidth="0.8"/>
                    <rect x="6" y="6" width="32" height="11" rx="5.5" fill="#FEE2E2"/>
                    <text x="22" y="14" fontFamily="Montserrat" fontSize="6" fontWeight="700" fill="#B91C1C" textAnchor="middle">URGENT</text>
                    <text x="6" y="28" fontFamily="Montserrat" fontSize="8" fontWeight="700" fill="#0A2540">Serveur · Le Bistrot</text>
                    <text x="6" y="38" fontFamily="Montserrat" fontSize="6" fontWeight="500" fill="#475569">Caen · Ce soir 19h-23h</text>
                    <text x="6" y="50" fontFamily="Montserrat" fontSize="9" fontWeight="800" fill="#1D4ED8">15 €/h</text>
                    <rect x="76" y="42" width="28" height="11" rx="5.5" fill="#1D4ED8"/>
                    <text x="90" y="50" fontFamily="Montserrat" fontSize="6" fontWeight="700" fill="white" textAnchor="middle">POSTULER</text>
                  </g>

                  {/* Mission 2 */}
                  <g transform="translate(10, 120)">
                    <rect width="110" height="56" rx="10" fill="#F8FAFF" stroke="#DBEAFE" strokeWidth="0.8"/>
                    <text x="6" y="20" fontFamily="Montserrat" fontSize="8" fontWeight="700" fill="#0A2540">Cuisinier · La Table</text>
                    <text x="6" y="30" fontFamily="Montserrat" fontSize="6" fontWeight="500" fill="#475569">Bayeux · Demain 11h-15h</text>
                    <text x="6" y="42" fontFamily="Montserrat" fontSize="9" fontWeight="800" fill="#1D4ED8">17 €/h</text>
                    <rect x="76" y="34" width="28" height="11" rx="5.5" fill="#0EA5E9"/>
                    <text x="90" y="42" fontFamily="Montserrat" fontSize="6" fontWeight="700" fill="white" textAnchor="middle">POSTULER</text>
                  </g>

                  {/* Mission 3 partial */}
                  <g transform="translate(10, 184)" opacity="0.6">
                    <rect width="110" height="56" rx="10" fill="#F8FAFF" stroke="#DBEAFE" strokeWidth="0.8"/>
                    <text x="6" y="20" fontFamily="Montserrat" fontSize="8" fontWeight="700" fill="#0A2540">Plongeur · Le Manoir</text>
                    <text x="6" y="30" fontFamily="Montserrat" fontSize="6" fontWeight="500" fill="#475569">Lisieux · Sam 18h-23h</text>
                  </g>

                  <rect x="50" y="247" width="30" height="2" rx="1" fill="#0A2540"/>
                </g>

                <g transform="translate(20, 90)" className="float-1">
                  <rect x="0" y="0" width="80" height="28" rx="14" fill="#FFFFFF" stroke="#DBEAFE" strokeWidth="1"/>
                  <circle cx="14" cy="14" r="4" fill="#10B981"/>
                  <text x="24" y="18" fontFamily="Montserrat" fontSize="8" fontWeight="700" fill="#0A2540">Disponible</text>
                </g>

                <g transform="translate(240, 240)" className="float-2">
                  <circle cx="20" cy="20" r="18" fill="#1D4ED8"/>
                  <text x="20" y="27" fontFamily="Montserrat" fontSize="20" fontWeight="800" fill="white" textAnchor="middle">€</text>
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" className="bg-white py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-block text-xs font-bold tracking-widest uppercase text-blue-700 mb-4 px-3.5 py-1.5 bg-blue-50 rounded-full">
                FAQ
              </div>
              <h3 className="font-extrabold tracking-tight text-slate-900 mb-3"
                  style={{ fontSize: 'clamp(28px, 3.8vw, 40px)', letterSpacing: '-0.035em' }}>
                Questions fréquentes
              </h3>
              <p className="text-slate-600">Tout ce que vous devez savoir sur ExtraTaff</p>
            </div>

            <div className="space-y-3">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-slate-100 transition-colors"
                  >
                    <span className="font-semibold text-slate-900 pr-4">{item.question}</span>
                    <svg
                      className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-4">
                      <p className="text-slate-600 leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="text-slate-600 mb-2">Vous avez d'autres questions ?</p>
              <a
                href="mailto:contact@extrataff.fr"
                className="inline-flex items-center text-blue-700 font-semibold hover:text-blue-800"
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
        <footer className="relative overflow-hidden py-16 px-4 text-slate-300"
                style={{ background: '#0A2540' }}>
          <div className="absolute top-0 left-0 right-0 h-px"
               style={{ background: 'linear-gradient(90deg, transparent, #0EA5E9, transparent)' }} />

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">

              {/* Marque */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-base"
                        style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)' }}>
                    E
                  </span>
                  <span className="text-white font-extrabold text-xl tracking-tight">
                    Extra<span style={{ color: '#BAE6FD' }}>Taff</span>
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  La marketplace dédiée aux Extras de la restauration et de l'hôtellerie en France.
                </p>
              </div>

              {/* Plateforme */}
              <div>
                <h5 className="text-white text-xs font-bold uppercase tracking-widest mb-5">Plateforme</h5>
                <ul className="space-y-3 text-sm">
                  <li><a href="#piliers" className="text-slate-300 hover:text-white transition-colors font-medium">Pourquoi ExtraTaff</a></li>
                  <li><a href="#methodologie" className="text-slate-300 hover:text-white transition-colors font-medium">Méthodologie</a></li>
                  <li><a href="#tarifs" className="text-slate-300 hover:text-white transition-colors font-medium">Tarifs</a></li>
                  <li><a href="#extras" className="text-slate-300 hover:text-white transition-colors font-medium">Espace Extras</a></li>
                </ul>
              </div>

              {/* Compte */}
              <div>
                <h5 className="text-white text-xs font-bold uppercase tracking-widest mb-5">Compte</h5>
                <ul className="space-y-3 text-sm">
                  <li><button onClick={() => navigate('/register?type=establishment')} className="text-slate-300 hover:text-white transition-colors font-medium">Inscription établissement</button></li>
                  <li><button onClick={() => navigate('/register?type=talent')} className="text-slate-300 hover:text-white transition-colors font-medium">Inscription Extra</button></li>
                  <li><button onClick={() => navigate('/login')} className="text-slate-300 hover:text-white transition-colors font-medium">Connexion</button></li>
                  <li><button onClick={() => navigate('/groupe')} className="text-slate-300 hover:text-white transition-colors font-medium">Offre Groupe</button></li>
                </ul>
              </div>

              {/* Légal & Contact */}
              <div>
                <h5 className="text-white text-xs font-bold uppercase tracking-widest mb-5">Légal & Contact</h5>
                <ul className="space-y-3 text-sm">
                  <li><Link to="/mentions-legales" className="text-slate-300 hover:text-white transition-colors font-medium">Mentions légales</Link></li>
                  <li><Link to="/cgv" className="text-slate-300 hover:text-white transition-colors font-medium">CGV</Link></li>
                  <li><Link to="/confidentialite" className="text-slate-300 hover:text-white transition-colors font-medium">Confidentialité</Link></li>
                  <li>
                    <a href="mailto:contact@extrataff.fr" className="text-slate-300 hover:text-white transition-colors font-medium">
                      contact@extrataff.fr
                    </a>
                  </li>
                </ul>
                <div className="mt-5 text-xs text-slate-500 leading-relaxed">
                  <p>CVBN CONSULTING SASU</p>
                  <p>1, sente aux Pruniers</p>
                  <p>27120 Gadencourt</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-7 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-3">
              <span>© {new Date().getFullYear()} ExtraTaff — CVBN CONSULTING SASU. Tous droits réservés.</span>
              <span>SIRET : 984 685 933 00017 — TVA : FR23984685933</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
