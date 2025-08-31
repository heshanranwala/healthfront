export type UserProfile = {
  id: string
  firstName: string
  lastName: string
  email: string
  gender: string
  dateOfBirth: string
  phoneNumber: string
  photoDataUrl?: string
}

import { getBaseUrl } from './apiConfig'

const BASE_URL = getBaseUrl()

// Function to get user ID from local storage
export function getUserId(): string | null {
  const userId = localStorage.getItem('auth_user_id')
  console.log('Retrieved userId from localStorage:', userId)
  return userId
}

// Delete user profile
export async function deleteUserProfile(): Promise<void> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  try {
    console.log('Deleting profile for userId:', userId)
    
    const response = await fetch(`${BASE_URL}/deleteProfile`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    console.log('Delete profile response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to delete profile:', response.status, errorText)
      throw new Error(`Failed to delete profile: ${response.status} ${errorText}`)
    }
  } catch (error) {
    console.error('Error deleting profile:', error)
    throw error
  }
}

// Add a fallback approach for profile loading
export async function getUserProfile(): Promise<UserProfile | null> {
  const userId = getUserId()
  if (!userId) return null

  try {
    const response = await fetch(`${BASE_URL}/getUserProfile?userId=${userId}`)
    console.log('Profile response status:', response.status)
    
    if (!response.ok) {
      console.log('Profile endpoint returned:', response.status, response.statusText)
      // Fallback: try to get user data from login response
      const userStr = localStorage.getItem('auth_user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          return {
            id: userId,
            firstName: user.name?.split(' ')[0] || '',
            lastName: user.name?.split(' ').slice(1).join(' ') || '',
            email: user.email || '',
            gender: '',
            dateOfBirth: '',
            phoneNumber: '',
            photoDataUrl: undefined
          }
        } catch (e) {
          console.error('Error parsing user data:', e)
        }
      }
      throw new Error('Failed to fetch user profile')
    }
    
    const responseData = await response.json()
    console.log('Profile response data:', responseData)
    
    // Check if the response has a value property (from backend structure)
    if (responseData.value) {
      // Handle double-nested value case: {"value":{"value":{...}}}
      if (responseData.value.value) {
        return responseData.value.value as UserProfile
      }
      return responseData.value as UserProfile
    }
    
    // Check if the response has a body property (from backend structure)
    if (responseData.body) {
      return responseData.body as UserProfile
    }
    
    return responseData as UserProfile
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

// Update user profile in backend
export async function updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  try {
    // Ensure all required fields are present, including photoDataUrl
    const requestBody = { 
      userId, 
      ...profile,
      photoDataUrl: profile.photoDataUrl || "" // Ensure photoDataUrl is always present as empty string if not provided
    }
    console.log('Updating profile with data:', requestBody)
    
    const response = await fetch(`${BASE_URL}/updateUserProfile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })
    
    console.log('Update profile response status:', response.status)
    
    // Log the response body
    const responseData = await response.json()
    console.log('Update profile response data:', responseData)
    console.log('Response data type:', typeof responseData)
    console.log('Response data keys:', Object.keys(responseData))
    
    if (!response.ok) {
      console.error('Failed to update profile:', response.status, responseData)
      throw new Error(`Failed to update user profile: ${response.status}`)
    }
    
    // Return the updated profile data
    if (responseData.body) {
      console.log('Using responseData.body:', responseData.body)
      return responseData.body as UserProfile
    } else if (responseData.id) {
      // If the response has an id field directly at the top level
      console.log('Using responseData with id directly:', responseData)
      return responseData as UserProfile
    } else if (responseData.message && responseData.message === "Profile updated successfully") {
      // If we only got a success message, fetch the latest profile
      console.log('Got success message, fetching latest profile')
      const updatedProfile = await getUserProfile()
      console.log('Fetched updated profile:', updatedProfile)
      return updatedProfile
    }
    
    console.log('Using responseData directly:', responseData)
    return responseData as UserProfile
  } catch (error) {
    console.error('Error updating profile:', error)
    throw error
  }
}

// Keep the old functions for compatibility
export function getProfile() {
  return getUserProfile()
}

export function saveProfile(profile: any) {
  return updateUserProfile(profile)
}

export async function saveSpecialNotes(notes: string): Promise<void> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  try {
    const response = await fetch(`${BASE_URL}/addSpecialNotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, notes }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to save special notes: ${response.status} ${errorText}`)
    }

    // Also save to localStorage as backup
    localStorage.setItem('special_notes', notes)
  } catch (error) {
    console.error('Error saving special notes:', error)
    throw error
  }
}

export async function getSpecialNotes(): Promise<string> {
  const userId = getUserId()
  if (!userId) return localStorage.getItem('special_notes') || ''

  try {
    const response = await fetch(`${BASE_URL}/getSpecialNotes?userId=${userId}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('Special notes response data:', data)
      
      // Extract notes from the correct field
      let notes = ''
      if (data.notes !== undefined) {
        notes = data.notes
      } else if (data.body) {
        notes = data.body
      } else if (data.specialNotes) {
        notes = data.specialNotes
      }
      
      console.log('Extracted notes:', notes)
      
      // Save to localStorage as backup
      localStorage.setItem('special_notes', notes)
      return notes
    }
  } catch (error) {
    console.error('Error fetching special notes:', error)
  }

  // Fallback to localStorage
  return localStorage.getItem('special_notes') || ''
}


