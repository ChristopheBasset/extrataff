import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const TURNSTILE_SITE_KEY = '0x4AAAAAACU7qpGVX9XhKmW1'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState(null)
  const turnstileRef = useRef(null)

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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!turnstileToken) {
      setError('Veuillez valider le captcha')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://extrataff.fr/reset-password',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  // Style block partagé entre l'écran principal et l'écran de succès
  const sharedStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

      .forgot-page {
        font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
        letter-spacing: -0.005em;
      }
      .forgot-page * {
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
        box-shadow: none;
      }

      @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } }
      .fade-in {
        opacity: 0; transform: translateY(16px);
        animation: fadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .fade-in-1 { animation-delay: 0.05s; }
      .fade-in-2 { animation-delay: 0.15s; }

      .forgot-input { transition: all 0.2s ease; }
      .forgot-input:focus {
        border-color: #1D4ED8;
        box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.12);
        outline: none;
      }
    `}</style>
  )

  // ========== ÉCRAN DE SUCCÈS ==========
  if (success) {
    return (
      <>
        {sharedStyles}
        <div className="forgot-page min-h-screen flex items-center justify-center py-12 px-4"
             style={{
               background: `
                 radial-gradient(ellipse 80% 50% at 80% 20%, rgba(186, 230, 253, 0.6) 0%, transparent 60%),
                 radial-gradient(ellipse 60% 40% at 10% 80%, rgba(219, 234, 254, 0.5) 0%, transparent 60%),
                 #FFFFFF
               `
             }}>
          <div className="max-w-md w-full">

            {/* Logo */}
            <div className="fade-in fade-in-1 text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <span className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-xl"
                      style={{
                        background: 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)',
                        boxShadow: '0 8px 20px rgba(29, 78, 216, 0.3)'
                      }}>
                  E
                </span>
                <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                  Extra<span className="text-blue-700 font-bold">Taff</span>
                </span>
              </Link>
            </div>

            <div className="fade-in fade-in-2 bg-white rounded-3xl shadow-xl border border-blue-100 p-9 text-center"
                 style={{ boxShadow: '0 20px 60px rgba(10, 37, 64, 0.10)' }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                   style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BAE6FD 100%)' }}>
                <svg className="w-10 h-10 text-blue-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-3" style={{ letterSpacing: '-0.025em' }}>
                Email <span className="gradient-text">envoyé&nbsp;!</span>
              </h2>
              <p className="text-slate-600 mb-3 leading-relaxed">
                Si un compte existe avec l'adresse <strong className="font-bold text-slate-900">{email}</strong>, vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
              </p>
              <p className="text-sm text-slate-500 mb-7 font-medium">
                💡 Pensez à vérifier vos spams si vous ne voyez pas l'email.
              </p>
              <Link
                to="/login"
                className="btn-primary-gradient inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-white font-semibold text-[15px] tracking-tight no-underline"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/>
                  <polyline points="12 19 5 12 12 5"/>
                </svg>
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ========== ÉCRAN PRINCIPAL ==========
  return (
    <>
      {sharedStyles}
      <div className="forgot-page min-h-screen flex items-center justify-center py-12 px-4"
           style={{
             background: `
               radial-gradient(ellipse 80% 50% at 80% 20%, rgba(186, 230, 253, 0.6) 0%, transparent 60%),
               radial-gradient(ellipse 60% 40% at 10% 80%, rgba(219, 234, 254, 0.5) 0%, transparent 60%),
               #FFFFFF
             `
           }}>
        <div className="max-w-md w-full">

          {/* Logo + titre */}
          <div className="fade-in fade-in-1 text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-xl"
                    style={{
                      background: 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)',
                      boxShadow: '0 8px 20px rgba(29, 78, 216, 0.3)'
                    }}>
                E
              </span>
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                Extra<span className="text-blue-700 font-bold">Taff</span>
              </span>
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mt-2"
                style={{ letterSpacing: '-0.025em' }}>
              Mot de passe <span className="gradient-text">oublié&nbsp;?</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">
              Pas de panique, on vous envoie un lien
            </p>
          </div>

          <div className="fade-in fade-in-2 bg-white rounded-3xl shadow-xl border border-blue-100 p-7 sm:p-9"
               style={{ boxShadow: '0 20px 60px rgba(10, 37, 64, 0.10), 0 4px 16px rgba(10, 37, 64, 0.06)' }}>

            <p className="text-slate-600 text-sm mb-5 leading-relaxed">
              Entrez votre adresse email et nous vous enverrons un lien sécurisé pour créer un nouveau mot de passe.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2.5">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="forgot-input w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 placeholder-slate-400 bg-white"
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  required
                />
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
                    Envoi…
                  </>
                ) : (
                  <>
                    Envoyer le lien
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
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
              <span>Lien sécurisé · Valide 1 heure</span>
            </div>
          </div>

          {/* Lien retour */}
          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-blue-700 hover:text-blue-800 font-bold inline-flex items-center gap-1.5 border-b-2 border-transparent hover:border-blue-700 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Retour à la connexion
            </Link>
          </div>

        </div>
      </div>
    </>
  )
}
