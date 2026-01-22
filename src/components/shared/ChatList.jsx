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

      if (userType === 'talent') {
        // TALENT - Récupérer le profil
        const { data: talent } = await supabase
          .from('talents')
          .select('id')
          .eq('user_id', user.id)
          .single()

        // Récupérer les candidatures acceptées avec infos mission et établissement
        const { data: applications, error } = await supabase
          .from('applications')
          .select(`
            id,
            status,
            created_at,
            missions (
              id,
              position,
              start_date,
              establishments (
                name
              )
            )
          `)
          .eq('talent_id', talent.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })

        if (error) throw error
        
        // Filtrer les conversations dont la mission existe encore
        const validConversations = (applications || []).filter(
          app => app.missions && app.missions.establishments
        )
        setConversations(validConversations)

      } else {
        // ÉTABLISSEMENT - Récupérer le profil
        const { data: establishment } = await supabase
          .from('establishments')
          .select('id')
          .eq('user_id', user.id)
          .single()

        // Récupérer les candidatures acceptées pour cet établissement
        const { data: applications, error } = await supabase
          .from('applications')
          .select(`
            id,
            status,
            created_at,
            missions!inner (
              id,
              position,
              start_date,
              establishment_id
            ),
            talents (
              first_name,
              last_name
            )
          `)
          .eq('status', 'accepted')
          .eq('missions.establishment_id', establishment.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        
        // Filtrer les conversations valides
        const validConversations = (applications || []).filter(
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
            <p className="text-xl text-gray-600 mb-4">📭 Aucune conversation</p>
            <p className="text-gray-500">
              Les conversations apparaissent quand vos candidatures sont acceptées
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map(conv => {
              // Sécurité supplémentaire
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
