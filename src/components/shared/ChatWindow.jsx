import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/supabase'

export default function ChatWindow({ userType }) {
  const navigate = useNavigate()
  const { applicationId } = useParams()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [application, setApplication] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadChat()
    
    // Subscription temps réel pour nouveaux messages
    const channel = supabase
      .channel(`chat:${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `application_id=eq.${applicationId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new])
          scrollToBottom()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [applicationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user.id)

      // Charger les infos de la candidature
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          missions (
            id,
            position,
            start_date,
            establishments (
              name,
              user_id
            )
          ),
          talents!talent_id (
            first_name,
            last_name,
            user_id
          )
        `)
        .eq('id', applicationId)
        .single()

      if (appError) throw appError
      setApplication(appData)

      // Charger les messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError
      setMessages(messagesData || [])

    } catch (err) {
      console.error('Erreur chargement chat:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const messageText = newMessage.trim()
    setNewMessage('') // Vider le champ immédiatement
    setSending(true)
    
    try {
      // Déterminer le receiver_id selon qui envoie
      const receiverId = userType === 'talent'
        ? application.missions.establishments.user_id
        : application.talents.user_id

      // Nom de l'expéditeur
      const senderName = userType === 'talent'
        ? `${application.talents.first_name} ${application.talents.last_name}`
        : application.missions.establishments.name

      // Créer le message optimiste (affichage immédiat)
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        application_id: applicationId,
        mission_id: application.missions.id,
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: messageText,
        created_at: new Date().toISOString()
      }

      // Ajouter immédiatement le message à l'affichage
      setMessages(prev => [...prev, optimisticMessage])
      scrollToBottom()

      // Envoyer au serveur
      const { error } = await supabase
        .from('messages')
        .insert({
          application_id: applicationId,
          mission_id: application.missions.id,
          sender_id: currentUserId,
          receiver_id: receiverId,
          content: messageText
        })

      if (error) throw error

      // Créer une notification pour le destinataire
      const receiverPath = userType === 'talent' ? 'establishment' : 'talent'
      await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          type: 'new_message',
          title: 'Nouveau message',
          content: `${senderName} : "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`,
          link: `/${receiverPath}/chat/${applicationId}`
        })

    } catch (err) {
      console.error('Erreur envoi message:', err)
      alert('Erreur lors de l\'envoi du message')
      // Recharger les messages en cas d'erreur
      loadChat()
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la conversation...</p>
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">Conversation introuvable</p>
          <button
            onClick={() => navigate(userType === 'talent' ? '/talent/chat' : '/establishment/chat')}
            className="btn-primary"
          >
            Retour aux conversations
          </button>
        </div>
      </div>
    )
  }

  const otherPartyName = userType === 'talent'
    ? application.missions.establishments.name
    : `${application.talents.first_name} ${application.talents.last_name}`

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate(userType === 'talent' ? '/talent/chat' : '/establishment/chat')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Retour
            </button>
            <div className="text-center">
              <h1 className="font-semibold text-gray-900">{otherPartyName}</h1>
              <p className="text-xs text-gray-500">{application.missions.position}</p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      {/* Badge messagerie sécurisée */}
      <div className="bg-green-50 border-b border-green-100">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-green-700 text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span>Messagerie sécurisée et chiffrée</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun message pour l'instant</p>
              <p className="text-sm text-gray-400 mt-2">Envoyez le premier message !</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => {
                const isMe = message.sender_id === currentUserId
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                        isMe
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-primary-100' : 'text-gray-500'}`}>
                        {formatDateTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1 input"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="btn-primary px-6"
            >
              {sending ? '...' : 'Envoyer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
