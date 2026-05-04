import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const userType = searchParams.get('type') // 'talent' ou 'establishment'

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptCGV, setAcceptCGV] = useState(false)

  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (!userType || (userType !== 'talent' && userType !== 'establishment')) {
      navigate('/')
    }
  }, [userType, navigate])

  // Inscription classique email/password
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!acceptCGV) {
      setError('Vous devez accepter les Conditions Générales de Vente pour vous inscrire')
      setLoading(false)
      return
    }

    if (authData.password !== authData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    if (authData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password
      })

      if (error) throw error

      if (!data.user) {
        throw new Error('Erreur lors de la création du compte')
      }

      console.log('✅ Compte créé avec succès:', data.user.id)

      if (!data.session) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await supabase.auth.refreshSession()
      }

      sessionStorage.setItem('registration_type', userType)
      sessionStorage.setItem('registration_success', 'true')

      setSuccess(true)
      setTimeout(() => {
        if (userType === 'talent') {
          window.location.href = '/talent/profile-form'
        } else {
          window.location.href = '/establishment/profile-form'
        }
      }, 2000)

    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  // Inscription avec Google
  const handleGoogleSignIn = async () => {
    if (!acceptCGV) {
      setError('Vous devez accepter les Conditions Générales de Vente pour vous inscrire')
      return
    }

    setGoogleLoading(true)
    setError(null)

    try {
      sessionStorage.setItem('registration_type', userType)
      sessionStorage.setItem('registration_success', 'true')
      sessionStorage.setItem('oauth_flow', 'register')

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

  if (!userType) return null

  // Style block — partagé entre l'écran principal et l'écran de succès
  const sharedStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

      .register-page {
        font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
        letter-spacing: -0.005em;
      }
      .register-page * {
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
      .fade-in-3 { animation-delay: 0.25s; }

      .register-input {
        transition: all 0.2s ease;
      }
      .register-input:focus {
        border-color: #1D4ED8;
        box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.12);
        outline: none;
      }

      /* CGV cartouche state transitions */
      .cgv-card {
        transition: all 0.3s ease;
      }
      .cgv-card.unchecked {
        background: linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%);
        border-color: #FCD34D;
      }
      .cgv-card.checked {
        background: linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%);
        border-color: #10B981;
      }

      /* Success screen pulse */
      @keyframes successPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .success-icon {
        animation: successPulse 2s ease-in-out infinite;
      }
    `}</style>
  )

  // ========== ÉCRAN DE SUCCÈS ==========
  if (success) {
    return (
      <>
        {sharedStyles}
        <div className="register-page min-h-screen flex items-center justify-center px-4"
             style={{
               background: `
                 radial-gradient(ellipse 80% 50% at 80% 20%, rgba(186, 230, 253, 0.6) 0%, transparent 60%),
                 radial-gradient(ellipse 60% 40% at 10% 80%, rgba(219, 234, 254, 0.5) 0%, transparent 60%),
                 #FFFFFF
               `
             }}>
          <div className="fade-in fade-in-1 max-w-md w-full bg-white rounded-3xl shadow-xl border border-blue-100 p-9 text-center"
               style={{ boxShadow: '0 20px 60px rgba(10, 37, 64, 0.10)' }}>
            <div className="success-icon w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                 style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', boxShadow: '0 12px 32px rgba(16, 185, 129, 0.35)' }}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3" style={{ letterSpacing: '-0.025em' }}>
              Compte créé <span className="gradient-text">avec succès</span>&nbsp;!
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              {userType === 'talent'
                ? 'Complétez maintenant votre profil Extra pour recevoir des missions près de chez vous.'
                : 'Complétez maintenant votre profil établissement pour publier vos premières missions.'}
            </p>
            <div className="flex items-center justify-center gap-2.5 text-blue-700 font-semibold text-sm">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span>Redirection en cours…</span>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ========== ÉCRAN PRINCIPAL ==========
  const isEstablishment = userType === 'establishment'
  const typeLabel = isEstablishment ? 'établissement' : 'Extra'
  const typeIcon = isEstablishment ? '🏪' : '✨'

  return (
    <>
      {sharedStyles}
      <div className="register-page min-h-screen"
           style={{
             background: `
               radial-gradient(ellipse 80% 50% at 80% 20%, rgba(186, 230, 253, 0.6) 0%, transparent 60%),
               radial-gradient(ellipse 60% 40% at 10% 80%, rgba(219, 234, 254, 0.5) 0%, transparent 60%),
               #FFFFFF
             `
           }}>

        {/* ===== HEADER ===== */}
        <header className="bg-white/85 backdrop-blur-xl border-b border-blue-100/50 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between py-3">
            <button
              onClick={() => navigate('/')}
              className="text-slate-500 hover:text-blue-700 font-semibold text-sm inline-flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Retour
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
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
            </button>
            <div className="w-16"></div>
          </div>
        </header>

        {/* ===== CONTENU ===== */}
        <div className="max-w-md mx-auto px-4 py-10 sm:py-14">

          {/* Badge type */}
          <div className="fade-in fade-in-1 text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold tracking-wider uppercase">
              <span className="text-base">{typeIcon}</span>
              <span>Inscription {typeLabel}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-4 mb-2" style={{ letterSpacing: '-0.03em' }}>
              {isEstablishment ? (
                <>Créez votre compte <span className="gradient-text">établissement</span></>
              ) : (
                <>Devenez <span className="gradient-text">candidat Extra</span></>
              )}
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              {isEstablishment
                ? 'Trouvez vos Extras CHR en quelques clics'
                : 'Recevez les missions qui matchent votre profil'}
            </p>
          </div>

          {/* Progress steps */}
          <div className="fade-in fade-in-2 flex items-center justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-md"
                     style={{ background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' }}>
                  1
                </div>
                <span className="text-blue-700 font-bold text-sm">Compte</span>
              </div>
              <div className="w-12 h-0.5 bg-blue-100 rounded-full"></div>
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-200 text-slate-500 font-extrabold text-sm">
                  2
                </div>
                <span className="text-slate-500 font-semibold text-sm">Profil</span>
              </div>
            </div>
          </div>

          {/* Card principale */}
          <div className="fade-in fade-in-3 bg-white rounded-3xl shadow-xl border border-blue-100 p-7 sm:p-9"
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

            {/* ========== CGV ========== */}
            <div
              className={`cgv-card flex items-start gap-3 mb-5 p-4 rounded-2xl border-2 cursor-pointer ${acceptCGV ? 'checked' : 'unchecked'}`}
              onClick={() => setAcceptCGV(!acceptCGV)}
            >
              <input
                type="checkbox"
                id="cgv"
                checked={acceptCGV}
                onChange={(e) => setAcceptCGV(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 h-5 w-5 rounded border-2 border-slate-300 text-blue-700 focus:ring-blue-500 cursor-pointer flex-shrink-0"
              />
              <label htmlFor="cgv" className="text-sm text-slate-700 cursor-pointer leading-relaxed flex-1" onClick={(e) => e.stopPropagation()}>
                {!acceptCGV && (
                  <span className="block font-bold text-amber-700 mb-1">
                    ⚠️ Commencez par accepter les conditions
                  </span>
                )}
                {acceptCGV && (
                  <span className="block font-bold text-emerald-700 mb-1">
                    ✅ Conditions acceptées
                  </span>
                )}
                J'accepte les{' '}
                <a href="/cgv" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-800 font-semibold" onClick={(e) => e.stopPropagation()}>
                  Conditions Générales de Vente
                </a>{' '}
                et la{' '}
                <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-800 font-semibold" onClick={(e) => e.stopPropagation()}>
                  Politique de Confidentialité
                </a>
                {' '}<span className="text-red-500 font-bold">*</span>
              </label>
            </div>

            {/* ========== Bouton Google ========== */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading || !acceptCGV}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 font-semibold py-3.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none mb-5 text-[15px]"
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

            {/* ========== Formulaire ========== */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  className="register-input w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 placeholder-slate-400 bg-white"
                  placeholder="email@exemple.com"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Mot de passe <span className="text-red-500">*</span>
                  <span className="text-slate-400 font-medium normal-case tracking-normal ml-1">(min 6 caractères)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    className="register-input w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 placeholder-slate-400 pr-12 bg-white"
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

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={authData.confirmPassword}
                    onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                    className="register-input w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 placeholder-slate-400 pr-12 bg-white"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    minLength={6}
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
                disabled={loading || !acceptCGV}
                className="btn-primary-gradient w-full text-white py-4 rounded-xl font-semibold text-[15px] tracking-tight inline-flex items-center justify-center gap-2.5 mt-6"
              >
                {loading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Création…
                  </>
                ) : (
                  <>
                    Créer mon compte
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
              <span>Inscription sécurisée · Vos données sont protégées</span>
            </div>
          </div>

          {/* Lien login */}
          <div className="mt-6 text-center text-sm text-slate-600 font-medium">
            Déjà un compte&nbsp;?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-700 hover:text-blue-800 font-bold border-b-2 border-transparent hover:border-blue-700 transition-colors"
            >
              Se connecter
            </button>
          </div>

          {/* Lien Offre Groupe (uniquement pour établissement) */}
          {isEstablishment && (
            <div className="mt-5 pt-5 border-t border-blue-100 text-center">
              <button
                onClick={() => navigate('/groupe')}
                className="text-sm text-slate-500 hover:text-blue-700 transition-colors inline-flex items-center gap-1.5 font-medium"
              >
                <span>🏢</span>
                <span>Vous gérez plusieurs établissements ?</span>
                <span className="underline font-semibold">Voir l'offre Groupe →</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
