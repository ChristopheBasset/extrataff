import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ESTABLISHMENT_TYPES } from '../../utils/constants'

export default function GroupInvitePage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [group, setGroup] = useState(null)
  const [pendingInvitations, setPendingInvitations] = useState([])

  const [formData, setFormData] = useState({
    managerEmail: '',
    restaurantName: '',
    restaurantType: ''
  })

  useEffect(() => {
    const fetchData = async () => {
      // Récupérer la session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }
      setSession(session)

      // Récupérer le groupe de l'utilisateur
      const { data: estData } = await supabase
        .from('establishments')
        .select('group_id')
        .eq('user_id', session.user.id)
        .eq('is_group_owner', true)
        .single()

      if (estData?.group_id) {
        const { data: groupData } = await supabase
          .from('groups')
          .select('*')
          .eq('id', estData.group_id)
          .single()
        setGroup(groupData)

        // Récupérer les invitations en attente
        const { data: invData } = await supabase
          .from('group_invitations')
          .select('*')
          .eq('group_id', estData.group_id)
          .eq('status', 'pending')
        setPendingInvitations(invData || [])
      }
    }

    fetchData()
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (!group) throw new Error('Groupe non trouvé')

      // 1. Créer l'invitation en BDD
      const token = Math.random().toString(36).substring(2, 38) // 36 caractères
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 jours

      const { data: invData, error: invError } = await supabase
        .from('group_invitations')
        .insert({
          group_id: group.id,
          manager_email: formData.managerEmail,
          restaurant_name: formData.restaurantName,
          restaurant_type: formData.restaurantType,
          token: token,
          status: 'pending',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      if (invError) throw invError

      // 2. Envoyer l'email d'invitation via Edge Function
      const joinLink = `${window.location.origin}/groupe/${group.id}/join?token=${token}`

      // Récupérer la session actuelle pour l'Authorization
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      const response = await fetch(
        'https://yixuosrfwrxhttbhqelj.supabase.co/functions/v1/send-group-invite',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession?.access_token}`
          },
          body: JSON.stringify({
            managerEmail: formData.managerEmail,
            groupName: group.name,
            restaurantName: formData.restaurantName,
            joinLink: joinLink,
            expiresAt: expiresAt.toISOString()
          })
        }
      )

      const emailResult = await response.json()

      if (!response.ok) {
        throw new Error(emailResult.error || 'Erreur lors de l\'envoi de l\'email')
      }

      // Succès !
      setSuccess(`Invitation envoyée à ${formData.managerEmail}`)
      setFormData({ managerEmail: '', restaurantName: '', restaurantType: '' })

      // Rafraîchir la liste des invitations
      const { data: newInvData } = await supabase
        .from('group_invitations')
        .select('*')
        .eq('group_id', group.id)
        .eq('status', 'pending')
      setPendingInvitations(newInvData || [])

    } catch (err) {
      console.error('Erreur :', err)
      setError(err.message || 'Erreur lors de l\'invitation')
    } finally {
      setLoading(false)
    }
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/group-admin')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Retour au tableau de bord
            </button>
            <h1 className="text-xl font-bold text-primary-600">⚡ ExtraTaff</h1>
            <div className="w-40"></div>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        
        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="text-4xl">📧</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Inviter un restaurant
              </h2>
              <p className="text-gray-600">Groupe: <strong>{group.name}</strong></p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              ✓ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Colonne gauche : Formulaire */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Nouvelle invitation</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email du manager *
                  </label>
                  <input
                    type="email"
                    value={formData.managerEmail}
                    onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="manager@restaurant.fr"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    L'invitation sera envoyée à cette adresse
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du restaurant *
                  </label>
                  <input
                    type="text"
                    value={formData.restaurantName}
                    onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Pommery Paris"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type d'établissement *
                  </label>
                  <select
                    value={formData.restaurantType}
                    onChange={(e) => setFormData({ ...formData, restaurantType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {ESTABLISHMENT_TYPES && ESTABLISHMENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>ℹ️ Note :</strong> Le manager recevra un lien pour créer son compte et remplir les infos détaillées du restaurant (adresse, téléphone, description).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? '📤 Envoi en cours...' : '📤 Envoyer l\'invitation'}
                </button>
              </div>

              {/* Colonne droite : Info */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-4">Info</h3>

                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-gray-600">INVITATIONS EN ATTENTE</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {pendingInvitations.length}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-600">VALIDITÉ</p>
                    <p className="text-lg font-semibold">7 jours</p>
                  </div>

                  <div>
                    <p className="text-gray-600">MODE D'AJOUT</p>
                    <p className="text-lg font-semibold">Email d'invitation</p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Liste des invitations en attente */}
        {pendingInvitations.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Invitations en attente ({pendingInvitations.length})
            </h3>

            <div className="space-y-3">
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{inv.restaurant_name}</p>
                    <p className="text-sm text-gray-600">{inv.manager_email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                      En attente
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
