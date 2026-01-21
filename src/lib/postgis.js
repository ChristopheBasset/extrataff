// src/lib/postgis.js
// Fonctions utilitaires pour PostGIS et géolocalisation

import { supabase } from './supabase'

// ============================================================================
// CONVERSION COORDONNÉES
// ============================================================================

/**
 * Crée un POINT PostGIS au format WKT (Well-Known Text)
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {string} Format: "POINT(longitude latitude)"
 */
export function createPostGISPoint(latitude, longitude) {
  // IMPORTANT: PostGIS utilise l'ordre (longitude, latitude)
  return `POINT(${longitude} ${latitude})`
}

/**
 * Parse un POINT PostGIS et extrait latitude/longitude
 * @param {string|Object} point 
 * @returns {{latitude: number, longitude: number}|null}
 */
export function parsePostGISPoint(point) {
  if (!point) return null
  
  // Si déjà un objet avec coordinates
  if (point.coordinates) {
    return {
      longitude: point.coordinates[0],
      latitude: point.coordinates[1]
    }
  }
  
  // Si string format "POINT(lng lat)"
  if (typeof point === 'string') {
    const matches = point.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/)
    if (matches) {
      return {
        longitude: parseFloat(matches[1]),
        latitude: parseFloat(matches[2])
      }
    }
  }
  
  return null
}

/**
 * Convertit une adresse en coordonnées (geocoding)
 * Utilise l'API Google Maps Geocoding
 * @param {string} address 
 * @returns {Promise<{latitude: number, longitude: number, formatted_address: string}|null>}
 */
export async function geocodeAddress(address) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('Google Maps API key missing')
    return null
  }
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    )
    const data = await response.json()
    
    if (data.status === 'OK' && data.results[0]) {
      const location = data.results[0].geometry.location
      return {
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: data.results[0].formatted_address
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error)
  }
  
  return null
}

/**
 * Convertit des coordonnées en adresse (reverse geocoding)
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string|null>}
 */
export async function reverseGeocode(latitude, longitude) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('Google Maps API key missing')
    return null
  }
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    )
    const data = await response.json()
    
    if (data.status === 'OK' && data.results[0]) {
      return data.results[0].formatted_address
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
  }
  
  return null
}

// ============================================================================
// CALCUL DISTANCE
// ============================================================================

/**
 * Calcule la distance entre deux points (formule Haversine)
 * Résultat en kilomètres
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance en km
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Rayon de la Terre en km
  
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance * 10) / 10 // Arrondi à 1 décimale
}

function toRad(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * Formate une distance pour affichage
 * @param {number} distanceKm 
 * @returns {string}
 */
export function formatDistance(distanceKm) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`
  }
  return `${distanceKm}km`
}

// ============================================================================
// QUERIES SUPABASE AVEC POSTGIS
// ============================================================================

/**
 * Récupère les missions à proximité d'un point
 * Utilise la fonction PostgreSQL missions_nearby
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} radiusKm 
 * @returns {Promise<Array>}
 */
export async function getMissionsNearby(latitude, longitude, radiusKm) {
  const { data, error } = await supabase.rpc('missions_nearby', {
    talent_lat: latitude,
    talent_lng: longitude,
    radius_km: radiusKm
  })
  
  if (error) {
    console.error('Error fetching nearby missions:', error)
    return []
  }
  
  return data || []
}

/**
 * Récupère les talents à proximité d'un point
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} radiusKm 
 * @returns {Promise<Array>}
 */
export async function getTalentsNearby(latitude, longitude, radiusKm) {
  const { data, error } = await supabase.rpc('talents_nearby', {
    establishment_lat: latitude,
    establishment_lng: longitude,
    radius_km: radiusKm
  })
  
  if (error) {
    console.error('Error fetching nearby talents:', error)
    return []
  }
  
  return data || []
}

// ============================================================================
// LOCALISATION FLOUE (PRIVACY)
// ============================================================================

/**
 * Génère une localisation floue (quartier) à partir de coordonnées exactes
 * Utilise reverse geocoding et extrait seulement le quartier
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string>}
 */
export async function generateFuzzyLocation(latitude, longitude) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) return 'Paris' // Fallback
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&result_type=sublocality|locality`
    )
    const data = await response.json()
    
    if (data.status === 'OK' && data.results[0]) {
      // Extraire le quartier/arrondissement
      const addressComponents = data.results[0].address_components
      
      // Chercher sublocality (quartier) ou locality (ville)
      const sublocality = addressComponents.find(c => 
        c.types.includes('sublocality') || c.types.includes('sublocality_level_1')
      )
      
      if (sublocality) {
        return sublocality.long_name
      }
      
      const locality = addressComponents.find(c => c.types.includes('locality'))
      if (locality) {
        return locality.long_name
      }
    }
  } catch (error) {
    console.error('Fuzzy location error:', error)
  }
  
  return 'Paris' // Fallback
}

/**
 * Ajoute du bruit aléatoire aux coordonnées (pour affichage flou)
 * Déplace le point de ~500m-1km aléatoirement
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {{latitude: number, longitude: number}}
 */
export function addLocationNoise(latitude, longitude) {
  // Déplacement aléatoire de ±0.005 degrés (~500m à Paris)
  const noiseLat = (Math.random() - 0.5) * 0.01
  const noiseLng = (Math.random() - 0.5) * 0.01
  
  return {
    latitude: latitude + noiseLat,
    longitude: longitude + noiseLng
  }
}

// ============================================================================
// BROWSER GEOLOCATION
// ============================================================================

/**
 * Obtient la position actuelle de l'utilisateur (via navigateur)
 * @returns {Promise<{latitude: number, longitude: number}|null>}
 */
export function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported')
      resolve(null)
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => {
        console.error('Geolocation error:', error)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

/**
 * Vérifie si un point est dans un rayon donné d'un autre point
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @param {number} radiusKm 
 * @returns {boolean}
 */
export function isWithinRadius(lat1, lon1, lat2, lon2, radiusKm) {
  const distance = calculateDistance(lat1, lon1, lat2, lon2)
  return distance <= radiusKm
}

// ============================================================================
// FONCTIONS SQL À CRÉER DANS SUPABASE (Documentation)
// ============================================================================

/**
 * Ces fonctions doivent être créées dans Supabase SQL Editor:
 * 
 * CREATE OR REPLACE FUNCTION missions_nearby(
 *   talent_lat DECIMAL,
 *   talent_lng DECIMAL,
 *   radius_km INTEGER
 * )
 * RETURNS TABLE (
 *   id UUID,
 *   establishment_id UUID,
 *   position VARCHAR,
 *   location_fuzzy VARCHAR,
 *   start_date DATE,
 *   urgency_level VARCHAR,
 *   distance_km DECIMAL
 * ) AS $$
 * BEGIN
 *   RETURN QUERY
 *   SELECT 
 *     m.id,
 *     m.establishment_id,
 *     m.position,
 *     m.location_fuzzy,
 *     m.start_date,
 *     m.urgency_level,
 *     ST_Distance(
 *       m.location_exact,
 *       ST_SetSRID(ST_MakePoint(talent_lng, talent_lat), 4326)::geography
 *     ) / 1000 AS distance_km
 *   FROM missions m
 *   WHERE m.status = 'open'
 *     AND ST_DWithin(
 *       m.location_exact,
 *       ST_SetSRID(ST_MakePoint(talent_lng, talent_lat), 4326)::geography,
 *       radius_km * 1000
 *     )
 *   ORDER BY distance_km;
 * END;
 * $$ LANGUAGE plpgsql;
 */
