// GroupInvitePage.jsx - Inviter des managers à rejoindre le groupe
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ESTABLISHMENT_TYPES } from '../../utils/constants'

export default function GroupInvitePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [pendingInvites, setPendingInvites] = useState([])
  
  const [formData, setFormData] = useState({
    managerEmail: '',
    restaurantName: '',
    restaurantType: ''
  })

  useEffect(() => {
    fetchUserAndGroup()
  }, [])

  const fetchUserAndGroup = async () => {
    try {
      // Récupérer l'user connecté
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        navigate('/login')
        return
      }

      setUser(authUser)

      // Récupérer le groupe de cet user
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('owner_id', authUser.id)
        .single()

      if (groupError && groupError.code !== 'PGRST116') throw groupError

      if (!groupData) {
        // L'user n'est pas admin d'un groupe
        navigate('/establishment')
        return
      }

      setGroup(groupData)

      // Récupérer les invitations en attente
      const { data: invitesData } = await supabase
        .from('group_invitations')
        .select('*')
        .eq('group_id', groupData.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      setPendingInvites(invitesData || [])

    } catch (err) {
      console.error('Erreur fetch:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.managerEmail || !formData.restaurantName || !formData.restaurantType) {
      setError('Tous les champs sont obligatoires')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. Générer un token unique
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours

      // 2. Créer l'invitation en BDD
      const { error: inviteError } = await supabase
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

      if (inviteError) throw inviteError

      // 3. Envoyer l'email d'invitation via Edge Function
      const joinLink = `${window.location.origin}/groupe/${group.id}/join?token=${token}`
      
      const response = await fetch('https://yixuosrfwrxhttbhqelj.supabase.co/functions/v1/send-group-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
        },
        body: JSON.stringify({
          managerEmail: formData.managerEmail,
          groupName: group.name,
          restaurantName: formData.restaurantName,
          joinLink: joinLink,
          expiresAt: expiresAt.toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'email')
      }

      setSuccess(`✅ Invitation envoyée à ${formData.managerEmail}`)
      setFormData({ managerEmail: '', restaurantName: '', restaurantType: '' })

      // Rafraîchir la liste des invitations
      setTimeout(() => fetchUserAndGroup(), 1000)

    } catch (err) {
      console.error('Erreur invitation:', err)
      setError(err.message || 'Erreur lors de l\'envoi de l\'invitation')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Vous devez être admin d'un groupe</p>
          <button
            onClick={() => navigate('/establishment')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/group-admin')}
            className="text-primary-600 hover:text-primary-700 font-semibold mb-4"
          >
            ← Retour au tableau de bord
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            📧 Inviter un restaurant
          </h1>
          <p className="text-gray-600 mt-2">
            Groupe: <span className="font-semibold">{group.name}</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Formulaire */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Nouvelle invitation</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email du manager
                  </label>
                  <input
                    type="email"
                    value={formData.managerEmail}
                    onChange={handleChange('managerEmail')}
                    placeholder="manager@restaurant.fr"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    L'invitation sera envoyée à cette adresse
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du restaurant
                  </label>
                  <input
                    type="text"
                    value={formData.restaurantName}
                    onChange={handleChange('restaurantName')}
                    placeholder="Ex: Pommery Paris"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type d'établissement
                  </label>
                  <select
                    value={formData.restaurantType}
                    onChange={handleChange('restaurantType')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {ESTABLISHMENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>ℹ️ Note:</strong> Le manager recevra un lien pour créer son compte et remplir les infos détaillées du restaurant (adresse, téléphone, description).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {sending ? '📧 Envoi en cours...' : '📧 Envoyer l\'invitation'}
                </button>
              </form>
            </div>
          </div>

          {/* Statistiques */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="font-bold text-gray-900 mb-6">Info</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Invitations en attente</p>
                  <p className="text-2xl font-bold text-primary-600">{pendingInvites.length}</p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 uppercase">Validité</p>
                  <p className="text-sm text-gray-700">7 jours</p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 uppercase">Mode d'ajout</p>
                  <p className="text-sm text-gray-700">Email d'invitation</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des invitations en attente */}
        {pendingInvites.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              ⏳ Invitations en attente ({pendingInvites.length})
            </h2>

            <div className="space-y-3">
              {pendingInvites.map((invite) => {
                const expiresAt = new Date(invite.expires_at)
                const isExpiring = expiresAt - Date.now() < 2 * 24 * 60 * 60 * 1000 // moins de 2 jours

                return (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{invite.restaurant_name}</p>
                      <p className="text-sm text-gray-600">📧 {invite.manager_email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Expire le {expiresAt.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      {isExpiring && (
                        <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
                          Expire bientôt
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
