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
  const [maxDistance, setMaxDistance] = useState(50) // km

  useEffect(() => {
    loadMissions()
  }, [])

  // Filtrer les missions quand les filtres changent
  useEffect(() => {
    applyFilters()
  }, [missions, selectedDepartments, maxDistance])

  const applyFilters = () => {
    let filtered = [...missions]
    
    // Filtre par département
    if (selectedDepartments.length > 0) {
      filtered = filtered.filter(mission => {
        const dept = extractDepartment(mission.location_fuzzy) || extractDepartment(mission.location_exact)
        return dept && selectedDepartments.includes(dept)
      })
    }
    
    // Note: Le filtre par distance nécessiterait des coordonnées GPS réelles
    // Pour l'instant on garde toutes les missions qui passent le filtre département
    
    setFilteredMissions(filtered)
  }

  const toggleDepartment = (dept) => {
    setSelectedDepartments(prev =>
      prev.includes(dept)
        ? prev.filter(d => d !== dept)
        : [...prev, dept]
    )
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

      // Initialiser les filtres avec les départements préférés du talent
      if (talentData.preferred_departments && talentData.preferred_departments.length > 0) {
        setSelectedDepartments(talentData.preferred_departments)
      }

      // 2. Récupérer toutes les missions ouvertes avec les infos établissement
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

      // 3. Calculer les scores de matching et filtrer
      const matchedMissions = getMatchedMissions(missionsData, talentData)
      
      setMissions(matchedMissions)
    } catch (err) {
      console.error('Erreur chargement missions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
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
      const { error } = await supabase
        .from('applications')
        .insert({
          mission_id: missionId,
          talent_id: talent.id,
          match_score: mission.match_score,
          status: 'interested'
        })

      if (error) throw error

      // Créer une notification pour l'établissement
      await notifyNewApplication(
        mission.establishments.user_id,
        `${talent.first_name} ${talent.last_name}`,
        mission.position,
        mission.match_score,
        missionId
      )

      alert('Candidature envoyée avec succès ! 🎉')
      
      // Recharger les missions
      loadMissions()
    } catch (err) {
      console.error('Erreur candidature:', err)
      alert('Erreur lors de l\'envoi de la candidature')
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
            <div className="w-20"></div> {/* Spacer */}
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Missions Matchées</h2>
          <p className="text-gray-600 mt-2">
            {filteredMissions.length} mission{filteredMissions.length > 1 ? 's' : ''} correspondant à votre profil
            {selectedDepartments.length > 0 && ` dans ${selectedDepartments.length} département(s)`}
          </p>
        </div>

        {/* Filtres */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Filtres</h3>
          
          {/* Filtrer par département */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrer par départements
            </label>
            <select
              multiple
              value={selectedDepartments}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value)
                setSelectedDepartments(selected)
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
            {selectedDepartments.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedDepartments.length} département(s) sélectionné(s)
                  </span>
                  <button
                    onClick={() => setSelectedDepartments([])}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Réinitialiser
                  </button>
                </div>
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
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {filteredMissions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-xl text-gray-600 mb-4">🔍 Aucune mission trouvée</p>
            <p className="text-gray-500 mb-6">
              {selectedDepartments.length > 0
                ? 'Essayez d\'élargir vos critères de recherche'
                : 'Revenez plus tard ou modifiez vos critères de recherche'
              }
            </p>
            {selectedDepartments.length > 0 ? (
              <button
                onClick={() => setSelectedDepartments([])}
                className="btn-primary"
              >
                Réinitialiser les filtres
              </button>
            ) : (
              <button
                onClick={() => navigate('/talent/edit-profile')}
                className="btn-primary"
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
