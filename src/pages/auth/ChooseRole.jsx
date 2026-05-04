import { useNavigate } from 'react-router-dom'

export default function ChooseRole() {
  const navigate = useNavigate()

  const handleChoice = (role) => {
    sessionStorage.setItem('registration_type', role)
    sessionStorage.setItem('registration_success', 'true')

    if (role === 'talent') {
      navigate('/talent/profile-form')
    } else {
      navigate('/establishment/profile-form')
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

        .choose-role-page {
          font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
          letter-spacing: -0.005em;
        }
        .choose-role-page * {
          font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
        }

        .gradient-text {
          background: linear-gradient(120deg, #1D4ED8 0%, #0EA5E9 60%, #3B82F6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          display: inline-block;
        }

        @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } }
        .fade-in {
          opacity: 0; transform: translateY(16px);
          animation: fadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .fade-in-1 { animation-delay: 0.05s; }
        .fade-in-2 { animation-delay: 0.18s; }
        .fade-in-3 { animation-delay: 0.30s; }
        .fade-in-4 { animation-delay: 0.42s; }

        .role-card {
          position: relative; overflow: hidden;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .role-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #1D4ED8, #0EA5E9);
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.4s ease;
        }
        .role-card:hover::before { transform: scaleX(1); }
        .role-card .role-icon-wrap { transition: transform 0.4s ease; }
        .role-card:hover .role-icon-wrap { transform: scale(1.06) rotate(-3deg); }
        .role-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 50px rgba(10, 37, 64, 0.15);
          border-color: #3B82F6 !important;
        }
        .role-card .arrow-end { opacity: 0; transform: translateX(-8px); transition: all 0.3s ease; }
        .role-card:hover .arrow-end { opacity: 1; transform: translateX(0); }
      `}</style>

      <div className="choose-role-page min-h-screen flex items-center justify-center py-12 px-4"
           style={{
             background: `
               radial-gradient(ellipse 80% 50% at 80% 20%, rgba(186, 230, 253, 0.6) 0%, transparent 60%),
               radial-gradient(ellipse 60% 40% at 10% 80%, rgba(219, 234, 254, 0.5) 0%, transparent 60%),
               #FFFFFF
             `
           }}>

        <div className="max-w-lg w-full">

          {/* Header */}
          <div className="fade-in fade-in-1 text-center mb-8">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2.5 mb-5 group"
            >
              <span className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-xl transition-transform duration-300 group-hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)',
                      boxShadow: '0 8px 20px rgba(29, 78, 216, 0.3)'
                    }}>
                E
              </span>
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                Extra<span className="text-blue-700 font-bold">Taff</span>
              </span>
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2"
                style={{ letterSpacing: '-0.03em' }}>
              Bienvenue sur <span className="gradient-text">ExtraTaff</span> 👋
            </h1>
            <p className="text-slate-500 font-medium">
              Quel est votre profil&nbsp;?
            </p>
          </div>

          <div className="space-y-4">

            {/* === CARTE EXTRA (Talent) === */}
            <button
              onClick={() => handleChoice('talent')}
              className="role-card fade-in fade-in-2 w-full bg-white rounded-2xl p-6 border-2 border-blue-100 text-left"
              style={{ boxShadow: '0 8px 24px rgba(10, 37, 64, 0.06)' }}
            >
              <div className="flex items-center gap-5">
                <div className="role-icon-wrap w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
                     style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)' }}>
                  ✨
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-extrabold text-slate-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Je suis un <span className="gradient-text">Extra</span>
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Je cherche des missions en restauration ou hôtellerie
                  </p>
                  <p className="text-xs text-emerald-600 mt-2 font-bold inline-flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    100&nbsp;% gratuit, à vie
                  </p>
                </div>
                <svg className="arrow-end w-5 h-5 text-blue-700 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </button>

            {/* === CARTE ÉTABLISSEMENT === */}
            <button
              onClick={() => handleChoice('establishment')}
              className="role-card fade-in fade-in-3 w-full bg-white rounded-2xl p-6 border-2 border-blue-100 text-left"
              style={{ boxShadow: '0 8px 24px rgba(10, 37, 64, 0.06)' }}
            >
              <div className="flex items-center gap-5">
                <div className="role-icon-wrap w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
                     style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)' }}>
                  🏪
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-extrabold text-slate-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Je suis un <span className="gradient-text">établissement</span>
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Je recherche des Extras pour mon restaurant, hôtel ou événement
                  </p>
                  <p className="text-xs text-blue-700 mt-2 font-bold inline-flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Sans commission · Sans engagement
                  </p>
                </div>
                <svg className="arrow-end w-5 h-5 text-blue-700 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </button>

            {/* === CARTE GROUPE === */}
            <button
              onClick={() => navigate('/groupe')}
              className="role-card fade-in fade-in-4 w-full bg-white rounded-2xl p-6 border-2 border-blue-100 text-left"
              style={{ boxShadow: '0 8px 24px rgba(10, 37, 64, 0.06)' }}
            >
              <div className="flex items-center gap-5">
                <div className="role-icon-wrap w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
                     style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)' }}>
                  🏢
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-extrabold text-slate-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Je gère un <span className="gradient-text">groupe</span>
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Plusieurs établissements sous une même enseigne
                  </p>
                  <p className="text-xs text-blue-700 mt-2 font-bold inline-flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Vue consolidée multi-sites
                  </p>
                </div>
                <svg className="arrow-end w-5 h-5 text-blue-700 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </button>

          </div>

          {/* Trust badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Authentification sécurisée via Google</span>
          </div>

        </div>
      </div>
    </>
  )
}
