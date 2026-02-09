import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES } from '../../lib/supabase'

export default function EstablishmentHired({ establishmentId, onBack }) {
  const navigate = useNavigate()
  const [hires, setHires] = useState([])
  const [loading, setLoading] = useState(true)
  const [existingRatings, setExistingRatings] = useState({}) // application_id -> rating

  // Modal notation
  const [ratingModal, setRatingModal] = useState(null) // { hire, score, comment }
  const [ratingSubmitting, setRatingSubmitting] = useState(false)

  useEffect(() => {
    if (establishmentId) loadHires()
  }, [establishmentId])

  const loadHires = async () => {
    setLoading(true)
    try {
      // Récupérer toutes les missions de l'établissement
      const { data: missions } = await supabase
        .from('missions')
        .select('id, position, start_date, end_date, shift_start_time, shift_end_time, hourly_rate, salary_text, service_continu')
        .eq('establishment_id', establishmentId)

      if (!missions || missions.length === 0) {
        setHires([])
        setLoading(false)
        return
      }

      const missionIds = missions.map(m => m.id)

      // Récupérer les candidatures confirmées
      const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .in('mission_id', missionIds)
        .eq('status', 'confirmed')
        .order('updated_at', { ascending: false })

      if (error) throw error

      if (!apps || apps.length === 0) {
        setHires([])
        setLoading(false)
        return
      }

      // Récupérer les infos des talents
      const talentIds = [...new Set(apps.map(a => a.talent_id))]
      const { data: talents } = await supabase
        .from('talents')
        .select('id, user_id, first_name, last_name, phone, email, years_experience')
        .in('id', talentIds)

      // Enrichir
      const enriched = apps.map(app => {
        const mission = missions.find(m => m.id === app.mission_id)
        const talent = talents?.find(t => t.id === app.talent_id)
        return { ...app, mission, talent }
      })

      setHires(enriched)

      // Charger les notes existantes pour ces candidatures
      const appIds = apps.map(a => a.id)
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('*')
        .in('application_id', appIds)

      if (ratingsData) {
        const ratingsMap = {}
        ratingsData.forEach(r => { ratingsMap[r.application_id] = r })
        setExistingRatings(ratingsMap)
      }
    } catch (err) {
      console.error('Erreur chargement embauches:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChat = (applicationId) => {
    navigate(`/establishment/chat/${applicationId}`)
  }

  // Vérifier si la mission est terminée
  const isMissionEnded = (mission) => {
    if (!mission) return false
    const endDate = mission.end_date || mission.start_date
    if (!endDate) return false
    const end = new Date(endDate)
    end.setHours(23, 59, 59)
    return end < new Date()
  }

  // Ouvrir la modal de notation
  const openRatingModal = (hire) => {
    setRatingModal({ hire, score: 0, comment: '' })
  }

  // Soumettre la note
  const submitRating = async () => {
    if (!ratingModal || ratingModal.score === 0) return

    setRatingSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('ratings')
        .insert({
          mission_id: ratingModal.hire.mission_id,
          application_id: ratingModal.hire.id,
          rater_id: user.id,
          rated_id: ratingModal.hire.talent?.user_id || ratingModal.hire.talent_id,
          rating_type: 'establishment_to_talent',
          visibility: 'public',
          overall_score: ratingModal.score,
          comment: ratingModal.comment.trim() || null,
          created_at: new Date().toISOString()
        })

      if (error) throw error

      // Rafraîchir
      setRatingModal(null)
      await loadHires()
    } catch (err) {
      console.error('Erreur notation:', err)
      alert('Erreur lors de la notation : ' + err.message)
    } finally {
      setRatingSubmitting(false)
    }
  }

  // Composant étoiles interactif
  const StarRating = ({ score, onSelect, size = 'text-3xl', interactive = true }) => {
    const [hovered, setHovered] = useState(0)
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`${size} transition-transform ${interactive ? 'cursor-pointer hover:scale-110' : ''} ${
              star <= (hovered || score) ? 'text-yellow-400' : 'text-gray-300'
            }`}
            onClick={() => interactive && onSelect?.(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  // Helpers
  const getPositionLabel = (value) => {
    const found = POSITION_TYPES?.find(p => p.value === value)
    return found ? found.label : value || '—'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    return timeStr.substring(0, 5)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement des embauches...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Retour
        </button>
        <h2 className="text-3xl font-bold text-gray-900">Mes Embauches</h2>
        <button
          onClick={loadHires}
          className="ml-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
        >
          🔄
        </button>
      </div>

      {/* Liste vide */}
      {hires.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune embauche confirmée</h3>
          <p className="text-gray-600">Les talents validés apparaîtront ici après confirmation dans le chat.</p>
        </div>
      )}

      {/* Liste des embauches */}
      <div className="space-y-4">
        {hires.map(hire => (
          <div
            key={hire.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Info talent + mission */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-lg">
                      {hire.talent?.first_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {hire.talent?.first_name || '—'} {hire.talent?.last_name || ''}
                    </h3>
                    <div className="flex gap-3 text-sm text-gray-500">
                      {hire.talent?.phone && <span>📞 {hire.talent.phone}</span>}
                      {hire.talent?.email && <span>✉️ {hire.talent.email}</span>}
                      {hire.talent?.years_experience > 0 && (
                        <span>⭐ {hire.talent.years_experience} an{hire.talent.years_experience > 1 ? 's' : ''} d'exp.</span>
                      )}
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-auto">
                    ✅ Confirmé
                  </span>
                </div>

                {/* Mission */}
                {hire.mission && (
                  <div className="p-3 bg-green-50 rounded-lg text-sm">
                    <p className="font-medium text-gray-900">
                      {getPositionLabel(hire.mission.position)}
                    </p>
                    <p className="text-gray-600 mt-1">
                      📅 {formatDate(hire.mission.start_date)}
                      {hire.mission.end_date && ` → ${formatDate(hire.mission.end_date)}`}
                    </p>
                    {(hire.mission.shift_start_time || hire.mission.shift_end_time) && (
                      <p className="text-gray-600">
                        🕐 {formatTime(hire.mission.shift_start_time)}
                        {hire.mission.shift_end_time && ` - ${formatTime(hire.mission.shift_end_time)}`}
                        {hire.mission.service_continu ? ' (continu)' : ' (avec coupure)'}
                      </p>
                    )}
                    {hire.mission.hourly_rate ? (
                      <p className="text-gray-600">💰 {parseFloat(hire.mission.hourly_rate).toFixed(2)} €/h</p>
                    ) : hire.mission.salary_text ? (
                      <p className="text-gray-600">💰 {hire.mission.salary_text}</p>
                    ) : null}
                  </div>
                )}

                {/* Date de confirmation */}
                <p className="text-xs text-gray-400 mt-2">
                  Confirmé le {new Date(hire.updated_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleOpenChat(hire.id)}
                  className="px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-sm font-medium transition-colors"
                >
                  💬 Conversation
                </button>

                {/* Notation */}
                {existingRatings[hire.id] ? (
                  <div className="px-4 py-2 bg-yellow-50 rounded-lg text-center">
                    <div className="flex justify-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} className={`text-lg ${s <= existingRatings[hire.id].overall_score ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Noté</p>
                  </div>
                ) : isMissionEnded(hire.mission) ? (
                  <button
                    onClick={() => openRatingModal(hire)}
                    className="px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    ⭐ Noter
                  </button>
                ) : (
                  <p className="text-xs text-gray-400 text-center px-2">Notation disponible<br/>après la mission</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL NOTATION */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">⭐</div>
              <h3 className="text-xl font-bold text-gray-900">
                Noter {ratingModal.hire.talent?.first_name} {ratingModal.hire.talent?.last_name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {getPositionLabel(ratingModal.hire.mission?.position)} — {formatDate(ratingModal.hire.mission?.start_date)}
              </p>
            </div>

            {/* Étoiles */}
            <div className="flex justify-center mb-6">
              <StarRating
                score={ratingModal.score}
                onSelect={(score) => setRatingModal({ ...ratingModal, score })}
              />
            </div>

            {/* Labels */}
            <div className="text-center mb-4">
              {ratingModal.score === 1 && <p className="text-red-500 font-medium">Très insatisfait</p>}
              {ratingModal.score === 2 && <p className="text-orange-500 font-medium">Insatisfait</p>}
              {ratingModal.score === 3 && <p className="text-yellow-600 font-medium">Correct</p>}
              {ratingModal.score === 4 && <p className="text-green-500 font-medium">Satisfait</p>}
              {ratingModal.score === 5 && <p className="text-green-600 font-medium">Excellent !</p>}
            </div>

            {/* Commentaire */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire (optionnel)
              </label>
              <textarea
                value={ratingModal.comment}
                onChange={(e) => setRatingModal({ ...ratingModal, comment: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Comment s'est passée la prestation ?"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 text-right mt-1">{ratingModal.comment.length}/500</p>
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={() => setRatingModal(null)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={submitRating}
                disabled={ratingModal.score === 0 || ratingSubmitting}
                className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold transition disabled:opacity-50"
              >
                {ratingSubmitting ? 'Envoi...' : 'Valider la note'}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              La note est définitive et ne pourra pas être modifiée.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
