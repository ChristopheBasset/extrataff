import { useNavigate } from 'react-router-dom'

export default function ChooseRole() {
  const navigate = useNavigate()

  const handleChoice = (role) => {
    sessionStorage.setItem('registration_type', role)
    sessionStorage.setItem('registration_success', 'true')

    if (role === 'talent') {
      navigate('/talent/profile-form')
    } else {
      navigate('/establishment/profile-form')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">⚡ ExtraTaff</h1>
          <p className="text-gray-600 mt-2">Bienvenue ! Quel est votre profil ?</p>
        </div>

        <div className="space-y-4">
          {/* Talent */}
          <button
            onClick={() => handleChoice('talent')}
            className="w-full bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-primary-500 transition text-left"
          >
            <div className="flex items-center gap-4">
              <div className="text-5xl">👤</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Je suis un Talent</h3>
                <p className="text-gray-600">Je cherche des missions extras dans la restauration et l'hôtellerie</p>
                <p className="text-sm text-green-600 mt-2 font-medium">100% gratuit</p>
              </div>
            </div>
          </button>

          {/* Établissement */}
          <button
            onClick={() => handleChoice('establishment')}
            className="w-full bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-primary-500 transition text-left"
          >
            <div className="flex items-center gap-4">
              <div className="text-5xl">🏪</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Je suis un Établissement</h3>
                <p className="text-gray-600">Je recherche des extras pour mon restaurant, hôtel ou événement</p>
                <p className="text-sm text-green-600 mt-2 font-medium">1ère mission offerte</p>
              </div>
            </div>
          </button>

          {/* Groupe */}
          <button
            onClick={() => navigate('/groupe')}
            className="w-full bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-primary-500 transition text-left"
          >
            <div className="flex items-center gap-4">
              <div className="text-5xl">🏢</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Je gère un Groupe</h3>
                <p className="text-gray-600">Plusieurs établissements sous une même enseigne</p>
                <p className="text-sm text-blue-600 mt-2 font-medium">Tarifs dégressifs -10%</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
