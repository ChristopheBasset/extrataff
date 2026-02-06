import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/supabase'

export default function ChatList({ userType }) {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      if (userType === 'talent') {
        // ✅ TALENT - Récupérer les candidatures acceptées
        const { data: talentData } = await supabase
          .from('talents')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!talentData) return

        const { data: applications, error } = await supabase
          .from('applications')
          .select('*')
          .eq('talent_id', talentData.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })

        if (error) throw error

        // Enrichir avec les infos missions et établissements
        const enriched = await Promise.all(
          (applications || []).map(async (app) => {
            const { data: mission } = await supabase
              .from('missions')
              .select('id, position, start_date, establishments(name)')
              .eq('id', app.mission_id)
              .single()

            return {
              ...app,
              missions: mission
            }
          })
        )

        const validConversations = enriched.filter(
          app => app.missions && app.missions.establishments
        )
        setConversations(validConversations)

      } else {
        // ✅ ÉTABLISSEMENT - Récupérer les missions puis les applications
        const { data: establishmentData } = await supabase
          .from('establishments')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!establishmentData) return

        // Récupérer les missions de cet établissement
        const { data: missions, error: missionsError } = await supabase
          .from('missions')
          .select('id')
          .eq('establishment_id', establishmentData.id)

        if (missionsError) throw missionsError

        if (!missions || missions.length === 0) {
          setConversations([])
          setLoading(false)
          return
        }

        const missionIds = missions.map(m => m.id)

        // Récupérer les applications acceptées pour ces missions
        const { data: applications, error: appError } = await supabase
          .from('applications')
          .select('*')
          .in('mission_id', missionIds)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })

        if (appError) throw appError

        // Enrichir avec les infos talents et missions
        const enriched = await Promise.all(
          (applications || []).map(async (app) => {
            const { data: talent } = await supabase
              .from('talents')
              .select('first_name, last_name')
              .eq('id', app.talent_id)
              .single()

            const { data: mission } = await supabase
              .from('missions')
              .select('id, position')
              .eq('id', app.mission_id)
              .single()

            return {
              ...app,
              talents: talent,
              missions: mission
            }
          })
        )

        const validConversations = enriched.filter(
          app => app.missions && app.talents
        )
        setConversations(validConversations)
      }

    } catch (err) {
      console.error('Erreur chargement conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des conversations...</p>
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
              onClick={() => navigate(userType === 'talent' ? '/talent' : '/establishment')}
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">💬 Messages</h2>
          <p className="text-gray-600 mt-2">
            {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-xl text-gray-600 mb-4">🔭 Aucune conversation</p>
            <p className="text-gray-500">
              Les conversations apparaissent quand vos candidatures sont acceptées
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map(conv => {
              if (!conv.missions) return null
              
              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/${userType}/chat/${conv.id}`)}
                  className="card w-full text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {userType === 'talent' ? (
                        <>
                          <h3 className="font-semibold text-gray-900">
                            {conv.missions.establishments?.name || 'Établissement'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {conv.missions.position}
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="font-semibold text-gray-900">
                            {conv.talents?.first_name || ''} {conv.talents?.last_name || 'Talent'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {conv.missions.position}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="text-gray-400">→</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
