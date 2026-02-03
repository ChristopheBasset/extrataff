import { useState, useEffect, useRef } from 'react'

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Tapez une adresse...",
  label = "Adresse",
  required = false,
  className = ""
}) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const wrapperRef = useRef(null)

  // URL de la Edge Function Supabase
  const EDGE_FUNCTION_URL = 'https://yixuosrfwrxhttbhqelj.supabase.co/functions/v1/search-address'

  // Fermer les suggestions quand on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mettre à jour query si value change de l'extérieur
  useEffect(() => {
    if (value !== query) {
      setQuery(value || '')
    }
  }, [value])

  // Recherche avec debounce
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        // Appel à la Edge Function Supabase
        const url = `${EDGE_FUNCTION_URL}?q=${encodeURIComponent(query)}`
        console.log('Appel Edge Function:', url)
        
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Réponse API:', data)
        
        if (data.features && data.features.length > 0) {
          const mappedSuggestions = data.features.map(feature => ({
            label: feature.properties.label,
            city: feature.properties.city,
            postcode: feature.properties.postcode,
            context: feature.properties.context,
            coordinates: feature.geometry.coordinates // [lng, lat]
          }))
          
          console.log('Suggestions mappées:', mappedSuggestions)
          setSuggestions(mappedSuggestions)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
          setShowSuggestions(true)
        }
      } catch (err) {
        console.error('Erreur recherche adresse:', err)
        setError(err.message)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300) // Debounce 300ms

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleSelect = (suggestion) => {
    console.log('Adresse sélectionnée:', suggestion)
    setQuery(suggestion.label)
    setShowSuggestions(false)
    
    // Retourner l'objet complet au parent
    const addressData = {
      address: suggestion.label,
      city: suggestion.city,
      postcode: suggestion.postcode,
      department: suggestion.context?.split(',')[0]?.trim() || '',
      coordinates: suggestion.coordinates
    }
    
    console.log('Envoi au parent:', addressData)
    onChange(addressData)
  }

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setQuery(newValue)
    setError(null)
    
    // Si l'utilisateur efface, notifier le parent
    if (!newValue) {
      onChange({
        address: '',
        city: '',
        postcode: '',
        department: '',
        coordinates: null
      })
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          required={required}
          className="input w-full"
          autoComplete="off"
        />
        
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {/* Afficher les erreurs */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          ⚠️ Erreur: {error}
        </div>
      )}

      {/* Liste des suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{suggestion.label}</div>
              <div className="text-sm text-gray-500">{suggestion.context}</div>
            </li>
          ))}
        </ul>
      )}

      {/* Message si pas de résultats */}
      {showSuggestions && query.length >= 3 && suggestions.length === 0 && !loading && !error && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg p-3 text-gray-500 text-sm">
          Aucune adresse trouvée
        </div>
      )}
    </div>
  )
}
