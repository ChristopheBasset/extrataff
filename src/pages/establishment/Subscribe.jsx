import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// Tarif de lancement : jusqu'au 31 décembre 2026 inclus (heure de Paris). Doit rester identique
// à la date de la fonction « create-checkout-session ».
const LAUNCH_END = new Date('2027-01-01T00:00:00+01:00')
// Première mission offerte : inscription avant le 1er décembre 2026.
const FREE_FIRST_DEADLINE = new Date('2026-12-01T00:00:00+01:00')
const BILLED_KINDS = ['free_first', 'single', 'subscription', 'pack']

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

const Check = () => (
  <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </span>
)

export default function Subscribe() {
  const navigate = useNavigate()
  const [establishment, setEstablishment] = useState(null)
  const [freeFirstAvailable, setFreeFirstAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      const { data: est } = await supabase
        .from('establishments')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!est) { navigate('/establishment'); return }
      setEstablishment(est)

      // Première mission offerte : affichage seulement (le serveur décide)
      const { count } = await supabase
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .eq('establishment_id', est.id)
        .in('billing_kind', BILLED_KINDS)
      const inTime = est.created_at && new Date(est.created_at) < FREE_FIRST_DEADLINE
      setFreeFirstAvailable(Boolean(inTime) && (!count || count === 0))
    } catch (err) {
      console.error('Erreur chargement formules:', err)
      setError('Impossible de charger vos informations. Rechargez la page.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const callFunction = async (name, body) => {
    const { data: { session } } = await supabase.auth.refreshSession()
    if (!session) throw new Error('Session expirée, reconnectez-vous.')
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    if (!response.ok || data.error) throw new Error(data.error || 'Une erreur est survenue')
    return data
  }

  const startCheckout = async (planType) => {
    setBusy(planType)
    setError(null)
    try {
      const data = await callFunction('create-checkout-session', { establishment_id: establishment.id, plan_type: planType })
      if (!data.url) throw new Error('Lien de paiement indisponible')
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setBusy(null)
    }
  }

  const openPortal = async () => {
    setBusy('portal')
    setError(null)
    try {
      const data = await callFunction('create-portal-session', { customer_id: establishment.stripe_customer_id })
      if (!data.url) throw new Error('Portail indisponible')
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setBusy(null)
    }
  }

  const changeCancellation = async (action) => {
    setBusy(action)
    setError(null)
    try {
      await callFunction('cancel-subscription', { action })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const now = new Date()
  const hasUnlimited = establishment?.subscription_status === 'active' && ['club', 'annual'].includes(establishment?.subscription_plan)
  const packCredits = establishment?.pack_credits || 0
  const packValid = packCredits > 0 && (!establishment?.pack_expires_at || new Date(establishment.pack_expires_at) > now)
  const cancelAt = establishment?.subscription_cancel_at
  const commitmentEnd = establishment?.commitment_ends_at
  const launchOn = now < LAUNCH_END

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button onClick={() => navigate('/establishment')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Retour
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Mes formules</h1>
        <p className="text-gray-600 mb-6">Prix en euros TTC. Aucune commission sur le salaire de vos extras.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        {/* Situation actuelle */}
        {(hasUnlimited || packValid || freeFirstAvailable) && (
          <div className="space-y-3 mb-8">
            {freeFirstAvailable && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="font-semibold text-green-800">🎁 Votre première mission est offerte</p>
                <p className="text-sm text-green-700 mt-0.5">Publiez-la depuis votre tableau de bord, sans carte bancaire.</p>
              </div>
            )}

            {packValid && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="font-semibold text-blue-800">🎟️ Pack de missions : {packCredits} restante{packCredits > 1 ? 's' : ''}</p>
                <p className="text-sm text-blue-700 mt-0.5">
                  {establishment.pack_expires_at ? `Valable jusqu'au ${formatDate(establishment.pack_expires_at)}. ` : ''}
                  {hasUnlimited
                    ? "Tant que votre abonnement est actif, vos missions sont illimitées : ces crédits ne sont pas utilisés et restent disponibles jusqu'à leur date de fin."
                    : 'Chaque publication (ou réouverture) utilise un crédit.'}
                </p>
              </div>
            )}

            {hasUnlimited && (
              <div className="p-5 bg-white border border-gray-200 rounded-xl">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-gray-900">⭐ Abonnement illimité</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {cancelAt
                        ? `Résiliation prévue le ${formatDate(cancelAt)} : vous gardez vos missions illimitées jusqu'à cette date.`
                        : commitmentEnd
                          ? `Engagement de 12 mois en cours jusqu'au ${formatDate(commitmentEnd)}, puis renouvelé automatiquement.`
                          : 'Engagement de 12 mois, renouvelé automatiquement.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Actif</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {establishment?.stripe_customer_id && (
                    <button
                      onClick={openPortal}
                      disabled={busy !== null}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      {busy === 'portal' ? 'Chargement…' : 'Carte bancaire et factures'}
                    </button>
                  )}
                  {cancelAt ? (
                    <button
                      onClick={() => changeCancellation('resume')}
                      disabled={busy !== null}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                    >
                      {busy === 'resume' ? 'Un instant…' : 'Annuler la résiliation'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm('Votre abonnement continuera jusqu\'à la fin de la période d\'engagement en cours, puis s\'arrêtera. Confirmer la résiliation ?')) changeCancellation('cancel')
                      }}
                      disabled={busy !== null}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      {busy === 'cancel' ? 'Un instant…' : 'Résilier à la fin de l\'engagement'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Offres */}
        {!hasUnlimited && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* À la mission */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
              <h2 className="text-lg font-bold text-gray-900">À la mission</h2>
              <p className="text-sm text-gray-500 mb-4">Pour un besoin unique</p>
              <div className="flex items-baseline gap-1.5 mb-5">
                <span className="text-4xl font-extrabold text-gray-900">19,90&nbsp;€</span>
                <span className="text-sm text-gray-500">TTC / mission</span>
              </div>
              <ul className="space-y-2.5 mb-6 text-sm text-gray-700 flex-1">
                <li className="flex gap-3"><Check />Payée au moment de la publication</li>
                <li className="flex gap-3"><Check />Pas d'abonnement, pas d'engagement</li>
                <li className="flex gap-3"><Check />En ligne jusqu'à ce qu'elle soit pourvue ou à sa date de fin (30 jours maximum)</li>
              </ul>
              <button
                onClick={() => navigate('/establishment/create-mission')}
                className="w-full py-3 bg-white border-2 border-gray-300 hover:border-primary-600 hover:text-primary-700 rounded-xl font-semibold text-gray-900"
              >
                Créer une mission
              </button>
            </div>

            {/* Pack */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
              <h2 className="text-lg font-bold text-gray-900">Pack de 3 missions</h2>
              <p className="text-sm text-gray-500 mb-4">Pour des besoins ponctuels</p>
              <div className="flex items-baseline gap-1.5 mb-5">
                <span className="text-4xl font-extrabold text-gray-900">34,90&nbsp;€</span>
                <span className="text-sm text-gray-500">TTC, paiement unique</span>
              </div>
              <ul className="space-y-2.5 mb-6 text-sm text-gray-700 flex-1">
                <li className="flex gap-3"><Check />3 missions à publier (ou rouvrir)</li>
                <li className="flex gap-3"><Check />Valable 2 mois à compter de l'achat</li>
                <li className="flex gap-3"><Check />Pas d'abonnement, pas de renouvellement</li>
              </ul>
              <button
                onClick={() => startCheckout('pack')}
                disabled={busy !== null}
                className="w-full py-3 bg-white border-2 border-gray-300 hover:border-primary-600 hover:text-primary-700 rounded-xl font-semibold text-gray-900 disabled:opacity-60"
              >
                {busy === 'pack' ? 'Redirection…' : 'Acheter le pack'}
              </button>
            </div>

            {/* Abonnement */}
            <div className="bg-white border-2 border-primary-600 rounded-2xl p-6 flex flex-col relative">
              {launchOn && (
                <span className="absolute -top-3 right-5 px-3 py-1 rounded-full bg-primary-600 text-white text-xs font-bold uppercase tracking-wider">
                  Tarif de lancement
                </span>
              )}
              <h2 className="text-lg font-bold text-gray-900">Illimité, engagement 12 mois</h2>
              <p className="text-sm text-gray-500 mb-4">Pour recruter régulièrement</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-4xl font-extrabold text-gray-900">{launchOn ? '14,90' : '19,90'}&nbsp;€</span>
                <span className="text-sm text-gray-500">TTC / mois</span>
              </div>
              {launchOn && (
                <p className="text-xs text-primary-700 mb-4">Jusqu'au 31 décembre 2026, puis 19,90&nbsp;€/mois. Votre tarif est conservé tant que votre abonnement dure.</p>
              )}
              {!launchOn && <div className="mb-4" />}
              <ul className="space-y-2.5 mb-6 text-sm text-gray-700 flex-1">
                <li className="flex gap-3"><Check />Missions illimitées, réouvertures comprises</li>
                <li className="flex gap-3"><Check />Facturé chaque mois</li>
                <li className="flex gap-3"><Check />Engagement de 12 mois, renouvelé automatiquement ; résiliation à l'issue de chaque période de 12 mois</li>
              </ul>
              <button
                onClick={() => startCheckout('annual')}
                disabled={busy !== null}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold disabled:opacity-60"
              >
                {busy === 'annual' ? 'Redirection…' : 'Souscrire'}
              </button>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500 mt-6">
          Voir les <a href="/cgv" className="text-primary-600 underline">conditions générales de vente</a>.
        </p>
      </div>
    </div>
  )
}
