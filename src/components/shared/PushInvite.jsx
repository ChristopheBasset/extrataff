// src/components/shared/PushInvite.jsx
import { useEffect, useState } from 'react'
import { getPushStatus } from '../../lib/pushStatus'
import { subscribeToPush } from '../../lib/pushNotifications'

const HIDE_KEY = 'extrataff_push_invite_hidden_until'
const HIDE_DAYS = 7

function isHidden() {
  try {
    const until = Number(localStorage.getItem(HIDE_KEY) || 0)
    return until > Date.now()
  } catch {
    return false
  }
}

function hideForAWhile() {
  try {
    localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DAYS * 24 * 3600 * 1000))
  } catch { /* stockage indisponible : sans conséquence */ }
}

/**
 * Invitation à activer les alertes sur le téléphone.
 *  - role : 'establishment' ou 'talent' (adapte le texte)
 *  - compact : version courte, sans bouton « Plus tard » (utilisée dans la cloche)
 * La demande d'autorisation n'est lancée qu'au clic sur le bouton (obligatoire sur iPhone).
 */
export default function PushInvite({ role = 'talent', compact = false, onStatusChange }) {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [hidden, setHidden] = useState(() => (compact ? false : isHidden()))

  const refresh = async () => {
    const s = await getPushStatus()
    setStatus(s)
    if (onStatusChange) onStatusChange(s)
    return s
  }

  useEffect(() => { refresh() }, [])

  const handleEnable = async () => {
    setBusy(true)
    try {
      await subscribeToPush()
    } finally {
      await refresh()
      setBusy(false)
    }
  }

  const handleLater = () => {
    hideForAWhile()
    setHidden(true)
  }

  if (!status || status === 'active' || status === 'unsupported' || hidden) return null

  const benefit = role === 'establishment'
    ? "Soyez prévenu dès qu'un candidat répond à votre mission, même quand l'application est fermée."
    : role === 'talent'
      ? "Recevez les missions qui vous correspondent, même quand l'application est fermée."
      : "Recevez vos alertes sur ce téléphone, même quand l'application est fermée."
  const title = role === 'establishment' ? 'Ne manquez aucun candidat'
    : role === 'talent' ? 'Ne manquez aucune mission'
    : 'Activez les alertes'

  return (
    <div
      className={`rounded-2xl border-2 ${compact ? 'p-3 mb-2' : 'p-4 sm:p-5 mb-6'}`}
      style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)', borderColor: '#93C5FD' }}
      data-testid="push-invite"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl flex-shrink-0">🔔</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{benefit}</p>

          {status === 'can_enable' && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={handleEnable}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' }}
              >
                {busy ? 'Activation…' : 'Activer les alertes'}
              </button>
              {!compact && (
                <button onClick={handleLater} className="text-xs text-slate-500 hover:text-slate-700 font-medium">
                  Plus tard
                </button>
              )}
            </div>
          )}

          {status === 'needs_install' && (
            <div className="mt-3">
              <p className="text-xs font-bold text-slate-800 mb-1">Sur iPhone, installez d'abord l'application (2 minutes) :</p>
              <ol className="text-xs text-slate-700 space-y-1 list-decimal pl-4 leading-relaxed">
                <li>Touchez l'icône <strong>Partager</strong> (le carré avec une flèche) dans la barre de Safari.</li>
                <li>Choisissez <strong>« Sur l'écran d'accueil »</strong>, puis <strong>Ajouter</strong>.</li>
                <li>Ouvrez <strong>ExtraTaff depuis la nouvelle icône</strong>, puis touchez « Activer les alertes ».</li>
              </ol>
              {!compact && (
                <button onClick={handleLater} className="mt-3 text-xs text-slate-500 hover:text-slate-700 font-medium">
                  Plus tard
                </button>
              )}
            </div>
          )}

          {status === 'denied' && (
            <div className="mt-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                Les alertes sont bloquées sur cet appareil. Autorisez les notifications pour ExtraTaff dans les réglages
                de votre téléphone ou de votre navigateur, puis rechargez la page.
              </p>
              {!compact && (
                <button onClick={handleLater} className="mt-3 text-xs text-slate-500 hover:text-slate-700 font-medium">
                  Compris
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
