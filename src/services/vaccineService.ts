import type { UserProfile } from './profileService'
import { getProfile } from './profileService'

// Backend vaccine record structure
export type BackendVaccineRecord = {
  id?: string
  name: string
  dose: string
  received: boolean
  receivedDate?: string
  isCustom?: boolean
  offsetMonths?: number
  dueDate?: string
}

// Frontend vaccine record structure for compatibility
export type VaccineRecord = {
  id: string
  name: string
  company: string
  offsetMonths: number
  isCustom: boolean
  administered: boolean
  administeredDateISO?: string
  dueDateISO?: string
}

import { getBaseUrl } from './apiConfig'

const BASE_URL = getBaseUrl()

// Import getUserId from profileService
import { getUserId } from './profileService'

// Get vaccines from backend
export async function getVaccinesFromBackend(): Promise<BackendVaccineRecord[]> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  console.log('Fetching vaccines from:', `${BASE_URL}/getVaccines?userId=${userId}`)
  
  try {
    const response = await fetch(`${BASE_URL}/getVaccines?userId=${userId}` , { mode: 'cors', cache: 'no-store' })
    console.log('Vaccine fetch response status:', response.status)
    
    if (!response.ok) {
      throw new Error('Failed to fetch vaccines')
    }
    const raw = await response.json()
    // Accept both plain array and { body: [...] }
    const data = Array.isArray(raw) ? raw : (Array.isArray(raw?.body) ? raw.body : [])
    console.log('Received vaccines data:', data)
    return data as BackendVaccineRecord[]
  } catch (error) {
    console.error('Error fetching vaccines:', error)
    return []
  }
}

// Convert backend vaccine records to frontend format
function convertBackendToFrontend(backendVaccines: BackendVaccineRecord[]): VaccineRecord[] {
  return backendVaccines.map((vaccine) => {
    // Use the backend offsetMonths if available, otherwise try to infer from dose/name
    let offsetMonths = 0;
    if (typeof vaccine.offsetMonths === 'number' && vaccine.offsetMonths > 0) {
      offsetMonths = vaccine.offsetMonths;
    } else {
      // Try to infer from dose/name if offsetMonths is not set
      const inferred = inferOffsetMonthsFromDose(vaccine.dose, vaccine.name);
      offsetMonths = inferred ?? 0;
    }
    
    return {
      id: vaccine.id || `${vaccine.name}::${typeof vaccine.dose === 'string' ? vaccine.dose : ''}`, // Use backend id if available
      name: vaccine.name,
      company: typeof vaccine.dose === 'string' ? vaccine.dose : '',
      offsetMonths: offsetMonths,
      isCustom: !!vaccine.isCustom,
      administered: vaccine.received,
      administeredDateISO: vaccine.receivedDate,
      dueDateISO: vaccine.dueDate
    }
  })
}

function inferOffsetMonthsFromDose(dose: string | undefined, name: string | undefined): number | undefined {
  if (!dose && !name) return undefined
  const source = `${dose || ''} ${name || ''}`.toLowerCase()
  // Match patterns like "11 years", "at 11 years"
  const yearsMatch = source.match(/(?:at\s+)?(\d+)\s*years?/) || source.match(/(?:at\s+)?(\d+)\s*yrs?/) 
  if (yearsMatch && yearsMatch[1]) {
    const years = parseInt(yearsMatch[1], 10)
    if (!Number.isNaN(years)) return years * 12
  }
  // Match patterns like "18 months", "at 18 months"
  const monthsMatch = source.match(/(?:at\s+)?(\d+)\s*months?/) || source.match(/(?:at\s+)?(\d+)\s*mos?/) 
  if (monthsMatch && monthsMatch[1]) {
    const months = parseInt(monthsMatch[1], 10)
    if (!Number.isNaN(months)) return months
  }
  // Common grade to age mapping: Grade 7 ~ 11 years
  if (/grade\s*7/.test(source)) return 11 * 12
  return undefined
}

// Get vaccines (now from backend)
export async function listVaccines(): Promise<VaccineRecord[]> {
  try {
    const backendVaccines = await getVaccinesFromBackend()
    return convertBackendToFrontend(backendVaccines)
  } catch (error) {
    console.error('Error getting vaccines:', error)
    return []
  }
}

// Add custom vaccine
export async function addCustomVaccine(name: string, company: string, offsetMonths: number): Promise<void> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  console.log('Adding custom vaccine:', { userId, name, company, offsetMonths })
  
  // Create a vaccine record in the format expected by the backend
  const vaccineRecord: BackendVaccineRecord = {
    name: name,
    dose: company,
    received: false,
    isCustom: true,
    offsetMonths: offsetMonths
  }

  try {
    const response = await fetch(`${BASE_URL}/addCustomVaccine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      cache: 'no-store',
      body: JSON.stringify({ 
        userId, 
        vaccine: vaccineRecord
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to add custom vaccine:', response.status, errorText)
      throw new Error(`Failed to add custom vaccine: ${response.status} ${errorText}`)
    }
  } catch (error) {
    console.error('Error adding custom vaccine:', error)
    throw error
  }
}

// Update vaccine
export async function updateVaccine(id: string, changes: Partial<Pick<VaccineRecord, 'name'|'company'|'offsetMonths'>>): Promise<boolean> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  console.log('DEBUG: updateVaccine called with id:', id, 'changes:', changes)

  // Get the vaccine details
  const vaccines = await listVaccines()
  console.log('DEBUG: Available vaccines for update:', vaccines.map(v => ({ id: v.id, name: v.name, isCustom: v.isCustom })))
  
  const vaccine = vaccines.find(v => v.id === id)
  console.log('DEBUG: Found vaccine for update:', vaccine)
  
  if (!vaccine) {
    console.error('Vaccine not found')
    return false
  }
  
  if (!vaccine.isCustom) {
    console.error('Cannot update non-custom vaccine')
    return false
  }

  try {
    const response = await fetch(`${BASE_URL}/updateVaccine`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      cache: 'no-store',
      body: JSON.stringify({
        userId,
        name: vaccine.name,
        dose: vaccine.company,
        newName: changes.name || vaccine.name,
        newDose: changes.company || vaccine.company,
        newOffsetMonths: changes.offsetMonths || vaccine.offsetMonths,
      }),
    })
    
    if (!response.ok) {
      console.error('Failed to update vaccine:', response.statusText)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error updating vaccine:', error)
    return false
  }
}

// Delete vaccine - only custom vaccines can be deleted
export async function deleteVaccine(id: string): Promise<void> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  console.log('DEBUG: deleteVaccine called with id:', id)

  // Get the vaccine details
  const vaccines = await listVaccines()
  console.log('DEBUG: Available vaccines:', vaccines.map(v => ({ id: v.id, name: v.name, isCustom: v.isCustom })))
  
  const vaccine = vaccines.find(v => v.id === id)
  console.log('DEBUG: Found vaccine:', vaccine)
  
  if (!vaccine) {
    throw new Error('Vaccine not found')
  }
  
  if (!vaccine.isCustom) {
    throw new Error('Only custom vaccines can be deleted')
  }

  try {
    const response = await fetch(`${BASE_URL}/deleteVaccine`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      cache: 'no-store',
      body: JSON.stringify({ 
        userId, 
        name: vaccine.name,
        dose: vaccine.company  // This maps to the backend's 'dose' field
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to delete vaccine:', response.status, errorText)
      throw new Error(`Failed to delete vaccine: ${response.status} ${errorText}`)
    }
  } catch (error) {
    console.error('Error deleting vaccine:', error)
    throw error
  }
}

// Mark vaccine as received
export async function markVaccineReceived(
  name: string,
  dose: string,
  receivedDate?: string
): Promise<void> {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  const payload = {
    userId,
    name,                   // Use 'name' instead of 'vaccineName'
    dose,
    received: true,         // Always marking as received
    receivedDate: receivedDate || new Date().toISOString().slice(0, 10) // yyyy-MM-dd
  };

  const response = await fetch(`${BASE_URL}/markVaccineReceived`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors',
    cache: 'no-store',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Failed payload:', payload, 'Response:', text);
    throw new Error('Failed to mark vaccine as received');
  }
}

// Mark/unmark vaccine by name + dose (for AlreadyVaccinated page)
export async function markVaccineByNameDose(
  name: string,
  dose: string,
  received: boolean,
  receivedDate?: string
): Promise<void> {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  const payload = {
    userId,
    name,
    dose,
    received,
    receivedDate: received ? (receivedDate || new Date().toISOString().slice(0, 10)) : ''
  };

  const response = await fetch(`${BASE_URL}/markVaccineReceived`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors',
    cache: 'no-store',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Failed payload:', payload, 'Response:', text);
    throw new Error('Failed to update vaccine received state');
  }
}

// Update the setAdministered function to work with backend
export async function setAdministered(vaccineId: string, administered: boolean, dateISO?: string): Promise<void> {
  // For now, we'll need to get the vaccine details to call the backend
  const vaccines = await listVaccines()
  const vaccine = vaccines.find(v => v.id === vaccineId)
  
  if (vaccine) {
    // If we're marking as administered
    if (administered) {
      console.log('Marking vaccine as administered:', vaccine.name, vaccine.company)
      await markVaccineReceived(
        vaccine.name, 
        vaccine.company, // Use company as dose
        dateISO || new Date().toISOString().slice(0, 10)
      )
    } else {
      // Unmark as administered
      const userId = getUserId();
      if (!userId) throw new Error('User not authenticated');
      const payload = {
        userId,
        name: vaccine.name,
        dose: vaccine.company,
        received: false,
        receivedDate: ''
      };
      await fetch(`${BASE_URL}/markVaccineReceived`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        cache: 'no-store',
        body: JSON.stringify(payload),
      });
    }
  }
}

// Get recommended vaccines by gender
export async function getRecommendedVaccines(gender: string): Promise<BackendVaccineRecord[]> {
  try {
    const response = await fetch(`${BASE_URL}/getRecommendedVaccines?gender=${gender}`)
    if (!response.ok) {
      throw new Error('Failed to fetch recommended vaccines')
    }
    return await response.json() as BackendVaccineRecord[]
  } catch (error) {
    console.error('Error fetching recommended vaccines:', error)
    return []
  }
}

// Compute due date (keep existing function for compatibility)
export async function computeDueDateISO(offsetMonths: number, profile?: UserProfile | null): Promise<string | null> {
  try {
    // If profile is provided, use it; otherwise fetch it
    const p = profile ?? await getProfile()
    if (!p) return null
    
    const baseISO = p.dateOfBirth
    if (!baseISO) return null
    
    const birth = new Date(baseISO + 'T00:00:00')
    const due = addMonths(birth, offsetMonths)
    return `${due.getFullYear().toString().padStart(4,'0')}-${(due.getMonth()+1).toString().padStart(2,'0')}-${due.getDate().toString().padStart(2,'0')}`
  } catch (error) {
    console.error('Error computing due date:', error)
    return null
  }
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime())
  d.setMonth(d.getMonth() + months)
  return d
}


