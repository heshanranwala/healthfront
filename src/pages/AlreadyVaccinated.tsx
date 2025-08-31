import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVaccinesFromBackend, markVaccineByNameDose } from '../services/vaccineService'
import { getProfile } from '../services/profileService'
import type { UserProfile } from '../services/profileService'
import './alreadyVaccinated.css'

function AlreadyVaccinatedPage() {
  const navigate = useNavigate()
  const [vaccines, setVaccines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVaccines, setSelectedVaccines] = useState<{[key: string]: boolean}>({})
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userProfile = await getProfile()
        setProfile(userProfile)
      } catch (error) {
        console.error('Error fetching profile:', error)
        navigate('/auth')
      }
    }
    
    fetchProfile()
  }, [navigate])

  useEffect(() => {
    const fetchVaccines = async () => {
      if (!profile) {
        return
      }

      try {
        setLoading(true)
        const userVaccines = await getVaccinesFromBackend()
        setVaccines(userVaccines)
        
        // Initialize vaccines based on their current received status
        const initialSelection = userVaccines.reduce((acc: {[key: string]: boolean}, vaccine: any) => {
          const key = `${vaccine.name}-${vaccine.dose}`
          acc[key] = vaccine.received || false
          return acc
        }, {})
        
        setSelectedVaccines(initialSelection)
      } catch (error) {
        console.error('Error fetching vaccines:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVaccines()
  }, [navigate, profile])

  const handleToggleVaccine = async (name: string, dose: string) => {
    const key = `${name}-${dose}`
    const next = !selectedVaccines[key]
    setSelectedVaccines(prev => ({ ...prev, [key]: next }))
    try {
      await markVaccineByNameDose(name, dose, next)
    } catch (e) {
      console.error('Failed to update vaccine received state:', e)
      setSelectedVaccines(prev => ({ ...prev, [key]: !next }))
      alert('Failed to update. Please try again.')
    }
  }

  const handleDone = () => {
    // Store welcome notification in localStorage for dashboard to show
    localStorage.setItem('showWelcomeNotification', 'true')
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <div className="already-vaccinated-page">
        <div className="loading-container">
          <h1 className="loading-title">Loading Vaccine Information</h1>
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="already-vaccinated-page">
      <header className="page-header">
        <h1 className="page-title">Vaccine History</h1>
        <p className="page-subtitle">Select the vaccines you have already received to complete your profile</p>
      </header>

      <div className="main-container">
        <section className="vaccines-section">
          <div className="section-header">
            <h2 className="section-title">Available Vaccines</h2>
            <div className="section-count">{vaccines.length} vaccines</div>
          </div>
          
          <div className="vaccines-grid">
            {vaccines.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💉</div>
                <h3>No vaccines available</h3>
                <p>Please check back later or contact your healthcare provider</p>
              </div>
            ) : (
              vaccines.map((vaccine, index) => {
                const key = `${vaccine.name}-${vaccine.dose}`
                const isSelected = selectedVaccines[key]
                return (
                  <div 
                    key={index} 
                    className={`vaccine-card-av ${isSelected ? 'selected' : 'unselected'}`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="vaccine-header-av">
                      <div className="vaccine-name-av">{vaccine.name}</div>
                      <div className="vaccine-dose-av">{vaccine.dose}</div>
                    </div>
                    
                    <div className="vaccine-status-av">
                      <div className={`status-indicator-av ${isSelected ? 'received' : 'pending'}`}>
                        {isSelected ? '✓ Received' : '⏳ Pending'}
                      </div>
                    </div>
                    
                    <div className="vaccine-actions-av">
                      <label className="vaccine-checkbox-av">
                        <input
                          type="checkbox"
                          checked={isSelected || false}
                          onChange={() => handleToggleVaccine(vaccine.name, vaccine.dose)}
                        />
                        <span className="checkmark-av"></span>
                        <span className="checkbox-label-av">
                          {isSelected ? 'Mark as not received' : 'Mark as received'}
                        </span>
                      </label>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <aside className="sidebar">
          <div className="profile-card-av">
            <div className="profile-photo-av">
              {profile?.photoDataUrl ? (
                <img src={profile.photoDataUrl} alt={`${profile.firstName} ${profile.lastName}`} />
              ) : (
                <div className="photo-placeholder-av">{profile?.firstName?.charAt(0) || 'U'}</div>
              )}
            </div>
            <div className="profile-info-av">
              <h3>{profile ? `${profile.firstName} ${profile.lastName}` : 'User'}</h3>
              <p className="profile-role-av">Health Profile</p>
            </div>
          </div>

          <div className="progress-section-av">
            <h3 className="progress-title-av">Progress</h3>
            <div className="progress-bar-av">
              <div 
                className="progress-fill-av" 
                style={{ 
                  width: `${vaccines.length > 0 ? (Object.values(selectedVaccines).filter(Boolean).length / vaccines.length) * 100 : 0}%` 
                }}
              ></div>
            </div>
            <div className="progress-stats-av">
              <div className="stat-av">
                <span className="stat-value-av">{Object.values(selectedVaccines).filter(Boolean).length}</span>
                <span className="stat-label-av">Selected</span>
              </div>
              <div className="stat-av">
                <span className="stat-value-av">{vaccines.length}</span>
                <span className="stat-label-av">Total</span>
              </div>
            </div>
          </div>
      
          <div className="action-section-av">
            <button className="primary-btn-av" onClick={handleDone}>
              <span className="btn-icon-av">✓</span>
              Complete Setup
            </button>
            <p className="action-hint-av">Click "Complete Setup" when you're done selecting vaccines</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default AlreadyVaccinatedPage