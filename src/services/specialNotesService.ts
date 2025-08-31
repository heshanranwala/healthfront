import { getUserId } from './profileService'
import { getBaseUrl } from './apiConfig'

const BASE_URL = getBaseUrl()

export type SpecialNotes = {
  id: string
  userId: string
  notes: string
  createdAt: string
}

// Get special notes from backend
export async function getSpecialNotes(): Promise<string | null> {
  const userId = getUserId()
  if (!userId) return null

  try {
    const response = await fetch(`${BASE_URL}/getSpecialNotes?userId=${userId}`, {
      headers: { Accept: 'application/json' }
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return null // No notes found
      }
      throw new Error(`Failed to fetch special notes: ${response.status}`)
    }
    
    const data = await response.json()
    return data.notes || null
  } catch (error) {
    console.error('Error fetching special notes:', error)
    return null
  }
}

// Add special notes to backend
export async function addSpecialNotes(notes: string): Promise<void> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  try {
    const response = await fetch(`${BASE_URL}/addSpecialNotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, notes })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to add special notes: ${response.status}`)
    }
  } catch (error) {
    console.error('Error adding special notes:', error)
    throw error
  }
}
