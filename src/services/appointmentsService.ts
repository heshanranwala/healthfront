export type Appointment = {
  id: string
  userId: string
  title: string
  doctor: string
  specialty: string
  date: string
  time: string
  notes: string
  completed: boolean
  created_at: string
}

import { getUserId } from './profileService'
import { getBaseUrl } from './apiConfig'

const BASE_URL = getBaseUrl()

// Get appointments from backend
export async function getAppointments(): Promise<Appointment[]> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  try {
    const response = await fetch(`${BASE_URL}/getAppointments?userId=${userId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch appointments')
    }
    return await response.json() as Appointment[]
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return []
  }
}

// Add appointment to backend
export async function addAppointment(appointment: Omit<Appointment, 'id' | 'userId' | 'created_at'>): Promise<Appointment> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  const response = await fetch(`${BASE_URL}/addAppointment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      title: appointment.title,
      doctor: appointment.doctor,
      specialty: appointment.specialty,
      date: appointment.date,
      time: appointment.time,
      notes: appointment.notes
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to add appointment')
  }
  return await response.json() as Appointment
}

// Update appointment in backend
export async function updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  const response = await fetch(`${BASE_URL}/updateAppointment`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      appointmentId: id,
      ...updates
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to update appointment')
  }
  return await response.json() as Appointment
}

// Delete appointment from backend
export async function deleteAppointment(id: string): Promise<void> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  const response = await fetch(`${BASE_URL}/deleteAppointment`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      appointmentId: id
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to delete appointment')
  }
}