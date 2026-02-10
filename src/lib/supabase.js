// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

// Configuration Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================================
// TYPES TYPESCRIPT (JSDoc pour JavaScript)
// ============================================================================

/**
 * @typedef {Object} Establishment
 * @property {string} id
 * @property {string} user_id
 * @property {string} name
 * @property {'restaurant_traditionnel'|'restaurant_gastronomique'|'bistrot'|'bar'|'hotel'|'traiteur'|'beach_club'|'saisonnier'|'autre'} type
 * @property {string} address
 * @property {any} location - PostGIS Geography Point
 * @property {string} [phone]
 * @property {string} [description]
 * @property {'trial'|'active'|'inactive'|'suspended'} subscription_status
 * @property {string} [subscription_start_date]
 * @property {string} [subscription_end_date]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Talent
 * @property {string} id
 * @property {string} user_id
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} phone
 * @property {any} location - PostGIS Geography Point
 * @property {number} search_radius
 * @property {string[]} position_types
 * @property {number} years_experience
 * @property {string[]} contract_preferences
 * @property {number} [min_hourly_rate]
 * @property {string[]} [establishment_types_preferences]
 * @property {string} [bio]
 * @property {string} avatar_initials
 * @property {string} [cv_url]
 * @property {number} total_missions_completed
 * @property {number} average_rating
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Mission
 * @property {string} id
 * @property {string} establishment_id
 * @property {string} position
 * @property {string} [establishment_type_profile]
 * @property {string} location_fuzzy
 * @property {any} location_exact - PostGIS Geography Point
 * @property {number} search_radius
 * @property {'ponctuelle'|'courte'|'longue'|'contrat'} duration_type
 * @property {string} start_date
 * @property {string} [end_date]
 * @property {string} [shift_start_time]
 * @property {string} [shift_end_time]
 * @property {number} [break_duration]
 * @property {string[]} [work_days]
 * @property {number} [hourly_rate]
 * @property {number} [daily_rate]
 * @property {number} [monthly_rate]
 * @property {'extra'|'auto_entrepreneur'|'cdd'|'cdi'|'saisonnier'|'stage'|'alternance'} contract_type
 * @property {'ultra_urgent'|'urgent'|'rapide'|'a_venir'} urgency_level
 * @property {string} [comment]
 * @property {'open'|'closed'|'filled'|'cancelled'} status
 * @property {string} [auto_close_date]
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} [closed_at]
 */

/**
 * @typedef {Object} Application
 * @property {string} id
 * @property {string} mission_id
 * @property {string} talent_id
 * @property {number} [match_score]
 * @property {'interested'|'accepted'|'rejected'|'completed'|'cancelled'} status
 * @property {string} [cancellation_reason]
 * @property {string} [cancellation_recommended_talent_id]
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} [accepted_at]
 * @property {string} [completed_at]
 * @property {string} [cancelled_at]
 */

/**
 * @typedef {Object} Rating
 * @property {string} id
 * @property {string} mission_id
 * @property {string} application_id
 * @property {string} rater_id
 * @property {string} rated_id
 * @property {'establishment_to_talent'|'talent_to_establishment'} rating_type
 * @property {'public'|'private'} visibility
 * @property {number} punctuality_score
 * @property {number} skills_score
 * @property {number} attitude_score
 * @property {number} reliability_score
 * @property {number} overall_score
 * @property {string} [comment]
 * @property {boolean} would_recommend
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} mission_id
 * @property {string} [application_id]
 * @property {string} sender_id
 * @property {string} receiver_id
 * @property {string} content
 * @property {boolean} read
 * @property {string} created_at
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} user_id
 * @property {string} type
 * @property {string} title
 * @property {string} [content]
 * @property {string} [link]
 * @property {boolean} read
 * @property {string} created_at
 */

// ============================================================================
// CONSTANTES
// ============================================================================

export const ESTABLISHMENT_TYPES = [
  { value: 'restaurant_traditionnel', label: 'Restaurant traditionnel' },
  { value: 'restaurant_gastronomique', label: 'Restaurant gastronomique' },
  { value: 'bistrot', label: 'Bistrot' },
  { value: 'bar', label: 'Bar' },
  { value: 'hotel', label: 'Hôtel' },
  { value: 'traiteur', label: 'Traiteur' },
  { value: 'beach_club', label: 'Beach club' },
  { value: 'saisonnier', label: 'Établissement saisonnier' },
  { value: 'autre', label: 'Autre' }
]

export const POSITION_TYPES = [
  // Cuisine
  { value: 'chef', label: 'Chef de cuisine', category: 'cuisine' },
  { value: 'sous_chef', label: 'Sous-chef', category: 'cuisine' },
  { value: 'chef_de_partie', label: 'Chef de partie', category: 'cuisine' },
  { value: 'commis', label: 'Commis de cuisine', category: 'cuisine' },
  { value: 'plongeur', label: 'Plongeur', category: 'cuisine' },
  
  // Service
  { value: 'maitre_hotel', label: 'Maître d\'hôtel', category: 'service' },
  { value: 'chef_de_salle', label: 'Chef de salle', category: 'service' },
  { value: 'serveur', label: 'Serveur', category: 'service' },
  { value: 'barman', label: 'Barman', category: 'service' },
  { value: 'sommelier', label: 'Sommelier', category: 'service' },
  { value: 'runner', label: 'Runner', category: 'service' },
  
  // Hôtellerie
  { value: 'receptionniste', label: 'Réceptionniste', category: 'hotellerie' },
  { value: 'concierge', label: 'Concierge', category: 'hotellerie' },
  { value: 'gouvernante', label: 'Gouvernante', category: 'hotellerie' },
  { value: 'valet', label: 'Valet / Voiturier', category: 'hotellerie' },
  
  // Management
  { value: 'manager', label: 'Manager', category: 'management' },
  { value: 'assistant_manager', label: 'Assistant manager', category: 'management' }
]

export const CONTRACT_TYPES = [
  { value: 'extra', label: 'Extra' },
  { value: 'auto_entrepreneur', label: 'Auto-entrepreneur' },
  { value: 'cdd', label: 'CDD' },
  { value: 'cdi', label: 'CDI' },
  { value: 'saisonnier', label: 'Saisonnier' },
  { value: 'stage', label: 'Stage' },
  { value: 'alternance', label: 'Alternance' }
]

export const DURATION_TYPES = [
  { value: 'ponctuelle', label: 'Mission ponctuelle (1 jour)' },
  { value: 'courte', label: 'Mission courte (2-7 jours)' },
  { value: 'longue', label: 'Mission longue (1-4 semaines)' },
  { value: 'contrat', label: 'Contrat (1 mois+)' }
]

export const URGENCY_LEVELS = [
  { value: 'ultra_urgent', label: '🔴 Ultra urgent (jour même, <4h)', color: 'red' },
  { value: 'urgent', label: '🟠 Urgent (demain, <24h)', color: 'orange' },
  { value: 'rapide', label: '🟡 Rapide (2-7 jours)', color: 'yellow' },
  { value: 'a_venir', label: '🟢 À venir (8 jours+)', color: 'green' }
]

export const DAYS_OF_WEEK = [
  { value: 'lundi', label: 'Lundi' },
  { value: 'mardi', label: 'Mardi' },
  { value: 'mercredi', label: 'Mercredi' },
  { value: 'jeudi', label: 'Jeudi' },
  { value: 'vendredi', label: 'Vendredi' },
  { value: 'samedi', label: 'Samedi' },
  { value: 'dimanche', label: 'Dimanche' }
]

export const TIME_SLOTS = [
  { value: 'matin', label: 'Matin (6h-12h)' },
  { value: 'midi', label: 'Midi (11h-15h)' },
  { value: 'soir', label: 'Soir (18h-23h)' },
  { value: 'nuit', label: 'Nuit (23h-6h)' },
  { value: 'journee_complete', label: 'Journée complète' }
]

export const FRENCH_DEPARTMENTS = [
  { value: '01', label: '01 - Ain', region: 'Auvergne-Rhône-Alpes' },
  { value: '02', label: '02 - Aisne', region: 'Hauts-de-France' },
  { value: '03', label: '03 - Allier', region: 'Auvergne-Rhône-Alpes' },
  { value: '04', label: '04 - Alpes-de-Haute-Provence', region: 'PACA' },
  { value: '05', label: '05 - Hautes-Alpes', region: 'PACA' },
  { value: '06', label: '06 - Alpes-Maritimes', region: 'PACA' },
  { value: '07', label: '07 - Ardèche', region: 'Auvergne-Rhône-Alpes' },
  { value: '08', label: '08 - Ardennes', region: 'Grand Est' },
  { value: '09', label: '09 - Ariège', region: 'Occitanie' },
  { value: '10', label: '10 - Aube', region: 'Grand Est' },
  { value: '11', label: '11 - Aude', region: 'Occitanie' },
  { value: '12', label: '12 - Aveyron', region: 'Occitanie' },
  { value: '13', label: '13 - Bouches-du-Rhône', region: 'PACA' },
  { value: '14', label: '14 - Calvados', region: 'Normandie' },
  { value: '15', label: '15 - Cantal', region: 'Auvergne-Rhône-Alpes' },
  { value: '16', label: '16 - Charente', region: 'Nouvelle-Aquitaine' },
  { value: '17', label: '17 - Charente-Maritime', region: 'Nouvelle-Aquitaine' },
  { value: '18', label: '18 - Cher', region: 'Centre-Val de Loire' },
  { value: '19', label: '19 - Corrèze', region: 'Nouvelle-Aquitaine' },
  { value: '2A', label: '2A - Corse-du-Sud', region: 'Corse' },
  { value: '2B', label: '2B - Haute-Corse', region: 'Corse' },
  { value: '21', label: '21 - Côte-d\'Or', region: 'Bourgogne-Franche-Comté' },
  { value: '22', label: '22 - Côtes-d\'Armor', region: 'Bretagne' },
  { value: '23', label: '23 - Creuse', region: 'Nouvelle-Aquitaine' },
  { value: '24', label: '24 - Dordogne', region: 'Nouvelle-Aquitaine' },
  { value: '25', label: '25 - Doubs', region: 'Bourgogne-Franche-Comté' },
  { value: '26', label: '26 - Drôme', region: 'Auvergne-Rhône-Alpes' },
  { value: '27', label: '27 - Eure', region: 'Normandie' },
  { value: '28', label: '28 - Eure-et-Loir', region: 'Centre-Val de Loire' },
  { value: '29', label: '29 - Finistère', region: 'Bretagne' },
  { value: '30', label: '30 - Gard', region: 'Occitanie' },
  { value: '31', label: '31 - Haute-Garonne', region: 'Occitanie' },
  { value: '32', label: '32 - Gers', region: 'Occitanie' },
  { value: '33', label: '33 - Gironde', region: 'Nouvelle-Aquitaine' },
  { value: '34', label: '34 - Hérault', region: 'Occitanie' },
  { value: '35', label: '35 - Ille-et-Vilaine', region: 'Bretagne' },
  { value: '36', label: '36 - Indre', region: 'Centre-Val de Loire' },
  { value: '37', label: '37 - Indre-et-Loire', region: 'Centre-Val de Loire' },
  { value: '38', label: '38 - Isère', region: 'Auvergne-Rhône-Alpes' },
  { value: '39', label: '39 - Jura', region: 'Bourgogne-Franche-Comté' },
  { value: '40', label: '40 - Landes', region: 'Nouvelle-Aquitaine' },
  { value: '41', label: '41 - Loir-et-Cher', region: 'Centre-Val de Loire' },
  { value: '42', label: '42 - Loire', region: 'Auvergne-Rhône-Alpes' },
  { value: '43', label: '43 - Haute-Loire', region: 'Auvergne-Rhône-Alpes' },
  { value: '44', label: '44 - Loire-Atlantique', region: 'Pays de la Loire' },
  { value: '45', label: '45 - Loiret', region: 'Centre-Val de Loire' },
  { value: '46', label: '46 - Lot', region: 'Occitanie' },
  { value: '47', label: '47 - Lot-et-Garonne', region: 'Nouvelle-Aquitaine' },
  { value: '48', label: '48 - Lozère', region: 'Occitanie' },
  { value: '49', label: '49 - Maine-et-Loire', region: 'Pays de la Loire' },
  { value: '50', label: '50 - Manche', region: 'Normandie' },
  { value: '51', label: '51 - Marne', region: 'Grand Est' },
  { value: '52', label: '52 - Haute-Marne', region: 'Grand Est' },
  { value: '53', label: '53 - Mayenne', region: 'Pays de la Loire' },
  { value: '54', label: '54 - Meurthe-et-Moselle', region: 'Grand Est' },
  { value: '55', label: '55 - Meuse', region: 'Grand Est' },
  { value: '56', label: '56 - Morbihan', region: 'Bretagne' },
  { value: '57', label: '57 - Moselle', region: 'Grand Est' },
  { value: '58', label: '58 - Nièvre', region: 'Bourgogne-Franche-Comté' },
  { value: '59', label: '59 - Nord', region: 'Hauts-de-France' },
  { value: '60', label: '60 - Oise', region: 'Hauts-de-France' },
  { value: '61', label: '61 - Orne', region: 'Normandie' },
  { value: '62', label: '62 - Pas-de-Calais', region: 'Hauts-de-France' },
  { value: '63', label: '63 - Puy-de-Dôme', region: 'Auvergne-Rhône-Alpes' },
  { value: '64', label: '64 - Pyrénées-Atlantiques', region: 'Nouvelle-Aquitaine' },
  { value: '65', label: '65 - Hautes-Pyrénées', region: 'Occitanie' },
  { value: '66', label: '66 - Pyrénées-Orientales', region: 'Occitanie' },
  { value: '67', label: '67 - Bas-Rhin', region: 'Grand Est' },
  { value: '68', label: '68 - Haut-Rhin', region: 'Grand Est' },
  { value: '69', label: '69 - Rhône', region: 'Auvergne-Rhône-Alpes' },
  { value: '70', label: '70 - Haute-Saône', region: 'Bourgogne-Franche-Comté' },
  { value: '71', label: '71 - Saône-et-Loire', region: 'Bourgogne-Franche-Comté' },
  { value: '72', label: '72 - Sarthe', region: 'Pays de la Loire' },
  { value: '73', label: '73 - Savoie', region: 'Auvergne-Rhône-Alpes' },
  { value: '74', label: '74 - Haute-Savoie', region: 'Auvergne-Rhône-Alpes' },
  { value: '75', label: '75 - Paris', region: 'Île-de-France' },
  { value: '76', label: '76 - Seine-Maritime', region: 'Normandie' },
  { value: '77', label: '77 - Seine-et-Marne', region: 'Île-de-France' },
  { value: '78', label: '78 - Yvelines', region: 'Île-de-France' },
  { value: '79', label: '79 - Deux-Sèvres', region: 'Nouvelle-Aquitaine' },
  { value: '80', label: '80 - Somme', region: 'Hauts-de-France' },
  { value: '81', label: '81 - Tarn', region: 'Occitanie' },
  { value: '82', label: '82 - Tarn-et-Garonne', region: 'Occitanie' },
  { value: '83', label: '83 - Var', region: 'PACA' },
  { value: '84', label: '84 - Vaucluse', region: 'PACA' },
  { value: '85', label: '85 - Vendée', region: 'Pays de la Loire' },
  { value: '86', label: '86 - Vienne', region: 'Nouvelle-Aquitaine' },
  { value: '87', label: '87 - Haute-Vienne', region: 'Nouvelle-Aquitaine' },
  { value: '88', label: '88 - Vosges', region: 'Grand Est' },
  { value: '89', label: '89 - Yonne', region: 'Bourgogne-Franche-Comté' },
  { value: '90', label: '90 - Territoire de Belfort', region: 'Bourgogne-Franche-Comté' },
  { value: '91', label: '91 - Essonne', region: 'Île-de-France' },
  { value: '92', label: '92 - Hauts-de-Seine', region: 'Île-de-France' },
  { value: '93', label: '93 - Seine-Saint-Denis', region: 'Île-de-France' },
  { value: '94', label: '94 - Val-de-Marne', region: 'Île-de-France' },
  { value: '95', label: '95 - Val-d\'Oise', region: 'Île-de-France' },
  { value: '971', label: '971 - Guadeloupe', region: 'Outre-mer' },
  { value: '972', label: '972 - Martinique', region: 'Outre-mer' },
  { value: '973', label: '973 - Guyane', region: 'Outre-mer' },
  { value: '974', label: '974 - La Réunion', region: 'Outre-mer' },
  { value: '976', label: '976 - Mayotte', region: 'Outre-mer' }
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Récupère le profil utilisateur (establishment ou talent)
 * @param {string} userId 
 * @returns {Promise<{type: 'establishment'|'talent', profile: Establishment|Talent}>}
 */
export async function getUserProfile(userId) {
  // Essayer establishment
  const { data: establishment, error: estError } = await supabase
    .from('establishments')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (establishment && !estError) {
    return { type: 'establishment', profile: establishment }
  }
  
  // Essayer talent
  const { data: talent, error: talError } = await supabase
    .from('talents')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (talent && !talError) {
    return { type: 'talent', profile: talent }
  }
  
  return { type: null, profile: null }
}

/**
 * Récupère le rôle utilisateur depuis metadata
 * @returns {Promise<'establishment'|'talent'|null>}
 */
export async function getUserRole() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  return user.user_metadata?.role || null
}

/**
 * Formate une date pour affichage
 * @param {string} dateString 
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

/**
 * Formate une date + heure pour affichage
 * @param {string} dateString 
 * @returns {string}
 */
export function formatDateTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

/**
 * Formate une heure
 * @param {string} timeString 
 * @returns {string}
 */
export function formatTime(timeString) {
  if (!timeString) return ''
  return timeString.slice(0, 5) // "09:00:00" -> "09:00"
}

/**
 * Génère les initiales d'un nom
 * @param {string} firstName 
 * @param {string} lastName 
 * @returns {string}
 */
export function generateInitials(firstName, lastName) {
  if (!firstName || !lastName) return '??'
  return `${firstName[0]}${lastName[0]}`.toUpperCase()
}

/**
 * Obtient le label d'un type
 * @param {string} value 
 * @param {Array} options 
 * @returns {string}
 */
export function getLabel(value, options) {
  const option = options.find(opt => opt.value === value)
  return option ? option.label : value
}

/**
 * Calcule le temps relatif (ex: "il y a 2 heures")
 * @param {string} dateString 
 * @returns {string}
 */
export function timeAgo(dateString) {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)
  
  const intervals = {
    an: 31536000,
    mois: 2592000,
    jour: 86400,
    heure: 3600,
    minute: 60
  }
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit)
    if (interval >= 1) {
      return `il y a ${interval} ${unit}${interval > 1 ? 's' : ''}`
    }
  }
  
  return 'à l\'instant'
}

// ============================================================================
// REALTIME SUBSCRIPTIONS HELPERS
// ============================================================================

/**
 * Subscribe to new messages for a mission
 * @param {string} missionId 
 * @param {Function} callback 
 * @returns {Object} subscription
 */
export function subscribeToMissionMessages(missionId, callback) {
  return supabase
    .channel(`mission:${missionId}:messages`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `mission_id=eq.${missionId}`
      },
      callback
    )
    .subscribe()
}

/**
 * Subscribe to new notifications
 * @param {string} userId 
 * @param {Function} callback 
 * @returns {Object} subscription
 */
export function subscribeToNotifications(userId, callback) {
  return supabase
    .channel(`user:${userId}:notifications`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

/**
 * Subscribe to application status changes
 * @param {string} applicationId 
 * @param {Function} callback 
 * @returns {Object} subscription
 */
export function subscribeToApplicationStatus(applicationId, callback) {
  return supabase
    .channel(`application:${applicationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'applications',
        filter: `id=eq.${applicationId}`
      },
      callback
    )
    .subscribe()
}

// ============================================================================
// GÉOLOCALISATION FLOUE
// ============================================================================

/**
 * Génère une localisation floue à partir d'une adresse complète
 * Masque l'adresse exacte pour protéger la vie privée de l'établissement
 * @param {string} fullAddress - Adresse complète (ex: "123 Rue de Rivoli, 75001 Paris")
 * @returns {string} Localisation floue (ex: "Paris 1er" ou "Lyon (69)")
 */
export function generateFuzzyLocation(fullAddress) {
  if (!fullAddress) return 'France'
  
  // Extraire le code postal (5 chiffres)
  const postalMatch = fullAddress.match(/(\d{5})/)
  if (!postalMatch) {
    // Si pas de code postal, retourner la dernière partie après la virgule
    const parts = fullAddress.split(',')
    return parts.length > 0 ? parts[parts.length - 1].trim() : 'France'
  }
  
  const postalCode = postalMatch[1]
  const department = postalCode.substring(0, 2)
  
  // CAS SPÉCIAL : Paris (75XXX)
  if (department === '75') {
    const arrondissement = parseInt(postalCode.substring(3, 5))
    const suffixe = arrondissement === 1 ? 'er' : 'ème'
    return `Paris ${arrondissement}${suffixe}`
  }
  
  // CAS GÉNÉRAL : Autres villes
  // Extraire la ville (après le code postal)
  const cityMatch = fullAddress.match(/\d{5}\s+([A-Za-zÀ-ÿ\s-]+)/)
  if (cityMatch) {
    const city = cityMatch[1].trim()
    return `${city} (${department})`
  }
  
  // Fallback : dernière partie après virgule
  const parts = fullAddress.split(',')
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1].trim()
    return `${lastPart} (${department})`
  }
  
  return `France (${department})`
}

/**
 * Génère une localisation floue pour les villes hors Paris
 * @param {string} fullAddress 
 * @returns {string}
 */
export function generateFuzzyLocationGeneric(fullAddress) {
  if (!fullAddress) return 'France'
  
  // Si Paris, utiliser la fonction spécifique
  if (fullAddress.includes('75') || fullAddress.toLowerCase().includes('paris')) {
    return generateFuzzyLocation(fullAddress)
  }
  
  // Pour les autres villes, extraire juste la ville et le code postal
  // Ex: "12 Rue de la Paix, 69001 Lyon" → "Lyon (69)"
  const cityMatch = fullAddress.match(/(\d{5})\s+([A-Za-zÀ-ÿ\s-]+)/)
  if (cityMatch) {
    const postalCode = cityMatch[1]
    const city = cityMatch[2].trim()
    const department = postalCode.substring(0, 2)
    return `${city} (${department})`
  }
  
  // Si pas de match, retourner la dernière partie après la virgule
  const parts = fullAddress.split(',')
  if (parts.length > 0) {
    return parts[parts.length - 1].trim()
  }
  
  return 'France'
}

/**
 * Extrait le département d'une adresse
 * @param {string} address - Adresse complète ou location_fuzzy
 * @returns {string|null} Code département (ex: "75", "69")
 */
export function extractDepartment(address) {
  if (!address) return null
  
  // CAS SPÉCIAL : Détecter Paris (avec ou sans arrondissement)
  if (address.toLowerCase().includes('paris')) {
    return '75'
  }
  
  // Chercher un code postal (5 chiffres)
  const postalMatch = address.match(/(\d{5})/)
  if (postalMatch) {
    return postalMatch[1].substring(0, 2)
  }
  
  // Chercher un département entre parenthèses (ex: "Lyon (69)")
  const deptMatch = address.match(/\((\d{2})\)/)
  if (deptMatch) {
    return deptMatch[1]
  }
  
  return null
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Crée une notification pour un utilisateur
 * @param {string} userId - ID de l'utilisateur destinataire
 * @param {string} type - Type de notification (application_accepted, new_application, etc.)
 * @param {string} title - Titre de la notification
 * @param {string} content - Contenu descriptif
 * @param {string} [link] - Lien optionnel vers l'action
 * @returns {Promise<Object>}
 */
export async function createNotification(userId, type, title, content, link = null) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        content,
        link,
        read: false
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('Erreur création notification:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Crée une notification quand une candidature est acceptée
 * @param {string} talentUserId - User ID du talent
 * @param {string} establishmentName - Nom de l'établissement
 * @param {string} position - Poste
 * @param {string} applicationId - ID de la candidature
 */
export async function notifyApplicationAccepted(talentUserId, establishmentName, position, applicationId) {
  return createNotification(
    talentUserId,
    'application_accepted',
    '✅ Candidature acceptée !',
    `${establishmentName} a accepté votre candidature pour le poste de ${position}.`,
    `/talent/applications`
  )
}

/**
 * Crée une notification quand une candidature est refusée
 * @param {string} talentUserId - User ID du talent
 * @param {string} establishmentName - Nom de l'établissement
 * @param {string} position - Poste
 */
export async function notifyApplicationRejected(talentUserId, establishmentName, position) {
  return createNotification(
    talentUserId,
    'application_rejected',
    'Candidature non retenue',
    `${establishmentName} n'a pas retenu votre candidature pour le poste de ${position}.`,
    `/talent/applications`
  )
}

/**
 * Crée une notification quand une nouvelle candidature est reçue
 * @param {string} establishmentUserId - User ID de l'établissement
 * @param {string} talentName - Nom du talent
 * @param {string} position - Poste
 * @param {number} matchScore - Score de matching
 * @param {string} missionId - ID de la mission
 */
export async function notifyNewApplication(establishmentUserId, talentName, position, matchScore, missionId) {
  const matchLabel = matchScore >= 90 ? 'Excellent match' : matchScore >= 75 ? 'Bon match' : 'Match correct'
  
  return createNotification(
    establishmentUserId,
    'new_application',
    '👤 Nouvelle candidature !',
    `${talentName} a postulé pour votre poste de ${position}. ${matchLabel} (${matchScore}%)`,
    `/establishment/applications/${missionId}`
  )
}


