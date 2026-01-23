import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, getLabel, CONTRACT_TYPES } from '../../lib/supabase'

export default function MyAgenda() {
  const navigate = useNavigate()
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadConfirmedMissions()
  }, [])

  const loadConfirmedMissions = async () => {
    try {
      // Récupérer le profil talent
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: talent } = await supabase
        .from('talents')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Récupérer les candidatures confirmées avec les missions
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
            establishment_id
          )
        `)
        .eq('talent_id', talent.id)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Filtrer les missions valides et trier par date de début
      const validMissions = data
        .filter(app => app.missions !== null)
        .sort((a, b) => new Date(a.missions.start_date) - new Date(b.missions.start_date))

      // Récupérer les noms des établissements
      const establishmentIds = [...new Set(validMissions.map(m => m.missions.establishment_id))]
      
      if (establishmentIds.length > 0) {
        const { data: establishments } = await supabase
          .from('establishments')
          .select('id, name')
          .in('id', establishmentIds)

        // Ajouter le nom de l'établissement à chaque mission
        const missionsWithEstablishment = validMissions.map(app => {
          const establishment = establishments?.find(e => e.id === app.missions.establishment_id)
          return {
            ...app,
            establishmentName: establishment?.name || 'Établissement'
          }
        })

        setMissions(missionsWithEstablishment)
      } else {
        setMissions(validMissions)
      }
    } catch (err) {
      console.error('Erreur chargement agenda:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Séparer les missions passées et à venir
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingMissions = missions.filter(m => new Date(m.missions.start_date) >= today)
  const pastMissions = missions.filter(m => new Date(m.missions.start_date) < today)

  // Fonction pour formater la date de manière plus lisible
  const formatAgendaDate = (dateString) => {
    const date = new Date(dateString)
    const options = { weekday: 'long', day: 'numeric', month: 'long' }
    return date.toLocaleDateString('fr-FR', options)
  }

  // Vérifier si la date est aujourd'hui ou demain
  const getDateLabel = (dateString) => {
    const date = new Date(dateString)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui"
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Demain"
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'agenda...</p>
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
          <h2 className="text-3xl font-bold text-gray-900">📅 Mon Agenda</h2>
          <p className="text-gray-600 mt-2">
            {upcomingMissions.length} mission{upcomingMissions.length > 1 ? 's' : ''} à venir
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {missions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-5xl mb-4">📅</p>
            <p className="text-xl text-gray-600 mb-4">Aucune mission confirmée</p>
            <p className="text-gray-500 mb-6">
              Vos missions confirmées apparaîtront ici
            </p>
            <button
              onClick={() => navigate('/talent/applications')}
              className="btn-primary"
            >
              Voir mes candidatures
            </button>
          </div>
        ) : (
          <>
            {/* Missions à venir */}
            {upcomingMissions.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Missions à venir
                </h3>
                <div className="space-y-4">
                  {upcomingMissions.map(application => {
                    const mission = application.missions
                    const dateLabel = getDateLabel(mission.start_date)

                    return (
                      <div key={application.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Date header */}
                        <div className="bg-primary-50 px-4 py-2 border-b border-primary-100">
                          <div className="flex items-center justify-between">
                            <p className="text-primary-800 font-medium capitalize">
                              {formatAgendaDate(mission.start_date)}
                            </p>
                            {dateLabel && (
                              <span className="px-2 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                                {dateLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mission content */}
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-lg font-bold text-gray-900">{mission.position}</h4>
                              <p className="text-gray-600">{application.establishmentName}</p>
                            </div>
                            {mission.hourly_rate && (
                              <span className="text-primary-600 font-bold">{mission.hourly_rate}€/h</span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <span>📍</span>
                              <span>{mission.location_fuzzy || 'Non précisé'}</span>
                            </div>
                            {mission.shift_start_time && mission.shift_end_time && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <span>🕐</span>
                                <span>{mission.shift_start_time.slice(0,5)} - {mission.shift_end_time.slice(0,5)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-600">
                              <span>📝</span>
                              <span>{getLabel(mission.contract_type, CONTRACT_TYPES)}</span>
                            </div>
                            {mission.end_date && mission.end_date !== mission.start_date && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <span>📅</span>
                                <span>Jusqu'au {formatDate(mission.end_date)}</span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => navigate(`/talent/chat/${application.id}`)}
                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                          >
                            💬 Contacter l'établissement
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Missions passées */}
            {pastMissions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                  Missions passées
                </h3>
                <div className="space-y-3 opacity-60">
                  {pastMissions.map(application => {
                    const mission = application.missions

                    return (
                      <div key={application.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-gray-900">{mission.position}</h4>
                            <p className="text-sm text-gray-500">
                              {application.establishmentName} • {formatDate(mission.start_date)}
                            </p>
                          </div>
                          <span className="text-gray-400 text-sm">Terminée</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
