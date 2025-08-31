import React, { useState, useEffect } from 'react';
import SideNav from '../components/SideNav';
import './doctorAppointments.css';
import { getDocAppointments, addDocAppointment, updateDocAppointment, deleteDocAppointment, toggleAppointmentStatus, type DocAppointment } from '../services/doctorAppointmentsService';
import { login } from '../services/authService';

const DoctorAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<DocAppointment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<DocAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('auth_user_id'));
  const [loginEmail, setLoginEmail] = useState('test@example.com');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [newAppointment, setNewAppointment] = useState({
    date: '',
    time: '',
    place: '',
    disease: ''
  });
  
  // Handler functions for edit, delete, and mark as done
  const handleEdit = (appointment: DocAppointment) => {
    setEditingAppointment(appointment);
    setShowEditModal(true);
  };

  const handleUpdateAppointment = async (e: React.FormEvent<HTMLFormElement> | null = null) => {
    if (e) e.preventDefault();
    if (!editingAppointment) return;

    try {
      console.log('Updating appointment:', editingAppointment);
      const formattedDate = formatDate(editingAppointment.date);
      console.log('Formatted date for update:', formattedDate);
      
      const updatedData = {
        ...editingAppointment,
        date: formattedDate,
      };
      const updatedApt = await updateDocAppointment(editingAppointment.id, updatedData);
      console.log('Appointment updated successfully:', updatedApt);
      setAppointments(prev => prev.map(apt => apt.id === updatedApt.id ? { ...updatedApt, date: formatDate(updatedApt.date) } : apt));
      setShowEditModal(false);
      setEditingAppointment(null);
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Failed to update appointment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    try {
      console.log('Deleting appointment with ID:', id);
      await deleteDocAppointment(id);
      setAppointments(prev => prev.filter(apt => apt.id !== id));
      console.log('Appointment deleted successfully');
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Failed to delete appointment');
    }
  };

  const handleMarkAsDone = async (id: string, currentCompleted: boolean = false) => {
    try {
      console.log('Toggling appointment status for ID:', id, 'Current status:', currentCompleted);
      const updatedApt = await toggleAppointmentStatus(id);
      console.log('Appointment status toggled successfully:', updatedApt);
      setAppointments(prev => prev.map(apt => apt.id === id ? { ...updatedApt, date: formatDate(updatedApt.date) } : apt));
    } catch (error) {
      console.error('Error toggling appointment status:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to toggle appointment status: ${errorMessage}`);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadAppointments();
    }
    // Check if user is authenticated
    const userId = localStorage.getItem('auth_user_id');
    console.log('Current user ID:', userId);
  }, [isLoggedIn]);

  // Mock data removed as requested

  // Format date from UTC to YYYY-MM-DD
  const formatDate = (date: string | Date): string => {
    if (!date) return '';
    
    try {
      // If it's already a string in YYYY-MM-DD format, return it
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      
      // Handle UTC object format from backend
      if (typeof date === 'object' && date !== null && 'utcIso' in date) {
        return (date as any).utcIso.split('T')[0];
      }

      // Handle year, month, day object format
      if (typeof date === 'object' && date !== null && 'year' in date && 'month' in date && 'day' in date) {
        const year = (date as any).year;
        // Month is 0-indexed in JavaScript Date but 1-indexed in our object
        const month = String((date as any).month).padStart(2, '0');
        const day = String((date as any).day).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Handle timestamp with comma (like '1755388800,0')
      if (typeof date === 'string' && date.includes(',')) {
        // Remove the comma and any decimal part
        const timestamp = parseInt(date.split(',')[0]);
        const dateObj = new Date(timestamp * 1000); // Convert to milliseconds
        return dateObj.toISOString().split('T')[0];
      }
      
      // Convert to Date object if it's a string
      try {
        const dateObj = typeof date === 'string' ? new Date(date) : (date instanceof Date ? date : new Date());
        // Format as YYYY-MM-DD
        return dateObj.toISOString().split('T')[0];
      } catch (e) {
        console.error('Failed to parse date in formatDate:', date, e);
        return new Date().toISOString().split('T')[0]; // Fallback to current date
      }
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return typeof date === 'string' ? date : JSON.stringify(date);
    }
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);
      console.log('Fetching doctor appointments...');
      let appts: DocAppointment[] = [];
      
      try {
        // Try to get appointments from backend
        appts = await getDocAppointments();
        console.log('Doctor appointments fetched from backend:', appts);
        
        // Format dates in the appointments
        appts = appts.map(apt => ({
          ...apt,
          date: formatDate(apt.date)
        }));
        console.log('Appointments with formatted dates:', appts);
      } catch (backendError) {
        console.error('Error fetching from backend:', backendError);
        // Don't use mock data anymore
        alert('Failed to load appointments. Please try again later.');
      }
      
      setAppointments(appts);
    } catch (error) {
      console.error('Error in loadAppointments:', error);
      // Don't fallback to mock data
      setAppointments([]);
      alert('Failed to load appointments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppointment = async () => {
    if (!newAppointment.date || !newAppointment.time || !newAppointment.place || !newAppointment.disease) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      console.log('Adding new appointment with date:', newAppointment.date);
      
      // Ensure date is in YYYY-MM-DD format for backend
      const formattedDate = formatDate(newAppointment.date);
      console.log('Formatted date for new appointment:', formattedDate);
      
      const addedAppointment = await addDocAppointment({
        date: formattedDate,
        time: newAppointment.time,
        place: newAppointment.place,
        disease: newAppointment.disease,
        completed: false // Add the missing completed property
      });
      
      console.log('Successfully added appointment:', addedAppointment);
      
      // Format the date in the returned appointment
      const formattedAppointment = {
        ...addedAppointment,
        date: formatDate(addedAppointment.date)
      };
      
      setAppointments(prev => [...prev, formattedAppointment]);
      
      setNewAppointment({
        date: '',
        time: '',
        place: '',
        disease: ''
      });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding doctor appointment:', error);
      alert('Failed to add doctor appointment. Please try again.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      await login(loginEmail, loginPassword);
      setIsLoggedIn(true);
      loadAppointments();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="appointments-page">
        <SideNav />
        <main className="appointments-main">
          <h1>Login Required</h1>
          <p>You need to log in to view and manage doctor appointments.</p>
          <form onSubmit={handleLogin} style={{ maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
              <input 
                type="email" 
                id="email" 
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)} 
                required 
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
              <input 
                type="password" 
                id="password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                required 
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            {loginError && <div style={{ color: 'red', marginBottom: '15px' }}>{loginError}</div>}
            <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Login</button>
          </form>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="appointments-page">
        <SideNav />
        <main className="appointments-main">
          <div>Loading doctor appointments...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="appointments-page">
      <SideNav />
      <main className="appointments-main">
        <header className="appointments-header">
          <div className="header-content">
            <h1 className="appointments-title">Doctor Appointments</h1>
            <p className="appointments-subtitle">Manage your medical appointments and consultations</p>
          </div>
          <button 
            className="add-appointment-btn"
            onClick={() => setShowAddModal(true)}
          >
            <span className="add-icon">+</span>
            Add Appointment
          </button>
        </header>

        <div className="appointments-dashboard">
          <section className="appointments-section">
            <div className="section-header">
              <h2 className="section-title">All Appointments</h2>
              <div className="section-count">{appointments.length} appointments</div>
            </div>
            
            {appointments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏥</div>
                <h3>No appointments scheduled</h3>
                <p>Start managing your health by scheduling your first doctor appointment</p>
                <button className="primary-btn" onClick={() => setShowAddModal(true)}>
                  Schedule First Appointment
                </button>
              </div>
            ) : (
              <div className="appointments-list">
                {appointments.map(appointment => (
                  <div key={appointment.id} className={`appointment-card ${appointment.completed ? 'completed' : 'pending'}`}>
                    <div className="appointment-header">
                      <div className="appointment-title">{appointment.disease}</div>
                      <div className={`appointment-status ${appointment.completed ? 'completed' : 'pending'}`}>
                        {appointment.completed ? '✓ Completed' : '⏳ Pending'}
                      </div>
                    </div>
                    
                    <div className="appointment-details">
                      <div className="appointment-info">
                        <div className="info-item">
                          <span className="label">Place:</span>
                          <span className="value">{appointment.place}</span>
                        </div>
                        <div className="info-item">
                          <span className="label">Date:</span>
                          <span className="value">{appointment.date}</span>
                        </div>
                        <div className="info-item">
                          <span className="label">Time:</span>
                          <span className="value">{appointment.time}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="appointment-actions">
                      <button 
                        className={`status-btn ${appointment.completed ? 'completed' : 'pending'}`}
                        onClick={() => handleMarkAsDone(appointment.id, appointment.completed)}
                      >
                        {appointment.completed ? 'Mark as Pending' : 'Mark as Done'}
                      </button>
                      
                      <div className="action-buttons">
                        <button 
                          className="edit-btn"
                          onClick={() => handleEdit(appointment)}
                        >
                          <span className="edit-icon">✏️</span>
                          Edit
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => handleDelete(appointment.id)}
                        >
                          <span className="delete-icon">🗑️</span>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Add Doctor Appointment Modal */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Add New Doctor Appointment</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleAddAppointment(); }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={newAppointment.date}
                      onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Time *</label>
                    <input
                      type="time"
                      value={newAppointment.time}
                      onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Place *</label>
                  <input
                    type="text"
                    value={newAppointment.place}
                    onChange={(e) => setNewAppointment({...newAppointment, place: e.target.value})}
                    placeholder="e.g., General Hospital"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Disease/Condition *</label>
                  <input
                    type="text"
                    value={newAppointment.disease}
                    onChange={(e) => setNewAppointment({...newAppointment, disease: e.target.value})}
                    placeholder="e.g., Fever"
                    required
                  />
                </div>
                
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit">
                    Add Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Doctor Appointment Modal */}
        {showEditModal && editingAppointment && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Edit Doctor Appointment</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateAppointment(e); }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={editingAppointment.date}
                      onChange={(e) => setEditingAppointment({...editingAppointment, date: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Time *</label>
                    <input
                      type="time"
                      value={editingAppointment.time}
                      onChange={(e) => setEditingAppointment({...editingAppointment, time: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Place *</label>
                  <input
                    type="text"
                    value={editingAppointment.place}
                    onChange={(e) => setEditingAppointment({...editingAppointment, place: e.target.value})}
                    placeholder="e.g., General Hospital"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Disease/Condition *</label>
                  <input
                    type="text"
                    value={editingAppointment.disease}
                    onChange={(e) => setEditingAppointment({...editingAppointment, disease: e.target.value})}
                    placeholder="e.g., Fever"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Completed</label>
                  <input
                    type="checkbox"
                    checked={editingAppointment.completed}
                    onChange={(e) => setEditingAppointment({...editingAppointment, completed: e.target.checked})}
                  />
                </div>
                
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit">
                    Update Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorAppointments;