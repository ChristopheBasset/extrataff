import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, formatDateTime } from '../../lib/supabase'

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
          missions (id, position),
          talents!talent_id (
            first_name,
            last_name,
            phone
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

  const acceptApplication = async (applicationId) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: 'accepted',
          establishment_confirmed: true
        })
        .eq('id', applicationId)

      if (error) throw error
      
      alert('✅ Candidature acceptée ! En attente de confirmation du talent.')
      loadApplications()
    } catch (err) {
      console.error('Erreur mise à jour:', err)
    }
  }

  const rejectApplication = async (applicationId) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId)

      if (error) throw error
      
      alert('❌ Candidature refusée')
      loadApplications()
    } catch (err) {
      console.error('Erreur mise à jour:', err)
    }
  }

  const confirmMission = async (applicationId) => {
    try {
      const app = applications.find(a => a.id === applicationId)
      
      if (!app.talent_confirmed) {
        alert('⏳ En attente de confirmation du talent')
        return
      }

      const { error } = await supabase
        .from('applications')
        .update({ 
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) throw error
      
      alert('🎉 Embauche validée ! La mission est confirmée.')
      loadApplications()
    } catch (err) {
      console.error('Erreur confirmation:', err)
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
                {/* Header */}
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

                {/* Contact */}
                {app.talents?.phone && (
                  <p className="text-gray-600 text-sm mb-4">📱 {app.talents.phone}</p>
                )}

                {/* Score matching */}
                {app.match_score && (
                  <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm font-medium text-gray-700">
                      🎯 Score de matching: <span className="text-lg text-amber-600 font-bold">{app.match_score}%</span>
                    </p>
                  </div>
                )}

                {/* État des confirmations */}
                {app.status === 'accepted' && (
                  <div className="mb-4 p-3 bg-gray-100 rounded-lg border border-gray-300">
                    <p className="text-sm font-bold text-gray-800 mb-2">État des confirmations :</p>
                    <div className="flex gap-4">
                      <span className={`text-sm font-medium ${app.establishment_confirmed ? 'text-green-600' : 'text-gray-400'}`}>
                        {app.establishment_confirmed ? '✅' : '⏳'} Établissement (vous)
                      </span>
                      <span className={`text-sm font-medium ${app.talent_confirmed ? 'text-green-600' : 'text-gray-400'}`}>
                        {app.talent_confirmed ? '✅' : '⏳'} Talent
                      </span>
                    </div>
                  </div>
                )}

                {/* Boutons d'action */}
                {app.status === 'interested' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptApplication(app.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      ✅ Accepter
                    </button>
                    <button
                      onClick={() => rejectApplication(app.id)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      ❌ Refuser
                    </button>
                  </div>
                )}

                {app.status === 'accepted' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => confirmMission(app.id)}
                      disabled={!app.talent_confirmed}
                      className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
                        app.talent_confirmed
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {app.talent_confirmed ? '🎉 Valider l\'embauche' : '⏳ En attente du talent'}
                    </button>
                    <button
                      onClick={() => navigate(`/establishment/chat/${app.id}`)}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                    >
                      💬 Ouvrir la conversation
                    </button>
                  </div>
                )}

                {app.status === 'confirmed' && (
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
