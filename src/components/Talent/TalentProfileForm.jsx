import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, POSITION_TYPES, CONTRACT_TYPES, FRENCH_DEPARTMENTS } from '../../lib/supabase'
import AddressAutocomplete from '../shared/AddressAutocomplete'

export default function TalentProfileForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deptSearch, setDeptSearch] = useState('')
  
  const [cvFile, setCvFile] = useState(null)
  const [cvUploading, setCvUploading] = useState(false)
  const [cvFileName, setCvFileName] = useState('')
  
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
    contract_preferences: ['extra'],
    min_hourly_rate: '',
    bio: '',
    accepts_coupure: true,
    notif_push: true,
    notif_email: true,
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

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

  const handleRemoveCv = () => {
    setCvFile(null)
    setCvFileName('')
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

    const cleanPhone = formData.phone.replace(/[\s\-\.]/g, '').trim()
    if (!/^0[67]\d{8}$/.test(cleanPhone)) {
      setError('Veuillez entrer un numéro de mobile valide (06 ou 07, 10 chiffres)')
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      const initials = `${formData.first_name[0]}${formData.last_name[0]}`.toUpperCase()

      let location = 'POINT(2.3522 48.8566)'
      if (formData.coordinates && formData.coordinates.length === 2) {
        location = `POINT(${formData.coordinates[0]} ${formData.coordinates[1]})`
      }

      let cvUrl = null
      if (cvFile) {
        setCvUploading(true)
        const fileExt = cvFile.name.split('.').pop()
        const fileName = `${user.id}_${Date.now()}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('CV')
          .upload(filePath, cvFile)

        if (uploadError) throw new Error('Erreur lors de l\'upload du CV: ' + uploadError.message)
        cvUrl = filePath
        setCvUploading(false)
      }

      const { error } = await supabase
        .from('talents')
        .insert({
          user_id: user.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: cleanPhone,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postal_code,
          department: formData.department,
          location: location,
          search_radius: parseInt(formData.search_radius),
          preferred_departments: formData.preferred_departments,
          position_types: formData.position_types,
          years_experience: parseInt(formData.years_experience),
          contract_preferences: formData.contract_preferences,
          min_hourly_rate: formData.min_hourly_rate ? parseFloat(formData.min_hourly_rate) : null,
          bio: formData.bio || null,
          avatar_initials: initials,
          accepts_coupure: formData.accepts_coupure,
          cv_url: cvUrl,
          notif_push: formData.notif_push,
          notif_email: formData.notif_email,
        })
        .select()
        .single()

      if (error) throw error

      alert('Profil créé avec succès !')
      window.location.href = '/talent'
    } catch (err) {
      console.error('Erreur création profil:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setCvUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">👤 Créer mon profil Talent</h1>
          <p className="text-gray-600 mt-2">Complétez votre profil pour recevoir des offres de missions</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="06 12 34 56 78" className="input" required maxLength={14} />
                <p className="text-xs text-gray-500 mt-1">Numéro mobile uniquement (06 ou 07)</p>
              </div>
              <div>
                <AddressAutocomplete value={formData.address} onChange={handleAddressChange} label="Adresse *" placeholder="Tapez votre adresse..." required />
              </div>
            </div>
          </div>

          {/* Upload CV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CV (optionnel)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {!cvFileName ? (
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-2">
                    <label className="cursor-pointer">
                      <span className="text-primary-600 hover:text-primary-500 font-medium">Choisir un fichier</span>
                      <input type="file" accept=".pdf" onChange={handleCvChange} className="hidden" />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">PDF uniquement, 5 Mo max</p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded">
                      <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cvFileName}</p>
                      <p className="text-xs text-gray-500">PDF</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleRemoveCv} className="text-red-600 hover:text-red-800">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Vous pourrez aussi l'envoyer plus tard si un établissement le demande</p>
          </div>

          {/* Rayon de recherche */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rayon de recherche : {formData.search_radius} km
            </label>
            <input type="range" name="search_radius" min="5" max="50" step="5" value={formData.search_radius} onChange={handleChange} className="w-full" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Départements préférés */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Départements de recherche (optionnel)</label>
            <p className="text-xs text-gray-500 mb-2">Sélectionnez les départements où vous souhaitez trouver des missions</p>
            {formData.preferred_departments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.preferred_departments.map(dept => {
                  const deptInfo = FRENCH_DEPARTMENTS.find(d => d.value === dept)
                  return (
                    <button key={dept} type="button" onClick={() => handleDepartmentToggle(dept)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium">
                      {deptInfo?.label || dept} ×
                    </button>
                  )
                })}
              </div>
            )}
            <input type="text" placeholder="🔍 Rechercher un département (ex: 33, Gironde...)" value={deptSearch} onChange={(e) => setDeptSearch(e.target.value)} className="input mb-2" />
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
              <div className="flex flex-wrap gap-1.5">
                {FRENCH_DEPARTMENTS
                  .filter(dept => {
                    if (!deptSearch.trim()) return true
                    const search = deptSearch.toLowerCase()
                    return dept.value.includes(search) || dept.label.toLowerCase().includes(search)
                  })
                  .map(dept => (
                    <button key={dept.value} type="button" onClick={() => handleDepartmentToggle(dept.value)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        formData.preferred_departments.includes(dept.value) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                      {dept.label}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Types de postes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Types de postes recherchés * (sélectionnez au moins 1)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {POSITION_TYPES.map(position => (
                <button key={position.value} type="button" onClick={() => handlePositionToggle(position.value)}
                  className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                    formData.position_types.includes(position.value) ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  {position.label}
                </button>
              ))}
            </div>
            {formData.position_types.length === 0 && (
              <p className="text-xs text-red-600 mt-1">Sélectionnez au moins un type de poste</p>
            )}
          </div>

          {/* Service continu / coupure */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Type de service accepté</label>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="accepts_coupure" checked={formData.accepts_coupure === true}
                    onChange={() => setFormData(prev => ({ ...prev, accepts_coupure: true }))}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500" />
                  <span className="text-gray-900">Les deux</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="accepts_coupure" checked={formData.accepts_coupure === false}
                    onChange={() => setFormData(prev => ({ ...prev, accepts_coupure: false }))}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500" />
                  <span className="text-gray-900">Service continu uniquement</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formData.accepts_coupure ? 'Vous verrez toutes les missions (avec ou sans coupure)' : 'Vous ne verrez que les missions en service continu'}
              </p>
            </div>
          </div>

          {/* Expérience */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Années d'expérience</label>
              <select name="years_experience" value={formData.years_experience} onChange={handleChange} className="input">
                <option value="0">Débutant</option>
                <option value="1">1 an</option>
                <option value="2">2 ans</option>
                <option value="3">3 ans</option>
                <option value="5">5 ans</option>
                <option value="10">10 ans et +</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarif horaire minimum (€)</label>
              <input type="number" name="min_hourly_rate" value={formData.min_hourly_rate} onChange={handleChange}
                placeholder="12.50" step="0.50" min="0" className="input" />
            </div>
          </div>

          {/* Préférences de contrat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Types de contrats acceptés</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CONTRACT_TYPES.slice(0, 4).map(contract => (
                <button key={contract.value} type="button" onClick={() => handleContractToggle(contract.value)}
                  className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                    formData.contract_preferences.includes(contract.value) ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  {contract.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio / Présentation (200 caractères max)</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} maxLength={200} rows={3} className="input"
              placeholder="Parlez de vous, vos points forts, votre motivation..." />
            <p className="text-xs text-gray-500 mt-1">{formData.bio.length} / 200 caractères</p>
          </div>

          {/* Préférences de notifications */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">🔔 Notifications</h2>
            <p className="text-sm text-gray-500 mb-4">
              Comment souhaitez-vous être informé des nouvelles missions et candidatures ?
            </p>
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Notifications Push</p>
                  <p className="text-xs text-gray-500">Alertes en temps réel sur votre mobile</p>
                </div>
                <div
                  onClick={() => setFormData(prev => ({ ...prev, notif_push: !prev.notif_push }))}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${formData.notif_push ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.notif_push ? 'translate-x-7' : 'translate-x-1'}`} />
                </div>
              </div>

              <div className="border-t border-gray-200" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Notifications Email</p>
                  <p className="text-xs text-gray-500">Récapitulatif par email des missions et candidatures</p>
                </div>
                <div
                  onClick={() => setFormData(prev => ({ ...prev, notif_email: !prev.notif_email }))}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${formData.notif_email ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.notif_email ? 'translate-x-7' : 'translate-x-1'}`} />
                </div>
              </div>

            </div>
          </div>

          {/* Bouton submit */}
          <div className="flex gap-4">
            <button type="button" onClick={() => navigate('/talent')} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={loading || cvUploading || formData.position_types.length === 0} className="btn-primary flex-1">
              {loading || cvUploading ? 'Création...' : 'Créer mon profil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
