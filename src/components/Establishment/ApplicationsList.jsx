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

  useEffect(() => {
    loadApplications()
  }, [missionId])

  const loadApplications = async () => {
    try {
      // Récupérer la mission avec l'établissement
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

      // Récupérer les candidatures avec les infos du talent
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
      // Trouver l'application
      const application = applications.find(a => a.id === applicationId)
      if (!application) return

      // Mettre à jour le statut
      const { error } = await supabase
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId)

      if (error) throw error

      // Créer une notification pour le talent
      await notifyApplicationAccepted(
        application.talents.user_id,
        mission.establishments.name,
        mission.position,
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
      // Trouver l'application
      const application = applications.find(a => a.id === applicationId)
      if (!application) return

      // Mettre à jour le statut
      const { error } = await supabase
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId)

      if (error) throw error

      // Créer une notification pour le talent
      await notifyApplicationRejected(
        application.talents.user_id,
        mission.establishments.name,
        mission.position
      )

      alert('Candidature refusée.')
      loadApplications()
    } catch (err) {
      console.error('Erreur refus:', err)
      alert('Erreur lors du refus de la candidature')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      interested: { label: '⏳ En attente', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
      accepted: { label: '✅ Accepté', bgColor: 'bg-green-100', textColor: 'text-green-700' },
      rejected: { label: '❌ Refusé', bgColor: 'bg-red-100', textColor: 'text-red-700' }
    }
    return badges[status] || badges.interested
  }

  const getMatchBadge = (score) => {
    if (score >= 90) return { label: '🎯 Excellent', color: 'text-green-600' }
    if (score >= 75) return { label: '👍 Bon', color: 'text-orange-600' }
    return { label: '✓ Correct', color: 'text-gray-600' }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/establishment/missions')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Retour aux missions
            </button>
            <h1 className="text-xl font-bold text-primary-600">⚡ ExtraTaff</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mission && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Candidatures - {mission.position}
            </h2>
            <p className="text-gray-600 mt-2">
              {applications.length} candidature{applications.length > 1 ? 's' : ''} reçue{applications.length > 1 ? 's' : ''}
            </p>
          </div>
        )}

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
              const statusBadge = getStatusBadge(application.status)
              const matchBadge = getMatchBadge(application.match_score)

              return (
                <div key={application.id} className="card">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
                        {talent.avatar_initials}
                      </div>
                      
                      {/* Infos */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {talent.first_name} {talent.last_name}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Candidature envoyée le {formatDateTime(application.created_at)}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-sm font-medium ${matchBadge.color}`}>
                            {matchBadge.label} ({application.match_score}%)
                          </span>
                          {talent.average_rating && (
                            <span className="text-sm text-yellow-600">
                              ⭐ {talent.average_rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge.bgColor} ${statusBadge.textColor}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Détails du talent */}
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">📞 Téléphone</p>
                      <p className="font-medium">{talent.phone}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">💼 Expérience</p>
                      <p className="font-medium">{talent.years_experience} an{talent.years_experience > 1 ? 's' : ''}</p>
                    </div>

                    {talent.min_hourly_rate && (
                      <div>
                        <p className="text-sm text-gray-600">💰 Tarif minimum</p>
                        <p className="font-medium">{talent.min_hourly_rate}€/h</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-gray-600">🎯 Missions complétées</p>
                      <p className="font-medium">{talent.total_missions_completed || 0}</p>
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">🔧 Postes</p>
                      <p className="font-medium">{talent.position_types?.join(', ')}</p>
                    </div>
                  </div>

                  {/* Bio */}
                  {talent.bio && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 italic">"{talent.bio}"</p>
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

                  {application.status === 'accepted' && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg mt-4">
                      <p className="text-green-800 font-medium mb-2">
                        ✅ Candidature acceptée
                      </p>
                      <p className="text-green-700 text-sm mb-3">
                        Vous pouvez contacter {talent.first_name} au {talent.phone} ou discuter via le chat.
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
