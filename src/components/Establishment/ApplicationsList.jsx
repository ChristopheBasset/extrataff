import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, formatDateTime, notifyApplicationAccepted, notifyApplicationRejected } from '../../lib/supabase'

export default function ApplicationsList() {
  const navigate = useNavigate()
  const { missionId } = useParams()
  const [mission, setMission] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [establishmentName, setEstablishmentName] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)

  useEffect(() => {
    loadApplications()
  }, [missionId])

  const loadApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Récupérer l'établissement de l'utilisateur connecté
      const { data: establishment, error: estError } = await supabase
        .from('establishments')
        .select('id, name')
        .eq('user_id', user.id)
        .single()

      if (estError) throw estError
      if (!establishment) throw new Error('Établissement non trouvé')
      
      setEstablishmentName(establishment.name)

      // CAS 1 : missionId spécifié → charger candidatures de cette mission uniquement
      if (missionId) {
        const { data: missionData, error: missionError } = await supabase
          .from('missions')
          .select(`
            *,
            establishments (
              name,
              user_id
            )
          `)
          .eq('id', missionId)
          .single()

        if (missionError) throw missionError
        setMission(missionData)

        const { data: applicationsData, error: applicationsError } = await supabase
          .from('applications')
          .select(`
            *,
            talents!talent_id (
              id,
              user_id,
              first_name,
              last_name,
              phone,
              position_types,
              years_experience,
              min_hourly_rate,
              bio,
              avatar_initials,
              total_missions_completed,
              average_rating
            )
          `)
          .eq('mission_id', missionId)
          .order('match_score', { ascending: false })

        if (applicationsError) throw applicationsError
        setApplications(applicationsData)

      } else {
        // CAS 2 : Pas de missionId → charger TOUTES les candidatures de l'établissement
        const { data: missions } = await supabase
          .from('missions')
          .select('id')
          .eq('establishment_id', establishment.id)

        if (missions && missions.length > 0) {
          const missionIds = missions.map(m => m.id)
          
          const { data: applicationsData, error: applicationsError } = await supabase
            .from('applications')
            .select(`
              *,
              talents!talent_id (
                id,
                user_id,
                first_name,
                last_name,
                phone,
                position_types,
                years_experience,
                min_hourly_rate,
                bio,
                avatar_initials,
                total_missions_completed,
                average_rating
              ),
              missions!mission_id (
                id,
                position,
                location_fuzzy,
                start_date,
                establishments (
                  name,
                  user_id
                )
              )
            `)
            .in('mission_id', missionIds)
            .order('created_at', { ascending: false })

          if (applicationsError) throw applicationsError
          setApplications(applicationsData)
        } else {
          setApplications([])
        }
      }
    } catch (err) {
      console.error('Erreur chargement candidatures:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (applicationId) => {
    if (!confirm('Êtes-vous sûr de vouloir accepter cette candidature ?')) return

    try {
      const application = applications.find(a => a.id === applicationId)
      if (!application) return

      const { error } = await supabase
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId)

      if (error) throw error

      // Notification pour le talent
      const missionName = mission ? mission.establishments.name : application.missions?.establishments?.name
      const positionName = mission ? mission.position : application.missions?.position

      await notifyApplicationAccepted(
        application.talents.user_id,
        missionName || establishmentName,
        positionName || 'poste',
        applicationId
      )

      alert('Candidature acceptée ! Le talent sera notifié.')
      loadApplications()
    } catch (err) {
      console.error('Erreur acceptation:', err)
      alert('Erreur lors de l\'acceptation de la candidature')
    }
  }

  const handleReject = async (applicationId) => {
    if (!confirm('Êtes-vous sûr de vouloir refuser cette candidature ?')) return

    try {
      const application = applications.find(a => a.id === applicationId)
      if (!application) return

      const { error } = await supabase
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId)

      if (error) throw error

      const missionName = mission ? mission.establishments.name : application.missions?.establishments?.name
      const positionName = mission ? mission.position : application.missions?.position

      await notifyApplicationRejected(
        application.talents.user_id,
        missionName || establishmentName,
        positionName || 'poste'
      )

      alert('Candidature refusée.')
      loadApplications()
    } catch (err) {
      console.error('Erreur refus:', err)
      alert('Erreur lors du refus de la candidature')
    }
  }

  const handleConfirmHire = async (applicationId) => {
    setConfirmingId(applicationId)
    try {
      const application = applications.find(a => a.id === applicationId)
      if (!application) return

      // Mettre à jour establishment_confirmed
      const updateData = { 
        establishment_confirmed: true
      }
      
      // Si le talent a déjà confirmé, on passe en status 'confirmed'
      if (application.talent_confirmed) {
        updateData.status = 'confirmed'
        updateData.confirmed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', applicationId)

      if (error) throw error

      // Message de succès adapté
      if (application.talent_confirmed) {
        alert('🎉 Embauche confirmée des deux côtés ! La mission est validée.')
      } else {
        alert('✅ Vous avez confirmé l\'embauche. En attente de l\'acceptation du talent.')
      }

      loadApplications()
    } catch (err) {
      console.error('Erreur confirmation:', err)
      alert('Erreur lors de la confirmation')
    } finally {
      setConfirmingId(null)
    }
  }

  const getStatusBadge = (application) => {
    const { status, talent_confirmed, establishment_confirmed } = application
    
    // Cas spécial : accepté mais en attente de confirmations
    if (status === 'accepted') {
      if (establishment_confirmed && !talent_confirmed) {
        return {
          label: '✅ Vous avez confirmé',
          subLabel: 'En attente du talent',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-700'
        }
      }
      if (!establishment_confirmed && talent_confirmed) {
        return {
          label: '⏳ À confirmer',
          subLabel: 'Le talent a accepté',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-700'
        }
      }
      return {
        label: '✅ Accepté',
        subLabel: 'À confirmer des deux côtés',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700'
      }
    }

    const badges = {
      interested: { label: '⏳ En attente', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
      confirmed: { 
        label: '🎉 Confirmé', 
        subLabel: 'Embauche validée !',
        bgColor: 'bg-purple-100', 
        textColor: 'text-purple-700' 
      },
      rejected: { label: '❌ Refusé', bgColor: 'bg-red-100', textColor: 'text-red-700' },
      completed: { label: '🏁 Terminé', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
      cancelled: { label: '🚫 Annulé', bgColor: 'bg-orange-100', textColor: 'text-orange-700' }
    }
    return badges[status] || badges.interested
  }

  const getMatchBadge = (score) => {
    if (!score) return { label: '—', color: 'text-gray-400' }
    if (score >= 90) return { label: '🎯 Excellent', color: 'text-green-600' }
    if (score >= 75) return { label: '👍 Bon', color: 'text-orange-600' }
    return { label: '✓ Correct', color: 'text-gray-600' }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des candidatures...</p>
        </div>
      </div>
    )
  }

  // Titre dynamique selon le contexte
  const pageTitle = mission 
    ? `Candidatures - ${mission.position}`
    : 'Toutes les candidatures'

  const pageSubtitle = mission
    ? `${applications.length} candidature${applications.length > 1 ? 's' : ''} reçue${applications.length > 1 ? 's' : ''}`
    : `${applications.length} candidature${applications.length > 1 ? 's' : ''} au total`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate(missionId ? '/establishment/missions' : '/establishment')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← {missionId ? 'Retour aux missions' : 'Retour au dashboard'}
            </button>
            <h1 className="text-xl font-bold text-primary-600">⚡ ExtraTaff</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{pageTitle}</h2>
          <p className="text-gray-600 mt-2">{pageSubtitle}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {applications.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-xl text-gray-600 mb-4">📭 Aucune candidature pour le moment</p>
            <p className="text-gray-500">
              Les talents intéressés apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map(application => {
              const talent = application.talents
              const statusBadge = getStatusBadge(application)
              const matchBadge = getMatchBadge(application.match_score)
              
              // Infos mission (depuis mission chargée ou depuis la relation)
              const missionInfo = mission || application.missions
              const positionName = missionInfo?.position || 'Poste'
              const missionLocation = missionInfo?.location_fuzzy || ''
              const missionDate = missionInfo?.start_date

              return (
                <div key={application.id} className="card">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
                        {talent?.avatar_initials || '??'}
                      </div>
                      
                      {/* Infos */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {talent?.first_name} {talent?.last_name}
                        </h3>
                        
                        {/* Afficher la mission si vue globale */}
                        {!missionId && missionInfo && (
                          <p className="text-primary-600 font-medium text-sm">
                            📋 {positionName} {missionLocation && `• ${missionLocation}`}
                            {missionDate && ` • ${formatDate(missionDate)}`}
                          </p>
                        )}
                        
                        <p className="text-gray-600 text-sm">
                          Candidature envoyée le {formatDateTime(application.created_at)}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-sm font-medium ${matchBadge.color}`}>
                            {matchBadge.label} {application.match_score && `(${application.match_score}%)`}
                          </span>
                          {talent?.average_rating && (
                            <span className="text-sm text-yellow-600">
                              ⭐ {talent.average_rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge.bgColor} ${statusBadge.textColor}`}>
                        {statusBadge.label}
                      </span>
                      {statusBadge.subLabel && (
                        <span className="text-xs text-gray-500">
                          {statusBadge.subLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Détails du talent */}
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">📞 Téléphone</p>
                      <p className="font-medium">{talent?.phone || 'Non renseigné'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">💼 Expérience</p>
                      <p className="font-medium">{talent?.years_experience || 0} an{(talent?.years_experience || 0) > 1 ? 's' : ''}</p>
                    </div>

                    {talent?.min_hourly_rate && (
                      <div>
                        <p className="text-sm text-gray-600">💰 Tarif minimum</p>
                        <p className="font-medium">{talent.min_hourly_rate}€/h</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-gray-600">🎯 Missions complétées</p>
                      <p className="font-medium">{talent?.total_missions_completed || 0}</p>
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">🔧 Postes</p>
                      <p className="font-medium">{talent?.position_types?.join(', ') || 'Non renseigné'}</p>
                    </div>
                  </div>

                  {/* Bio */}
                  {talent?.bio && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 italic">"{talent.bio}"</p>
                    </div>
                  )}

                  {/* Indicateur de confirmation */}
                  {application.status === 'accepted' && (
                    <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">État des confirmations :</p>
                      <div className="flex gap-4">
                        <span className={`text-sm ${application.establishment_confirmed ? 'text-green-600' : 'text-gray-400'}`}>
                          {application.establishment_confirmed ? '✅' : '⏳'} Vous
                        </span>
                        <span className={`text-sm ${application.talent_confirmed ? 'text-green-600' : 'text-gray-400'}`}>
                          {application.talent_confirmed ? '✅' : '⏳'} Talent
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {application.status === 'interested' && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={() => handleAccept(application.id)}
                        className="btn-primary flex-1"
                      >
                        ✅ Accepter
                      </button>
                      <button
                        onClick={() => handleReject(application.id)}
                        className="btn-secondary flex-1"
                      >
                        ❌ Refuser
                      </button>
                    </div>
                  )}

                  {application.status === 'accepted' && !application.establishment_confirmed && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg mt-4">
                      <p className="text-green-800 font-medium mb-2">
                        ✅ Candidature acceptée
                      </p>
                      <p className="text-green-700 text-sm mb-3">
                        Discutez avec {talent?.first_name} puis confirmez l'embauche pour valider la mission.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => navigate(`/establishment/chat/${application.id}`)}
                          className="btn-secondary flex-1"
                        >
                          💬 Ouvrir la conversation
                        </button>
                        <button
                          onClick={() => handleConfirmHire(application.id)}
                          disabled={confirmingId === application.id}
                          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium"
                        >
                          {confirmingId === application.id ? '⏳ Confirmation...' : '🤝 Confirmer l\'embauche'}
                        </button>
                      </div>
                    </div>
                  )}

                  {application.status === 'accepted' && application.establishment_confirmed && !application.talent_confirmed && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mt-4">
                      <p className="text-yellow-800 font-medium mb-2">
                        ⏳ En attente de l'acceptation du talent
                      </p>
                      <p className="text-yellow-700 text-sm mb-3">
                        Vous avez confirmé l'embauche. Dès que {talent?.first_name} accepte, la mission sera validée.
                      </p>
                      <button
                        onClick={() => navigate(`/establishment/chat/${application.id}`)}
                        className="btn-primary w-full"
                      >
                        💬 Ouvrir la conversation
                      </button>
                    </div>
                  )}

                  {application.status === 'confirmed' && (
                    <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mt-4">
                      <p className="text-purple-800 font-medium mb-2">
                        🎉 Embauche confirmée des deux côtés !
                      </p>
                      <p className="text-purple-700 text-sm mb-3">
                        {talent?.first_name} travaillera avec vous. Vous pouvez continuer à échanger.
                      </p>
                      <button
                        onClick={() => navigate(`/establishment/chat/${application.id}`)}
                        className="btn-primary w-full"
                      >
                        💬 Ouvrir la conversation
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
