import { useState, useEffect } from 'react'
import { getUserProfile, updateUserProfile, deleteUserProfile } from '../services/profileService'
import { useNavigate } from 'react-router-dom'
import './profile.css'
import SideNav from '../components/SideNav'

function ProfilePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const profile = await getUserProfile()
      if (profile) {
        setFirstName(profile.firstName || '')
        setLastName(profile.lastName || '')
        setGender(profile.gender || '')
        setEmail(profile.email || '')
        setPhoneNumber(profile.phoneNumber || '')
        setDateOfBirth(profile.dateOfBirth || '')
        setPhotoDataUrl(profile.photoDataUrl)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await fileToDataUrl(file)
    setPhotoDataUrl(url)
  }

  const [saveSuccess, setSaveSuccess] = useState(false)

  const onSave = async () => {
    try {
      setSaving(true)
      setSaveSuccess(false)
      const updatedProfile = await updateUserProfile({
        firstName,
        lastName,
        gender,
        email,
        phoneNumber,
        dateOfBirth,
        photoDataUrl,
      })
      
      console.log('Profile.tsx received updated profile:', updatedProfile)
      
      // Use the updated profile data returned directly from the API
      if (updatedProfile) {
        // Force reload the profile to ensure we have the latest data
        await loadProfile()
        
        setSaveSuccess(true)
        setEditMode(false) // Exit edit mode after successful save
      } else {
        console.error('No profile data returned from update')
        alert('Profile update may not have been saved correctly. Please refresh the page.')
      }
      
      // Automatically hide success message after 5 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 5000)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (confirm('Are you sure you want to delete your profile? This action cannot be undone.')) {
      try {
        // Call the deleteUserProfile function (needs to be implemented in profileService.ts)
        await deleteUserProfile()
        localStorage.removeItem('auth_user_id')
        localStorage.removeItem('auth_user')
        navigate('/')
      } catch (error) {
        console.error('Error deleting profile:', error)
        alert('Failed to delete profile. Please try again.')
      }
    }
  }
  
  const toggleEditMode = () => {
    setEditMode(!editMode)
  }

  if (loading) {
    return (
      <div className="profile-page">
        <SideNav />
        <main className="profile-main">
          <h1>Profile</h1>
          <div>Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <SideNav />

      <main className="profile-main">
        <header className="profile-header">
          <div className="header-content">
            <h1 className="profile-title">Profile Settings</h1>
            <p className="profile-subtitle">Manage your personal information and preferences</p>
          </div>
          {!editMode && (
            <button className="edit-profile-btn" onClick={toggleEditMode}>
              <span className="edit-icon">✏️</span>
              Edit Profile
            </button>
          )}
        </header>

        {saveSuccess && !editMode && (
          <div className="success-banner">
            <span className="success-icon">✓</span>
            <span>Profile updated successfully!</span>
          </div>
        )}

        <div className="profile-content">
          <div className="profile-photo-section">
            <div className="photo-container">
              {photoDataUrl ? (
                <img src={photoDataUrl} alt="Profile" className="profile-photo" />
              ) : (
                <div className="photo-placeholder">
                  {firstName && lastName ? `${firstName.charAt(0)}${lastName.charAt(0)}` : '👤'}
                </div>
              )}
              {editMode && (
                <div className="photo-upload">
                  <label className="upload-btn">
                    <input type="file" accept="image/*" onChange={onPickPhoto} />
                    <span className="upload-icon">📷</span>
                    <span>Change Photo</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="profile-form">
            <div className="form-section">
              <h2 className="section-title">Personal Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input 
                    type="text" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    disabled={!editMode}
                    className="form-input"
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input 
                    type="text" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                    disabled={!editMode}
                    className="form-input"
                    placeholder="Enter your last name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select 
                    value={gender} 
                    onChange={(e) => setGender(e.target.value)}
                    disabled={!editMode}
                    className="form-select"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input 
                    type="date" 
                    value={dateOfBirth} 
                    onChange={(e) => setDateOfBirth(e.target.value)} 
                    disabled={!editMode}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2 className="section-title">Contact Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    disabled={!editMode}
                    className="form-input"
                    placeholder="Enter your email address"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    disabled={!editMode}
                    className="form-input"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </div>
          </div>

          {editMode && (
            <div className="profile-actions">
              <div className="action-buttons">
                <button className="save-btn" onClick={onSave} disabled={saving}>
                  <span className="save-icon">💾</span>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="cancel-btn" onClick={toggleEditMode}>
                  Cancel
                </button>
              </div>
              <div className="danger-zone">
                <h3 className="danger-title">Danger Zone</h3>
                <p className="danger-description">Once you delete your profile, there is no going back. Please be certain.</p>
                <button className="delete-btn" onClick={onDelete}>
                  <span className="delete-icon">🗑️</span>
                  Delete Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ProfilePage

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}


