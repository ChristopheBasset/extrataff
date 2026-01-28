import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, DURATION_TYPES, generateFuzzyLocation } from '../../lib/supabase'

export default function EditMissionForm() {
  const navigate = useNavigate()
  const { missionId } = useParams()
  const [loading, setLoading] = useState(false)
  const [loadingMission, setLoadingMission] = useState(true)
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
    comment: '',
    service_continu: false // Nouveau champ
  })

  useEffect(() => {
    loadMission()
  }, [missionId])

  const loadMission = async () => {
    try {
      const { data: mission, error } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single()

      if (error) throw error

      setFormData({
        position: mission.position || '',
        start_date: '', // Laisser vide pour forcer l'utilisateur à choisir une nouvelle date
        end_date: '',
        shift_start_time: mission.shift_start_time?.slice(0, 5) || '',
        shift_end_time: mission.shift_end_time?.slice(0, 5) || '',
        contract_type: mission.contract_type || 'extra',
        duration_type: mission.duration_type || 'ponctuel',
        hourly_rate: mission.hourly_rate || '',
        urgency_level: mission.urgency_level || 'a_venir',
        comment: mission.comment || '',
        service_continu: mission.service_continu || false
      })
    } catch (err) {
      console.error('Erreur chargement mission:', err)
      setError('Mission introuvable')
    } finally {
      setLoadingMission(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Fonction pour extraire le département d'une adresse
  const extractDepartmentFromAddress = (address) => {
    if (!address) return null
    const match = address.match(/\b(\d{5})\b/)
    if (match) {
      const postalCode = match[1]
      const dept = postalCode.substring(0, 2)
      if (dept === '20') {
        return parseInt(postalCode) < 20200 ? '2A' : '2B'
      }
      return dept
    }
    return null
  }

  // Fonction pour notifier les talents qui matchent
  const notifyMatchingTalents = async (mission, establishmentName, establishmentAddress) => {
    try {
      const missionDepartment = extractDepartmentFromAddress(establishmentAddress)

      const { data: matchingTalents, error: talentsError } = await supabase
        .from('talents')
        .select('id, user_id, first_name, position_types, preferred_departments')
        .contains('position_types', [mission.position])

      if (talentsError || !matchingTalents || matchingTalents.length === 0) {
        return
      }

      const talentsInDepartment = matchingTalents.filter(talent => {
        if (!talent.preferred_departments || talent.preferred_departments.length === 0) {
          return true
        }
        return missionDepartment && talent.preferred_departments.includes(missionDepartment)
      })

      if (talentsInDepartment.length === 0) return

      const positionLabel = POSITION_TYPES.find(p => p.value === mission.position)?.label || mission.position

      const notifications = talentsInDepartment.map(talent => ({
        user_id: talent.user_id,
        type: 'new_mission',
        title: '🎯 Nouvelle mission disponible !',
        content: `Une mission "${positionLabel}" correspond à votre profil - ${establishmentName}`,
        link: '/talent/missions',
        read: false
      }))

      await supabase.from('notifications').insert(notifications)
    } catch (err) {
      console.error('Erreur notification talents:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Vérifier que la date est définie
      if (!formData.start_date) {
        throw new Error('Veuillez définir une date de début pour la mission')
      }

      // Récupérer le profil établissement
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id, name, address')
        .eq('user_id', user.id)
        .single()

      if (!establishment) {
        throw new Error('Profil établissement introuvable')
      }

      if (!establishment.address) {
        throw new Error('Adresse de l\'établissement manquante. Veuillez compléter votre profil.')
      }

      const fuzzyLocation = generateFuzzyLocation(establishment.address)

      // Mettre à jour la mission
      const { data: updatedMission, error } = await supabase
        .from('missions')
        .update({
          position: formData.position,
          location_fuzzy: fuzzyLocation,
          location_exact: establishment.address,
          duration_type: formData.duration_type,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          shift_start_time: formData.shift_start_time || null,
          shift_end_time: formData.shift_end_time || null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          contract_type: formData.contract_type,
          urgency_level: formData.urgency_level,
          comment: formData.comment || null,
          service_continu: formData.service_continu,
          status: 'open',
          archived_at: null // Désarchiver la mission
        })
        .eq('id', missionId)
        .select()
        .single()

      if (error) throw error

      // Notifier les talents qui matchent
      await notifyMatchingTalents(updatedMission, establishment.name, establishment.address)

      alert('Mission relancée avec succès ! 🎉')
      navigate('/establishment/missions')
    } catch (err) {
      console.error('Erreur modification mission:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingMission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la mission...</p>
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
              onClick={() => navigate('/establishment/missions')}
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
          <h2 className="text-3xl font-bold text-gray-900">🔄 Relancer la mission</h2>
          <p className="text-gray-600 mt-2">Modifiez les détails et republiez votre annonce</p>
        </div>

        {/* Bannière info */}
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
          <p className="font-medium">💡 Mission relancée</p>
          <p className="text-sm mt-1">
            Les informations de l'ancienne mission ont été conservées. 
            Mettez à jour les dates et horaires avant de republier.
          </p>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Nouvelles dates et horaires</h3>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début * <span className="text-orange-600">(obligatoire)</span>
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="input border-orange-300"
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

              {/* Service continu ou avec coupure */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="service_continu"
                    checked={formData.service_continu}
                    onChange={handleChange}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Service continu</span>
                    <p className="text-sm text-gray-500">
                      {formData.service_continu 
                        ? '✅ Sans coupure (service en continu)' 
                        : '⏸️ Avec coupure (service coupé)'}
                    </p>
                  </div>
                </label>
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
              onClick={() => navigate('/establishment/missions')}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Publication...' : '🔄 Relancer la mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
