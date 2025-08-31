export type BmiEntry = {
  id?: string // Record ID from backend
  dateISO: string // YYYY-MM-DD
  heightCm: number
  weightKg: number
  notes?: string // Notes from backend
}


import { getUserId } from './profileService'
import { getBaseUrl } from './apiConfig'

const BASE_URL = getBaseUrl()

// Get BMI records from backend
export async function listBmi(): Promise<BmiEntry[]> {
  try {
    return await fetchBmiRecords()
  } catch (error) {
    console.error('Error fetching BMI records:', error)
    return []
  }
}

// Add BMI record to backend
export async function addBmi(entry: BmiEntry): Promise<void> {
  try {
    const result = await addBmiRecordToBackend(entry)
    if (result === null) {
      throw new Error('Failed to add BMI record')
    }
  } catch (error) {
    console.error('Error adding BMI record:', error)
    throw error
  }
}

// Update BMI record in backend
export async function updateBmi(originalDateISO: string, updated: BmiEntry): Promise<void> {
  try {
    const userId = getUserId()
    if (!userId) throw new Error('User not authenticated')
    
    // Find the record ID first
    const allRecords = await fetchBmiRecords()
    const record = allRecords.find(r => r.dateISO === originalDateISO)
    
    if (!record) {
      throw new Error('BMI record not found')
    }
    
    // Call the backend update endpoint
    const response = await fetch(`${BASE_URL}/updateBmiRecord`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        userId,
        recordId: record.id || originalDateISO,
        weight: updated.weightKg,
        height: updated.heightCm / 100,
        date: updated.dateISO,
        notes: updated.notes || ''
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to update BMI record: ${response.status} ${errorText}`)
    }
  } catch (error) {
    console.error('Error updating BMI record:', error)
    throw error
  }
}

// Delete BMI record from backend
export async function deleteBmi(dateISO: string): Promise<void> {
  try {
    const userId = getUserId()
    if (!userId) throw new Error('User not authenticated')
    
    // Find the record ID first
    const allRecords = await fetchBmiRecords()
    const record = allRecords.find(r => r.dateISO === dateISO)
    
    if (!record) {
      throw new Error('BMI record not found')
    }
    
    // Call the backend delete endpoint
    const response = await fetch(`${BASE_URL}/deleteBmiRecord`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        userId,
        recordId: record.id || dateISO
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to delete BMI record: ${response.status} ${errorText}`)
    }
  } catch (error) {
    console.error('Error deleting BMI record:', error)
    throw error
  }
}

// Backend integration
export async function fetchBmiRecords(): Promise<BmiEntry[]> {
  const userId = getUserId()
  if (!userId) return []
  try {
    const response = await fetch(`${BASE_URL}/getBmiRecords?userId=${userId}`, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Failed to fetch BMI records: ${response.status}`)
    const data = await response.json()
    
    console.log('DEBUG: BMI records response:', data)
    
    // Handle nested response structure from backend
    let bmiData = data
    if (data.body && Array.isArray(data.body)) {
      bmiData = data.body
    }
    
    // Map backend fields to frontend BmiEntry
    const mapped: BmiEntry[] = (Array.isArray(bmiData) ? bmiData : []).map((rec: any) => {
      console.log('DEBUG: Processing BMI record:', rec)
      
      // Normalize date
      let dateISO = ''
      const created = rec.createdAt || rec.created_at || rec.date || rec.created || ''
      if (typeof created === 'string') {
        dateISO = created.includes('T') ? created.split('T')[0] : created
      }
      
      return {
        id: rec.id?.toString() || '',
        dateISO,
        heightCm: Number(rec.height) * 100 || 0,
        weightKg: Number(rec.weight) || 0,
        notes: rec.notes || ''
      }
    }).filter((e: BmiEntry) => !!e.dateISO)
    
    console.log('DEBUG: Mapped BMI records:', mapped)
    return mapped.sort((a,b)=>a.dateISO.localeCompare(b.dateISO))
  } catch (e) {
    console.error('fetchBmiRecords error', e)
    return []
  }
}

export async function addBmiRecordToBackend(entry: BmiEntry): Promise<number | null> {
  const userId = getUserId()
  if (!userId) return null
  const payload = {
    userId,
    weight: entry.weightKg,
    height: entry.heightCm / 100,
    date: entry.dateISO,
    notes: entry.notes || ''
  }
  try {
    const response = await fetch(`${BASE_URL}/addBmiRecord`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`Failed to add BMI record: ${response.status}`)
    const body = await response.json()
    // backend returns { message, bmi }
    return typeof body?.bmi === 'number' ? body.bmi : null
  } catch (e) {
    console.error('addBmiRecordToBackend error', e)
    return null
  }
}

export function computeBmi(heightCm: number, weightKg: number): number {
  const h = heightCm / 100
  if (!h) return 0
  return +(weightKg / (h * h)).toFixed(1)
}

export function classifyBmi(bmi: number): { label: string; color: 'danger' | 'ok' | 'warn' } {
  if (bmi <= 0) return { label: 'unknown', color: 'warn' }
  if (bmi < 18.5) return { label: 'underweight', color: 'danger' }
  if (bmi < 25) return { label: 'healthy', color: 'ok' }
  if (bmi < 30) return { label: 'overweight', color: 'warn' }
  return { label: 'obese', color: 'danger' }
}

export async function latest(): Promise<BmiEntry | null> {
  const all = await listBmi()
  return all.length ? all[all.length - 1] : null
}

// Growth/BMI classification from backend
export type GrowthCheckResponse = {
  userId: string
  gender?: string
  ageInMonths?: number
  weight: number
  height: number
  growthRange?: { under: number; min: number; max: number; over: number }
  weightStatus?: string
  bmi?: number
  bmiStatus?: string
  message?: string
}

export async function checkGrowth(weightKg: number, heightCm: number): Promise<GrowthCheckResponse | null> {
  const userId = getUserId()
  if (!userId) return null
  try {
    const response = await fetch(`${BASE_URL}/checkGrowth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ userId, weight: weightKg, height: heightCm }),
    })
    if (!response.ok) throw new Error(`checkGrowth failed: ${response.status}`)
    return await response.json()
  } catch (e) {
    console.error('checkGrowth error', e)
    return null
  }
}

