import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, formatDate, formatDateTime } from '../../lib/supabase'

export default function ApplicationsReceived({ establishmentId }) {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadApplications()
  }, [establishmentId])

  const loadApplications = async () => {
    try {
      // Récupérer les missions de l'établissement
      const { data: missions } = await supabase
        .from('missions')
        .select('id')
        .eq('establishment_id', establishmentId)

      if (!missions || missions.length === 0) {
        setApplications([])
        setLoading(false)
        return
      }

      const missionIds = missions.map(m => m.id)

      // Récupérer les candidatures pour ces missions
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          missions (id, position, location_fuzzy, hourly_rate, start_date, end_date),
          talents!talent_id (
            id,
            first_name,
            last_name,
            phone,
            email,
            bio,
            experience_years,
            preferred_departments,
            skills,
            availability
          )
        `)
        .in('mission_id', missionIds)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (err) {
      console.error('Erreur chargement candidatures:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (applicationId, newStatus) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus, establishment_confirmed: newStatus === 'accepted' })
        .eq('id', applicationId)

      if (error) throw error
      
      alert(`Candidature ${newStatus === 'accepted' ? 'acceptée' : 'refusée'} !`)
      loadApplications()
    } catch (err) {
      console.error('Erreur mise à jour:', err)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      interested: { label: '⏳ Intéressé', color: 'bg-blue-100 text-blue-700' },
      accepted: { label: '✅ Accepté', color: 'bg-green-100 text-green-700' },
      rejected: { label: '❌ Refusé', color: 'bg-red-100 text-red-700' },
      confirmed: { label: '🎉 Confirmé', color: 'bg-purple-100 text-purple-700' }
    }
    return badges[status] || badges.interested
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Candidatures Reçues</h2>
        <p className="text-gray-600 mt-1">{applications.length} candidature(s)</p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
          <p className="text-xl text-gray-600 mb-4">👥 Aucune candidature</p>
          <p className="text-gray-500">Les candidatures apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => {
            const badge = getStatusBadge(app.status)
            return (
              <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {app.talents?.first_name} {app.talents?.last_name}
                    </h3>
                    <p className="text-gray-600 font-medium">{app.missions?.position}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Candidature envoyée le {formatDateTime(app.created_at)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Infos de contact */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
                  {app.talents?.phone && (
                    <p className="text-gray-600 text-sm">📱 <span className="font-medium">{app.talents.phone}</span></p>
                  )}
                  {app.talents?.email && (
                    <p className="text-gray-600 text-sm">📧 <span className="font-medium">{app.talents.email}</span></p>
                  )}
                </div>

                {/* Profil du talent */}
                <div className="mb-4 grid md:grid-cols-2 gap-4">
                  {app.talents?.experience_years && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium">💼 Expérience</p>
                      <p className="text-sm font-semibold text-gray-900">{app.talents.experience_years} ans</p>
                    </div>
                  )}
                  
                  {app.talents?.availability && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600 font-medium">📅 Disponibilité</p>
                      <p className="text-sm font-semibold text-gray-900">{app.talents.availability}</p>
                    </div>
                  )}
                </div>

                {/* Bio du talent */}
                {app.talents?.bio && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 font-medium mb-1">À propos</p>
                    <p className="text-sm text-gray-700">{app.talents.bio}</p>
                  </div>
                )}

                {/* Compétences */}
                {app.talents?.skills && app.talents.skills.length > 0 && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600 font-medium mb-2">🎯 Compétences</p>
                    <div className="flex flex-wrap gap-2">
                      {app.talents.skills.map((skill, i) => (
                        <span key={i} className="px-2 py-1 bg-purple-200 text-purple-700 rounded-full text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Infos matching et mission */}
                <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    {app.match_score && (
                      <div>
                        <p className="text-xs text-amber-600 font-medium">🎯 Matching</p>
                        <p className="text-sm font-bold text-gray-900">{app.match_score}%</p>
                      </div>
                    )}
                    {app.missions?.hourly_rate && (
                      <div>
                        <p className="text-xs text-amber-600 font-medium">💰 Tarif proposé</p>
                        <p className="text-sm font-bold text-primary-600">{app.missions.hourly_rate}€/h</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Afficher l'état des confirmations */}
                {app.status === 'accepted' && (
                  <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">État des confirmations :</p>
                    <div className="flex gap-4">
                      <span className={`text-sm ${app.establishment_confirmed ? 'text-green-600' : 'text-gray-400'}`}>
                        {app.establishment_confirmed ? '✅' : '⏳'} Établissement (vous)
                      </span>
                      <span className={`text-sm ${app.talent_confirmed ? 'text-green-600' : 'text-gray-400'}`}>
                        {app.talent_confirmed ? '✅' : '⏳'} Talent
                      </span>
                    </div>
                  </div>
                )}

                {app.status === 'interested' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(app.id, 'accepted')}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      ✅ Accepter
                    </button>
                    <button
                      onClick={() => updateStatus(app.id, 'rejected')}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      ❌ Refuser
                    </button>
                  </div>
                )}

                {(app.status === 'accepted' || app.status === 'confirmed') && (
                  <button
                    onClick={() => navigate(`/establishment/chat/${app.id}`)}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    💬 Ouvrir la conversation
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
