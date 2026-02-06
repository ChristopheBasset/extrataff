import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

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
        // TALENT
        const { data: talentData } = await supabase
          .from('talents')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!talentData) {
          setConversations([])
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('applications')
          .select(`
            id,
            status,
            created_at,
            mission_id,
            missions (
              id,
              position,
              establishment_id,
              establishments (
                name
              )
            )
          `)
          .eq('talent_id', talentData.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Erreur:', error)
          setConversations([])
        } else {
          setConversations(data || [])
        }

      } else {
        // ÉTABLISSEMENT
        const { data: estabData } = await supabase
          .from('establishments')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!estabData) {
          setConversations([])
          setLoading(false)
          return
        }

        // Récupérer les missions de cet établissement
        const { data: missionsData } = await supabase
          .from('missions')
          .select('id')
          .eq('establishment_id', estabData.id)

        if (!missionsData || missionsData.length === 0) {
          setConversations([])
          setLoading(false)
          return
        }

        const missionIds = missionsData.map(m => m.id)

        // Récupérer les applications acceptées
        const { data, error } = await supabase
          .from('applications')
          .select(`
            id,
            status,
            created_at,
            mission_id,
            talent_id,
            missions (
              id,
              position
            ),
            talents (
              first_name,
              last_name
            )
          `)
          .in('mission_id', missionIds)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Erreur:', error)
          setConversations([])
        } else {
          setConversations(data || [])
        }
      }

    } catch (err) {
      console.error('Erreur:', err)
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">💬 Messages</h2>
          <p className="text-gray-600 mt-2">
            {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-12">
            <p className="text-xl text-gray-600 mb-4">🔭 Aucune conversation</p>
            <p className="text-gray-500">
              Les conversations apparaissent quand vos candidatures sont acceptées
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => navigate(`/${userType}/chat/${conv.id}`)}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all w-full text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {userType === 'talent' ? (
                      <>
                        <h3 className="font-semibold text-gray-900">
                          {conv.missions?.establishments?.name || 'Établissement'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {conv.missions?.position || 'Poste'}
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-gray-900">
                          {conv.talents?.first_name || ''} {conv.talents?.last_name || 'Talent'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {conv.missions?.position || 'Poste'}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="text-gray-400">→</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
