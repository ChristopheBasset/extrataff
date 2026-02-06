import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, notifyNewApplication, FRENCH_DEPARTMENTS, extractDepartment } from '../../lib/supabase'
import { getMatchedMissions } from '../../lib/matching'
import MissionCard from './MissionCard'

export default function MissionList() {
  const navigate = useNavigate()
  const [missions, setMissions] = useState([])
  const [filteredMissions, setFilteredMissions] = useState([])
  const [talent, setTalent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filtres
  const [selectedDepartments, setSelectedDepartments] = useState([])
  const [showAllDepartments, setShowAllDepartments] = useState(false)

  useEffect(() => {
    loadMissions()
  }, [])

  // Filtrer les missions quand les filtres changent
  useEffect(() => {
    applyFilters()
  }, [missions, selectedDepartments, showAllDepartments])

  const applyFilters = () => {
    let filtered = [...missions]
    
    // Filtre par département
    if (!showAllDepartments && selectedDepartments.length > 0) {
      filtered = filtered.filter(mission => {
        const dept = extractDepartment(mission.location_fuzzy) || extractDepartment(mission.location_exact)
        return dept && selectedDepartments.includes(dept)
      })
    }
    
    setFilteredMissions(filtered)
  }

  const toggleDepartment = (dept) => {
    setSelectedDepartments(prev =>
      prev.includes(dept)
        ? prev.filter(d => d !== dept)
        : [...prev, dept]
    )
    setShowAllDepartments(false)
  }

  const loadMissions = async () => {
    try {
      // 1. Récupérer le profil talent
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: talentData, error: talentError } = await supabase
        .from('talents')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (talentError) throw talentError
      setTalent(talentData)

      // Initialiser les filtres avec les départements préférés
      if (talentData.preferred_departments && talentData.preferred_departments.length > 0) {
        setSelectedDepartments(talentData.preferred_departments)
      }

      // 2. Récupérer les missions_ids auxquelles le talent a déjà candidaté
      const { data: applicationsData } = await supabase
        .from('applications')
        .select('mission_id')
        .eq('talent_id', talentData.id)

      const appliedMissionIds = applicationsData?.map(app => app.mission_id) || []

      // 3. Récupérer les missions_ids que le talent a masquées
      const { data: hiddenData } = await supabase
        .from('hidden_missions')
        .select('mission_id')
        .eq('talent_id', talentData.id)

      const hiddenMissionIds = hiddenData?.map(h => h.mission_id) || []

      // 4. Récupérer toutes les missions ouvertes
      const { data: missionsData, error: missionsError } = await supabase
        .from('missions')
        .select(`
          *,
          establishments (
            id,
            name,
            user_id
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (missionsError) throw missionsError

      // 5. Filtrer les missions où le talent a déjà candidaté OU masquées
      const availableMissions = (missionsData || []).filter(
        mission => !appliedMissionIds.includes(mission.id) && !hiddenMissionIds.includes(mission.id)
      )

      // 6. Calculer les scores de matching
      const matchedMissions = getMatchedMissions(availableMissions, talentData)
      
      setMissions(matchedMissions)
    } catch (err) {
      console.error('Erreur chargement missions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour envoyer le SMS à l'établissement via Edge Function
  const sendSmsToEstablishment = async (applicationId) => {
    try {
      const response = await supabase.functions.invoke('sms-new-application', {
        body: { applicationId }
      })
      
      if (response.error) {
        console.error('Erreur envoi SMS:', response.error)
      } else {
        console.log('SMS envoyé avec succès:', response.data)
      }
    } catch (err) {
      console.error('Erreur appel Edge Function SMS:', err)
    }
  }

  const handleApply = async (missionId) => {
    try {
      const mission = missions.find(m => m.id === missionId)
      
      // Vérifier si déjà candidaté
      const { data: existingApplication } = await supabase
        .from('applications')
        .select('id')
        .eq('mission_id', missionId)
        .eq('talent_id', talent.id)
        .single()

      if (existingApplication) {
        alert('Vous avez déjà candidaté à cette mission !')
        return
      }

      // Créer la candidature
      const { data: newApplication, error } = await supabase
        .from('applications')
        .insert({
          mission_id: missionId,
          talent_id: talent.id,
          match_score: mission.match_score,
          status: 'interested'
        })
        .select()
        .single()

      if (error) throw error

      // Créer une notification in-app pour l'établissement
      await notifyNewApplication(
        mission.establishments.user_id,
        `${talent.first_name} ${talent.last_name}`,
        mission.position,
        mission.match_score,
        missionId
      )

      // Envoyer un SMS à l'établissement
      await sendSmsToEstablishment(newApplication.id)

      alert('Candidature envoyée avec succès ! 🎉')
      
      // Recharger les missions
      loadMissions()
    } catch (err) {
      console.error('Erreur candidature:', err)
      alert('Erreur lors de l\'envoi de la candidature')
    }
  }

  const handleHideMission = async (missionId) => {
    try {
      const { error } = await supabase
        .from('hidden_missions')
        .insert({
          talent_id: talent.id,
          mission_id: missionId
        })

      if (error) throw error

      // Retirer la mission de la liste localement
      setMissions(prev => prev.filter(m => m.id !== missionId))
      alert('Mission masquée ✓')
    } catch (err) {
      console.error('Erreur masquage mission:', err)
      alert('Erreur lors du masquage de la mission')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Recherche de missions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/talent')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Retour
            </button>
            <h1 className="text-xl font-bold text-primary-600">⚡ ExtraTaff</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Missions Matchées</h2>
          <p className="text-gray-600 mt-2">
            {filteredMissions.length} mission{filteredMissions.length > 1 ? 's' : ''} correspondant à votre profil
            {!showAllDepartments && selectedDepartments.length > 0 && (
              <span> dans {selectedDepartments.length} département(s)</span>
            )}
            {showAllDepartments && <span> (toutes régions)</span>}
          </p>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">🔍 Zone de recherche</h3>
            
            {/* Boutons rapides */}
            <div className="flex gap-2">
              {talent?.preferred_departments?.length > 0 && showAllDepartments && (
                <button
                  onClick={() => {
                    setSelectedDepartments(talent.preferred_departments)
                    setShowAllDepartments(false)
                  }}
                  className="text-sm px-3 py-1 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200"
                >
                  🔍 Mes départements uniquement
                </button>
              )}
              {!showAllDepartments && selectedDepartments.length > 0 && (
                <button
                  onClick={() => setShowAllDepartments(true)}
                  className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                >
                  🌍 Voir toutes les régions
                </button>
              )}
            </div>
          </div>
          
          {/* Départements actifs */}
          {!showAllDepartments && selectedDepartments.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Missions affichées pour vos départements préférés :
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedDepartments.map(dept => {
                  const deptInfo = FRENCH_DEPARTMENTS.find(d => d.value === dept)
                  return (
                    <span
                      key={dept}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                    >
                      {deptInfo?.label || dept}
                      <button
                        type="button"
                        onClick={() => toggleDepartment(dept)}
                        className="hover:text-primary-900"
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {showAllDepartments && (
            <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
              🌍 Vous voyez toutes les missions de France. Cliquez sur "Mes départements uniquement" pour filtrer.
            </p>
          )}

          {/* Option pour ajouter des départements */}
          <details className="mt-4">
            <summary className="text-sm text-primary-600 cursor-pointer hover:text-primary-700">
              ➕ Ajouter d'autres départements à ma recherche
            </summary>
            <div className="mt-3">
              <select
                multiple
                value={selectedDepartments}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setSelectedDepartments(selected)
                  setShowAllDepartments(false)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl min-h-[150px]"
              >
                {FRENCH_DEPARTMENTS.map(dept => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Maintenez Ctrl (Windows) ou Cmd (Mac) pour sélectionner plusieurs départements.
              </p>
            </div>
          </details>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {filteredMissions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
            <p className="text-xl text-gray-600 mb-4">🔍 Aucune mission trouvée</p>
            <p className="text-gray-500 mb-6">
              {!showAllDepartments && selectedDepartments.length > 0
                ? 'Aucune mission disponible dans vos départements. Essayez d\'élargir votre recherche.'
                : 'Aucune mission ne correspond à votre profil pour le moment.'
              }
            </p>
            {!showAllDepartments && selectedDepartments.length > 0 ? (
              <button
                onClick={() => setShowAllDepartments(true)}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
              >
                🌍 Voir toutes les régions
              </button>
            ) : (
              <button
                onClick={() => navigate('/talent/edit-profile')}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
              >
                Modifier mon profil
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMissions.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                matchCategory={mission.match_category}
                onApply={handleApply}
                onHide={handleHideMission}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
