import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, ESTABLISHMENT_TYPES } from '../../lib/supabase'

export default function EstablishmentProfileEdit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    address: '',
    phone: '',
    description: ''
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          name: data.name || '',
          type: data.type || '',
          address: data.address || '',
          phone: data.phone || '',
          description: data.description || ''
        })
      }
    } catch (err) {
      console.error('Erreur chargement profil:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('establishments')
        .update({
          name: formData.name,
          type: formData.type,
          address: formData.address,
          phone: formData.phone,
          description: formData.description || null
        })
        .eq('user_id', user.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        navigate('/establishment')
      }, 1500)
    } catch (err) {
      console.error('Erreur mise à jour profil:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du profil...</p>
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

      {/* Formulaire */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">🏪 Modifier mon profil</h2>
          <p className="text-gray-600 mt-2">Mettez à jour les informations de votre établissement</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              ✅ Profil mis à jour avec succès ! Redirection...
            </div>
          )}

          {/* Informations de l'établissement */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'établissement *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Restaurant Le Gourmet"
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type d'établissement *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Sélectionnez un type</option>
                {ESTABLISHMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse complète *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Rue de Rivoli, 75001 Paris"
                className="input"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ <strong>Important :</strong> Incluez le code postal (ex: 75001) pour que les talents de ce département reçoivent vos missions
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="01 42 60 12 34"
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description de l'établissement
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="input"
                placeholder="Présentez votre établissement, votre ambiance, vos spécialités..."
              />
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/establishment')}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
