import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, formatDateTime, getLabel, CONTRACT_TYPES } from '../../lib/supabase'
import { getUrgencyBadge } from '../../lib/matching'

export default function MyMissions() {
  const navigate = useNavigate()
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMissions()
  }, [])

  const loadMissions = async () => {
    try {
      // Récupérer le profil établissement
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Récupérer les missions avec le compte de candidatures
      const { data, error } = await supabase
        .from('missions')
        .select(`
          *,
          applications(count)
        `)
        .eq('establishment_id', establishment.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setMissions(data)
    } catch (err) {
      console.error('Erreur chargement missions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      open: { label: '🟢 Ouverte', bgColor: 'bg-green-100', textColor: 'text-green-700' },
      closed: { label: '🔴 Fermée', bgColor: 'bg-red-100', textColor: 'text-red-700' },
      filled: { label: '✅ Pourvue', bgColor: 'bg-blue-100', textColor: 'text-blue-700' }
    }
    return badges[status] || badges.open
  }

  const handleCloseMission = async (missionId) => {
    if (!confirm('Êtes-vous sûr de vouloir fermer cette mission ?')) return

    try {
      const { error } = await supabase
        .from('missions')
        .update({ status: 'closed' })
        .eq('id', missionId)

      if (error) throw error

      alert('Mission fermée avec succès !')
      loadMissions()
    } catch (err) {
      console.error('Erreur fermeture mission:', err)
      alert('Erreur lors de la fermeture de la mission')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des missions...</p>
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
              onClick={() => navigate('/establishment')}
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Mes Missions</h2>
            <p className="text-gray-600 mt-2">
              {missions.length} mission{missions.length > 1 ? 's' : ''} créée{missions.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/establishment/create-mission')}
            className="btn-primary"
          >
            ➕ Nouvelle mission
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {missions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-xl text-gray-600 mb-4">📭 Aucune mission créée pour le moment</p>
            <p className="text-gray-500 mb-6">
              Créez votre première annonce pour recevoir des candidatures !
            </p>
            <button
              onClick={() => navigate('/establishment/create-mission')}
              className="btn-primary"
            >
              Créer une mission
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {missions.map(mission => {
              const statusBadge = getStatusBadge(mission.status)
              const urgencyBadge = getUrgencyBadge(mission.urgency_level)
              const applicationsCount = mission.applications?.[0]?.count || 0

              return (
                <div key={mission.id} className="card">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {mission.position}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Créée le {formatDateTime(mission.created_at)}
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

                  {/* Détails */}
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
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
                  </div>

                  {/* Commentaire */}
                  {mission.comment && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 italic">"{mission.comment}"</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => navigate(`/establishment/applications/${mission.id}`)}
                      className="btn-primary flex-1"
                    >
                      👥 Voir les candidatures ({applicationsCount})
                    </button>
                    
                    {mission.status === 'open' && (
                      <button
                        onClick={() => handleCloseMission(mission.id)}
                        className="btn-secondary"
                      >
                        🔒 Fermer
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
