import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, FRENCH_DEPARTMENTS } from '../../lib/supabase'
import AddressAutocomplete from '../shared/AddressAutocomplete'

export default function TalentProfileEdit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)
  
  // État pour le CV
  const [cvFile, setCvFile] = useState(null)
  const [cvUploading, setCvUploading] = useState(false)
  const [cvFileName, setCvFileName] = useState('')
  const [existingCvUrl, setExistingCvUrl] = useState(null)
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    department: '',
    coordinates: null,
    search_radius: 10,
    preferred_departments: [],
    position_types: [],
    years_experience: 0,
    contract_preferences: [],
    min_hourly_rate: '',
    bio: '',
    accepts_coupure: true
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('talents')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          department: data.department || '',
          coordinates: null,
          search_radius: data.search_radius || 10,
          preferred_departments: data.preferred_departments || [],
          position_types: data.position_types || [],
          years_experience: data.years_experience || 0,
          contract_preferences: data.contract_preferences || [],
          min_hourly_rate: data.min_hourly_rate || '',
          bio: data.bio || '',
          accepts_coupure: data.accepts_coupure !== false
        })
        
        // Charger le CV existant
        if (data.cv_url) {
          setExistingCvUrl(data.cv_url)
        }
      }
    } catch (err) {
      console.error('Erreur chargement profil:', err)
      setError(err.message)
    } finally {
      setInitialLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Gestion de l'adresse avec autocomplete
  const handleAddressChange = (addressData) => {
    setFormData(prev => ({
      ...prev,
      address: addressData.address,
      city: addressData.city,
      postal_code: addressData.postcode,
      department: addressData.department,
      coordinates: addressData.coordinates
    }))
  }

  // Gestion du fichier CV
  const handleCvChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Seuls les fichiers PDF sont acceptés')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Le fichier ne doit pas dépasser 5 Mo')
        return
      }
      setCvFile(file)
      setCvFileName(file.name)
      setError(null)
    }
  }

  // Supprimer le CV (nouveau ou existant)
  const handleRemoveCv = async () => {
    if (existingCvUrl && !cvFile) {
      // Supprimer le CV existant du storage
      try {
        const { error } = await supabase.storage
          .from('cv')
          .remove([existingCvUrl])
        
        if (error) throw error
        
        // Mettre à jour la base
        const { data: { user } } = await supabase.auth.getUser()
        await supabase
          .from('talents')
          .update({ cv_url: null })
          .eq('user_id', user.id)
        
        setExistingCvUrl(null)
        alert('CV supprimé')
      } catch (err) {
        console.error('Erreur suppression CV:', err)
        setError('Erreur lors de la suppression du CV')
      }
    } else {
      // Annuler le nouveau fichier sélectionné
      setCvFile(null)
      setCvFileName('')
    }
  }

  // Télécharger le CV existant
  const handleDownloadCv = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('cv')
        .download(existingCvUrl)
      
      if (error) throw error
      
      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `CV_${formData.first_name}_${formData.last_name}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erreur téléchargement CV:', err)
      setError('Erreur lors du téléchargement du CV')
    }
  }

  const handlePositionToggle = (position) => {
    setFormData(prev => ({
      ...prev,
      position_types: prev.position_types.includes(position)
        ? prev.position_types.filter(p => p !== position)
        : [...prev.position_types, position]
    }))
  }

  const handleDepartmentToggle = (department) => {
    setFormData(prev => ({
      ...prev,
      preferred_departments: prev.preferred_departments.includes(department)
        ? prev.preferred_departments.filter(d => d !== department)
        : [...prev.preferred_departments, department]
    }))
  }

  const handleContractToggle = (contract) => {
    setFormData(prev => ({
      ...prev,
      contract_preferences: prev.contract_preferences.includes(contract)
        ? prev.contract_preferences.filter(c => c !== contract)
        : [...prev.contract_preferences, contract]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Upload du nouveau CV si présent
      let cvUrl = existingCvUrl
      if (cvFile) {
        setCvUploading(true)
        
        // Supprimer l'ancien CV si existe
        if (existingCvUrl) {
          await supabase.storage.from('cv').remove([existingCvUrl])
        }
        
        const fileExt = cvFile.name.split('.').pop()
        const fileName = `${user.id}_${Date.now()}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('cv')
          .upload(filePath, cvFile)

        if (uploadError) {
          throw new Error('Erreur lors de l\'upload du CV: ' + uploadError.message)
        }

        cvUrl = filePath
        setCvUploading(false)
      }

      // Préparer les données à mettre à jour
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postal_code,
        department: formData.department,
        search_radius: parseInt(formData.search_radius),
        preferred_departments: formData.preferred_departments,
        position_types: formData.position_types,
        years_experience: parseInt(formData.years_experience),
        contract_preferences: formData.contract_preferences,
        min_hourly_rate: formData.min_hourly_rate ? parseFloat(formData.min_hourly_rate) : null,
        bio: formData.bio || null,
        accepts_coupure: formData.accepts_coupure,
        cv_url: cvUrl
      }

      // Mettre à jour les coordonnées seulement si une nouvelle adresse a été sélectionnée
      if (formData.coordinates && formData.coordinates.length === 2) {
        updateData.location = `POINT(${formData.coordinates[0]} ${formData.coordinates[1]})`
      }

      const { error } = await supabase
        .from('talents')
        .update(updateData)
        .eq('user_id', user.id)

      if (error) throw error

      alert('Profil mis à jour avec succès !')
      navigate('/talent')
    } catch (err) {
      console.error('Erreur mise à jour profil:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setCvUploading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">✏️ Modifier mon profil</h1>
          <p className="text-gray-600 mt-2">Mettez à jour vos informations</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Informations personnelles */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="06 12 34 56 78"
                  className="input"
                  required
                />
              </div>

              <div>
                {/* Adresse avec autocomplete */}
                <AddressAutocomplete
                  value={formData.address}
                  onChange={handleAddressChange}
                  label="Adresse *"
                  placeholder="Tapez votre adresse..."
                  required
                />
              </div>
            </div>
          </div>

          {/* CV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CV (optionnel)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {/* CV existant */}
              {existingCvUrl && !cvFile && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded">
                      <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">CV enregistré ✓</p>
                      <p className="text-xs text-gray-500">PDF</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadCv}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      Télécharger
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCv}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Nouveau CV sélectionné */}
              {cvFile && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded">
                      <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cvFileName}</p>
                      <p className="text-xs text-gray-500">Nouveau fichier (sera enregistré)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCv}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Zone d'upload (si pas de CV) */}
              {!existingCvUrl && !cvFile && (
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-2">
                    <label className="cursor-pointer">
                      <span className="text-primary-600 hover:text-primary-500 font-medium">
                        Choisir un fichier
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleCvChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">PDF uniquement, 5 Mo max</p>
                </div>
              )}

              {/* Bouton remplacer si CV existe */}
              {existingCvUrl && !cvFile && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <label className="cursor-pointer">
                    <span className="text-primary-600 hover:text-primary-500 text-sm font-medium">
                      Remplacer par un nouveau CV
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleCvChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Rayon de recherche */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rayon de recherche : {formData.search_radius} km
            </label>
            <input
              type="range"
              name="search_radius"
              min="5"
              max="50"
              step="5"
              value={formData.search_radius}
              onChange={handleChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Départements préférés */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Départements de recherche (optionnel)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Sélectionnez les départements où vous souhaitez trouver des missions
            </p>
            <select
              multiple
              value={formData.preferred_departments}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value)
                setFormData(prev => ({ ...prev, preferred_departments: selected }))
              }}
              className="input min-h-[150px]"
            >
              {FRENCH_DEPARTMENTS.map(dept => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Maintenez Ctrl (Windows) ou Cmd (Mac) pour sélectionner plusieurs départements
            </p>
            {formData.preferred_departments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.preferred_departments.map(dept => {
                  const deptInfo = FRENCH_DEPARTMENTS.find(d => d.value === dept)
                  return (
                    <span
                      key={dept}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                    >
                      {deptInfo?.label || dept}
                      <button
                        type="button"
                        onClick={() => handleDepartmentToggle(dept)}
                        className="hover:text-primary-900"
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* Types de postes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Types de postes recherchés * (sélectionnez au moins 1)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {POSITION_TYPES.slice(0, 12).map(position => (
                <button
                  key={position.value}
                  type="button"
                  onClick={() => handlePositionToggle(position.value)}
                  className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                    formData.position_types.includes(position.value)
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {position.label}
                </button>
              ))}
            </div>
            {formData.position_types.length === 0 && (
              <p className="text-xs text-red-600 mt-1">Sélectionnez au moins un type de poste</p>
            )}
          </div>

          {/* Préférence service continu / avec coupure */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type de service accepté
            </label>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="accepts_coupure"
                    checked={formData.accepts_coupure === true}
                    onChange={() => setFormData(prev => ({ ...prev, accepts_coupure: true }))}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="text-gray-900">Les deux</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="accepts_coupure"
                    checked={formData.accepts_coupure === false}
                    onChange={() => setFormData(prev => ({ ...prev, accepts_coupure: false }))}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="text-gray-900">Service continu uniquement</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formData.accepts_coupure 
                  ? 'Vous verrez toutes les missions (avec ou sans coupure)' 
                  : 'Vous ne verrez que les missions en service continu'}
              </p>
            </div>
          </div>

          {/* Expérience */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Années d'expérience
              </label>
              <select
                name="years_experience"
                value={formData.years_experience}
                onChange={handleChange}
                className="input"
              >
                <option value="0">Débutant</option>
                <option value="1">1 an</option>
                <option value="2">2 ans</option>
                <option value="3">3 ans</option>
                <option value="5">5 ans</option>
                <option value="10">10 ans et +</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarif horaire minimum (€)
              </label>
              <input
                type="number"
                name="min_hourly_rate"
                value={formData.min_hourly_rate}
                onChange={handleChange}
                placeholder="12.50"
                step="0.50"
                min="0"
                className="input"
              />
            </div>
          </div>

          {/* Préférences de contrat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Types de contrats acceptés
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CONTRACT_TYPES.slice(0, 4).map(contract => (
                <button
                  key={contract.value}
                  type="button"
                  onClick={() => handleContractToggle(contract.value)}
                  className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                    formData.contract_preferences.includes(contract.value)
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {contract.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio / Présentation (200 caractères max)
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              maxLength={200}
              rows={3}
              className="input"
              placeholder="Parlez de vous, vos points forts, votre motivation..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.bio.length} / 200 caractères
            </p>
          </div>

          {/* Boutons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/talent')}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || cvUploading || formData.position_types.length === 0}
              className="btn-primary flex-1"
            >
              {loading || cvUploading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
