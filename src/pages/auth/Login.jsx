import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const TURNSTILE_SITE_KEY = '0x4AAAAAACU7qpGVX9XhKmW1'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [turnstileToken, setTurnstileToken] = useState(null)
  const turnstileRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Charger le script Turnstile
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      if (window.turnstile && turnstileRef.current) {
        window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(null),
        })
      }
    }

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // Connexion classique email/password
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!turnstileToken) {
      setError('Veuillez valider le captcha')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: turnstileToken
        }
      })

      if (loginError) {
        setError(loginError.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect'
          : loginError.message)
        setLoading(false)
        if (window.turnstile) {
          window.turnstile.reset()
          setTurnstileToken(null)
        }
        return
      }

      await redirectBasedOnProfile(data.user.id)
    } catch (err) {
      console.error('Erreur login:', err)
      setError('Erreur lors de la connexion')
      setLoading(false)
      if (window.turnstile) {
        window.turnstile.reset()
        setTurnstileToken(null)
      }
    }
  }

  // Connexion avec Google
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      sessionStorage.setItem('oauth_flow', 'login')

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error
    } catch (err) {
      setError(err.message || 'Erreur connexion Google')
      setGoogleLoading(false)
    }
  }

  // Redirection selon le profil
  const redirectBasedOnProfile = async (userId) => {
    try {
      // Vérifier établissement
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (establishment) {
        console.log('✅ Login établissement:', userId)
        navigate('/establishment/dashboard')
        return
      }

      // Vérifier talent
      const { data: talent } = await supabase
        .from('talents')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (talent) {
        console.log('✅ Login talent:', userId)
        navigate('/talent/dashboard')
        return
      }

      // Pas de profil → profil form
      console.log('⚠️ Pas de profil trouvé')
      navigate('/talent/profile-form')
    } catch (err) {
      console.error('Erreur redirection:', err)
      navigate('/talent/profile-form')
    }
  }

  return (
    <>
      {/* ===== STYLES ===== */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

        .login-page {
          font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
          letter-spacing: -0.005em;
        }
        .login-page * {
          font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
        }

        .gradient-text {
          background: linear-gradient(120deg, #1D4ED8 0%, #0EA5E9 60%, #3B82F6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          display: inline-block;
        }

        .btn-primary-gradient {
          background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
          position: relative; overflow: hidden;
          box-shadow: 0 8px 24px rgba(29, 78, 216, 0.20);
          transition: all 0.25s ease;
        }
        .btn-primary-gradient::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, #0EA5E9 0%, #1D4ED8 100%);
          opacity: 0; transition: opacity 0.25s;
        }
        .btn-primary-gradient:hover:not(:disabled)::before { opacity: 1; }
        .btn-primary-gradient > * { position: relative; z-index: 1; }
        .btn-primary-gradient:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 16px 40px rgba(29, 78, 216, 0.30);
        }
        .btn-primary-gradient:disabled {
          opacity: 0.55; cursor: not-allowed;
          transform: none; box-shadow: 0 4px 12px rgba(29, 78, 216, 0.12);
        }

        .login-input { transition: all 0.25s ease; }
        .login-input:focus {
          outline: none;
          border-color: #1D4ED8;
          box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.10);
        }
        .login-input:hover:not(:focus) { border-color: #94A3B8; }

        .fade-in { animation: fadeInUp 0.6s ease both; }
        .fade-in-1 { animation-delay: 0.05s; }
        .fade-in-2 { animation-delay: 0.15s; }
        .fade-in-3 { animation-delay: 0.30s; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="login-page min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* ===== Header ===== */}
          <div className="fade-in fade-in-1 text-center mb-8">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-extrabold">E</span>
              </div>
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight"
                    style={{ letterSpacing: '-0.025em' }}>
                Extra<span className="text-blue-700 font-bold">Taff</span>
              </span>
            </button>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mt-2"
                style={{ letterSpacing: '-0.025em' }}>
              Bon retour <span className="gradient-text">parmi nous</span> 👋
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">
              Connectez-vous pour accéder à votre espace
            </p>
          </div>

          {/* ===== CARTE PRINCIPALE ===== */}
          <div className="fade-in fade-in-2 bg-white rounded-3xl shadow-xl border border-blue-100 p-7 sm:p-9"
               style={{ boxShadow: '0 20px 60px rgba(10, 37, 64, 0.10), 0 4px 16px rgba(10, 37, 64, 0.06)' }}>

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium mb-5 flex items-start gap-2.5">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* ========== Bouton Google ========== */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 font-semibold py-3.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-5 text-[15px]"
            >
              {googleLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continuer avec Google
            </button>

            {/* Séparateur */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="bg-white px-3 text-slate-400 font-bold">ou par email</span>
              </div>
            </div>

            {/* ========== Formulaire classique ========== */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 placeholder-slate-400 bg-white"
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 placeholder-slate-400 pr-12 bg-white"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-700 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="text-right mt-2">
                  <Link to="/forgot-password" className="text-sm text-blue-700 hover:text-blue-800 font-semibold transition-colors">
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>

              {/* Turnstile Captcha */}
              <div className="flex justify-center pt-1">
                <div ref={turnstileRef}></div>
              </div>

              <button
                type="submit"
                disabled={loading || !turnstileToken}
                className="btn-primary-gradient w-full text-white py-4 rounded-xl font-semibold text-[15px] tracking-tight inline-flex items-center justify-center gap-2.5"
              >
                {loading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Connexion…
                  </>
                ) : (
                  <>
                    Se connecter
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Trust badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Connexion sécurisée · Turnstile + Supabase</span>
            </div>
          </div>

          {/* ===== Lien inscription ===== */}
          <div className="fade-in fade-in-3 mt-6 text-center text-sm text-slate-600 font-medium">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-blue-700 hover:text-blue-800 font-bold border-b-2 border-transparent hover:border-blue-700 transition-colors">
              Je m'inscris
            </Link>
          </div>

          {/* ===== Retour landing ===== */}
          <div className="fade-in fade-in-3 mt-3 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors inline-flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Retour à l'accueil
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
