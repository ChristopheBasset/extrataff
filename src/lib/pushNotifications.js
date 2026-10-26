// src/lib/pushNotifications.js
import { supabase } from './supabase'

// Clé PUBLIQUE VAPID (visible dans le navigateur de tous les visiteurs : sans risque).
// Ne jamais mettre ici la clé PRIVÉE, qui reste dans les secrets de Supabase.
const VAPID_PUBLIC_KEY = 'BArQsThfkFa1g3oBu-7klsoZZJg8BLHjhpGLLf9CYoLHpoySOYPs4R6GVKtu-ITyU9n80So0snwXLSr9M6L-KGY'

/**
 * Convertit la clé VAPID en Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Vérifie si les notifications push sont supportées
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Enregistre le Service Worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker non supporté')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker enregistré:', registration)
    return registration
  } catch (error) {
    console.error('Erreur enregistrement SW:', error)
    return null
  }
}

/**
 * Demande la permission et souscrit aux push notifications
 * (à appeler au clic de l'utilisateur : obligatoire sur iPhone)
 */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    console.log('Push non supporté sur ce navigateur')
    return null
  }

  try {
    // Demander la permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Permission notifications refusée')
      return null
    }

    // Récupérer le SW
    const registration = await navigator.serviceWorker.ready

    // Vérifier si déjà souscrit
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Nouvelle souscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
      console.log('Nouvelle souscription push:', subscription)
    } else {
      console.log('Souscription push existante')
    }

    // Sauvegarder dans Supabase (rattache l'appareil au compte connecté)
    await saveSubscription(subscription)

    return subscription
  } catch (error) {
    console.error('Erreur souscription push:', error)
    return null
  }
}

/**
 * Rattache l'appareil au compte connecté.
 * Si l'appareil servait à un autre compte (téléphone ou ordinateur partagé), il passe au compte actuel.
 */
async function saveSubscription(subscription) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const subscriptionData = subscription.toJSON()

    const { error } = await supabase.rpc('register_push_subscription', {
      p_endpoint: subscriptionData.endpoint,
      p_p256dh: subscriptionData.keys.p256dh,
      p_auth: subscriptionData.keys.auth
    })

    if (error) {
      console.error('Erreur sauvegarde subscription:', error)
    } else {
      console.log('Subscription sauvegardée pour user:', user.id)
    }
  } catch (error) {
    console.error('Erreur saveSubscription:', error)
  }
}

/**
 * À la déconnexion : l'appareil cesse de recevoir les alertes de ce compte.
 * L'appareil reste autorisé : le compte suivant qui s'y connecte le reprend automatiquement.
 * À appeler AVANT supabase.auth.signOut().
 */
export async function detachPushOnLogout() {
  try {
    if (!('serviceWorker' in navigator)) return
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(() => resolve(null), 2000))
    ])
    if (!registration) return
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  } catch (error) {
    console.error('Erreur détachement push:', error)
  }
}

/**
 * Se désabonner des push notifications
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Supprimer de Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
      }

      // Se désabonner du navigateur
      await subscription.unsubscribe()
      console.log('Désabonné des push notifications')
    }
  } catch (error) {
    console.error('Erreur désabonnement push:', error)
  }
}
