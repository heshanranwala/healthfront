export type User = {
  id: string
  name: string
  email: string
}

export type AuthResponse = {
  message: string
  userId: string
  name: string
  email: string
  redirectTo?: string
}

import { getBaseUrl, createFetchOptions, logApiConfig } from './apiConfig'

const BASE_URL = getBaseUrl()

const STORAGE_KEYS = {
  userId: 'auth_user_id',
  user: 'auth_user',
}

function saveSession(auth: AuthResponse) {
  console.log('Saving session to localStorage:', auth)
  localStorage.setItem(STORAGE_KEYS.userId, auth.userId)
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({
    id: auth.userId,
    name: auth.name,
    email: auth.email
  }))
  console.log('Session saved. userId in localStorage:', localStorage.getItem(STORAGE_KEYS.userId))
}

export function getStoredSession(): AuthResponse | null {
  const userId = localStorage.getItem(STORAGE_KEYS.userId)
  const userStr = localStorage.getItem(STORAGE_KEYS.user)
  console.log('getStoredSession - userId:', userId)
  console.log('getStoredSession - userStr:', userStr)
  if (!userId || !userStr) {
    console.log('getStoredSession - no session found')
    return null
  }
  try {
    const user = JSON.parse(userStr) as User
    const session = { message: "Session restored", userId, name: user.name, email: user.email }
    console.log('getStoredSession - returning session:', session)
    return session
  } catch (error) {
    console.log('getStoredSession - error parsing session:', error)
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.userId)
  localStorage.removeItem(STORAGE_KEYS.user)
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  logApiConfig() // Log configuration for debugging
  
  const response = await fetch(`${BASE_URL}/login`, createFetchOptions('POST', { email, password }))
  if (!response.ok) {
    const text = await response.text().catch(() => 'Login failed')
    throw new Error(text || 'Login failed')
  }
  
  const responseData = await response.json()
  console.log('Login response:', responseData)
  
  // Handle both direct response and response with body property
  const data = responseData.body ? responseData.body as AuthResponse : responseData as AuthResponse
  console.log('Processed login data:', data)
  console.log('Saving session with userId:', data.userId)
  saveSession(data)
  return data
}

export async function signup(firstName: string, lastName: string, email: string, password: string, gender: string, dateOfBirth: string, phoneNumber: string): Promise<AuthResponse> {
  const response = await fetch(`${BASE_URL}/signup`, createFetchOptions('POST', { 
    firstName, 
    lastName, 
    email, 
    password, 
    gender, 
    dateOfBirth,
    phoneNumber
  }))
  if (!response.ok) {
    const text = await response.text().catch(() => 'Signup failed')
    throw new Error(text || 'Signup failed')
  }
  
  const responseData = await response.json()
  console.log('Signup response:', responseData)
  
  // Handle both direct response and response with body property
  const data = responseData.body ? responseData.body as AuthResponse : responseData as AuthResponse
  saveSession(data)
  return data
}

export async function logout(): Promise<void> {
  clearSession()
}

export async function getProfile(): Promise<User | null> {
  const userId = localStorage.getItem(STORAGE_KEYS.userId)
  if (!userId) return null
  const userStr = localStorage.getItem(STORAGE_KEYS.user)
  if (userStr) {
    try {
      return JSON.parse(userStr) as User
    } catch {
      return null
    }
  }
  return null
}


