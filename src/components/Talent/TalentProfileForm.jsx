import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, FRENCH_DEPARTMENTS } from '../../lib/supabase'

export default function TalentProfileForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    city: '',
    search_radius: 10,
    preferred_departments: [],
    position_types: [],
    years_experience: 0,
    contract_preferences: ['extra'],
    min_hourly_rate: '',
    bio: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePositionToggle = (position) => {
    setFormData(prev => ({
      ...prev,
      position_types: prev.position_types.includes(position)
        ? prev.position_types.filter(p => p !== position)
        : [...prev.position_types, position]
    }))
  }

  const handleDepartmentToggle = (department) => {
    setFormData(prev => ({
      ...prev,
      preferred_departments: prev.preferred_departments.includes(department)
        ? prev.preferred_departments.filter(d => d !== department)
        : [...prev.preferred_departments, department]
    }))
  }

  const handleContractToggle = (contract) => {
    setFormData(prev => ({
      ...prev,
      contract_preferences: prev.contract_preferences.includes(contract)
        ? prev.contract_preferences.filter(c => c !== contract)
        : [...prev.contract_preferences, contract]
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

      // Générer les initiales
      const initials = `${formData.first_name[0]}${formData.last_name[0]}`.toUpperCase()

      // Pour l'instant, on utilise des coordonnées par défaut (Paris)
      // On ajoutera la vraie géolocalisation plus tard
      const defaultLocation = 'POINT(2.3522 48.8566)' // Paris

      // Créer le profil talent
      const { data, error } = await supabase
        .from('talents')
        .insert({
          user_id: user.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          location: defaultLocation,
          search_radius: parseInt(formData.search_radius),
          preferred_departments: formData.preferred_departments,
          position_types: formData.position_types,
          years_experience: parseInt(formData.years_experience),
          contract_preferences: formData.contract_preferences,
          min_hourly_rate: formData.min_hourly_rate ? parseFloat(formData.min_hourly_rate) : null,
          bio: formData.bio || null,
          avatar_initials: initials
        })
        .select()
        .single()

      if (error) throw error

      // Rediriger vers le dashboard
      alert('Profil créé avec succès !')
      window.location.href = '/talent'
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
          <h1 className="text-3xl font-bold text-gray-900">👤 Créer mon profil Talent</h1>
          <p className="text-gray-600 mt-2">Complétez votre profil pour recevoir des offres de missions</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Informations personnelles */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="input"
                  required
                />
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
                  placeholder="06 12 34 56 78"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Paris"
                  className="input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Rayon de recherche */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rayon de recherche : {formData.search_radius} km
            </label>
            <input
              type="range"
              name="search_radius"
              min="5"
              max="50"
              step="5"
              value={formData.search_radius}
              onChange={handleChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Départements préférés */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Départements de recherche (optionnel)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Sélectionnez les départements où vous souhaitez trouver des missions. Laissez vide pour voir toutes les missions.
            </p>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {FRENCH_DEPARTMENTS.map(dept => (
                <button
                  key={dept.value}
                  type="button"
                  onClick={() => handleDepartmentToggle(dept.value)}
                  className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                    formData.preferred_departments.includes(dept.value)
                      ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {dept.value}
                </button>
              ))}
            </div>
            {formData.preferred_departments.length > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                ✓ {formData.preferred_departments.length} département(s) sélectionné(s)
              </p>
            )}
          </div>

          {/* Types de postes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Types de postes recherchés * (sélectionnez au moins 1)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {POSITION_TYPES.slice(0, 12).map(position => (
                <button
                  key={position.value}
                  type="button"
                  onClick={() => handlePositionToggle(position.value)}
                  className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                    formData.position_types.includes(position.value)
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {position.label}
                </button>
              ))}
            </div>
            {formData.position_types.length === 0 && (
              <p className="text-xs text-red-600 mt-1">Sélectionnez au moins un type de poste</p>
            )}
          </div>

          {/* Expérience */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Années d'expérience
              </label>
              <select
                name="years_experience"
                value={formData.years_experience}
                onChange={handleChange}
                className="input"
              >
                <option value="0">Débutant</option>
                <option value="1">1 an</option>
                <option value="2">2 ans</option>
                <option value="3">3 ans</option>
                <option value="5">5 ans</option>
                <option value="10">10 ans et +</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarif horaire minimum (€)
              </label>
              <input
                type="number"
                name="min_hourly_rate"
                value={formData.min_hourly_rate}
                onChange={handleChange}
                placeholder="12.50"
                step="0.50"
                min="0"
                className="input"
              />
            </div>
          </div>

          {/* Préférences de contrat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Types de contrats acceptés
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CONTRACT_TYPES.slice(0, 4).map(contract => (
                <button
                  key={contract.value}
                  type="button"
                  onClick={() => handleContractToggle(contract.value)}
                  className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                    formData.contract_preferences.includes(contract.value)
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {contract.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio / Présentation (200 caractères max)
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              maxLength={200}
              rows={3}
              className="input"
              placeholder="Parlez de vous, vos points forts, votre motivation..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.bio.length} / 200 caractères
            </p>
          </div>

          {/* Bouton submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/talent')}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || formData.position_types.length === 0}
              className="btn-primary flex-1"
            >
              {loading ? 'Création...' : 'Créer mon profil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
