import React, { useState, useEffect, useMemo } from 'react';
import { getProfile, saveSpecialNotes, getSpecialNotes } from '../services/profileService';
import { setAdministered } from '../services/vaccineService';
import { latest, computeBmi, type BmiEntry } from '../services/bmiService';
import { useVaccineSync } from '../hooks/useVaccineSync';
import { getDocAppointments, updateDocAppointment } from '../services/doctorAppointmentsService';
import type { DocAppointment } from '../services/doctorAppointmentsService';
import SideNav from '../components/SideNav';
import './dashboard.css';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  phoneNumber: string;
  photoDataUrl?: string;
}

type VaxNotif = { id: string; name: string; due: string | null };

type ApptNotif = { id: string; title: string; desc: string; date: string };

function toLocalDateFromISO(iso: string | null | undefined): Date {
  if (!iso) {
    // Return current date if no ISO string provided
    return new Date();
  }
  try {
    // Try to parse the date directly first
    const date = new Date(iso);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Fallback to manual parsing
    const [y, m, d] = iso.split('-').map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) {
      // If any part is NaN, return current date
      return new Date();
    }
    return new Date(y, (m || 1) - 1, d || 1);
  } catch (error) {
    console.error('Error parsing date:', error);
    return new Date();
  }
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDateForDisplay(dateString: string | null): string {
  if (!dateString) return 'No date';
  try {
    const date = toLocalDateFromISO(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

function classifyDue(dueISO: string | null, nearDays: number = 7): 'status-danger' | 'status-warn' | 'status-ok' {
  if (!dueISO) return 'status-ok';
  const today = startOfToday();
  const due = toLocalDateFromISO(dueISO);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'status-danger';
  if (diffDays <= nearDays) return 'status-warn';
  return 'status-ok';
}

const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [specialNotes, setSpecialNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [processingVaccine, setProcessingVaccine] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingAppointment, setProcessingAppointment] = useState<string | null>(null);
  const [showWelcomeNotification, setShowWelcomeNotification] = useState(false);
  const [lastBmi, setLastBmi] = useState<BmiEntry | null>(null);
  const [bmiValue, setBmiValue] = useState(0);
  const { vaccines: allVaccines, refreshVaccines } = useVaccineSync();

  // Function to load profile data
  const loadProfile = async () => {
    try {
      const userProfile = await getProfile();
      if (userProfile) {
        setProfile(userProfile);
        const notes = await getSpecialNotes();
        setSpecialNotes(notes);
      } else {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setShowOnboarding(true);
    }
  };

  // Load profile on component mount and when component becomes visible
  useEffect(() => {
    loadProfile();
    
    // Check for welcome notification from Already Vaccinated page
    const shouldShowWelcome = localStorage.getItem('showWelcomeNotification');
    if (shouldShowWelcome === 'true') {
      setShowWelcomeNotification(true);
      localStorage.removeItem('showWelcomeNotification');
      setTimeout(() => setShowWelcomeNotification(false), 5000);
    }
    
    // Add event listener to refresh profile when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadProfile();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Load latest BMI on component mount
  useEffect(() => {
    const loadLatestBmi = async () => {
      try {
        const data = await latest();
        setLastBmi(data);
        if (data) {
          setBmiValue(computeBmi(data.heightCm, data.weightKg));
        }
      } catch (error) {
        console.error('Error loading latest BMI:', error);
      }
    };
    loadLatestBmi();
  }, []);

  const handleSaveNotes = async () => {
    try {
      await saveSpecialNotes(specialNotes);
      setIsEditingNotes(false);
      setSuccessMessage('Special notes saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save notes:', error);
      setSuccessMessage('Failed to save notes. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleClearNotes = async () => {
    if (confirm('Are you sure you want to clear all special notes?')) {
      try {
        setSpecialNotes('');
        await saveSpecialNotes('');
        setSuccessMessage('Special notes cleared successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error('Failed to clear notes:', error);
        setSuccessMessage('Failed to clear notes. Please try again.');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  };

  const handleMarkVaccineDone = async (vaccineId: string) => {
    setProcessingVaccine(vaccineId);
    try {
      setAdministered(vaccineId, true);
      refreshVaccines();
      const vaccine = allVaccines.find(v => v.id === vaccineId);
      setSuccessMessage(`${vaccine?.name || 'Vaccine'} marked as administered!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally { setProcessingVaccine(null); }
  };

  const handleMarkAppointmentDone = async (appointmentId: string) => {
    setProcessingAppointment(appointmentId);
    try {
      // Get the current appointment data to ensure all required fields are provided
      const currentAppointments = await getDocAppointments();
      const currentAppointment = currentAppointments.find(apt => apt.id === appointmentId);
      
      if (!currentAppointment) {
        throw new Error('Appointment not found');
      }
      
      // Update with all current fields, only changing completed status
      await updateDocAppointment(appointmentId, {
        date: currentAppointment.date,
        time: currentAppointment.time,
        place: currentAppointment.place,
        disease: currentAppointment.disease,
        completed: true
      });
      
      // Refresh appointments to get updated data
      const updatedAppointments = await getDocAppointments(true); // Force refresh
      const notifications = updatedAppointments
        .filter(apt => apt && apt.id)
        .map(apt => ({
          id: apt.id,
          title: apt.disease || 'Appointment',
          desc: `Place: ${apt.place || 'Not specified'}`,
          date: apt.date || ''
        }))
        .sort((a, b) => {
          try {
            const da = toLocalDateFromISO(a.date);
            const db = toLocalDateFromISO(b.date);
            return da.getTime() - db.getTime();
          } catch (error) {
            console.error('Error sorting appointments:', error);
            return 0;
          }
        })
        .slice(0, 50);
      
      setAppointmentNotifications(notifications);
      setSuccessMessage('Appointment marked as done!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error('Failed to mark appointment done', e);
    } finally {
      setProcessingAppointment(null);
    }
  };

  const vaccineNotifications: VaxNotif[] = useMemo(() => {
    if (!Array.isArray(allVaccines)) return [];
    // Note: a fully accurate notification list would compute async due dates per vaccine.
    // Note: computeDueDateISO is async, but useMemo expects sync. Fallback to best-effort using known DOB.
    // Quick sync approximation: if profile exists, compute via JS here too.
    if (profile?.dateOfBirth) {
      const birth = toLocalDateFromISO(profile.dateOfBirth);
      const approx: VaxNotif[] = allVaccines
        .filter(v => v && !v.administered)
        .map(v => {
          const months = v.offsetMonths ?? 0;
          const d = new Date(birth.getTime());
          d.setMonth(d.getMonth() + months);
          const dueISO = `${d.getFullYear().toString().padStart(4,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
          return { id: v.id, name: v.name, due: dueISO };
        })
        .sort((a, b) => {
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          const da = toLocalDateFromISO(a.due);
          const db = toLocalDateFromISO(b.due);
          return da.getTime() - db.getTime();
        })
        .slice(0, 50);
      return approx;
    }
    // If DOB missing, return pending without dates
    return allVaccines
      .filter(v => v && !v.administered)
      .map(v => ({ id: v.id, name: v.name, due: null }))
      .slice(0, 50);
  }, [profile?.dateOfBirth, allVaccines]);

  const [appointmentNotifications, setAppointmentNotifications] = useState<ApptNotif[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);



  useEffect(() => {
    const fetchDoctorAppointments = async () => {
      setIsLoadingAppointments(true);
      try {
        let docAppointments: DocAppointment[] = [];
        try {
          docAppointments = await getDocAppointments();
          console.log('Doctor appointments fetched for dashboard:', docAppointments);
        } catch (backendError) {
          console.error('Error fetching appointments from backend for dashboard:', backendError);
          // Return empty array to trigger mock data below
          docAppointments = [];
        }

        // If no valid appointments, show empty state
        if (!docAppointments || docAppointments.length === 0) {
          console.log('No valid appointments found for dashboard');
          setAppointmentNotifications([]);
          return;
        }
        
        const notifications = docAppointments
          .filter(apt => apt && apt.id) // Filter out any invalid appointments
          .map(apt => ({
            id: apt.id,
            title: apt.disease || 'Appointment',
            desc: `Place: ${apt.place || 'Not specified'}`,
            date: apt.date || ''
          }))
          .sort((a, b) => {
            try {
              const da = toLocalDateFromISO(a.date);
              const db = toLocalDateFromISO(b.date);
              return da.getTime() - db.getTime();
            } catch (error) {
              console.error('Error sorting appointments:', error);
              return 0; // Keep original order if there's an error
            }
          })
          .slice(0, 50);
        setAppointmentNotifications(notifications);
      } catch (error) {
        console.error('Error in fetchDoctorAppointments:', error);
        // Fallback to empty array in case of any error
        setAppointmentNotifications([]);
      } finally {
        setIsLoadingAppointments(false);
      }
    };

    fetchDoctorAppointments();
  }, []);

  if (!profile) { return <div>Loading...</div>; }

  // Calculate age based on user's date of birth (for now, using user's age)
  const birthDate = profile?.dateOfBirth ? toLocalDateFromISO(profile.dateOfBirth) : new Date();
  const today = startOfToday();
  const ageInMonths = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));



  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <div className="dashboard">
      <SideNav />
      <main className="dash-main">
        <header className="dash-header">
          <h1>Dashboard</h1>
          {successMessage && <div className="success-message">{successMessage}</div>}
          {showWelcomeNotification && (
            <div className="success-banner">
              <span className="success-icon">✓</span>
              <span>Welcome! Your vaccine information has been saved successfully.</span>
            </div>
          )}
        </header>

        <div className="dash-content">
          <div className="dash-side">
            <div className="profile-card">
              <div className="profile-photo">
                {profile.photoDataUrl ? (
                  <img src={profile.photoDataUrl} alt={fullName} />
                ) : (
                  <div className="photo-placeholder">{fullName.charAt(0)}</div>
                )}
              </div>
              <div className="profile-info">
                <h3>{fullName}</h3>
                <p>{ageInMonths} months old</p>
              </div>
            </div>

            <div className="metrics">
              <div className="metric"><span className="label">Age</span><span className="value">{ageInMonths} months</span></div>
              <div className="metric"><span className="label">Height</span><span className="value">{lastBmi?.heightCm || '—'} cm</span></div>
              <div className="metric"><span className="label">Weight</span><span className="value">{lastBmi?.weightKg || '—'} kg</span></div>
              <div className="metric"><span className="label">BMI</span><span className="value">{bmiValue || '—'}</span></div>
            </div>

            <div className="notes">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1vmin' }}>
                <h4>Special Notes</h4>
                <div style={{ display: 'flex', gap: '0.5vmin' }}>
                  {!isEditingNotes ? (
                    <button 
                      className="ghost" 
                      onClick={() => setIsEditingNotes(true)}
                      style={{ padding: '0.8vmin 1.2vmin', fontSize: 'clamp(0.8rem, 1.4vmin, 1rem)' }}
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button 
                        className="primary" 
                        onClick={handleSaveNotes}
                        style={{ padding: '0.8vmin 1.2vmin', fontSize: 'clamp(0.8rem, 1.4vmin, 1rem)' }}
                      >
                        Save
                      </button>
                      <button 
                        className="ghost" 
                        onClick={() => setIsEditingNotes(false)}
                        style={{ padding: '0.8vmin 1.2vmin', fontSize: 'clamp(0.8rem, 1.4vmin, 1rem)' }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <button 
                    className="ghost" 
                    onClick={handleClearNotes}
                    style={{ padding: '0.8vmin 1.2vmin', fontSize: 'clamp(0.8rem, 1.4vmin, 1rem)' }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <textarea 
                value={specialNotes} 
                onChange={(e) => setSpecialNotes(e.target.value)} 
                placeholder="Add any special notes about your child..." 
                disabled={!isEditingNotes}
                style={{ 
                  opacity: isEditingNotes ? 1 : 0.7,
                  cursor: isEditingNotes ? 'text' : 'default'
                }}
              />
            </div>
          </div>

          <div className="dash-main-content">
            <section className="vaccines">
              <h2>Vaccine schedule</h2>
              <div className="feed notif-list hover-float scroll-panel">
                {vaccineNotifications.length === 0 ? (
                  <div className="notif status-ok">
                    <div className="icon" />
                    <div className="title">No scheduled vaccines yet</div>
                    <div className="meta">All vaccines are up to date!</div>
                  </div>
                ) : (
                  vaccineNotifications.map((n, idx) => {
                    const status = classifyDue(n.due);
                    return (
                      <div key={n.id + (n.due || '')} className={`notif ${status}`} style={{ animationDelay: `${idx * 60}ms` }}>
                        <div className="icon" />
                        <div className="vaccine-details">
                          <div className="title">{n.name}</div>
                          <div className="meta">Scheduled from birth</div>
                          <div className="meta">Due: {formatDateForDisplay(n.due)}</div>
                        </div>
                        <button className="vaccine-done-btn" onClick={() => handleMarkVaccineDone(n.id)} disabled={processingVaccine === n.id}>
                          {processingVaccine === n.id ? 'Marking...' : 'Done'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="appointments">
              <h2>Doctors appointments</h2>
              <div className="feed notif-list hover-float scroll-panel">
                {isLoadingAppointments ? (
                  <div className="notif status-ok">
                    <div className="icon" />
                    <div className="title">Loading appointments...</div>
                    <div className="meta" />
                  </div>
                ) : appointmentNotifications.length === 0 ? (
                  <div className="notif status-ok">
                    <div className="icon" />
                    <div className="title">No upcoming appointments</div>
                    <div className="meta" />
                  </div>
                ) : (
                  appointmentNotifications.map((n, idx) => {
                    const status = classifyDue(n.date);
                    return (
                      <div key={`apt-${n.id}-${idx}`} className={`notif ${status}`} style={{ animationDelay: `${idx * 60}ms` }}>
                        <div className="icon" />
                        <div>
                          <div className="title">{n.title}</div>
                          <div className="meta">{n.desc}</div>
                        </div>
                        <div className="meta">Due {formatDateForDisplay(n.date)}</div>
                        {status === 'status-warn' && (
                          <button className="vaccine-done-btn" onClick={() => handleMarkAppointmentDone(n.id)} disabled={processingAppointment === n.id}>
                            {processingAppointment === n.id ? 'Marking...' : 'Done'}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>

        {showOnboarding && (
          <div className="modal-overlay" onClick={() => setShowOnboarding(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Welcome to Baby Vaccination Tracker!</h2>
              <p>Let's get started by setting up your child's profile.</p>
              <button onClick={() => setShowOnboarding(false)}>Get Started</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;


