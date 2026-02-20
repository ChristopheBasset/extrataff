import { formatDate, getLabel, CONTRACT_TYPES } from '../../lib/supabase'

export default function MissionCard({ mission, matchCategory, onApply, onHide }) {

  return (
    <div className={`card hover:shadow-lg transition-shadow relative ${
      mission.is_urgent ? 'ring-2 ring-red-400 bg-red-50/30' : ''
    }`}>

      {/* Badge URGENT flottant */}
      {mission.is_urgent && (
        <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md animate-pulse">
          ⚡ URGENT
        </div>
      )}

      {/* Header avec score de match */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap gap-2">
          {matchCategory && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${matchCategory.bgColor} ${matchCategory.textColor} border-2 ${matchCategory.borderColor}`}>
              {matchCategory.badge} {matchCategory.label} ({mission.match_score}%)
            </span>
          )}
        </div>
      </div>

      {/* Informations principales */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {mission.position}
        </h3>
        {mission.nb_postes > 1 && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
              👥 {mission.nb_postes - (mission.nb_postes_pourvus || 0)} poste{(mission.nb_postes - (mission.nb_postes_pourvus || 0)) > 1 ? 's' : ''} restant{(mission.nb_postes - (mission.nb_postes_pourvus || 0)) > 1 ? 's' : ''} sur {mission.nb_postes}
            </span>
          </div>
        )}
        <p className="text-gray-600">
          📍 {mission.location_fuzzy || 'Paris'}
        </p>
      </div>

      {/* Détails */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-700">
          <span className="font-medium w-32">Début :</span>
          <span className={mission.is_urgent ? 'font-bold text-red-600' : ''}>
            {formatDate(mission.start_date)}
            {mission.is_urgent && ' ⚡'}
          </span>
        </div>

        {mission.end_date && (
          <div className="flex items-center text-sm text-gray-700">
            <span className="font-medium w-32">Fin :</span>
            <span>{formatDate(mission.end_date)}</span>
          </div>
        )}

        <div className="flex items-center text-sm text-gray-700">
          <span className="font-medium w-32">Contrat :</span>
          <span>{getLabel(mission.contract_type, CONTRACT_TYPES)}</span>
        </div>

        {mission.hourly_rate && (
          <div className="flex items-center text-sm text-gray-700">
            <span className="font-medium w-32">Tarif :</span>
            <span className="font-semibold text-primary-600">{mission.hourly_rate}€/h</span>
          </div>
        )}

        {mission.shift_start_time && mission.shift_end_time && (
          <div className="flex items-center text-sm text-gray-700">
            <span className="font-medium w-32">Horaires :</span>
            <span>{mission.shift_start_time.slice(0,5)} - {mission.shift_end_time.slice(0,5)}</span>
          </div>
        )}
      </div>

      {/* Commentaire */}
      {mission.comment && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 italic">"{mission.comment}"</p>
        </div>
      )}

      {/* Boutons */}
      <div className="flex gap-2">
        <button
          onClick={() => onApply(mission.id)}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            mission.is_urgent
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'btn-primary'
          }`}
        >
          {mission.is_urgent ? '⚡ Postuler maintenant' : '✋ Je suis intéressé(e)'}
        </button>
        <button
          onClick={() => onHide(mission.id)}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          👋 Passer
        </button>
      </div>
    </div>
  )
}
