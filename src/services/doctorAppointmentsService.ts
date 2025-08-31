export type DocAppointment = {
  id: string
  userId: string
  date: string
  time: string
  place: string
  disease: string
  completed: boolean
}

import { getBaseUrl } from './apiConfig'

const BASE_URL = getBaseUrl()

// Import getUserId from profileService
import { getUserId } from './profileService'

// Simple cache for appointments
let appointmentsCache: DocAppointment[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Function to clear cache
export const clearAppointmentsCache = () => {
  appointmentsCache = null;
  cacheTimestamp = 0;
};

export const formatDateFromBackend = (date: any): string => {
  if (!date) return '';
  
  try {
    console.log('Formatting date from backend:', date, typeof date);
    
    // Handle ISO date string
    if (typeof date === 'string') {
      // Extract YYYY-MM-DD from ISO string if it contains 'T'
      return date.includes('T') ? date.split('T')[0] : date;
    }
    
    // Handle UTC object from backend
    if (date && typeof date === 'object' && 'utcIso' in date) {
      console.log('Handling UTC object with utcIso:', date.utcIso);
      return date.utcIso.split('T')[0];
    }
    
    // Handle year, month, day object
    if (date && typeof date === 'object' && 'year' in date && 'month' in date && 'day' in date) {
      console.log('Handling year/month/day object:', date);
      const year = date.year;
      const month = String(date.month).padStart(2, '0');
      const day = String(date.day).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Fallback: try to convert to ISO string
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      console.log('Converting to date object:', dateObj);
      return dateObj.toISOString().split('T')[0];
    }
    
    // If all else fails, return the original value as string
    console.log('Falling back to string conversion for date:', date);
    return String(date);
  } catch (error) {
    console.error('Error formatting date from backend:', error, date);
    return String(date);
  }
};

// Get doctor appointments from backend
export async function getDocAppointments(forceRefresh: boolean = false): Promise<DocAppointment[]> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  // Check cache first (unless force refresh is requested)
  const now = Date.now();
  if (!forceRefresh && appointmentsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('Returning cached appointments');
    return appointmentsCache;
  }

  try {
    console.log('Fetching doctor appointments for userId:', userId);
    const response = await fetch(`${BASE_URL}/getDocAppointments?userId=${userId}`, {
      headers: { 
        'Accept': 'application/json'
      },
      mode: 'cors'
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch doctor appointments: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Raw doctor appointments data:', data);
    
    // Transform the data to match our expected format
    const appointments = data.map((item: any) => {
      console.log('Processing item:', item);
      
      // Handle case where the item has a 'value' property (from the logs)
      if (item.value) {
        console.log('Item has value property:', item.value);
        item = item.value; // Use the value property as the item
      }
      
      // Check if the item has the expected structure
      if (item.appointment) {
        // Handle nested structure
        const dateValue = item.appointment.date;
        console.log('Nested appointment date value:', dateValue);
        
        const appointment = {
          id: item.appointment.id || '',
          userId: item.userId || '',
          date: formatDateFromBackend(dateValue),
          time: item.appointment.time || '',
          place: item.appointment.place || '',
          disease: item.appointment.disease || '',
          completed: item.appointment.completed || false
        };
        console.log('Mapped nested appointment:', appointment);
        return appointment;
      } else {
        // Handle case where appointment is not a nested object
        const dateValue = item.date;
        console.log('Flat appointment date value:', dateValue);
        
        const appointment = {
          id: item.id || '',
          userId: item.userId || '',
          date: formatDateFromBackend(dateValue),
          time: item.time || '',
          place: item.place || '',
          disease: item.disease || '',
          completed: item.completed || false
        };
        console.log('Mapped flat appointment:', appointment);
        return appointment;
      }
    });
    
    console.log('Transformed appointments:', appointments);
    
    // Cache the results
    appointmentsCache = appointments;
    cacheTimestamp = now;
    
    return appointments;
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    return [];
  }
}

// Add doctor appointment to backend
export async function addDocAppointment(appointment: Omit<DocAppointment, 'id' | 'userId'>): Promise<DocAppointment> {
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  try {
    console.log('Sending appointment data:', {
      userId,
      date: appointment.date,
      time: appointment.time,
      place: appointment.place,
      disease: appointment.disease
    });

    const response = await fetch(`${BASE_URL}/addDocAppointment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        userId,
        date: appointment.date,
        time: appointment.time,
        place: appointment.place,
        disease: appointment.disease
      }),
      mode: 'cors'
    })
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Failed to add doctor appointment: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received response data:', data);
    
    // Check if the response has a 'value' property
    let responseData = data;
    if (data.value) {
      console.log('Response has value property:', data.value);
      responseData = data.value;
    }
    
    // Handle both nested and flat response structures
    if (responseData.appointment) {
      // Nested structure
      const dateValue = responseData.appointment.date;
      console.log('Response nested appointment date value:', dateValue);
      
      return {
        id: responseData.appointment.id,
        userId: responseData.userId,
        date: formatDateFromBackend(dateValue),
        time: responseData.appointment.time,
        place: responseData.appointment.place,
        disease: responseData.appointment.disease,
        completed: responseData.appointment.completed || false
      };
    } else {
      // Flat structure
      const dateValue = responseData.date;
      console.log('Response flat appointment date value:', dateValue);
      
      const newAppointment = {
        id: responseData.id || '',
        userId: userId,
        date: formatDateFromBackend(dateValue) || appointment.date,
        time: responseData.time || appointment.time,
        place: responseData.place || appointment.place,
        disease: responseData.disease || appointment.disease,
        completed: responseData.completed || false
      };
      
      // Clear cache since we added a new appointment
      clearAppointmentsCache();
      
      return newAppointment;
    }
  } catch (error) {
    console.error('Error in addDocAppointment:', error);
    throw error;
  }
}

// Update doctor appointment
export const updateDocAppointment = async (appointmentId: string, updates: Partial<DocAppointment>): Promise<DocAppointment> => {
  const userId = getUserId();
  
  // Ensure date is always included
  if (!updates.date) {
    console.error('Date is required for updateDocAppointment but was not provided');
    throw new Error('Date is required for updating appointments');
  }
  if (!userId) throw new Error('User not authenticated')

  try {
    console.log('Updating appointment with ID:', appointmentId, 'for user:', userId);
    console.log('Update data received:', updates);
    
    // Ensure completed field is always included, even if it's false
    const updatesWithCompleted = {
      ...updates,
      completed: updates.completed !== undefined ? updates.completed : false,
      // Make sure these fields are always defined
      time: updates.time || '',
      place: updates.place || '',
      disease: updates.disease || ''
    };
    console.log('Added completed field to updates:', updatesWithCompleted.completed);
    
    // Format date if it exists
    if (updates.date) {
      console.log('Original date value:', updates.date, typeof updates.date);
      // Always format the date to ensure it's in the correct format
      try {
        let formattedDate;
        if (typeof updates.date === 'string') {
          // If it's already in YYYY-MM-DD format, use it directly
          if (/^\d{4}-\d{2}-\d{2}$/.test(updates.date)) {
            formattedDate = updates.date;
          } else {
            // Otherwise, parse and format it
            // Handle timestamp with comma (like '1755388800,0')
            if (updates.date.includes(',')) {
              // Remove the comma and any decimal part
              const timestamp = parseInt(updates.date.split(',')[0]);
              const dateObj = new Date(timestamp * 1000); // Convert to milliseconds
              formattedDate = dateObj.toISOString().split('T')[0];
            } else {
              try {
                const dateObj = new Date(updates.date);
                formattedDate = dateObj.toISOString().split('T')[0];
              } catch (e) {
                // Fallback to current date if parsing fails
                console.error('Failed to parse date:', updates.date);
                formattedDate = new Date().toISOString().split('T')[0];
              }
            }
          }
        } else if (typeof updates.date === 'object' && updates.date !== null) {
          // Handle date objects
          if (updates.date && typeof updates.date === 'object') {
            // Use type assertion with interface for better type checking
            interface DateWithUtcIso { utcIso: string }
            interface DateWithYMD { year: number | string; month: number | string; day: number | string }
            
            if ('utcIso' in updates.date) {
              const dateWithUtc = updates.date as DateWithUtcIso;
              formattedDate = dateWithUtc.utcIso.split('T')[0];
            } else if ('year' in updates.date && 'month' in updates.date && 'day' in updates.date) {
              const dateWithYMD = updates.date as DateWithYMD;
              const year = dateWithYMD.year;
              const month = String(dateWithYMD.month).padStart(2, '0');
              const day = String(dateWithYMD.day).padStart(2, '0');
              formattedDate = `${year}-${month}-${day}`;
            } else {
              // Regular Date object
              formattedDate = new Date(updates.date as Date).toISOString().split('T')[0];
            }
          }
        }
        
        console.log('Formatted date for update:', formattedDate);
        if (formattedDate) {
          updatesWithCompleted.date = formattedDate;
        } else {
          throw new Error('Could not format date properly');
        }
      } catch (error) {
        console.error('Error formatting date:', error);
        throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
      }
    }
    
    // Create a payload structure that exactly matches what the backend expects
    // The backend expects: string userId, string appointmentId, string date, string time, string place, string disease, string doctorName, boolean completed
    const requestPayload = {
      userId,
      appointmentId,
      date: typeof updatesWithCompleted.date === 'string' && updatesWithCompleted.date 
        ? updatesWithCompleted.date 
        : new Date().toISOString().split('T')[0],
      time: updatesWithCompleted.time || '',
      place: updatesWithCompleted.place || '',
      disease: updatesWithCompleted.disease || '',
      doctorName: 'General Doctor', // Add default doctor name
      completed: updatesWithCompleted.completed !== undefined ? updatesWithCompleted.completed : false
    };
    
    // Double check all required fields are present
    if (!requestPayload.date) {
      console.warn('Date field is missing, setting default date');
      requestPayload.date = new Date().toISOString().split('T')[0];
    }
    
    if (!requestPayload.disease) {
      console.warn('Disease field is missing, setting default empty string');
      requestPayload.disease = '';
    }
    
    if (!requestPayload.time) {
      console.warn('Time field is missing, setting default empty string');
      requestPayload.time = '';
    }
    
    if (!requestPayload.place) {
      console.warn('Place field is missing, setting default empty string');
      requestPayload.place = '';
    }
    
    console.log('Sending update with data:', JSON.stringify(requestPayload));
    console.log('Date field in payload:', requestPayload.date, typeof requestPayload.date);
    console.log('Disease field in payload:', requestPayload.disease, typeof requestPayload.disease);
    
    const response = await fetch(`${BASE_URL}/updateDocAppointment`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestPayload),
      mode: 'cors'
    })
    
    console.log('Update response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Failed to update doctor appointment: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Received update response data:', data);
    
    // Check if the response has a 'value' property
    let responseData = data;
    if (data.value) {
      console.log('Response has value property:', data.value);
      responseData = data.value;
    }
    
    // Handle both nested and flat response structures
    if (responseData.appointment) {
      // Nested structure
      const dateValue = responseData.appointment.date;
      console.log('Response nested appointment date value:', dateValue);
      
      const result = {
        id: responseData.appointment.id,
        userId: responseData.userId,
        date: formatDateFromBackend(dateValue),
        time: responseData.appointment.time,
        place: responseData.appointment.place,
        disease: responseData.appointment.disease,
        completed: responseData.appointment.completed ?? false
      };
      console.log('Processed updated appointment (nested):', result);
      
      // Clear cache since we updated an appointment
      clearAppointmentsCache();
      
      return result;
    } else {
      // Flat structure
      const dateValue = responseData.date;
      console.log('Response flat appointment date value:', dateValue);
      
      const result = {
        id: responseData.id || appointmentId,
        userId: userId,
        date: formatDateFromBackend(dateValue) || '',
        time: responseData.time || '',
        place: responseData.place || '',
        disease: responseData.disease || '',
        completed: responseData.completed ?? false
      };
      console.log('Processed updated appointment (flat):', result);
      
      // Clear cache since we updated an appointment
      clearAppointmentsCache();
      
      return result;
    }
  } catch (error) {
    console.error('Error in updateDocAppointment:', error);
    throw error;
  }
}

// Toggle appointment status (pending/completed)
export async function toggleAppointmentStatus(appointmentId: string): Promise<DocAppointment> {
  console.log('Toggling appointment status with ID:', appointmentId);
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  try {
    console.log(`Toggling appointment status with ID: ${appointmentId} for user: ${userId}`);
    
    const response = await fetch(`${BASE_URL}/toggleAppointmentStatus`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        userId,
        appointmentId
      }),
      mode: 'cors'
    })
    
    console.log('Toggle response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Toggle error response:', errorText);
      throw new Error(`Failed to toggle appointment status: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Toggle response data:', data);
    
    // The backend should return the updated appointment data
    // If it doesn't, we'll fetch it
    if (data && data.newStatus !== undefined) {
      // Backend returned the new status, construct the updated appointment
      const updatedAppointment = await getDocAppointments();
      const appointment = updatedAppointment.find(apt => apt.id === appointmentId);
      
      if (!appointment) {
        throw new Error('Appointment not found after toggle');
      }
      
      console.log('Appointment status toggled successfully');
      
      // Clear cache since we toggled an appointment
      clearAppointmentsCache();
      
      return appointment;
    } else {
      // Fallback: fetch all appointments and find the updated one
      const updatedAppointment = await getDocAppointments();
      const appointment = updatedAppointment.find(apt => apt.id === appointmentId);
      
      if (!appointment) {
        throw new Error('Appointment not found after toggle');
      }
      
      console.log('Appointment status toggled successfully');
      
      // Clear cache since we toggled an appointment
      clearAppointmentsCache();
      
      return appointment;
    }
  } catch (error) {
    console.error('Error in toggleAppointmentStatus:', error);
    throw error;
  }
}

// Delete a doctor appointment
export async function deleteDocAppointment(appointmentId: string): Promise<void> {
  console.log('Deleting doctor appointment with ID:', appointmentId);
  const userId = getUserId()
  if (!userId) throw new Error('User not authenticated')

  try {
    console.log(`Deleting appointment with ID: ${appointmentId} for user: ${userId}`);
    
    // The backend expects a payload, not query parameters
    const response = await fetch(`${BASE_URL}/deleteDocAppointment`, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        userId,
        appointmentId
      }),
      mode: 'cors'
    })
    
    console.log('Delete response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Delete error response:', errorText);
      throw new Error(`Failed to delete doctor appointment: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    console.log('Appointment deleted successfully');
    
    // Clear cache since we deleted an appointment
    clearAppointmentsCache();
  } catch (error) {
    console.error('Error in deleteDocAppointment:', error);
    throw error;
  }
}