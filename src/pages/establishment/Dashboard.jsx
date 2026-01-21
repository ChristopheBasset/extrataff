import { supabase } from '../../lib/supabase'
import { useNavigate, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import EstablishmentProfileForm from '../../components/Establishment/EstablishmentProfileForm'
import MissionForm from '../../components/Establishment/MissionForm'
import MyMissions from '../../components/Establishment/MyMissions'
import ApplicationsList from '../../components/Establishment/ApplicationsList'
import ChatList from '../../components/shared/ChatList'
import ChatWindow from '../../components/shared/ChatWindow'
import NotificationBadge from '../../components/shared/NotificationBadge'
import NotificationList from '../../components/shared/NotificationList'

export default function EstablishmentDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    checkProfile()
  }, [])

  const checkProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data } = await supabase
      .from('establishments')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    setProfile(data)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
  }

  // Si pas de profil, afficher le formulaire
  if (!profile) {
    return <EstablishmentProfileForm />
  }

  // Si profil existe, afficher le dashboard avec routes
  return (
    <Routes>
      <Route path="/" element={
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <h1 className="text-xl font-bold text-primary-600">⚡ ExtraTaff</h1>
                <div className="flex items-center gap-4">
                  {/* Badge de notifications */}
                  <div className="relative">
                    <NotificationBadge onClick={() => setShowNotifications(!showNotifications)} />
                    <NotificationList 
                      isOpen={showNotifications}
                      onClose={() => setShowNotifications(false)}
                    />
                  </div>
                  
                  <span className="text-gray-700">{profile.name}</span>
                  <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
                    Déconnexion
                  </button>
                </div>
              </div>
            </div>
          </nav>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Dashboard Établissement</h2>
              <p className="text-gray-600 mt-2">Bienvenue {profile.name} !</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-2">Mes Missions</h3>
                <p className="text-gray-600 mb-4">Gérez vos annonces et consultez les candidatures</p>
                <button
                  onClick={() => navigate('/establishment/missions')}
                  className="btn-primary w-full"
                >
                  📋 Voir mes missions
                </button>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-2">Créer une Mission</h3>
                <p className="text-gray-600 mb-4">Publiez une nouvelle annonce</p>
                <button
                  onClick={() => navigate('/establishment/create-mission')}
                  className="btn-primary w-full"
                >
                  ➕ Nouvelle mission
                </button>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-2">💬 Messages</h3>
                <p className="text-gray-600 mb-4">Discutez avec les talents</p>
                <button
                  onClick={() => navigate('/establishment/chat')}
                  className="btn-primary w-full"
                >
                  Mes conversations
                </button>
              </div>
            </div>
          </div>
        </div>
      } />
      
      <Route path="/create-mission" element={<MissionForm />} />
      <Route path="/missions" element={<MyMissions />} />
      <Route path="/applications/:missionId" element={<ApplicationsList />} />
      <Route path="/chat" element={<ChatList userType="establishment" />} />
      <Route path="/chat/:applicationId" element={<ChatWindow userType="establishment" />} />
    </Routes>
  )
}
