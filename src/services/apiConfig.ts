// API Configuration for Railway Backend
const DEFAULT_BASE_URL = 'http://localhost:9090/health'
const BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL

// Create headers
export function createHeaders(additionalHeaders: Record<string, string> = {}): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...additionalHeaders
  }

  return headers
}

// Create fetch options
export function createFetchOptions(
  method: string = 'GET',
  body?: any,
  additionalHeaders: Record<string, string> = {}
): RequestInit {
  const options: RequestInit = {
    method,
    headers: createHeaders(additionalHeaders),
    mode: 'cors'
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  return options
}

// Get the base URL
export function getBaseUrl(): string {
  return BASE_URL
}

// Log API configuration for debugging
export function logApiConfig(): void {
  console.log('API Configuration:')
  console.log('- Base URL:', BASE_URL)
}
