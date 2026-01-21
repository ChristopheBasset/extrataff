import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function NotificationBadge({ onClick }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUnreadCount()
    
    // Setup de la subscription temps réel
    let channel
    
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel('notifications-badge')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadUnreadCount()
          }
        )
        .subscribe()
    }
    
    setupSubscription()
    
    // Recharger toutes les 30 secondes (backup)
    const interval = setInterval(loadUnreadCount, 30000)
    
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
      clearInterval(interval)
    }
  }, [])

  const loadUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error

      setUnreadCount(count || 0)
    } catch (err) {
      console.error('Erreur chargement notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      title="Notifications"
    >
      {/* Icône cloche */}
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Badge avec compteur */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-600 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
