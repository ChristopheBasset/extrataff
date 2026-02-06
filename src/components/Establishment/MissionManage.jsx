import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, formatDate } from '../../lib/supabase'

export default function MissionManage({ establishmentId }) {
  const navigate = useNavigate()
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMissions()
  }, [establishmentId])

  const loadMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('establishment_id', establishmentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMissions(data || [])
    } catch (err) {
      console.error('Erreur chargement missions:', err)
    } finally {
      setLoading(false)
    }
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mes Missions</h2>
          <p className="text-gray-600 mt-1">{missions.length} mission(s)</p>
        </div>
        <button
          onClick={() => navigate('/establishment/create-mission')}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Créer une mission
        </button>
      </div>

      {missions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
          <p className="text-xl text-gray-600 mb-4">📋 Aucune mission créée</p>
          <p className="text-gray-500 mb-6">Créez votre première mission pour commencer</p>
          <button
            onClick={() => navigate('/establishment/create-mission')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            + Créer une mission
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {missions.map(mission => (
            <div key={mission.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{mission.position}</h3>
                  <p className="text-gray-600">{mission.location_fuzzy}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  mission.status === 'open'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {mission.status === 'open' ? '✅ Ouverte' : '🔒 Fermée'}
                </span>
              </div>

              <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-600">📅 Début</p>
                  <p className="font-medium">{formatDate(mission.start_date)}</p>
                </div>
                {mission.hourly_rate && (
                  <div>
                    <p className="text-gray-600">💰 Tarif</p>
                    <p className="font-medium text-primary-600">{mission.hourly_rate}€/h</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">📝 Contrat</p>
                  <p className="font-medium">{mission.contract_type}</p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/establishment/mission/${mission.id}/edit`)}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                ✏️ Éditer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
