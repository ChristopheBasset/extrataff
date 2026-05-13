import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, formatDateTime } from '../../lib/supabase'

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

  const [appointments, setAppointments] = useState([])
  const [showRdvModal, setShowRdvModal] = useState(false)
  const [rdvDate, setRdvDate] = useState(null)
  const [rdvTime, setRdvTime] = useState(null)
  const [rdvNote, setRdvNote] = useState('')
  const [sendingRdv, setSendingRdv] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())

  const messagesEndRef = useRef(null)

  const latestAppointment = appointments.length > 0 ? appointments[appointments.length - 1] : null
  const getAppointmentById = (id) => appointments.find(a => a.id === id) || null

  // === Fermeture auto du chat au début de la mission ===
  const isChatClosed = useMemo(() => {
    if (!application?.missions) return false
    if (application.hire_status !== 'hired') return false // chat ouvert tant que pas d'embauche

    const { start_date, shift_start_time } = application.missions
    if (!start_date) return false

    const startStr = shift_start_time
      ? `${start_date}T${shift_start_time}`
      : `${start_date}T00:00:00`
    const startTs = new Date(startStr).getTime()
    return Date.now() >= startTs
  }, [application])

  useEffect(() => {
    loadChat()
    const channel = supabase
      .channel(`chat:${applicationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `application_id=eq.${applicationId}`
      }, (payload) => {
        if (payload.new.sender_id !== currentUserId) {
          setMessages(prev => [...prev, payload.new])
          const c = payload.new.content || ''
          if (c.startsWith(CV_REQUEST_PREFIX)) setCvRequested(true)
          if (c.startsWith(CV_SHARED_PREFIX)) setCvShared(true)
          if (c.startsWith(RDV_RESPONSE_PREFIX)) {
            const data = JSON.parse(c.replace(RDV_RESPONSE_PREFIX, ''))
            setAppointments(prev => prev.map(a => a.id === data.appointment_id ? { ...a, status: data.response } : a))
          }
          if (c.startsWith(RDV_PROPOSAL_PREFIX)) loadAppointments()
          scrollToBottom()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [applicationId, currentUserId])

  useEffect(() => { scrollToBottom() }, [messages])

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }

  const checkCvStatus = (msgs) => {
    msgs.forEach(msg => {
      const c = msg.content || ''
      if (c.startsWith(CV_REQUEST_PREFIX)) setCvRequested(true)
      if (c.startsWith(CV_SHARED_PREFIX)) setCvShared(true)
    })
  }

  const loadAppointments = async () => {
    const { data } = await supabase
      .from('appointments').select('*')
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
            id, position, start_date, shift_start_time, shift_end_time,
            establishments ( name, user_id, address )
          ),
          talents!talent_id ( first_name, last_name, user_id, cv_url, phone, email )
        `)
        .eq('id', applicationId).single()
      if (appError) throw appError
      setApplication(appData)
      setTalentCvUrl(appData.talents?.cv_url || null)

      const { data: messagesData, error: messagesError } = await supabase
        .from('messages').select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true })
      if (messagesError) throw messagesError
      const msgs = messagesData || []
      setMessages(msgs)
      checkCvStatus(msgs)

      const { data: apptData } = await supabase
        .from('appointments').select('*')
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
    if (!newMessage.trim() || sending || isChatClosed) return
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
          application_id: applicationId, mission_id: application.missions.id,
          sender_id: currentUserId, receiver_id: receiverId,
          topic: 'text', content: messageText
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
          application_id: applicationId, mission_id: application.missions.id,
          scheduled_at: scheduledAt, address, note: rdvNote || null, status: 'pending'
        })
        .select().single()
      if (apptError) throw apptError
      setAppointments(prev => [...prev, apptData])

      const receiverId = application.talents.user_id
      const rdvPayload = JSON.stringify({
        appointment_id: apptData.id, scheduled_at: scheduledAt,
        address, note: rdvNote || null
      })

      const { data: insertedMsg, error: msgError } = await supabase
        .from('messages')
        .insert({
          application_id: applicationId, mission_id: application.missions.id,
          sender_id: currentUserId, receiver_id: receiverId,
          topic: 'rdv_proposal', content: RDV_PROPOSAL_PREFIX + rdvPayload
        })
        .select().single()

      if (msgError) {
        setMessages(prev => [...prev, {
          id: `rdv-${Date.now()}`, application_id: applicationId,
          sender_id: currentUserId, receiver_id: receiverId,
          topic: 'rdv_proposal', content: RDV_PROPOSAL_PREFIX + rdvPayload,
          created_at: new Date().toISOString()
        }])
      } else {
        setMessages(prev => [...prev, insertedMsg])
      }
      setRdvDate(null); setRdvTime(null); setRdvNote('')

      await supabase.from('notifications').insert({
        user_id: receiverId, type: 'rdv_proposed', title: 'Rendez-vous proposé',
        content: `${application.missions.establishments.name} vous propose un RDV le ${rdvDate.d} ${MONTHS[rdvDate.m]} à ${rdvTime}`,
        link: `/talent/chat/${applicationId}`
      })

      const talentPhone = application.talents?.phone
      if (talentPhone) {
        const rdvDateLabel = `${rdvDate.d} ${MONTHS[rdvDate.m]}`
        supabase.functions.invoke('sms-rdv-proposed', {
          body: {
            talent_phone: talentPhone, talent_name: application.talents.first_name,
            establishment_name: application.missions.establishments.name,
            rdv_date: rdvDateLabel, rdv_time: rdvTime,
            app_link: `https://extrataff.fr/talent/chat/${applicationId}`
          }
        }).catch(err => console.error('Erreur SMS RDV:', err))
      }

      const talentEmail = application.talents?.email
      if (talentEmail) {
        const rdvDateLabel = `${rdvDate.d} ${MONTHS[rdvDate.m]}`
        supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'rdv_proposed', to: talentEmail,
            data: {
              talent_name: application.talents.first_name,
              establishment_name: application.missions.establishments.name,
              address, rdv_date: rdvDateLabel, rdv_time: rdvTime,
              note: rdvNote || null, application_id: applicationId
            }
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
          application_id: applicationId, mission_id: application.missions.id,
          sender_id: currentUserId, receiver_id: receiverId,
          topic: 'rdv_response', content: RDV_RESPONSE_PREFIX + responsePayload
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

      const appt = appointments.find(a => a.id === appointmentId)
      const { data: estabEmail } = await supabase.rpc('get_establishment_email', { estab_user_id: receiverId })
      if (estabEmail && appt) {
        const rdvDate = new Date(appt.scheduled_at)
        const rdvDateLabel = rdvDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        const rdvTimeLabel = rdvDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'rdv_response', to: estabEmail,
            data: {
              talent_name: talentName, position: application.missions.position,
              rdv_date: rdvDateLabel, rdv_time: rdvTimeLabel,
              response, application_id: applicationId
            }
          }
        }).catch(err => console.error('Erreur email réponse RDV:', err))
      }
    } catch (err) {
      console.error('Erreur réponse RDV:', err)
      alert('Erreur lors de la réponse')
    } finally {
      setSendingRdv(false)
    }
  }

  // === HANDLE CONFIRM HIRE (modifié) ===
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

      // === NOUVEAU : si embauche → fermer la mission ===
      if (decision === 'hired' && application?.missions?.id) {
        await supabase.from('missions').update({
          status: 'filled',
          updated_at: new Date().toISOString()
        }).eq('id', application.missions.id)
      }

      if (latestAppointment && decision === 'hired') {
        await supabase.from('appointments').update({ status: 'done' }).eq('id', latestAppointment.id)
        setAppointments(prev => prev.map(a => a.id === latestAppointment.id ? { ...a, status: 'done' } : a))
      }

      const receiverId = application.talents.user_id
      const talentName = `${application.talents.first_name} ${application.talents.last_name}`
      const hirePayload = JSON.stringify({ decision, talent_name: talentName })

      const { data: insertedMsg, error: msgError } = await supabase
        .from('messages')
        .insert({
          application_id: applicationId, mission_id: application.missions.id,
          sender_id: currentUserId, receiver_id: receiverId,
          topic: 'hire_decision', content: HIRE_DECISION_PREFIX + hirePayload
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

        const talentEmail = application.talents?.email
        if (talentEmail) {
          supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'hire_confirmed', to: talentEmail,
              data: {
                talent_name: application.talents.first_name,
                establishment_name: application.missions.establishments.name,
                position: application.missions.position, application_id: applicationId
              }
            }
          }).catch(err => console.error('Erreur email embauche:', err))
        }
      } else {
        // === SUPPRIMÉ : pas d'email "non retenu" (silence radio) ===
        // On garde juste la notification in-app discrète pour le talent
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
    for (let i = 1; i <= total; i++) cells.push({ d: i, other: false })
    while (cells.length % 7 !== 0) cells.push({ d: cells.length - first - total + 1, other: true })
    return cells
  }

  const isPastDay = (d, m, y) => {
    const day = new Date(y, m, d)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return day < today
  }

  // ─── RENDER MESSAGE ───
  const renderMessage = (message) => {
    const isMe = message.sender_id === currentUserId
    const content = message.content || ''

    if (content.startsWith(RDV_PROPOSAL_PREFIX)) {
      const data = JSON.parse(content.replace(RDV_PROPOSAL_PREFIX, ''))
      const date = new Date(data.scheduled_at)
      const dateLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      const timeLabel = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      const appt = getAppointmentById(data.appointment_id)
      const apptStatus = appt?.status || 'pending'

      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className="rounded-2xl p-4 max-w-sm w-full border-2"
               style={{ background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', borderColor: '#FCD34D' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg shadow-sm">📅</div>
              <div>
                <p className="text-sm font-bold text-amber-900">Rendez-vous proposé</p>
                <p className="text-xs text-amber-700 font-medium">
                  {apptStatus === 'pending' && 'En attente de réponse'}
                  {apptStatus === 'confirmed' && '✅ Confirmé'}
                  {apptStatus === 'refused' && '❌ Refusé'}
                  {apptStatus === 'done' && '✅ Effectué'}
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm text-amber-900 font-semibold capitalize">
                <span>🗓️</span><span>{dateLabel} · {timeLabel}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-amber-800">
                <span>📍</span><span className="font-medium">{data.address}</span>
              </div>
              {data.note && (
                <div className="bg-white/70 rounded-xl p-2.5 text-xs text-amber-800 italic font-medium">{data.note}</div>
              )}
            </div>

            {userType === 'talent' && apptStatus === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => handleRdvResponse('confirmed', data.appointment_id)} disabled={sendingRdv}
                  className="flex-1 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                  {sendingRdv ? '...' : '✅ Confirmer'}
                </button>
                <button onClick={() => handleRdvResponse('refused', data.appointment_id)} disabled={sendingRdv}
                  className="flex-1 bg-white border-2 border-amber-200 text-amber-800 hover:bg-amber-50 text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 transition-all">
                  Refuser
                </button>
              </div>
            )}
            {userType === 'establishment' && apptStatus === 'pending' && (
              <div className="bg-white/70 text-amber-800 text-xs font-semibold rounded-xl px-3 py-2 text-center">
                ⏳ En attente de confirmation
              </div>
            )}
            {(apptStatus === 'confirmed' || apptStatus === 'done') && (
              <div className="bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl px-3 py-2 text-center">
                ✅ RDV confirmé par {application?.talents?.first_name}
              </div>
            )}
            {apptStatus === 'refused' && (
              <div className="bg-red-100 text-red-700 text-xs font-bold rounded-xl px-3 py-2 text-center">
                ❌ RDV refusé
              </div>
            )}
            <p className="text-[10px] text-amber-600/70 mt-2 font-medium">{formatDateTime(message.created_at)}</p>
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
          <div className="rounded-2xl p-4 max-w-sm w-full border-2"
               style={isHired
                 ? { background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', borderColor: '#6EE7B7' }
                 : { background: 'linear-gradient(135deg, #F8FAFF, #F1F5F9)', borderColor: '#CBD5E1' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm">
                {isHired ? '🎉' : '😔'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${isHired ? 'text-emerald-800' : 'text-slate-700'}`}>
                  {isHired ? (userType === 'establishment' ? 'Embauche confirmée' : '🎉 Félicitations !') : 'Candidature non retenue'}
                </p>
                <p className={`text-xs font-medium mt-0.5 ${isHired ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {isHired
                    ? (userType === 'establishment' ? `${data.talent_name} est embauché(e)` : 'Votre embauche a été confirmée')
                    : (userType === 'establishment' ? 'Vous n\'avez pas retenu ce candidat' : 'L\'établissement n\'a pas donné suite')}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">{formatDateTime(message.created_at)}</p>
          </div>
        </div>
      )
    }

    if (content.startsWith(CV_REQUEST_PREFIX)) {
      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className="rounded-2xl p-4 max-w-sm w-full border-2"
               style={{ background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', borderColor: '#FCD34D' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg">📄</div>
              <div>
                <p className="text-sm font-bold text-amber-900">Demande de CV</p>
                <p className="text-xs text-amber-700 font-medium">
                  {userType === 'talent' ? "L'établissement souhaite consulter votre CV" : "CV demandé"}
                </p>
              </div>
            </div>
            {userType === 'talent' && !cvShared && (
              <button onClick={handleShareCv} disabled={sending || !talentCvUrl}
                className="mt-2 w-full text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
                {!talentCvUrl ? 'Aucun CV enregistré' : sending ? 'Envoi...' : '📄 Envoyer mon CV'}
              </button>
            )}
            {userType === 'talent' && !talentCvUrl && (
              <p className="text-xs text-amber-700 mt-2 font-medium">
                <a href="/talent/dashboard" className="underline">Ajoutez votre CV</a> dans votre profil
              </p>
            )}
            <p className="text-[10px] text-amber-600/70 mt-2 font-medium">{formatDateTime(message.created_at)}</p>
          </div>
        </div>
      )
    }

    if (content.startsWith(CV_SHARED_PREFIX)) {
      const cvPath = content.replace(CV_SHARED_PREFIX, '')
      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className="rounded-2xl p-4 max-w-sm w-full border-2"
               style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', borderColor: '#6EE7B7' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg">✅</div>
              <div>
                <p className="text-sm font-bold text-emerald-800">CV partagé</p>
                <p className="text-xs text-emerald-600 font-medium">
                  {userType === 'establishment' ? "Le candidat a partagé son CV" : "Vous avez partagé votre CV"}
                </p>
              </div>
            </div>
            {userType === 'establishment' && (
              <button onClick={() => handleDownloadCv(cvPath)} disabled={downloadingCv}
                className="mt-2 w-full text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                {downloadingCv ? 'Téléchargement...' : '📥 Télécharger le CV'}
              </button>
            )}
            <p className="text-[10px] text-emerald-600/70 mt-2 font-medium">{formatDateTime(message.created_at)}</p>
          </div>
        </div>
      )
    }

    return (
      <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl ${isMe ? 'text-white' : 'bg-white border border-blue-100 text-slate-900'}`}
          style={isMe
            ? { background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)', boxShadow: '0 4px 12px rgba(29, 78, 216, 0.20)' }
            : { boxShadow: '0 2px 6px rgba(10, 37, 64, 0.05)' }}
        >
          <p className="break-words text-[15px] font-medium leading-snug">{content}</p>
          <p className={`text-[10px] mt-1 ${isMe ? 'text-white/80' : 'text-slate-400'} font-medium`}>
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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(10, 37, 64, 0.4)', backdropFilter: 'blur(8px)' }}>
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
          <h2 className="text-xl font-extrabold text-slate-900 mb-1" style={{ letterSpacing: '-0.025em' }}>Proposer un rendez-vous</h2>
          <p className="text-xs text-slate-500 font-medium mb-4">La date sera visible par le talent dans le chat</p>
          <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Date</p>
          <div className="border-2 border-slate-200 rounded-2xl overflow-hidden mb-4 bg-slate-50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
                className="text-slate-400 hover:text-blue-700 px-2 py-1 rounded text-lg font-bold">‹</button>
              <span className="text-sm font-bold text-slate-800 capitalize">{MONTHS[calMonth]} {calYear}</span>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
                className="text-slate-400 hover:text-blue-700 px-2 py-1 rounded text-lg font-bold">›</button>
            </div>
            <div className="grid grid-cols-7 gap-px p-2">
              {DAYS_SHORT.map(d => (<div key={d} className="text-center text-xs text-slate-500 font-bold py-1">{d}</div>))}
              {cells.map((cell, idx) => {
                const past = !cell.other && isPastDay(cell.d, calMonth, calYear)
                const selected = !cell.other && rdvDate?.d === cell.d && rdvDate?.m === calMonth && rdvDate?.y === calYear
                return (
                  <button key={idx} disabled={cell.other || past}
                    onClick={() => { if (!cell.other && !past) { setRdvDate({ d: cell.d, m: calMonth, y: calYear }); setRdvTime(null) } }}
                    className={`text-center text-sm py-1.5 rounded-lg transition-all font-semibold
                      ${cell.other || past ? 'text-slate-300 cursor-default' : 'cursor-pointer'}
                      ${selected ? 'text-white shadow-md' : (!cell.other && !past ? 'hover:bg-blue-50 text-slate-800' : '')}`}
                    style={selected ? { background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' } : {}}>
                    {cell.d}
                  </button>
                )
              })}
            </div>
          </div>
          {rdvDate && (
            <>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Heure</p>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {TIME_SLOTS.map(slot => (
                  <button key={slot} onClick={() => setRdvTime(slot)}
                    className={`py-2 rounded-xl text-sm border-2 transition-all font-bold
                      ${rdvTime === slot ? 'text-white border-transparent shadow-md' : 'border-slate-200 text-slate-700 hover:border-blue-300'}`}
                    style={rdvTime === slot ? { background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' } : {}}>
                    {slot}
                  </button>
                ))}
              </div>
            </>
          )}
          {rdvDate && rdvTime && (
            <>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Adresse (pré-remplie)</p>
              <div className="flex items-center gap-2 border-2 border-slate-200 rounded-xl px-3 py-2.5 mb-4 bg-slate-50">
                <span>📍</span>
                <span className="text-sm text-slate-700 font-medium truncate">{application?.missions?.establishments?.address || 'Adresse non renseignée'}</span>
              </div>
              <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Note (optionnel)</p>
              <textarea rows={2} value={rdvNote} onChange={e => setRdvNote(e.target.value)}
                placeholder="Ex : sonnette B, demander Mme Martin..."
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 mb-4 resize-none focus:outline-none focus:border-blue-500 transition-all" />
            </>
          )}
          <div className="flex gap-3">
            <button onClick={() => { setShowRdvModal(false); setRdvDate(null); setRdvTime(null); setRdvNote('') }}
              className="flex-1 py-3 border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">Annuler</button>
            <button onClick={handleProposeRdv} disabled={!canSend}
              className="flex-1 py-3 text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #1E40AF)', boxShadow: '0 8px 24px rgba(29, 78, 216, 0.25)' }}>
              {sendingRdv ? 'Envoi...' : '📅 Envoyer le RDV'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Bandeau "Je l'embauche" toujours visible côté établissement ───
  const renderHireBanner = () => {
    if (userType !== 'establishment') return null
    if (application?.hire_status) return null // déjà décidé
    return (
      <div className="px-4 py-3 border-b border-purple-100"
           style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
            <span className="text-base">💜</span> Avez-vous embauché {application?.talents?.first_name} ?
          </p>
          <div className="flex gap-2">
            <button onClick={() => handleConfirmHire('hired')} disabled={confirming}
              className="flex-1 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 transition-all hover:-translate-y-0.5 inline-flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
              {confirming ? '...' : <>✅ Je l'embauche</>}
            </button>
            <button onClick={() => handleConfirmHire('rejected')} disabled={confirming}
              className="flex-1 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 transition-all">
              Non retenu
            </button>
          </div>
        </div>
      </div>
    )
  }

  const sharedStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
      .chat-v8 { font-family: 'Montserrat', system-ui, sans-serif; letter-spacing: -0.005em; }
      .chat-v8 * { font-family: 'Montserrat', system-ui, sans-serif; }
      .chat-input { transition: all 0.2s ease; }
      .chat-input:focus { border-color: #1D4ED8; box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.12); outline: none; }
    `}</style>
  )

  if (loading) {
    return (
      <>
        {sharedStyles}
        <div className="chat-v8 min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)', boxShadow: '0 12px 32px rgba(29, 78, 216, 0.35)' }}>
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
            <p className="text-slate-600 font-semibold">Chargement…</p>
          </div>
        </div>
      </>
    )
  }

  if (!application) {
    return (
      <>
        {sharedStyles}
        <div className="chat-v8 min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 mb-4 font-bold">Conversation introuvable</p>
            <button onClick={() => navigate(userType === 'talent' ? '/talent/dashboard' : '/establishment/dashboard')}
              className="px-6 py-3 rounded-xl text-white font-bold"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #1E40AF)' }}>
              Retour
            </button>
          </div>
        </div>
      </>
    )
  }

  const otherPartyName = userType === 'talent'
    ? application.missions.establishments.name
    : `${application.talents.first_name} ${application.talents.last_name}`
  const hasActiveRdv = appointments.some(a => a.status === 'pending' || a.status === 'confirmed')

  return (
    <>
      {sharedStyles}
      <div className="chat-v8 min-h-screen flex flex-col" style={{ background: '#F8FAFF' }}>
        {renderRdvModal()}

        {/* HEADER */}
        <header className="bg-white/95 backdrop-blur-xl border-b border-blue-100 sticky top-0 z-30">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <button onClick={() => navigate(userType === 'talent' ? '/talent/dashboard' : '/establishment/dashboard')}
              className="text-blue-700 hover:text-blue-800 font-bold inline-flex items-center gap-1.5 text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              Retour
            </button>
            <div className="text-center min-w-0 flex-1 px-4">
              <h1 className="font-extrabold text-slate-900 text-sm truncate" style={{ letterSpacing: '-0.015em' }}>{otherPartyName}</h1>
              <p className="text-[11px] text-slate-500 font-medium truncate">{application.missions.position}</p>
            </div>
            <div className="w-12"></div>
          </div>
        </header>

        {/* Bandeau secondaire */}
        <div className="bg-white border-b border-blue-50">
          <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-blue-700 text-xs font-bold">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Messagerie sécurisée</span>
              {application.hire_status === 'hired' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ml-1 text-white"
                      style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  ✅ Embauche confirmée
                </span>
              )}
              {isChatClosed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ml-1 bg-slate-200 text-slate-700">
                  🔒 Chat fermé
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {userType === 'establishment' && !cvRequested && !cvShared && !application.hire_status && (
                <button onClick={handleRequestCv} disabled={sending}
                  className="inline-flex items-center gap-1 text-amber-800 text-[11px] font-bold py-1.5 px-3 rounded-full transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', border: '1px solid #FCD34D' }}>
                  📄 Demander CV
                </button>
              )}
              {userType === 'establishment' && cvRequested && !cvShared && (
                <span className="text-[11px] text-amber-700 font-bold">CV demandé ⏳</span>
              )}
              {cvShared && <span className="text-[11px] text-emerald-600 font-bold">CV reçu ✓</span>}

              {userType === 'establishment' && !hasActiveRdv && !application.hire_status && (
                <button onClick={() => setShowRdvModal(true)}
                  className="inline-flex items-center gap-1 text-blue-800 text-[11px] font-bold py-1.5 px-3 rounded-full transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)', border: '1px solid #93C5FD' }}>
                  📅 + RDV
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bandeau "Je l'embauche" */}
        {renderHireBanner()}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl"
                     style={{ background: 'linear-gradient(135deg, #DBEAFE, #BAE6FD)' }}>💬</div>
                <p className="text-slate-500 font-bold">Aucun message pour l'instant</p>
                <p className="text-sm text-slate-400 mt-2 font-medium">Envoyez le premier message !</p>
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
        <div className="bg-white border-t border-blue-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
            {isChatClosed ? (
              <div className="text-center py-3 rounded-xl"
                   style={{ background: 'linear-gradient(135deg, #F1F5F9, #F8FAFF)', border: '2px solid #E2E8F0' }}>
                <p className="text-sm font-bold text-slate-700">🔒 Le chat est fermé</p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  La mission a commencé. Communiquez via le planning si besoin.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez votre message…"
                  className="chat-input flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] font-medium text-slate-900 bg-white"
                  disabled={sending}
                />
                <button type="submit" disabled={!newMessage.trim() || sending}
                  className="px-6 text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #1D4ED8, #1E40AF)', boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)' }}>
                  {sending ? '...' : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
