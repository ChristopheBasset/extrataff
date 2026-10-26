// src/lib/pushStatus.js
// Dit si l'appareil peut recevoir des alertes ExtraTaff, et ce qu'il faut faire pour les activer.

export function isIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches) || window.navigator.standalone === true
}

// Attend le service worker, mais au plus 3 secondes (évite de rester bloqué s'il n'est pas enregistré)
function readyWithTimeout(ms = 3000) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

/**
 * Résultat possible :
 *  - 'active'        : les alertes sont déjà activées sur cet appareil
 *  - 'can_enable'    : on peut les activer (un clic suffit)
 *  - 'needs_install' : iPhone/iPad ouvert dans le navigateur : il faut d'abord installer l'application
 *  - 'denied'        : l'utilisateur a refusé les notifications (à réautoriser dans les réglages)
 *  - 'unsupported'   : navigateur incompatible
 */
export async function getPushStatus() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported'
  if (isIOS() && !isStandalone()) return 'needs_install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'granted') {
    try {
      const registration = await readyWithTimeout()
      const subscription = registration ? await registration.pushManager.getSubscription() : null
      return subscription ? 'active' : 'can_enable'
    } catch {
      return 'can_enable'
    }
  }
  return 'can_enable'
}
