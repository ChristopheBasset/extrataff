import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES } from '../../lib/supabase'

export default function ApplicationsReceived({ establishmentId, onBack, onCountChange }) {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (establishmentId) loadApplications()
  }, [establishmentId])

  const loadApplications = async () => {
    setLoading(true)
    try {
      // Récupérer toutes les missions de l'établissement
      const { data: missions } = await supabase
        .from('missions')
        .select('id, position, start_date, end_date, shift_start_time, shift_end_time, hourly_rate')
        .eq('establishment_id', establishmentId)

      if (!missions || missions.length === 0) {
        setApplications([])
        setLoading(false)
        return
      }

      const missionIds = missions.map(m => m.id)

      // Récupérer les candidatures interested + accepted (ancien flux)
      const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .in('mission_id', missionIds)
        .in('status', ['interested', 'accepted'])
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!apps || apps.length === 0) {
        setApplications([])
        setLoading(false)
        return
      }

      // Récupérer les infos des talents
      const talentIds = [...new Set(apps.map(a => a.talent_id))]
      const { data: talents } = await supabase
        .from('talents')
        .select('id, user_id, first_name, last_name, phone, position_types, years_experience')
        .in('id', talentIds)

      // Enrichir les candidatures
      const enriched = apps.map(app => {
        const mission = missions.find(m => m.id === app.mission_id)
        const talent = talents?.find(t => t.id === app.talent_id)
        return { ...app, mission, talent }
      })

      setApplications(enriched)
      if (onCountChange) onCountChange(enriched.length)
    } catch (err) {
      console.error('Erreur chargement candidatures:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (applicationId) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) throw error

      // ✅ Envoyer une notification au talent
      const app = applications.find(a => a.id === applicationId)
      if (app?.talent?.user_id) {
        const posLabel = app.mission ? getPositionLabel(app.mission.position) : 'votre candidature'
        const estabName = app.establishment?.name || "L'établissement"
        await supabase.from('notifications').insert({
          user_id: app.talent.user_id,
          type: 'application_accepted',
          title: '✅ Candidature acceptée !',
          content: `${estabName} est intéressé par votre profil pour ${posLabel}`,
          link: '/talent/applications',
          read: false
        })
      }

      // Ouvrir le chat automatiquement
      navigate(`/establishment/chat/${applicationId}`)
    } catch (err) {
      console.error('Erreur acceptation:', err)
      alert('Erreur lors de l\'acceptation')
    }
  }

  const handleRefuse = async (applicationId) => {
    if (!confirm('Refuser ce candidat ? Il disparaîtra de votre liste.')) return

    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: 'refused',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) throw error
      loadApplications()
    } catch (err) {
      console.error('Erreur refus:', err)
      alert('Erreur lors du refus')
    }
  }

  const handleDecline = async (applicationId) => {
    if (!confirm('Décliner ce candidat ? La conversation sera supprimée et il disparaîtra de votre liste. Le candidat pourra repostuler sur une future mission.')) return

    try {
      // 1. Supprimer les messages du chat liés à cette candidature
      const { error: msgErr } = await supabase
        .from('messages')
        .delete()
        .eq('application_id', applicationId)

      if (msgErr) console.warn('Erreur suppression messages:', msgErr)

      // 2. Supprimer la candidature
      const { error: appErr } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId)

      if (appErr) throw appErr

      // 3. Notifier le talent
      const app = applications.find(a => a.id === applicationId)
      if (app?.talent?.user_id) {
        const posLabel = app.mission ? getPositionLabel(app.mission.position) : 'la mission'
        await supabase.from('notifications').insert({
          user_id: app.talent.user_id,
          type: 'application_declined',
          title: '😔 Candidature déclinée',
          content: `L'établissement a finalement décliné votre candidature pour ${posLabel}. N'hésitez pas à postuler sur d'autres missions !`,
          link: '/talent/missions',
          read: false
        })
      }

      loadApplications()
    } catch (err) {
      console.error('Erreur déclinaison:', err)
      alert('Erreur lors de la déclinaison')
    }
  }

  const handleOpenChat = (applicationId) => {
    navigate(`/establishment/chat/${applicationId}`)
  }

  // Helpers
  const getPositionLabel = (value) => {
    const found = POSITION_TYPES?.find(p => p.value === value)
    return found ? found.label : value || '—'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    return timeStr.substring(0, 5)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement des candidatures...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Retour
        </button>
        <h2 className="text-3xl font-bold text-gray-900">Mes Candidats</h2>
        <button
          onClick={loadApplications}
          className="ml-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
        >
          🔄
        </button>
      </div>

      {/* Liste vide */}
      {applications.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun candidat pour le moment</h3>
          <p className="text-gray-600">Les talents intéressés par vos missions apparaîtront ici.</p>
        </div>
      )}

      {/* Liste des candidatures */}
      <div className="space-y-4">
        {applications.map(app => (
          <div
            key={app.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Info talent */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-lg">
                      {app.talent?.first_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {app.talent?.first_name || '—'} {app.talent?.last_name || ''}
                    </h3>
                    {app.talent?.phone && (
                      <p className="text-sm text-gray-500">📞 {app.talent.phone}</p>
                    )}
                  </div>
                  {/* Badge expérience */}
                  {app.talent?.years_experience > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      ⭐ {app.talent.years_experience} an{app.talent.years_experience > 1 ? 's' : ''} d'exp.
                    </span>
                  )}
                  {/* Badge status */}
                  {app.status === 'accepted' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      💬 En conversation
                    </span>
                  )}
                </div>

                {/* Compétences du talent */}
                {app.talent?.position_types && app.talent.position_types.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {app.talent.position_types.map(pos => (
                      <span
                        key={pos}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {getPositionLabel(pos)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Mission concernée */}
                {app.mission && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium text-gray-900">
                      Mission : {getPositionLabel(app.mission.position)}
                    </p>
                    <p className="text-gray-600">
                      📅 {formatDate(app.mission.start_date)}
                      {app.mission.end_date && ` → ${formatDate(app.mission.end_date)}`}
                      {app.mission.shift_start_time && ` • 🕐 ${formatTime(app.mission.shift_start_time)}`}
                      {app.mission.shift_end_time && ` - ${formatTime(app.mission.shift_end_time)}`}
                    </p>
                    {app.mission.hourly_rate && (
                      <p className="text-gray-600">💰 {parseFloat(app.mission.hourly_rate).toFixed(2)} €/h</p>
                    )}
                  </div>
                )}

                {/* Date de candidature */}
                <p className="text-xs text-gray-400 mt-2">
                  Candidature reçue le {new Date(app.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col gap-2">
                {app.status === 'interested' && (
                  <>
                    <button
                      onClick={() => handleAccept(app.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      ✅ Accepter
                    </button>
                    <button
                      onClick={() => handleRefuse(app.id)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      ❌ Refuser
                    </button>
                  </>
                )}
                {app.status === 'accepted' && (
                  <>
                    <button
                      onClick={() => handleOpenChat(app.id)}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      💬 Ouvrir conversation
                    </button>
                    <button
                      onClick={() => handleDecline(app.id)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      ❌ Décliner
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
