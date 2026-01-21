// src/lib/matching.js
// Algorithme de matching ExtraTaff

import { calculateDistance } from './postgis'

/**
 * Calcule le score de matching entre une mission et un talent
 * @param {Object} mission - La mission
 * @param {Object} talent - Le profil talent
 * @returns {number} Score de 0 à 100
 */
export function calculateMatchScore(mission, talent) {
  let score = 0

  // 1. GÉOLOCALISATION (30 points)
  // Pour l'instant, on donne 30 points par défaut
  // TODO: Implémenter le calcul de distance réel avec PostGIS
  score += 30

  // 2. POSTE (25 points)
  if (talent.position_types && talent.position_types.includes(mission.position)) {
    score += 25
  }

  // 3. DISPONIBILITÉ (20 points)
  // Pour l'instant, on suppose que le talent est disponible
  // TODO: Vérifier les vraies disponibilités
  score += 20

  // 4. TARIF (15 points)
  if (mission.hourly_rate && talent.min_hourly_rate) {
    if (mission.hourly_rate >= talent.min_hourly_rate) {
      score += 15
    }
  } else {
    // Si pas de tarif spécifié, on donne 10 points
    score += 10
  }

  // 5. TYPE DE CONTRAT (10 points)
  if (talent.contract_preferences && talent.contract_preferences.includes(mission.contract_type)) {
    score += 10
  }

  return score
}

/**
 * Retourne la catégorie de matching selon le score
 * @param {number} score - Score de 0 à 100
 * @returns {Object} {category, label, color, badge}
 */
export function getMatchCategory(score) {
  if (score >= 90) {
    return {
      category: 'EXCELLENT',
      label: 'Excellent match',
      color: 'green',
      badge: '🎯',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      textColor: 'text-green-700'
    }
  }
  
  if (score >= 75) {
    return {
      category: 'BON',
      label: 'Bon match',
      color: 'orange',
      badge: '👍',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500',
      textColor: 'text-orange-700'
    }
  }
  
  if (score >= 60) {
    return {
      category: 'AUTRES',
      label: 'Match correct',
      color: 'gray',
      badge: '✓',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-500',
      textColor: 'text-gray-700'
    }
  }

  return null // Pas de match suffisant
}

/**
 * Retourne le badge d'urgence selon le niveau
 * @param {string} urgencyLevel - urgent, normal
 * @returns {Object} {emoji, label, color}
 */
export function getUrgencyBadge(urgencyLevel) {
  const badges = {
    urgent: {
      emoji: '🔴',
      label: 'Urgent',
      color: 'orange',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700'
    },
    normal: {
      emoji: '🟢',
      label: 'Normal',
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700'
    }
  }

  return badges[urgencyLevel] || badges.normal
}

/**
 * Filtre et trie les missions selon le matching
 * @param {Array} missions - Liste des missions
 * @param {Object} talent - Profil talent
 * @returns {Array} Missions triées avec scores
 */
export function getMatchedMissions(missions, talent) {
  return missions
    .map(mission => ({
      ...mission,
      match_score: calculateMatchScore(mission, talent),
      match_category: getMatchCategory(calculateMatchScore(mission, talent))
    }))
    .filter(m => m.match_score >= 60) // Seuil minimum 60%
    .sort((a, b) => b.match_score - a.match_score) // Tri décroissant
}
