import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, DURATION_TYPES, URGENCY_LEVELS, generateFuzzyLocation } from '../../lib/supabase'

export default function MissionForm({ onMissionCreated }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [checkingAccess, setCheckingAccess] = useState(true)

  // Vérifier IMMÉDIATEMENT si le resto peut créer une mission
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { navigate('/login'); return }

        const { data: establishment } = await supabase
          .from('establishments')
          .select('subscription_status, subscription_plan, missions_used, missions_credit, subscription_ends_at')
          .eq('user_id', user.id)
          .single()

        if (!establishment) { navigate('/establishment'); return }

        const status = establishment.subscription_status
        const missionsUsed = establishment.missions_used || 0
        const missionsCredit = establishment.missions_credit || 0
        const FREEMIUM_MAX_MISSIONS = 2

        // Premium ou abonnement actif → accès libre
        if (status === 'active' || status === 'premium') {
          // Vérifier si abonnement saisonnier expiré
          if (establishment.subscription_plan === 'seasonal' && establishment.subscription_ends_at) {
            const endsAt = new Date(establishment.subscription_ends_at)
            if (new Date() > endsAt) {
              navigate('/establishment/subscribe')
              return
            }
          }
          setCheckingAccess(false)
          return
        }

        // A des crédits missions achetés → accès autorisé
        if (missionsCredit > 0) {
          setCheckingAccess(false)
          return
        }

        // Freemium avec missions gratuites restantes → accès autorisé
        if (status === 'freemium' && missionsUsed < FREEMIUM_MAX_MISSIONS) {
          setCheckingAccess(false)
          return
        }

        // Sinon → page d'abonnement
        navigate('/establishment/subscribe')
      } catch (err) {
        console.error('Erreur vérification accès:', err)
      } finally {
        setCheckingAccess(false)
      }
    }
    checkAccess()
  }, [])

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
    service_continu: true,
    nb_postes: 1
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
        .select('id, name, address, subscription_status, subscription_plan, missions_used, missions_credit')
        .eq('user_id', user.id)
        .single()

      if (!establishment) {
        throw new Error('Profil établissement introuvable')
      }

      if (!establishment.address) {
        throw new Error('Adresse de l\'établissement manquante. Veuillez compléter votre profil.')
      }

      const isFreemium = establishment.subscription_status === 'freemium'
      const missionsUsed = establishment.missions_used || 0
      const missionsCredit = establishment.missions_credit || 0
      const nbPostes = parseInt(formData.nb_postes) || 1

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
          nb_postes: parseInt(formData.nb_postes) || 1,
          nb_postes_pourvus: 0,
          status: 'open'
        })
        .select()
        .single()

      if (error) throw error

      // Incrémenter le compteur de missions si freemium
      if (isFreemium && missionsCredit <= 0) {
        const { error: updateError } = await supabase
          .from('establishments')
          .update({ missions_used: missionsUsed + 1 })
          .eq('id', establishment.id)

        if (updateError) {
          console.error('Erreur mise à jour compteur missions:', updateError)
        }
      }

      // Décrémenter les crédits missions si achat à la mission
      if (missionsCredit > 0 && establishment.subscription_status !== 'active' && establishment.subscription_status !== 'premium') {
        const { error: creditError } = await supabase
          .from('establishments')
          .update({ missions_credit: Math.max(0, missionsCredit - nbPostes) })
          .eq('id', establishment.id)

        if (creditError) {
          console.error('Erreur déduction crédits:', creditError)
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

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification en cours...</p>
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

            {/* Nombre de postes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de postes à pourvoir *
              </label>
              <div className="flex items-center gap-3">
                <select
                  name="nb_postes"
                  value={formData.nb_postes}
                  onChange={handleChange}
                  className="input w-32"
                  required
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">
                  {formData.nb_postes > 1 
                    ? `👥 ${formData.nb_postes} personnes recherchées pour ce poste`
                    : '👤 1 personne recherchée'
                  }
                </span>
              </div>
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
