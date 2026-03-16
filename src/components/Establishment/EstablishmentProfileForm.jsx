import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, ESTABLISHMENT_TYPES } from '../../lib/supabase'
import AddressAutocomplete from '../shared/AddressAutocomplete'

export default function EstablishmentProfileForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    otherType: '',
    address: '',
    city: '',
    postal_code: '',
    department: '',
    coordinates: null,
    phone: '',
    description: '',
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

  const normalizePhone = (phone) => phone.replace(/[\s\-\.]/g, '').trim()

  const checkPhoneExists = async (phone) => {
    const normalizedPhone = normalizePhone(phone)
    const { data, error } = await supabase
      .from('establishments')
      .select('id, name')
      .or(`phone.eq.${normalizedPhone},phone.eq.${phone}`)
      .limit(1)
    if (error) return false
    return data && data.length > 0
  }

  const checkAddressExists = async (address) => {
    if (!address || address.trim() === '') return false
    const { data, error } = await supabase
      .from('establishments')
      .select('id, name')
      .eq('address', address.trim())
      .limit(1)
    if (error) return false
    return data && data.length > 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      const phoneExists = await checkPhoneExists(formData.phone)
      if (phoneExists) throw new Error('Ce numéro de téléphone est déjà associé à un établissement. Si vous êtes le propriétaire, connectez-vous avec votre compte existant.')

      const addressExists = await checkAddressExists(formData.address)
      if (addressExists) throw new Error('Cette adresse est déjà associée à un établissement. Si vous êtes le propriétaire, connectez-vous avec votre compte existant.')

      let location = 'POINT(2.3522 48.8566)'
      if (formData.coordinates && formData.coordinates.length === 2) {
        location = `POINT(${formData.coordinates[0]} ${formData.coordinates[1]})`
      }

      const finalType = formData.type === 'autre' ? formData.otherType : formData.type
      const normalizedPhone = normalizePhone(formData.phone)

      const { error } = await supabase
        .from('establishments')
        .insert({
          user_id: user.id,
          name: formData.name,
          type: finalType,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postal_code,
          department: formData.department,
          location: location,
          phone: normalizedPhone,
          description: formData.description || null,
          subscription_status: 'freemium',
          missions_used: 0,
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notif_push: formData.notif_push,
          notif_email: formData.notif_email,
        })
        .select()
        .single()

      if (error) throw error

      alert('Profil créé avec succès ! 🎉')
      window.location.href = '/establishment'
    } catch (err) {
      console.error('Erreur création profil:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🏪 Créer mon profil Établissement</h1>
          <p className="text-gray-600 mt-2">Complétez votre profil pour publier vos annonces</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
          )}

          {/* Offre Freemium */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <p className="text-amber-900 font-medium mb-1">🎁 Offre Freemium - 1 mois d'essai gratuit</p>
            <p className="text-amber-700 text-sm">Testez ExtraTaff gratuitement pendant 1 mois avec jusqu'à 2 missions, puis 59,90€/mois pour des missions illimitées.</p>
          </div>

          {/* Informations de l'établissement */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations de l'établissement</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'établissement *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Restaurant Le Gourmet" className="input" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'établissement *</label>
                <select name="type" value={formData.type} onChange={handleChange} className="input" required>
                  <option value="">Sélectionnez un type</option>
                  {ESTABLISHMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {formData.type === 'autre' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Précisez le type d'établissement *</label>
                  <input type="text" name="otherType" value={formData.otherType} onChange={handleChange} placeholder="Ex: Food truck, Cave à vin, Épicerie fine..." className="input" required />
                </div>
              )}

              <AddressAutocomplete value={formData.address} onChange={handleAddressChange} label="Adresse complète *" placeholder="Tapez une adresse..." required />
              <p className="text-xs text-gray-500 -mt-2">L'adresse exacte ne sera pas affichée publiquement. Elle sert à identifier votre établissement de manière unique.</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="01 42 60 12 34" className="input" required />
                <p className="text-xs text-gray-500 mt-1">Ce numéro sera utilisé pour identifier votre établissement de manière unique</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description de l'établissement</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="input" placeholder="Présentez votre établissement, votre ambiance, vos spécialités..." />
                <p className="text-xs text-gray-500 mt-1">Cette description sera visible par les talents</p>
              </div>
            </div>
          </div>

          {/* Préférences de notifications */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">🔔 Notifications</h2>
            <p className="text-sm text-gray-500 mb-4">Comment souhaitez-vous être informé des candidatures reçues ?</p>
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
                  <p className="text-xs text-gray-500">Récapitulatif par email des candidatures reçues</p>
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

          {/* Boutons */}
          <div className="flex gap-4">
            <button type="button" onClick={() => navigate('/establishment')} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Création...' : 'Créer mon établissement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
