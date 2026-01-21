import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, DURATION_TYPES, URGENCY_LEVELS, generateFuzzyLocation } from '../../lib/supabase'

export default function MissionForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    position: '',
    start_date: '',
    end_date: '',
    shift_start_time: '',
    shift_end_time: '',
    contract_type: 'extra',
    duration_type: 'ponctuel',
    hourly_rate: '',
    urgency_level: 'a_venir',
    comment: ''
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
      // Récupérer le profil établissement
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id, address')
        .eq('user_id', user.id)
        .single()

      if (!establishment) {
        throw new Error('Profil établissement introuvable')
      }

      if (!establishment.address) {
        throw new Error('Adresse de l\'établissement manquante. Veuillez compléter votre profil.')
      }

      // Générer la localisation floue à partir de l'adresse
      const fuzzyLocation = generateFuzzyLocation(establishment.address)

      // Créer la mission
      const { error } = await supabase
        .from('missions')
        .insert({
          establishment_id: establishment.id,
          position: formData.position,
          location_fuzzy: fuzzyLocation, // Localisation floue (ville)
          location_exact: establishment.address, // Adresse complète
          search_radius: 10, // Par défaut 10km
          duration_type: formData.duration_type,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          shift_start_time: formData.shift_start_time || null,
          shift_end_time: formData.shift_end_time || null,
          break_duration: 0, // Toujours 0, champ déprécié
          work_days: [], // On ajoutera plus tard
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          contract_type: formData.contract_type,
          urgency_level: formData.urgency_level,
          comment: formData.comment || null,
          status: 'open'
        })

      if (error) throw error

      alert('Mission créée avec succès ! 🎉')
      navigate('/establishment')
    } catch (err) {
      console.error('Erreur création mission:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
          <h2 className="text-3xl font-bold text-gray-900">Créer une mission</h2>
          <p className="text-gray-600 mt-2">Publiez votre annonce et recevez des candidatures</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Poste recherché */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Poste recherché</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de poste *
              </label>
              <select
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Sélectionnez un poste</option>
                {POSITION_TYPES.map(position => (
                  <option key={position.value} value={position.value}>
                    {position.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates et horaires */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dates et horaires</h3>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Laissez vide pour une mission ponctuelle
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure de début
                  </label>
                  <input
                    type="time"
                    name="shift_start_time"
                    value={formData.shift_start_time}
                    onChange={handleChange}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure de fin
                  </label>
                  <input
                    type="time"
                    name="shift_end_time"
                    value={formData.shift_end_time}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Type de contrat */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Type de contrat</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contrat *
                </label>
                <select
                  name="contract_type"
                  value={formData.contract_type}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  {CONTRACT_TYPES.map(contract => (
                    <option key={contract.value} value={contract.value}>
                      {contract.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durée *
                </label>
                <select
                  name="duration_type"
                  value={formData.duration_type}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  {DURATION_TYPES.map(duration => (
                    <option key={duration.value} value={duration.value}>
                      {duration.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Rémunération */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rémunération</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarif horaire (€)
              </label>
              <input
                type="number"
                name="hourly_rate"
                value={formData.hourly_rate}
                onChange={handleChange}
                placeholder="12.50"
                step="0.50"
                min="0"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Laissez vide pour ne pas afficher le tarif
              </p>
            </div>
          </div>

          {/* Urgence */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Niveau d'urgence</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, urgency_level: 'urgent' }))}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  formData.urgency_level === 'urgent'
                    ? 'border-orange-600 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">🔴</div>
                <div className="font-semibold">Urgent</div>
                <div className="text-xs text-gray-600 mt-1">Aujourd'hui / Demain</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, urgency_level: 'a_venir' }))}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  formData.urgency_level === 'a_venir'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">🟢</div>
                <div className="font-semibold">Normal</div>
                <div className="text-xs text-gray-600 mt-1">À venir</div>
              </button>
            </div>
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Informations complémentaires (200 caractères max)
            </label>
            <textarea
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              maxLength={200}
              rows={3}
              className="input"
              placeholder="Précisez vos attentes, l'ambiance, les tâches spécifiques..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.comment.length} / 200 caractères
            </p>
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
              {loading ? 'Création...' : 'Publier la mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
