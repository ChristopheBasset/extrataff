import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, formatDateTime, getLabel, CONTRACT_TYPES } from '../../lib/supabase'
import { getUrgencyBadge } from '../../lib/matching'

export default function MyApplications() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    try {
      // Récupérer le profil talent
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: talent } = await supabase
        .from('talents')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Récupérer les candidatures avec les missions associées
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          missions (
            id,
            position,
            location_fuzzy,
            start_date,
            end_date,
            shift_start_time,
            shift_end_time,
            hourly_rate,
            contract_type,
            urgency_level,
            comment,
            status
          )
        `)
        .eq('talent_id', talent.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setApplications(data)
    } catch (err) {
      console.error('Erreur chargement candidatures:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      interested: {
        label: '⏳ En attente',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700'
      },
      accepted: {
        label: '✅ Accepté',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700'
      },
      rejected: {
        label: '❌ Refusé',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700'
      },
      completed: {
        label: '🎉 Terminé',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-700'
      },
      cancelled: {
        label: '🚫 Annulé',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700'
      }
    }
    return badges[status] || badges.interested
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
              onClick={() => navigate('/talent')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Retour
            </button>
            <h1 className="text-xl font-bold text-primary-600">⚡ ExtraTaff</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Mes Candidatures</h2>
          <p className="text-gray-600 mt-2">
            {applications.length} candidature{applications.length > 1 ? 's' : ''}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {applications.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-xl text-gray-600 mb-4">📭 Aucune candidature pour le moment</p>
            <p className="text-gray-500 mb-6">
              Consultez les missions disponibles et postulez !
            </p>
            <button
              onClick={() => navigate('/talent/missions')}
              className="btn-primary"
            >
              Voir les missions
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map(application => {
              const mission = application.missions
              const statusBadge = getStatusBadge(application.status)
              const urgencyBadge = getUrgencyBadge(mission.urgency_level)

              return (
                <div key={application.id} className="card">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {mission.position}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Candidature envoyée le {formatDateTime(application.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge.bgColor} ${statusBadge.textColor}`}>
                        {statusBadge.label}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${urgencyBadge.bgColor} ${urgencyBadge.textColor}`}>
                        {urgencyBadge.emoji} {urgencyBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Détails de la mission */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">📍 Lieu</p>
                      <p className="font-medium">{mission.location_fuzzy}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">📅 Début</p>
                      <p className="font-medium">{formatDate(mission.start_date)}</p>
                    </div>

                    {mission.end_date && (
                      <div>
                        <p className="text-sm text-gray-600">📅 Fin</p>
                        <p className="font-medium">{formatDate(mission.end_date)}</p>
                      </div>
                    )}

                    {mission.hourly_rate && (
                      <div>
                        <p className="text-sm text-gray-600">💰 Tarif</p>
                        <p className="font-medium text-primary-600">{mission.hourly_rate}€/h</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-gray-600">📝 Contrat</p>
                      <p className="font-medium">{getLabel(mission.contract_type, CONTRACT_TYPES)}</p>
                    </div>

                    {mission.shift_start_time && mission.shift_end_time && (
                      <div>
                        <p className="text-sm text-gray-600">🕐 Horaires</p>
                        <p className="font-medium">
                          {mission.shift_start_time.slice(0,5)} - {mission.shift_end_time.slice(0,5)}
                        </p>
                      </div>
                    )}

                    {application.match_score && (
                      <div>
                        <p className="text-sm text-gray-600">🎯 Score de matching</p>
                        <p className="font-medium">{application.match_score}%</p>
                      </div>
                    )}
                  </div>

                  {/* Commentaire de la mission */}
                  {mission.comment && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 italic">"{mission.comment}"</p>
                    </div>
                  )}

                  {/* Actions selon le statut */}
                  {application.status === 'accepted' && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <p className="text-green-800 font-medium mb-2">
                        🎉 Votre candidature a été acceptée !
                      </p>
                      <p className="text-green-700 text-sm mb-3">
                        Vous pouvez maintenant discuter avec l'établissement pour finaliser les détails.
                      </p>
                      <button
                        onClick={() => navigate(`/talent/chat/${application.id}`)}
                        className="btn-primary w-full"
                      >
                        💬 Ouvrir la conversation
                      </button>
                    </div>
                  )}

                  {application.status === 'rejected' && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <p className="text-red-800 text-sm">
                        Cette candidature n'a pas été retenue. Continuez à postuler à d'autres missions !
                      </p>
                    </div>
                  )}

                  {application.status === 'interested' && mission.status === 'open' && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <p className="text-blue-800 text-sm">
                        ⏳ En attente de réponse de l'établissement
                      </p>
                    </div>
                  )}

                  {mission.status === 'closed' && application.status === 'interested' && (
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                      <p className="text-gray-800 text-sm">
                        Cette mission a été pourvue
                      </p>
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
