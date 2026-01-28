import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/supabase'

// Constantes pour les messages spéciaux
const CV_REQUEST_PREFIX = '__CV_REQUEST__'
const CV_SHARED_PREFIX = '__CV_SHARED__'

export default function ChatWindow({ userType }) {
  const navigate = useNavigate()
  const { applicationId } = useParams()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [application, setApplication] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [talentCvUrl, setTalentCvUrl] = useState(null)
  const [cvRequested, setCvRequested] = useState(false)
  const [cvShared, setCvShared] = useState(false)
  const [downloadingCv, setDownloadingCv] = useState(false)
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
          // Vérifier si c'est une demande ou partage de CV
          checkCvStatus([payload.new])
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

  // Vérifier le statut CV dans les messages
  const checkCvStatus = (msgs) => {
    msgs.forEach(msg => {
      if (msg.content.startsWith(CV_REQUEST_PREFIX)) {
        setCvRequested(true)
      }
      if (msg.content.startsWith(CV_SHARED_PREFIX)) {
        setCvShared(true)
      }
    })
  }

  const loadChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user.id)

      // Charger les infos de la candidature avec le CV du talent
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
            user_id,
            cv_url
          )
        `)
        .eq('id', applicationId)
        .single()

      if (appError) throw appError
      setApplication(appData)
      setTalentCvUrl(appData.talents?.cv_url || null)

      // Charger les messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError
      setMessages(messagesData || [])
      
      // Vérifier si CV déjà demandé/partagé
      checkCvStatus(messagesData || [])

    } catch (err) {
      console.error('Erreur chargement chat:', err)
    } finally {
      setLoading(false)
    }
  }

  // Demander le CV (côté établissement)
  const handleRequestCv = async () => {
    if (sending || cvRequested) return
    setSending(true)

    try {
      const receiverId = application.talents.user_id
      const senderName = application.missions.establishments.name

      // Message spécial de demande de CV
      const { error } = await supabase
        .from('messages')
        .insert({
          application_id: applicationId,
          mission_id: application.missions.id,
          sender_id: currentUserId,
          receiver_id: receiverId,
          content: CV_REQUEST_PREFIX
        })

      if (error) throw error

      setCvRequested(true)

      // Notification pour le talent
      await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          type: 'cv_request',
          title: 'Demande de CV',
          content: `${senderName} souhaite consulter votre CV`,
          link: `/talent/chat/${applicationId}`
        })

    } catch (err) {
      console.error('Erreur demande CV:', err)
      alert('Erreur lors de la demande de CV')
    } finally {
      setSending(false)
    }
  }

  // Envoyer/Partager le CV (côté talent)
  const handleShareCv = async () => {
    if (sending || !talentCvUrl) return
    setSending(true)

    try {
      const receiverId = application.missions.establishments.user_id
      const senderName = `${application.talents.first_name} ${application.talents.last_name}`

      // Message spécial de partage de CV
      const { error } = await supabase
        .from('messages')
        .insert({
          application_id: applicationId,
          mission_id: application.missions.id,
          sender_id: currentUserId,
          receiver_id: receiverId,
          content: CV_SHARED_PREFIX + talentCvUrl
        })

      if (error) throw error

      setCvShared(true)

      // Notification pour l'établissement
      await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          type: 'cv_shared',
          title: 'CV reçu',
          content: `${senderName} a partagé son CV`,
          link: `/establishment/chat/${applicationId}`
        })

    } catch (err) {
      console.error('Erreur partage CV:', err)
      alert('Erreur lors du partage du CV')
    } finally {
      setSending(false)
    }
  }

  // Télécharger le CV (côté établissement)
  const handleDownloadCv = async (cvPath) => {
    setDownloadingCv(true)
    try {
      const { data, error } = await supabase.storage
        .from('cv')
        .download(cvPath)

      if (error) throw error

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `CV_${application.talents.first_name}_${application.talents.last_name}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erreur téléchargement CV:', err)
      alert('Erreur lors du téléchargement du CV')
    } finally {
      setDownloadingCv(false)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const messageText = newMessage.trim()
    setNewMessage('')
    setSending(true)
    
    try {
      const receiverId = userType === 'talent'
        ? application.missions.establishments.user_id
        : application.talents.user_id

      const senderName = userType === 'talent'
        ? `${application.talents.first_name} ${application.talents.last_name}`
        : application.missions.establishments.name

      // Message optimiste
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        application_id: applicationId,
        mission_id: application.missions.id,
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: messageText,
        created_at: new Date().toISOString()
      }

      setMessages(prev => [...prev, optimisticMessage])
      scrollToBottom()

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
      loadChat()
    } finally {
      setSending(false)
    }
  }

  // Render d'un message (gère les messages spéciaux)
  const renderMessage = (message) => {
    const isMe = message.sender_id === currentUserId
    const content = message.content

    // Message de demande de CV
    if (content.startsWith(CV_REQUEST_PREFIX)) {
      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 max-w-sm">
            <div className="flex items-center gap-2 text-amber-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">Demande de CV</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              {userType === 'talent' 
                ? "L'établissement souhaite consulter votre CV"
                : "Vous avez demandé le CV du candidat"}
            </p>
            {userType === 'talent' && !cvShared && (
              <button
                onClick={handleShareCv}
                disabled={sending || !talentCvUrl}
                className="mt-2 w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2 px-4 rounded-lg disabled:opacity-50"
              >
                {!talentCvUrl ? 'Aucun CV enregistré' : sending ? 'Envoi...' : '📄 Envoyer mon CV'}
              </button>
            )}
            {userType === 'talent' && !talentCvUrl && (
              <p className="text-xs text-amber-600 mt-1">
                <a href="/talent/edit-profile" className="underline">Ajoutez votre CV</a> dans votre profil
              </p>
            )}
            <p className="text-xs text-amber-500 mt-2">
              {formatDateTime(message.created_at)}
            </p>
          </div>
        </div>
      )
    }

    // Message de CV partagé
    if (content.startsWith(CV_SHARED_PREFIX)) {
      const cvPath = content.replace(CV_SHARED_PREFIX, '')
      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 max-w-sm">
            <div className="flex items-center gap-2 text-green-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">CV partagé</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              {userType === 'establishment' 
                ? "Le candidat a partagé son CV"
                : "Vous avez partagé votre CV"}
            </p>
            {userType === 'establishment' && (
              <button
                onClick={() => handleDownloadCv(cvPath)}
                disabled={downloadingCv}
                className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg disabled:opacity-50"
              >
                {downloadingCv ? 'Téléchargement...' : '📥 Télécharger le CV'}
              </button>
            )}
            <p className="text-xs text-green-500 mt-2">
              {formatDateTime(message.created_at)}
            </p>
          </div>
        </div>
      )
    }

    // Message normal
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
          <p className="break-words">{content}</p>
          <p className={`text-xs mt-1 ${isMe ? 'text-primary-100' : 'text-gray-500'}`}>
            {formatDateTime(message.created_at)}
          </p>
        </div>
      </div>
    )
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

      {/* Badge messagerie sécurisée + bouton CV pour établissement */}
      <div className="bg-green-50 border-b border-green-100">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span>Messagerie sécurisée</span>
            </div>
            
            {/* Bouton Demander CV (visible uniquement pour établissement) */}
            {userType === 'establishment' && !cvRequested && !cvShared && (
              <button
                onClick={handleRequestCv}
                disabled={sending}
                className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium py-1.5 px-3 rounded-full transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Demander CV
              </button>
            )}
            {userType === 'establishment' && cvRequested && !cvShared && (
              <span className="text-xs text-amber-600">CV demandé ⏳</span>
            )}
            {cvShared && (
              <span className="text-xs text-green-600">CV reçu ✓</span>
            )}
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
              {messages.map(message => renderMessage(message))}
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
