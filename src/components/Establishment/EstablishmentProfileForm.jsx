import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, ESTABLISHMENT_TYPES } from '../../lib/supabase'

export default function EstablishmentProfileForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    address: '',
    phone: '',
    description: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Utilisateur non connecté')
      }

      // Pour l'instant, on utilise des coordonnées par défaut (Paris)
      // On ajoutera la vraie géolocalisation plus tard
      const defaultLocation = 'POINT(2.3522 48.8566)' // Paris

      // Créer le profil établissement
      const { data, error } = await supabase
        .from('establishments')
        .insert({
          user_id: user.id,
          name: formData.name,
          type: formData.type,
          address: formData.address,
          location: defaultLocation,
          phone: formData.phone,
          description: formData.description || null,
          subscription_status: 'trial' // Période d'essai
        })
        .select()
        .single()

      if (error) throw error

      // Rediriger vers le dashboard
      alert('Profil créé avec succès !')
      window.location.href = '/establishment'
    } catch (err) {
      console.error('Erreur création profil:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🏪 Créer mon profil Établissement</h1>
          <p className="text-gray-600 mt-2">Complétez votre profil pour publier vos annonces</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Période d'essai */}
          <div className="bg-primary-50 border border-primary-200 p-4 rounded-lg">
            <p className="text-primary-900 font-medium mb-1">
              🎁 14 jours d'essai gratuit
            </p>
            <p className="text-primary-700 text-sm">
              Testez ExtraTaff gratuitement pendant 14 jours, puis 99€/mois pour des annonces illimitées.
            </p>
          </div>

          {/* Informations de l'établissement */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations de l'établissement</h2>
            
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
                  L'adresse exacte ne sera pas affichée publiquement (quartier uniquement)
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
                <p className="text-xs text-gray-500 mt-1">
                  Cette description sera visible par les talents
                </p>
              </div>
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
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Création...' : 'Créer mon établissement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
