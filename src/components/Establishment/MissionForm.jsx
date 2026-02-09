import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, DURATION_TYPES, URGENCY_LEVELS, generateFuzzyLocation } from '../../lib/supabase'

export default function MissionForm({ onMissionCreated }) {
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
    salary_type: 'hourly',
    salary_text: '',
    urgency_level: 'a_venir',
    comment: '',
    service_continu: true
  })

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
    // Chercher un code postal (5 chiffres)
    const match = address.match(/\b(\d{5})\b/)
    if (match) {
      const postalCode = match[1]
      // Les 2 premiers chiffres = département (sauf Corse: 20 → 2A/2B)
      const dept = postalCode.substring(0, 2)
      if (dept === '20') {
        // Corse : 20000-20190 = 2A, 20200-20620 = 2B
        return parseInt(postalCode) < 20200 ? '2A' : '2B'
      }
      return dept
    }
    return null
  }

  // Fonction pour notifier les talents qui matchent (poste + département)
  const notifyMatchingTalents = async (mission, establishmentName, establishmentAddress) => {
    try {
      // Extraire le département de l'adresse de l'établissement
      const missionDepartment = extractDepartmentFromAddress(establishmentAddress)
      console.log('Département de la mission:', missionDepartment)

      // Chercher les talents dont le position_types contient le poste de la mission
      const { data: matchingTalents, error: talentsError } = await supabase
        .from('talents')
        .select('id, user_id, first_name, position_types, preferred_departments')
        .contains('position_types', [mission.position])

      if (talentsError) {
        console.error('Erreur recherche talents:', talentsError)
        return
      }

      if (!matchingTalents || matchingTalents.length === 0) {
        console.log('Aucun talent ne matche avec cette mission')
        return
      }

      // Filtrer les talents par département
      const talentsInDepartment = matchingTalents.filter(talent => {
        // Si le talent n'a pas de départements préférés, il reçoit toutes les notifications
        if (!talent.preferred_departments || talent.preferred_departments.length === 0) {
          return true
        }
        // Sinon, vérifier si le département de la mission est dans ses préférences
        return missionDepartment && talent.preferred_departments.includes(missionDepartment)
      })

      if (talentsInDepartment.length === 0) {
        console.log('Aucun talent dans ce département ne matche')
        return
      }

      // Trouver le label du poste
      const positionLabel = POSITION_TYPES.find(p => p.value === mission.position)?.label || mission.position

      // Créer une notification pour chaque talent qui matche
      const notifications = talentsInDepartment.map(talent => ({
        user_id: talent.user_id,
        type: 'new_mission',
        title: '🎯 Nouvelle mission disponible !',
        content: `Une mission "${positionLabel}" correspond à votre profil - ${establishmentName}`,
        link: '/talent/missions',
        read: false
      }))

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        console.error('Erreur création notifications:', notifError)
      } else {
        console.log(`${notifications.length} talents notifiés (sur ${matchingTalents.length} qui matchent le poste)`)
      }
    } catch (err) {
      console.error('Erreur notification talents:', err)
    }
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
        .select('id, name, address, subscription_status, trial_ends_at, missions_used')
        .eq('user_id', user.id)
        .single()

      if (!establishment) {
        throw new Error('Profil établissement introuvable')
      }

      if (!establishment.address) {
        throw new Error('Adresse de l\'établissement manquante. Veuillez compléter votre profil.')
      }

      // Vérifier les limites freemium
      const isFreemium = establishment.subscription_status === 'freemium'
      const trialEndsAt = establishment.trial_ends_at ? new Date(establishment.trial_ends_at) : null
      const isTrialExpired = trialEndsAt && trialEndsAt < new Date()
      const missionsUsed = establishment.missions_used || 0
      const FREEMIUM_MAX_MISSIONS = 2

      if (isFreemium) {
        if (isTrialExpired) {
          throw new Error('Votre période d\'essai est terminée. Passez à l\'abonnement Premium pour continuer.')
        }
        if (missionsUsed >= FREEMIUM_MAX_MISSIONS) {
          throw new Error(`Vous avez atteint la limite de ${FREEMIUM_MAX_MISSIONS} missions en offre Freemium. Passez à Premium pour publier plus de missions.`)
        }
      }

      // Générer la localisation floue à partir de l'adresse
      const fuzzyLocation = generateFuzzyLocation(establishment.address)

      // Créer la mission et récupérer les données insérées
      const { data: newMission, error } = await supabase
        .from('missions')
        .insert({
          establishment_id: establishment.id,
          position: formData.position,
          location_fuzzy: fuzzyLocation,
          location_exact: establishment.address,
          search_radius: 10,
          duration_type: formData.duration_type,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          shift_start_time: formData.shift_start_time || null,
          shift_end_time: formData.shift_end_time || null,
          break_duration: 0,
          work_days: [],
          hourly_rate: formData.salary_type === 'hourly' && formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          salary_text: formData.salary_type === 'other' ? formData.salary_text : null,
          contract_type: formData.contract_type,
          urgency_level: formData.urgency_level,
          comment: formData.comment || null,
          service_continu: formData.service_continu,
          status: 'open'
        })
        .select()
        .single()

      if (error) throw error

      // Incrémenter le compteur de missions si freemium
      if (isFreemium) {
        const { error: updateError } = await supabase
          .from('establishments')
          .update({ missions_used: missionsUsed + 1 })
          .eq('id', establishment.id)

        if (updateError) {
          console.error('Erreur mise à jour compteur missions:', updateError)
        }
      }

      // Notifier les talents qui matchent (notifications in-app)
      await notifyMatchingTalents(newMission, establishment.name, establishment.address)

      // Callback pour mettre à jour le dashboard
      if (onMissionCreated) {
        onMissionCreated()
      }

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
                <option value="">Sélectionner un poste</option>
                {POSITION_TYPES.map(pos => (
                  <option key={pos.value} value={pos.value}>
                    {pos.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Planning */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Planning</h3>
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

              {/* Service continu ou avec coupure - Boutons radio */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Type de service
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="service_continu"
                      checked={formData.service_continu === true}
                      onChange={() => setFormData(prev => ({ ...prev, service_continu: true }))}
                      className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-gray-900">Service continu</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="service_continu"
                      checked={formData.service_continu === false}
                      onChange={() => setFormData(prev => ({ ...prev, service_continu: false }))}
                      className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-gray-900">Avec coupure</span>
                  </label>
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
            
            {/* Toggle Horaire / Autre */}
            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, salary_type: 'hourly', salary_text: '' }))}
                className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.salary_type === 'hourly'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                💰 Tarif horaire
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, salary_type: 'other', hourly_rate: '' }))}
                className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.salary_type === 'other'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                📝 Autre
              </button>
            </div>

            {formData.salary_type === 'hourly' ? (
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
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Précisez la rémunération *
                </label>
                <input
                  type="text"
                  name="salary_text"
                  value={formData.salary_text}
                  onChange={handleChange}
                  placeholder="Ex : 150€/jour, À négocier, Selon profil, 2000€ brut/mois..."
                  className="input"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Décrivez librement la rémunération proposée
                </p>
              </div>
            )}
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
