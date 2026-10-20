import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// Après le paiement : Stripe prévient notre serveur (quelques secondes), puis les droits
// sont ajoutés au compte. On attend ici que ce soit visible.
export default function SubscribeSuccess() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('waiting') // waiting | ready | slow
  const [summary, setSummary] = useState('')

  useEffect(() => {
    let cancelled = false
    let attempts = 0

    const check = async () => {
      attempts++
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: est } = await supabase
          .from('establishments')
          .select('subscription_status, subscription_plan, pack_credits, pack_expires_at')
          .eq('user_id', user.id)
          .maybeSingle()
        const unlimited = est?.subscription_status === 'active' && ['club', 'annual'].includes(est?.subscription_plan)
        const packValid = (est?.pack_credits || 0) > 0 && (!est?.pack_expires_at || new Date(est.pack_expires_at) > new Date())
        if (!cancelled && (unlimited || packValid)) {
          setSummary(unlimited
            ? 'Votre abonnement illimité est actif.'
            : `Votre pack est actif : ${est.pack_credits} mission${est.pack_credits > 1 ? 's' : ''} disponible${est.pack_credits > 1 ? 's' : ''}.`)
          setStatus('ready')
          return
        }
      } catch (err) {
        console.error('Erreur vérification paiement:', err)
      }
      if (cancelled) return
      if (attempts >= 15) { setStatus('slow'); return }
      setTimeout(check, 2000)
    }

    check()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-md w-full p-8 text-center">
        {status === 'waiting' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-5"></div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement reçu</h1>
            <p className="text-gray-600">Nous activons votre formule, cela prend quelques secondes…</p>
          </>
        )}

        {status === 'ready' && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Merci !</h1>
            <p className="text-gray-600 mb-6">{summary}</p>
            <button onClick={() => navigate('/establishment')} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl">
              Retour au tableau de bord
            </button>
          </>
        )}

        {status === 'slow' && (
          <>
            <div className="text-5xl mb-4">⏳</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement reçu</h1>
            <p className="text-gray-600 mb-6">
              L'activation de votre formule prend un peu plus de temps que d'habitude. Elle apparaîtra dans « Mes formules » dans quelques minutes. Si ce n'est pas le cas, écrivez-nous.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/establishment/subscribe')} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl">
                Voir mes formules
              </button>
              <button onClick={() => navigate('/establishment')} className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl">
                Retour au tableau de bord
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
