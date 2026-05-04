import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      // Récupérer la session depuis l'URL (Supabase gère le hash)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) throw sessionError

      if (!session) {
        // Attendre un peu que Supabase traite le callback
        await new Promise(resolve => setTimeout(resolve, 2000))
        const { data: { session: retrySession } } = await supabase.auth.getSession()

        if (!retrySession) {
          throw new Error('Impossible de récupérer la session')
        }

        await routeUser(retrySession.user)
        return
      }

      await routeUser(session.user)
    } catch (err) {
      console.error('Erreur callback OAuth:', err)
      setError(err.message)
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  const routeUser = async (user) => {
    const oauthFlow = sessionStorage.getItem('oauth_flow')

    // ========== Flow: Group Register ==========
    if (oauthFlow === 'group_register') {
      const managementType = sessionStorage.getItem('group_management_type') || 'single'
      const establishmentCount = sessionStorage.getItem('group_establishment_count') || '2'

      // Nettoyer sessionStorage
      sessionStorage.removeItem('oauth_flow')
      sessionStorage.removeItem('group_management_type')
      sessionStorage.removeItem('group_establishment_count')

      // Rediriger vers le GroupRegister étape 3 avec les paramètres
      sessionStorage.setItem('google_group_user_id', user.id)
      sessionStorage.setItem('google_group_management_type', managementType)
      sessionStorage.setItem('google_group_count', establishmentCount)
      sessionStorage.setItem('registration_success', 'true')

      navigate(`/groupe/register?count=${establishmentCount}&step=3&mode=${managementType}`)
      return
    }

    // ========== Flow: Register (talent ou establishment) ==========
    if (oauthFlow === 'register') {
      const registrationType = sessionStorage.getItem('registration_type')

      sessionStorage.removeItem('oauth_flow')
      sessionStorage.setItem('registration_success', 'true')

      if (registrationType === 'establishment') {
        navigate('/establishment/profile-form')
      } else {
        navigate('/talent/profile-form')
      }
      return
    }

    // ========== Flow: Login (ou pas de flow stocké) ==========
    sessionStorage.removeItem('oauth_flow')

    // Vérifier si l'utilisateur a déjà un profil
    const { data: establishment } = await supabase
      .from('establishments')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (establishment) {
      navigate('/establishment/dashboard')
      return
    }

    const { data: talent } = await supabase
      .from('talents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (talent) {
      navigate('/talent/dashboard')
      return
    }

    // Nouvel utilisateur Google sans profil → choisir son type
    navigate('/auth/choose-role')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

        .auth-callback-page {
          font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
          letter-spacing: -0.005em;
        }
        .auth-callback-page * {
          font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
        }

        @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } }
        .fade-in {
          opacity: 0; transform: translateY(16px);
          animation: fadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(29, 78, 216, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(29, 78, 216, 0); }
        }
        .pulse-ring { animation: pulse-ring 1.8s ease-out infinite; }
      `}</style>

      <div className="auth-callback-page min-h-screen flex items-center justify-center px-4"
           style={{
             background: `
               radial-gradient(ellipse 80% 50% at 80% 20%, rgba(186, 230, 253, 0.6) 0%, transparent 60%),
               radial-gradient(ellipse 60% 40% at 10% 80%, rgba(219, 234, 254, 0.5) 0%, transparent 60%),
               #FFFFFF
             `
           }}>
        <div className="fade-in max-w-md w-full bg-white rounded-3xl shadow-xl border border-blue-100 p-9 text-center"
             style={{ boxShadow: '0 20px 60px rgba(10, 37, 64, 0.10)' }}>

          {error ? (
            <>
              {/* === ERREUR === */}
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                   style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', boxShadow: '0 12px 32px rgba(239, 68, 68, 0.35)' }}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-3" style={{ letterSpacing: '-0.025em' }}>
                Erreur de connexion
              </h2>
              <p className="text-slate-600 mb-5 leading-relaxed text-sm">
                {error}
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Redirection automatique vers la page de connexion…
              </p>
            </>
          ) : (
            <>
              {/* === CHARGEMENT === */}
              <div className="pulse-ring w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                   style={{
                     background: 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)',
                     boxShadow: '0 12px 32px rgba(29, 78, 216, 0.35)'
                   }}>
                <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-3" style={{ letterSpacing: '-0.025em' }}>
                Connexion en cours…
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Vérification de votre compte Google
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Authentification sécurisée</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
