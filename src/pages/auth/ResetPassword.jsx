import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Vérifier qu'on a bien un token de reset dans l'URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')

    if (type === 'recovery' && accessToken) {
      // Supabase gère automatiquement la session avec le token
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hashParams.get('refresh_token') || '',
      })
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    // Rediriger après 3 secondes
    setTimeout(() => {
      navigate('/login')
    }, 3000)
  }

  // Style block partagé
  const sharedStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

      .reset-page {
        font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
        letter-spacing: -0.005em;
      }
      .reset-page * {
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

      .reset-input { transition: all 0.2s ease; }
      .reset-input:focus {
        border-color: #1D4ED8;
        box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.12);
        outline: none;
      }

      @keyframes successPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .success-icon { animation: successPulse 2s ease-in-out infinite; }
    `}</style>
  )

  // ========== ÉCRAN DE SUCCÈS ==========
  if (success) {
    return (
      <>
        {sharedStyles}
        <div className="reset-page min-h-screen flex items-center justify-center py-12 px-4"
             style={{
               background: `
                 radial-gradient(ellipse 80% 50% at 80% 20%, rgba(186, 230, 253, 0.6) 0%, transparent 60%),
                 radial-gradient(ellipse 60% 40% at 10% 80%, rgba(219, 234, 254, 0.5) 0%, transparent 60%),
                 #FFFFFF
               `
             }}>
          <div className="max-w-md w-full">

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
              <div className="success-icon w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                   style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', boxShadow: '0 12px 32px rgba(16, 185, 129, 0.35)' }}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-3" style={{ letterSpacing: '-0.025em' }}>
                Mot de passe <span className="gradient-text">modifié&nbsp;!</span>
              </h2>
              <p className="text-slate-600 mb-5 leading-relaxed">
                Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
              </p>
              <div className="flex items-center justify-center gap-2.5 text-blue-700 font-semibold text-sm">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>Redirection vers la connexion…</span>
              </div>
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
      <div className="reset-page min-h-screen flex items-center justify-center py-12 px-4"
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
              Nouveau <span className="gradient-text">mot de passe</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">
              Choisissez un mot de passe solide et facile à retenir
            </p>
          </div>

          <div className="fade-in fade-in-2 bg-white rounded-3xl shadow-xl border border-blue-100 p-7 sm:p-9"
               style={{ boxShadow: '0 20px 60px rgba(10, 37, 64, 0.10), 0 4px 16px rgba(10, 37, 64, 0.06)' }}>

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

              {/* Nouveau mot de passe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Nouveau mot de passe
                  <span className="text-slate-400 font-medium normal-case tracking-normal ml-1">(min 6 caractères)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="reset-input w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 placeholder-slate-400 pr-12 bg-white"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    minLength={6}
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
              </div>

              {/* Confirmer mot de passe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="reset-input w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 placeholder-slate-400 pr-12 bg-white"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-700 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary-gradient w-full text-white py-4 rounded-xl font-semibold text-[15px] tracking-tight inline-flex items-center justify-center gap-2.5 mt-6"
              >
                {loading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Modification…
                  </>
                ) : (
                  <>
                    Modifier mon mot de passe
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
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
              <span>Modification sécurisée</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
