import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/supabase'

const CV_REQUEST_PREFIX = '__CV_REQUEST__'
const CV_SHARED_PREFIX = '__CV_SHARED__'
const RDV_PROPOSAL_PREFIX = '__RDV_PROPOSAL__'
const RDV_RESPONSE_PREFIX = '__RDV_RESPONSE__'
const HIRE_DECISION_PREFIX = '__HIRE_DECISION__'

const TIME_SLOTS = ['08h00','09h00','10h00','11h00','14h00','15h00','16h00','17h00','18h00','19h00']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_SHORT = ['Lu','Ma','Me','Je','Ve','Sa','Di']

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
  const [confirming, setConfirming] = useState(false)

  // Tableau de tous les appointments (pas juste le dernier)
  const [appointments, setAppointments] = useState([])
  const [showRdvModal, setShowRdvModal] = useState(false)
  const [rdvDate, setRdvDate] = useState(null)
  const [rdvTime, setRdvTime] = useState(null)
  const [rdvNote, setRdvNote] = useState('')
  const [sendingRdv, setSendingRdv] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())

  const messagesEndRef = useRef(null)

  // Appointment le plus récent (pour les décisions globales)
  const latestAppointment = appointments.length > 0
    ? appointments[appointments.length - 1]
    : null

  const getAppointmentById = (id) => appointments.find(a => a.id === id) || null

  useEffect(() => {
    loadChat()
    const channel = supabase
      .channel(`chat:${applicationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `application_id=eq.${applicationId}`
      }, (payload) => {
        if (payload.new.sender_id !== currentUserId) {
          setMessages(prev => [...prev, payload.new])
          const c = payload.new.content || ''
          if (c.startsWith(CV_REQUEST_PREFIX)) setCvRequested(true)
          if (c.startsWith(CV_SHARED_PREFIX)) setCvShared(true)
          if (c.startsWith(RDV_RESPONSE_PREFIX)) {
            const data = JSON.parse(c.replace(RDV_RESPONSE_PREFIX, ''))
            setAppointments(prev => prev.map(a =>
              a.id === data.appointment_id ? { ...a, status: data.response } : a
            ))
          }
          if (c.startsWith(RDV_PROPOSAL_PREFIX)) {
            // Recharger les appointments pour avoir le nouveau
            loadAppointments()
          }
          scrollToBottom()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [applicationId, currentUserId])

  useEffect(() => { scrollToBottom() }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkCvStatus = (msgs) => {
    msgs.forEach(msg => {
      const c = msg.content || ''
      if (c.startsWith(CV_REQUEST_PREFIX)) setCvRequested(true)
      if (c.startsWith(CV_SHARED_PREFIX)) setCvShared(true)
    })
  }

  const loadAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true })
    if (data) setAppointments(data)
  }

  const loadChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user.id)

      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select(`
          id, status, hire_status,
          missions (
            id, position, start_date,
            establishments ( name, user_id, address )
          ),
          talents!talent_id ( first_name, last_name, user_id, cv_url, phone, email )
        `)
        .eq('id', applicationId)
        .single()

      if (appError) throw appError
      setApplication(appData)
      setTalentCvUrl(appData.talents?.cv_url || null)

      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError
      const msgs = messagesData || []
      setMessages(msgs)
      checkCvStatus(msgs)

      // Charger TOUS les appointments de cette candidature
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true })

      if (apptData) setAppointments(apptData)

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
    setNewMessage('')
    setSending(true)
    try {
      const receiverId = userType === 'talent'
        ? application.missions.establishments.user_id
        : application.talents.user_id
      const senderName = userType === 'talent'
        ? `${application.talents.first_name} ${application.talents.last_name}`
        : application.missions.establishments.name

      const tempId = `temp-${Date.now()}`
      setMessages(prev => [...prev, {
        id: tempId, application_id: applicationId,
        mission_id: application.missions.id,
        sender_id: currentUserId, receiver_id: receiverId,
        content: messageText, created_at: new Date().toISOString()
      }])
      scrollToBottom()

      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert({
          application_id: applicationId,
          mission_id: application.missions.id,
          sender_id: currentUserId,
          receiver_id: receiverId,
          topic: 'text',
          content: messageText
        })
        .select().single()

      if (error) throw error
      setMessages(prev => prev.map(msg => msg.id === tempId ? insertedMessage : msg))

      const receiverPath = userType === 'talent' ? 'establishment' : 'talent'
      await supabase.from('notifications').insert({
        user_id: receiverId, type: 'new_message', title: 'Nouveau message',
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

  const handleRequestCv = async () => {
    if (sending || cvRequested) return
    setSending(true)
    try {
      const receiverId = application.talents.user_id
      const senderName = application.missions.establishments.name
      const { error } = await supabase.from('messages').insert({
        application_id: applicationId, mission_id: application.missions.id,
        sender_id: currentUserId, receiver_id: receiverId,
        topic: 'cv_request', content: CV_REQUEST_PREFIX
      })
      if (error) throw error
      setCvRequested(true)
      await supabase.from('notifications').insert({
        user_id: receiverId, type: 'cv_request', title: 'Demande de CV',
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

  const handleShareCv = async () => {
    if (sending || !talentCvUrl) return
    setSending(true)
    try {
      const receiverId = application.missions.establishments.user_id
      const senderName = `${application.talents.first_name} ${application.talents.last_name}`
      const { error } = await supabase.from('messages').insert({
        application_id: applicationId, mission_id: application.missions.id,
        sender_id: currentUserId, receiver_id: receiverId,
        topic: 'cv_share', content: CV_SHARED_PREFIX + talentCvUrl
      })
      if (error) throw error
      setCvShared(true)
      await supabase.from('notifications').insert({
        user_id: receiverId, type: 'cv_shared', title: 'CV reçu',
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

  const handleDownloadCv = async (cvPath) => {
    setDownloadingCv(true)
    try {
      let cleanPath = cvPath
      if (cleanPath.startsWith('http')) { window.open(cleanPath, '_blank'); return }
      cleanPath = cleanPath.replace(/^\//, '')
      const { data, error } = await supabase.storage.from('CV').download(cleanPath)
      if (error) {
        const { data: urlData } = supabase.storage.from('CV').getPublicUrl(cleanPath)
        if (urlData?.publicUrl) { window.open(urlData.publicUrl, '_blank'); return }
        throw error
      }
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `CV_${application.talents.first_name}_${application.talents.last_name}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erreur téléchargement CV:', err)
      alert('Erreur lors du téléchargement du CV.')
    } finally {
      setDownloadingCv(false)
    }
  }

  const handleProposeRdv = async () => {
    if (!rdvDate || !rdvTime || sendingRdv) return
    setSendingRdv(true)
    setShowRdvModal(false)
    try {
      const hour = parseInt(rdvTime.split('h')[0])
      const scheduledAt = new Date(rdvDate.y, rdvDate.m, rdvDate.d, hour, 0, 0).toISOString()
      const address = application.missions.establishments.address || ''

      const { data: apptData, error: apptError } = await supabase
        .from('appointments')
        .insert({
          application_id: applicationId,
          mission_id: application.missions.id,
          scheduled_at: scheduledAt,
          address,
          note: rdvNote || null,
          status: 'pending'
        })
        .select().single()

      if (apptError) throw apptError
      setAppointments(prev => [...prev, apptData])

      const receiverId = application.talents.user_id
      const rdvPayload = JSON.stringify({
        appointment_id: apptData.id,
        scheduled_at: scheduledAt,
        address,
        note: rdvNote || null
      })

      const { data: insertedMsg, error: msgError } = await supabase
        .from('messages')
        .insert({
          application_id: applicationId,
          mission_id: application.missions.id,
          sender_id: currentUserId,
          receiver_id: receiverId,
          topic: 'rdv_proposal',
          content: RDV_PROPOSAL_PREFIX + rdvPayload
        })
        .select().single()

      if (msgError) {
        console.error('Erreur insert message RDV:', msgError)
        setMessages(prev => [...prev, {
          id: `rdv-${Date.now()}`, application_id: applicationId,
          sender_id: currentUserId, receiver_id: receiverId,
          topic: 'rdv_proposal',
          content: RDV_PROPOSAL_PREFIX + rdvPayload,
          created_at: new Date().toISOString()
        }])
      } else {
        setMessages(prev => [...prev, insertedMsg])
      }

      setRdvDate(null); setRdvTime(null); setRdvNote('')

      // Notification in-app
      await supabase.from('notifications').insert({
        user_id: receiverId, type: 'rdv_proposed', title: 'Rendez-vous proposé',
        content: `${application.missions.establishments.name} vous propose un RDV le ${rdvDate.d} ${MONTHS[rdvDate.m]} à ${rdvTime}`,
        link: `/talent/chat/${applicationId}`
      })

      // SMS au talent
      const talentPhone = application.talents?.phone
      if (talentPhone) {
        const rdvDateLabel = `${rdvDate.d} ${MONTHS[rdvDate.m]}`
        supabase.functions.invoke('sms-rdv-proposed', {
          body: {
            talent_phone: talentPhone,
            talent_name: application.talents.first_name,
            establishment_name: application.missions.establishments.name,
            rdv_date: rdvDateLabel,
            rdv_time: rdvTime,
            app_link: `https://extrataff.fr/talent/chat/${applicationId}`
          }
        }).catch(err => console.error('Erreur SMS RDV:', err))
      }

      // Email au talent
      const talentEmail = application.talents?.email
      if (talentEmail) {
        const rdvDateLabel = `${rdvDate.d} ${MONTHS[rdvDate.m]}`
        supabase.functions.invoke('email-rdv-proposed', {
          body: {
            talent_email: talentEmail,
            talent_name: application.talents.first_name,
            establishment_name: application.missions.establishments.name,
            establishment_address: address,
            rdv_date: rdvDateLabel,
            rdv_time: rdvTime,
            note: rdvNote || null,
            app_link: `https://extrataff.fr/talent/chat/${applicationId}`
          }
        }).catch(err => console.error('Erreur email RDV:', err))
      }

    } catch (err) {
      console.error('Erreur proposition RDV:', err)
      alert('Erreur : ' + (err.message || 'impossible de proposer le RDV'))
    } finally {
      setSendingRdv(false)
    }
  }

  const handleRdvResponse = async (response, appointmentId) => {
    if (sendingRdv) return
    setSendingRdv(true)
    try {
      await supabase.from('appointments').update({ status: response }).eq('id', appointmentId)
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: response } : a))

      const receiverId = application.missions.establishments.user_id
      const talentName = `${application.talents.first_name} ${application.talents.last_name}`
      const responsePayload = JSON.stringify({ response, appointment_id: appointmentId })

      const { data: insertedMsg, error: msgError } = await supabase
        .from('messages')
        .insert({
          application_id: applicationId,
          mission_id: application.missions.id,
          sender_id: currentUserId,
          receiver_id: receiverId,
          topic: 'rdv_response',
          content: RDV_RESPONSE_PREFIX + responsePayload
        })
        .select().single()

      if (!msgError && insertedMsg) setMessages(prev => [...prev, insertedMsg])

      await supabase.from('notifications').insert({
        user_id: receiverId,
        type: response === 'confirmed' ? 'rdv_confirmed' : 'rdv_refused',
        title: response === 'confirmed' ? 'RDV confirmé ✅' : 'RDV refusé',
        content: response === 'confirmed'
          ? `${talentName} a confirmé votre rendez-vous`
          : `${talentName} a refusé le rendez-vous`,
        link: `/establishment/chat/${applicationId}`
      })
    } catch (err) {
      console.error('Erreur réponse RDV:', err)
      alert('Erreur lors de la réponse')
    } finally {
      setSendingRdv(false)
    }
  }

  const handleConfirmHire = async (decision = 'hired') => {
    if (confirming) return
    setConfirming(true)
    try {
      const newStatus = decision === 'hired' ? 'confirmed' : 'rejected'
      await supabase.from('applications').update({
        status: newStatus, hire_status: decision,
        confirmed_at: decision === 'hired' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }).eq('id', applicationId)

      setApplication(prev => ({ ...prev, status: newStatus, hire_status: decision }))

      if (latestAppointment && decision === 'hired') {
        await supabase.from('appointments').update({ status: 'done' }).eq('id', latestAppointment.id)
        setAppointments(prev => prev.map(a =>
          a.id === latestAppointment.id ? { ...a, status: 'done' } : a
        ))
      }

      const receiverId = application.talents.user_id
      const talentName = `${application.talents.first_name} ${application.talents.last_name}`
      const hirePayload = JSON.stringify({ decision, talent_name: talentName })

      const { data: insertedMsg, error: msgError } = await supabase
        .from('messages')
        .insert({
          application_id: applicationId,
          mission_id: application.missions.id,
          sender_id: currentUserId,
          receiver_id: receiverId,
          topic: 'hire_decision',
          content: HIRE_DECISION_PREFIX + hirePayload
        })
        .select().single()

      if (!msgError && insertedMsg) setMessages(prev => [...prev, insertedMsg])

      if (decision === 'hired') {
        await supabase.from('notifications').insert({
          user_id: receiverId, type: 'hire_confirmed', title: '🎉 Embauche confirmée !',
          content: `${application.missions.establishments.name} a validé votre embauche pour "${application.missions.position}"`,
          link: `/talent/chat/${applicationId}`
        })
        await supabase.from('notifications').insert({
          user_id: currentUserId, type: 'hire_confirmed', title: '🎉 Embauche confirmée !',
          content: `Vous avez confirmé ${talentName} pour "${application.missions.position}"`,
          link: `/establishment/chat/${applicationId}`
        })
      } else {
        await supabase.from('notifications').insert({
          user_id: receiverId, type: 'hire_rejected', title: 'Candidature non retenue',
          content: `${application.missions.establishments.name} n'a pas retenu votre candidature`,
          link: `/talent/chat/${applicationId}`
        })
      }
    } catch (err) {
      console.error('Erreur validation embauche:', err)
      alert('Erreur lors de la validation')
    } finally {
      setConfirming(false)
    }
  }

  const getCalDays = (m, y) => {
    const firstDay = new Date(y, m, 1).getDay()
    const first = firstDay === 0 ? 6 : firstDay - 1
    const total = new Date(y, m + 1, 0).getDate()
    const prevTotal = new Date(y, m, 0).getDate()
    const cells = []
    for (let i = 0; i < first; i++) cells.push({ d: prevTotal - first + 1 + i, other: true })
    for (let i = 1; i <= total; i++) cells.push({ d: i })
    while (cells.length % 7 !== 0) cells.push({ d: cells.length - first - total + 1, other: true })
    return cells
  }

  const isPastDay = (d, m, y) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return new Date(y, m, d) < today
  }

  const renderMessage = (message) => {
    const isMe = message.sender_id === currentUserId
    const content = message.content || ''

    // ── Carte RDV proposé ──
    if (content.startsWith(RDV_PROPOSAL_PREFIX)) {
      const data = JSON.parse(content.replace(RDV_PROPOSAL_PREFIX, ''))
      const date = new Date(data.scheduled_at)
      const dateLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      const timeLabel = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

      // Chaque carte cherche SON appointment par appointment_id
      const appt = getAppointmentById(data.appointment_id)
      const apptStatus = appt?.status || 'pending'

      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 max-w-sm w-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-amber-100 rounded-lg p-1.5">
                <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">Rendez-vous proposé</p>
                <p className="text-xs text-amber-600">
                  {apptStatus === 'pending' && 'En attente de réponse'}
                  {apptStatus === 'confirmed' && '✅ Confirmé'}
                  {apptStatus === 'refused' && 'Refusé'}
                  {apptStatus === 'done' && '✅ Effectué'}
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="capitalize">{dateLabel} · {timeLabel}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{data.address}</span>
              </div>
              {data.note && (
                <div className="bg-amber-100 rounded-lg p-2 text-xs text-amber-700 italic">{data.note}</div>
              )}
            </div>

            {userType === 'talent' && apptStatus === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => handleRdvResponse('confirmed', data.appointment_id)} disabled={sendingRdv}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-lg disabled:opacity-50">
                  {sendingRdv ? '...' : 'Confirmer'}
                </button>
                <button onClick={() => handleRdvResponse('refused', data.appointment_id)} disabled={sendingRdv}
                  className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm py-2 px-3 rounded-lg disabled:opacity-50">
                  Refuser
                </button>
              </div>
            )}
            {userType === 'establishment' && apptStatus === 'pending' && (
              <div className="flex items-center gap-2 bg-gray-100 text-gray-500 text-sm rounded-lg px-3 py-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                En attente de confirmation du talent
              </div>
            )}
            {(apptStatus === 'confirmed' || apptStatus === 'done') && (
              <div className="flex items-center gap-2 bg-green-100 text-green-700 text-sm rounded-lg px-3 py-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                RDV confirmé par {application?.talents?.first_name}
              </div>
            )}
            {apptStatus === 'refused' && (
              <div className="flex items-center gap-2 bg-red-100 text-red-700 text-sm rounded-lg px-3 py-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                RDV refusé
              </div>
            )}
            <p className="text-xs text-amber-500 mt-2">{formatDateTime(message.created_at)}</p>
          </div>
        </div>
      )
    }

    if (content.startsWith(RDV_RESPONSE_PREFIX)) return null

    if (content.startsWith(HIRE_DECISION_PREFIX)) {
      const data = JSON.parse(content.replace(HIRE_DECISION_PREFIX, ''))
      const isHired = data.decision === 'hired'
      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className={`border-2 rounded-xl p-4 max-w-sm w-full ${isHired ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-300'}`}>
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-1.5 ${isHired ? 'bg-purple-100' : 'bg-gray-200'}`}>
                {isHired ? (
                  <svg className="w-4 h-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-sm font-semibold ${isHired ? 'text-purple-800' : 'text-gray-700'}`}>
                  {isHired ? (userType === 'establishment' ? 'Embauche confirmée' : '🎉 Félicitations !') : 'Candidature non retenue'}
                </p>
                <p className={`text-xs ${isHired ? 'text-purple-600' : 'text-gray-500'}`}>
                  {isHired
                    ? (userType === 'establishment' ? `${data.talent_name} est embauché(e)` : 'Votre embauche a été confirmée')
                    : (userType === 'establishment' ? 'Vous n\'avez pas retenu ce candidat' : 'L\'établissement n\'a pas donné suite')}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{formatDateTime(message.created_at)}</p>
          </div>
        </div>
      )
    }

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
              {userType === 'talent' ? "L'établissement souhaite consulter votre CV" : "Vous avez demandé le CV du candidat"}
            </p>
            {userType === 'talent' && !cvShared && (
              <button onClick={handleShareCv} disabled={sending || !talentCvUrl}
                className="mt-2 w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2 px-4 rounded-lg disabled:opacity-50">
                {!talentCvUrl ? 'Aucun CV enregistré' : sending ? 'Envoi...' : '📄 Envoyer mon CV'}
              </button>
            )}
            {userType === 'talent' && !talentCvUrl && (
              <p className="text-xs text-amber-600 mt-1">
                <a href="/talent/edit-profile" className="underline">Ajoutez votre CV</a> dans votre profil
              </p>
            )}
            <p className="text-xs text-amber-500 mt-2">{formatDateTime(message.created_at)}</p>
          </div>
        </div>
      )
    }

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
              {userType === 'establishment' ? "Le candidat a partagé son CV" : "Vous avez partagé votre CV"}
            </p>
            {userType === 'establishment' && (
              <button onClick={() => handleDownloadCv(cvPath)} disabled={downloadingCv}
                className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg disabled:opacity-50">
                {downloadingCv ? 'Téléchargement...' : '📥 Télécharger le CV'}
              </button>
            )}
            <p className="text-xs text-green-500 mt-2">{formatDateTime(message.created_at)}</p>
          </div>
        </div>
      )
    }

    return (
      <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${isMe ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
          <p className="break-words">{content}</p>
          <p className={`text-xs mt-1 ${isMe ? 'text-primary-100' : 'text-gray-500'}`}>
            {formatDateTime(message.created_at)}
          </p>
        </div>
      </div>
    )
  }

  const renderRdvModal = () => {
    if (!showRdvModal) return null
    const cells = getCalDays(calMonth, calYear)
    const canSend = rdvDate && rdvTime && !sendingRdv
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Proposer un rendez-vous</h2>
          <p className="text-xs text-gray-500 mb-4">La date sera visible par le talent dans le chat</p>
          <p className="text-xs text-gray-500 mb-2 font-medium">Date</p>
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
                className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded text-lg">‹</button>
              <span className="text-sm font-medium text-gray-800">{MONTHS[calMonth]} {calYear}</span>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
                className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded text-lg">›</button>
            </div>
            <div className="grid grid-cols-7 gap-px p-2">
              {DAYS_SHORT.map(d => (
                <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
              ))}
              {cells.map((cell, idx) => {
                const past = !cell.other && isPastDay(cell.d, calMonth, calYear)
                const selected = !cell.other && rdvDate?.d === cell.d && rdvDate?.m === calMonth && rdvDate?.y === calYear
                return (
                  <button key={idx} disabled={cell.other || past}
                    onClick={() => { if (!cell.other && !past) { setRdvDate({ d: cell.d, m: calMonth, y: calYear }); setRdvTime(null) } }}
                    className={`text-center text-sm py-1.5 rounded-lg transition-colors
                      ${cell.other || past ? 'text-gray-300 cursor-default' : 'cursor-pointer'}
                      ${selected ? 'bg-primary-600 text-white' : (!cell.other && !past ? 'hover:bg-gray-100 text-gray-800' : '')}`}>
                    {cell.d}
                  </button>
                )
              })}
            </div>
          </div>
          {rdvDate && (
            <>
              <p className="text-xs text-gray-500 mb-2 font-medium">Heure du rendez-vous</p>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {TIME_SLOTS.map(slot => (
                  <button key={slot} onClick={() => setRdvTime(slot)}
                    className={`py-2 rounded-lg text-sm border transition-colors
                      ${rdvTime === slot ? 'bg-primary-50 border-primary-400 text-primary-700 font-medium' : 'border-gray-200 text-gray-700 hover:border-primary-300'}`}>
                    {slot}
                  </button>
                ))}
              </div>
            </>
          )}
          {rdvDate && rdvTime && (
            <>
              <p className="text-xs text-gray-500 mb-1 font-medium">Adresse (pré-remplie)</p>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 mb-4 bg-gray-50">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-gray-700">{application?.missions?.establishments?.address || 'Adresse non renseignée'}</span>
              </div>
              <p className="text-xs text-gray-500 mb-1 font-medium">Note pour le talent (optionnel)</p>
              <textarea rows={2} value={rdvNote} onChange={e => setRdvNote(e.target.value)}
                placeholder="Ex : sonnette B, demander Mme Martin..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 mb-4 resize-none focus:outline-none focus:border-primary-400" />
            </>
          )}
          <div className="flex gap-3">
            <button onClick={() => { setShowRdvModal(false); setRdvDate(null); setRdvTime(null); setRdvNote('') }}
              className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm">Annuler</button>
            <button onClick={handleProposeRdv} disabled={!canSend}
              className="flex-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-40 px-6">
              {sendingRdv ? 'Envoi...' : 'Envoyer le RDV'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderHireValidationCard = () => {
    if (userType !== 'establishment') return null
    if (!latestAppointment || latestAppointment.status !== 'confirmed') return null
    if (application?.hire_status) return null
    return (
      <div className="bg-purple-50 border-t-2 border-purple-200 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-semibold text-purple-800 mb-1">Suite au rendez-vous</p>
          <p className="text-xs text-purple-600 mb-3">
            Souhaitez-vous confirmer l'embauche de {application?.talents?.first_name} {application?.talents?.last_name} ?
          </p>
          <div className="flex gap-2">
            <button onClick={() => handleConfirmHire('hired')} disabled={confirming}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50">
              {confirming ? '...' : '🎉 Confirmer l\'embauche'}
            </button>
            <button onClick={() => handleConfirmHire('rejected')} disabled={confirming}
              className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm py-2 rounded-lg disabled:opacity-50">
              Ne pas retenir
            </button>
          </div>
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
          <button onClick={() => navigate(userType === 'talent' ? '/talent/dashboard' : '/establishment/dashboard')}
            className="btn-primary">Retour aux conversations</button>
        </div>
      </div>
    )
  }

  const otherPartyName = userType === 'talent'
    ? application.missions.establishments.name
    : `${application.talents.first_name} ${application.talents.last_name}`

  // Bouton + RDV visible si : pas de RDV en cours (pending) et pas encore embauché
  const hasActiveRdv = appointments.some(a => a.status === 'pending' || a.status === 'confirmed')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {renderRdvModal()}

      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate(userType === 'talent' ? '/talent/dashboard' : '/establishment/dashboard')}
              className="text-gray-600 hover:text-gray-900">← Retour</button>
            <div className="text-center">
              <h1 className="font-semibold text-gray-900">{otherPartyName}</h1>
              <p className="text-xs text-gray-500">{application.missions.position}</p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <div className="bg-green-50 border-b border-green-100">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span>Messagerie sécurisée</span>
              {application.hire_status === 'hired' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-200 text-green-800 ml-2">
                  ✅ Embauche confirmée
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {userType === 'establishment' && !cvRequested && !cvShared && (
                <button onClick={handleRequestCv} disabled={sending}
                  className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium py-1.5 px-3 rounded-full transition-colors disabled:opacity-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Demander CV
                </button>
              )}
              {userType === 'establishment' && cvRequested && !cvShared && (
                <span className="text-xs text-amber-600">CV demandé ⏳</span>
              )}
              {cvShared && <span className="text-xs text-green-600">CV reçu ✓</span>}

              {/* Bouton + RDV : visible si pas de RDV actif et pas encore embauché */}
              {userType === 'establishment' && !hasActiveRdv && !application.hire_status && (
                <button onClick={() => setShowRdvModal(true)}
                  className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-medium py-1.5 px-3 rounded-full transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  + RDV
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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

      {renderHireValidationCard()}

      <div className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSend} className="flex gap-2">
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..." className="flex-1 input" disabled={sending} />
            <button type="submit" disabled={!newMessage.trim() || sending} className="btn-primary px-6">
              {sending ? '...' : 'Envoyer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
