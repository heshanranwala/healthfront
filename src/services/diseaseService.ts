import { getUserId } from './profileService'
import { getBaseUrl } from './apiConfig'

const BASE_URL = getBaseUrl()

export type Disease = {
  id: string
  userId: string
  name: string
  description: string
  diagnosedDate: string
  status: 'active' | 'resolved' | 'chronic'
  notes?: string
}

// Get diseases from backend
export async function getDiseases(): Promise<Disease[]> {
  const userId = getUserId()
  if (!userId) return []

  try {
    const response = await fetch(`${BASE_URL}/getDiseases?userId=${userId}`, {
      headers: { Accept: 'application/json' }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch diseases: ${response.status}`)
    }
    
    const data = await response.json()
    return data || []
  } catch (error) {
    console.error('Error fetching diseases:', error)
    return []
  }
}

// Add disease to backend
export async function addDisease(disease: Omit<Disease, 'id'>): Promise<void> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  try {
    const response = await fetch(`${BASE_URL}/addDisease`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: disease.userId,
        name: disease.name,
        description: disease.description,
        diagnosedDate: disease.diagnosedDate,
        status: disease.status,
        notes: disease.notes || ''
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to add disease: ${response.status}`)
    }
  } catch (error) {
    console.error('Error adding disease:', error)
    throw error
  }
}



