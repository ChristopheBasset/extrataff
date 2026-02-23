import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, generateFuzzyLocation } from '../../lib/supabase'

export default function MissionForm({ onMissionCreated }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [establishment, setEstablishment] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Charger l'établissement et vérifier l'accès
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { navigate('/login'); return }

        const { data: est } = await supabase
          .from('establishments')
          .select('id, name, address, subscription_status, subscription_plan, missions_used, missions_credit, missions_included_used')
          .eq('user_id', user.id)
          .single()

        if (!est) { navigate('/establishment'); return }

        setEstablishment(est)
        setCheckingAccess(false)
      } catch (err) {
        console.error('Erreur vérification accès:', err)
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
    hourly_rate: '',
    salary_type: 'hourly',
    salary_text: '',
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

  // ===== CALCULS AUTOMATIQUES =====

  // Détection urgente : date de début = aujourd'hui (J) ou demain (J+1)
  const isUrgent = useMemo(() => {
    if (!formData.start_date) return false
    const now = new Date()
    const startDate = new Date(formData.start_date)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)
    // Normaliser les dates pour comparer juste les jours
    startDate.setHours(0, 0, 0, 0)
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    return startDate >= todayStart && startDate <= tomorrow
  }, [formData.start_date])

  // Calcul durée en jours
  const durationDays = useMemo(() => {
    if (!formData.start_date) return null
    if (!formData.end_date) return 1
    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 1
  }, [formData.start_date, formData.end_date])

  // Déterminer le tarif et le type de paiement
  const paymentInfo = useMemo(() => {
    if (!establishment) return null

    const status = establishment.subscription_status
    const plan = establishment.subscription_plan
    const missionsUsed = establishment.missions_used || 0
    const missionIncluded = establishment.missions_included_used === false
    const FREEMIUM_MAX = 1

    // Abonné Club
    if (status === 'active' && plan === 'club') {
      if (missionIncluded) {
        return {
          type: 'club_included',
          price: 0,
          label: 'Incluse dans votre Club',
          description: 'Cette mission est comprise dans votre abonnement Club ExtraTaff',
          canCreate: true
        }
      }
      return {
        type: 'club_extra',
        price: 10.80,
        priceHT: 9.00,
        label: isUrgent ? 'Mission urgente — Tarif Club' : 'Mission supplémentaire — Tarif Club',
        description: `${isUrgent ? '⚡ Mission urgente' : 'Mission supplémentaire'} à 10,80€ TTC (9€ HT) grâce à votre abonnement Club`,
        canCreate: false // Paiement requis
      }
    }

    // Freemium avec missions gratuites restantes
    if (status === 'freemium' && missionsUsed < FREEMIUM_MAX) {
      return {
        type: 'freemium',
        price: 0,
        label: `Mission gratuite (${missionsUsed + 1}/${FREEMIUM_MAX})`,
        description: `Il vous reste ${FREEMIUM_MAX - missionsUsed} mission${FREEMIUM_MAX - missionsUsed > 1 ? 's' : ''} gratuite${FREEMIUM_MAX - missionsUsed > 1 ? 's' : ''}`,
        canCreate: true
      }
    }

    // Non-abonné (freemium épuisé ou pas d'abo)
    if (isUrgent) {
      return {
        type: 'no_sub_urgent',
        price: 30.00,
        priceHT: 25.00,
        label: 'Mission urgente',
        description: '⚡ Mission urgente — 30€ TTC (25€ HT)',
        canCreate: false,
        clubSaving: '21€ d\'économie avec le Club ExtraTaff'
      }
    }

    return {
      type: 'no_sub_normal',
      price: 21.60,
      priceHT: 18.00,
      label: 'Mission normale',
      description: 'Mission — 21,60€ TTC (18€ HT)',
      canCreate: false,
      clubSaving: '10,80€ avec le Club (ou incluse si 1ère du mois)'
    }
  }, [establishment, isUrgent])

  // ===== FONCTIONS =====

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

  const notifyMatchingTalents = async (mission, establishmentName, establishmentAddress) => {
    try {
      const missionDepartment = extractDepartmentFromAddress(establishmentAddress)

      const { data: matchingTalents, error: talentsError } = await supabase
        .from('talents')
        .select('id, user_id, first_name, position_types, preferred_departments')
        .contains('position_types', [mission.position])

      if (talentsError || !matchingTalents || matchingTalents.length === 0) return

      const talentsInDepartment = matchingTalents.filter(talent => {
        if (!talent.preferred_departments || talent.preferred_departments.length === 0) return true
        return missionDepartment && talent.preferred_departments.includes(missionDepartment)
      })

      if (talentsInDepartment.length === 0) return

      const positionLabel = POSITION_TYPES.find(p => p.value === mission.position)?.label || mission.position
      const urgentPrefix = mission.is_urgent ? '🔴 URGENT — ' : '🎯 '

      const notifications = talentsInDepartment.map(talent => ({
        user_id: talent.user_id,
        type: 'new_mission',
        title: `${urgentPrefix}Nouvelle mission disponible !`,
        content: `Une mission "${positionLabel}" correspond à votre profil - ${establishmentName}`,
        link: '/talent/missions',
        read: false
      }))

      await supabase.from('notifications').insert(notifications)
      console.log(`${notifications.length} talents notifiés`)
    } catch (err) {
      console.error('Erreur notification talents:', err)
    }
  }

  // Créer la mission en base (statut dépend du paiement)
  const createMission = async (status = 'open') => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!establishment.address) {
      throw new Error('Adresse de l\'établissement manquante. Veuillez compléter votre profil.')
    }

    const fuzzyLocation = generateFuzzyLocation(establishment.address)

    const { data: newMission, error } = await supabase
      .from('missions')
      .insert({
        establishment_id: establishment.id,
        position: formData.position,
        location_fuzzy: fuzzyLocation,
        location_exact: establishment.address,
        search_radius: 10,
        duration_type: durationDays === 1 ? 'ponctuel' : 'courte_duree',
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        shift_start_time: formData.shift_start_time || null,
        shift_end_time: formData.shift_end_time || null,
        break_duration: 0,
        work_days: [],
        hourly_rate: formData.salary_type === 'hourly' && formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        salary_text: formData.salary_type === 'other' ? formData.salary_text : null,
        contract_type: formData.contract_type,
        urgency_level: isUrgent ? 'urgent' : 'a_venir',
        is_urgent: isUrgent,
        comment: formData.comment || null,
        service_continu: formData.service_continu,
        nb_postes: parseInt(formData.nb_postes) || 1,
        nb_postes_pourvus: 0,
        status: status,
        payment_status: status === 'open' ? 'paid' : 'pending'
      })
      .select()
      .single()

    if (error) throw error
    return newMission
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!paymentInfo) return

    // Si paiement requis → afficher la modale de confirmation
    if (!paymentInfo.canCreate) {
      setShowPaymentModal(true)
      return
    }

    // Sinon → créer directement (freemium ou club incluse)
    await handleDirectCreate()
  }

  // Création directe (gratuite : freemium ou mission incluse club)
  const handleDirectCreate = async () => {
    setLoading(true)
    setError(null)

    try {
      const newMission = await createMission('open')

      // Mise à jour selon le type
      if (paymentInfo.type === 'freemium') {
        await supabase
          .from('establishments')
          .update({ missions_used: (establishment.missions_used || 0) + 1 })
          .eq('id', establishment.id)
      }

      if (paymentInfo.type === 'club_included') {
        await supabase
          .from('establishments')
          .update({ missions_included_used: true })
          .eq('id', establishment.id)
      }

      // Notifier les talents
      await notifyMatchingTalents(newMission, establishment.name, establishment.address)

      if (onMissionCreated) onMissionCreated()
      alert('Mission créée avec succès ! 🎉')
      navigate('/establishment')
    } catch (err) {
      console.error('Erreur création mission:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Création avec paiement Stripe
  const handlePaidCreate = async () => {
    setLoading(true)
    setError(null)

    try {
      // Créer la mission en statut "pending" (en attente de paiement)
      const newMission = await createMission('pending')

      // Déterminer le plan_type Stripe
      let planType
      if (paymentInfo.type === 'club_extra') {
        planType = 'mission_club_extra'
      } else if (paymentInfo.type === 'no_sub_urgent') {
        planType = 'mission_urgent'
      } else {
        planType = 'mission_normal'
      }

      // Appeler l'Edge Function pour créer la session Stripe
      const { data: { session } } = await supabase.auth.refreshSession()
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            establishment_id: establishment.id,
            plan_type: planType,
            mission_id: newMission.id,
            is_urgent: isUrgent
          })
        }
      )

      const data = await response.json()

      if (!response.ok || data.error) {
        // Si erreur Stripe, supprimer la mission en pending
        await supabase.from('missions').delete().eq('id', newMission.id)
        throw new Error(data.error || 'Erreur lors de la création du paiement')
      }

      if (!data.url) {
        await supabase.from('missions').delete().eq('id', newMission.id)
        throw new Error('URL de paiement non reçue')
      }

      // Rediriger vers Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      console.error('Erreur paiement:', err)
      setError(err.message)
      setShowPaymentModal(false)
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

          {/* Planning — Dates & Horaires */}
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
                    min={formData.start_date || undefined}
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Laissez vide pour une mission d'1 jour
                  </p>
                </div>
              </div>

              {/* Durée calculée + Badge urgent */}
              {formData.start_date && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full">
                    📅 {durationDays} jour{durationDays > 1 ? 's' : ''}
                  </span>
                  {isUrgent && (
                    <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-sm font-bold px-3 py-1.5 rounded-full animate-pulse">
                      ⚡ Mission urgente
                    </span>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure de début *
                  </label>
                  <input
                    type="time"
                    name="shift_start_time"
                    value={formData.shift_start_time}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure de fin *
                  </label>
                  <input
                    type="time"
                    name="shift_end_time"
                    value={formData.shift_end_time}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
              </div>

              {/* Service continu ou avec coupure */}
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
          </div>

          {/* Rémunération */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rémunération</h3>
            
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
              </div>
            )}
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

          {/* Encart tarif / statut */}
          {paymentInfo && (
            <div className={`rounded-xl p-4 border ${
              paymentInfo.price === 0 
                ? 'bg-green-50 border-green-200' 
                : isUrgent 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-semibold ${
                    paymentInfo.price === 0 ? 'text-green-800' : isUrgent ? 'text-red-800' : 'text-blue-800'
                  }`}>
                    {paymentInfo.label}
                  </p>
                  <p className={`text-sm mt-0.5 ${
                    paymentInfo.price === 0 ? 'text-green-600' : isUrgent ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {paymentInfo.description}
                  </p>
                </div>
                {paymentInfo.price > 0 && (
                  <span className={`text-2xl font-bold ${isUrgent ? 'text-red-700' : 'text-blue-700'}`}>
                    {paymentInfo.price.toFixed(2)}€
                  </span>
                )}
              </div>
              {paymentInfo.clubSaving && (
                <div className="mt-3 pt-3 border-t border-amber-200 bg-amber-50 -mx-4 -mb-4 px-4 py-3 rounded-b-xl">
                  <p className="text-sm text-amber-800">
                    💡 <strong>Astuce :</strong> {paymentInfo.clubSaving}
                    <button 
                      type="button"
                      onClick={() => navigate('/establishment/subscribe')} 
                      className="ml-2 text-primary-600 font-semibold underline"
                    >
                      Voir le Club
                    </button>
                  </p>
                </div>
              )}
            </div>
          )}

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
              {loading ? 'Création...' : (
                paymentInfo?.price > 0 
                  ? `Publier — ${paymentInfo.price.toFixed(2)}€`
                  : 'Publier la mission'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modale de confirmation de paiement */}
      {showPaymentModal && paymentInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">{isUrgent ? '⚡' : '📋'}</div>
              <h3 className="text-xl font-bold text-gray-900">Confirmer la publication</h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Poste</span>
                <span className="font-medium text-gray-900">
                  {POSITION_TYPES.find(p => p.value === formData.position)?.label || formData.position}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date</span>
                <span className="font-medium text-gray-900">
                  {new Date(formData.start_date).toLocaleDateString('fr-FR')}
                  {formData.end_date && ` → ${new Date(formData.end_date).toLocaleDateString('fr-FR')}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Durée</span>
                <span className="font-medium text-gray-900">{durationDays} jour{durationDays > 1 ? 's' : ''}</span>
              </div>
              {isUrgent && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type</span>
                  <span className="font-bold text-red-600">⚡ Urgente</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between">
                <span className="font-bold text-gray-900">Total</span>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-primary-600">{paymentInfo.price.toFixed(2)}€</span>
                  <span className="text-xs text-gray-500 block">{paymentInfo.priceHT?.toFixed(2)}€ HT</span>
                </div>
              </div>
            </div>

            {/* Suggestion Club pour les non-abonnés */}
            {paymentInfo.clubSaving && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-amber-800">
                  💡 <strong>Avec le Club :</strong> {paymentInfo.clubSaving}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={loading}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handlePaidCreate}
                disabled={loading}
                className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Paiement...
                  </span>
                ) : (
                  `Payer ${paymentInfo.price.toFixed(2)}€`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
