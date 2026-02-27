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
      // On stocke les infos pour que la page puisse les utiliser
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur de connexion</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirection vers la page de connexion...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Connexion en cours...</h2>
        <p className="text-gray-600">Vérification de votre compte Google</p>
      </div>
    </div>
  )
}
