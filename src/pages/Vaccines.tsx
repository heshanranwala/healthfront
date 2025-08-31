import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SideNav from '../components/SideNav'
import { addCustomVaccine, computeDueDateISO, setAdministered, updateVaccine, deleteVaccine } from '../services/vaccineService'
import type { VaccineRecord } from '../services/vaccineService'
import { getProfile } from '../services/profileService'
import { useVaccineSync } from '../hooks/useVaccineSync'
import './vaccines.css'

function VaccinesPage() {
  useNavigate()
  const { vaccines, setVaccines, refreshVaccines } = useVaccineSync()
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [offset, setOffset] = useState<string>('0')
  const [openAdd, setOpenAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editOffset, setEditOffset] = useState<string>('0')
  // Removed filteredVaccines state; we compute filtered inline
  const [dueDates, setDueDates] = useState<{[id: string]: string | null}>({})
  const [vaccineStatus, setVaccineStatus] = useState<{received: VaccineRecord[], pending: VaccineRecord[]}>({
    received: [],
    pending: []
  })
  const [profile, setProfile] = useState<null | any>(null)
  
  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      const profileData = await getProfile()
      setProfile(profileData)
    }
    fetchProfile()
  }, [])

  const onToggleAdmin = (id: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    // Optimistic UI update
    setVaccines(prev => prev.map(v => v.id === id ? { ...v, administered: checked, administeredDateISO: checked ? (new Date().toISOString().slice(0,10)) : undefined } : v))
    try {
      await setAdministered(id, checked)
      await refreshVaccines()
    } catch (err) {
      console.error('Failed to update vaccine administered state:', err)
      // Revert on failure
      setVaccines(prev => prev.map(v => v.id === id ? { ...v, administered: !checked } : v))
    }
  }

  const onAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const months = Number(offset)
    if (!name.trim() || Number.isNaN(months) || months < 0) return
    try {
      await addCustomVaccine(name.trim(), company.trim() || 'Custom', months)
      setName(''); setCompany(''); setOffset('0')
      await refreshVaccines()
    } catch (err) {
      console.error('Add custom vaccine failed:', err)
      alert('Failed to add vaccine. Please try again.')
    }
  }

  const onOpenEdit = (v: VaccineRecord) => {
    setEditId(v.id)
    setEditName(v.name)
    setEditCompany(v.company)
    setEditOffset(String(v.offsetMonths))
  }

  const onSaveEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!editId) return
    const months = Number(editOffset)
    if (!editName.trim() || Number.isNaN(months) || months < 0) return
    updateVaccine(editId, { name: editName.trim(), company: editCompany.trim(), offsetMonths: months })
    setEditId(null)
    refreshVaccines()
  }

  const onDelete = (id: string) => {
    if (!confirm('Delete this vaccine?')) return
    deleteVaccine(id)
    refreshVaccines()
  }
  
  // Filter vaccines based on user's gender
  useEffect(() => {
    if (profile && vaccines.length > 0) {
      // Debug: Log vaccine data to see isCustom values
      console.log('All vaccines with isCustom values:', vaccines.map(v => ({ name: v.name, isCustom: v.isCustom, type: typeof v.isCustom })))
      
      // Filter vaccines based on gender
      const filtered = vaccines.filter(vaccine => {
        // Check if this is a custom vaccine (always show)
        if (vaccine.isCustom) return true;
        
        // For female-specific vaccines
        if (vaccine.name.includes('Rubella') || vaccine.name.includes('Tetanus Toxoid (TT)')) {
          return profile.gender?.toLowerCase() === 'female';
        }
        
        // All other vaccines are shown to everyone
        return true;
      })
      
      // Separate vaccines into received and pending
      const received = filtered.filter(v => v.administered)
      const pending = filtered.filter(v => !v.administered)
      
      setVaccineStatus({
        received,
        pending
      })
      
      // Update due dates for all vaccines
      const updateDueDates = async () => {
        const dates: {[id: string]: string | null} = {}
        for (const vaccine of filtered) {
          dates[vaccine.id] = vaccine.dueDateISO || await computeDueDateISO(vaccine.offsetMonths, profile)
        }
        setDueDates(dates)
      }
      
      updateDueDates()
    }
  }, [vaccines, profile])

  // Close modals with Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openAdd) setOpenAdd(false)
        if (editId) setEditId(null)
      }
    }
    if (openAdd || editId) {
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    }
  }, [openAdd, editId])



  return (
    <div className="vaccines-page">
      <SideNav />

      <main className="vacc-main">
        <header className="vaccines-header">
          <div className="header-content">
            <h1 className="vaccines-title">Vaccine Register</h1>
            <p className="vaccines-subtitle">Track your vaccination schedule and history</p>
          </div>
          <button className="add-vaccine-btn" onClick={() => setOpenAdd(true)}>
            <span className="add-icon">+</span>
            Add Custom Vaccine
          </button>
        </header>

        <div className="vaccines-dashboard">
          {/* Already Vaccinated Section - ADMINISTERED */}
          <section className="vaccines-section">
            <div className="section-header">
              <h2 className="section-title">Already Vaccinated</h2>
              <div className="section-count">{vaccineStatus.received.length} vaccines</div>
            </div>
            
            <div className="vaccines-list">
              {vaccineStatus.received.length > 0 ? (
                vaccineStatus.received.map(v => (
                  <div key={v.id} className="vaccine-card administered">
                    <div className="vaccine-header">
                      <div className="vaccine-name">{v.name}</div>
                      <div className="vaccine-company">{v.company}</div>
                      <div className="vaccine-status-badge">✓ Vaccinated</div>
                    </div>
                    
                    <div className="vaccine-details">
                      <div className="vaccine-date">
                        <span className="label">Received:</span>
                        <span className="value">{v.administeredDateISO || 'Unknown date'}</span>
                      </div>
                      <div className="vaccine-schedule">
                        <span className="label">Scheduled:</span>
                        <span className="value">{v.offsetMonths === 0 ? 'At birth' : `${v.offsetMonths} months after birth`}</span>
                      </div>
                    </div>
                    
                    <div className="vaccine-actions">
                      <label className="vaccine-checkbox">
                        <input
                          type="checkbox"
                          checked={!!v.administered}
                          onChange={onToggleAdmin(v.id)}
                        />
                        <span className="checkmark"></span>
                        Mark as vaccinated
                      </label>
                      
                      {/* Debug info for this vaccine */}
                      <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.5rem' }}>
                        {v.name}: isCustom = {String(v.isCustom)} ({typeof v.isCustom})
                      </div>
                      
                      {v.isCustom === true && (
                        <div className="custom-vaccine-actions">
                          <button className="edit-vaccine-btn" type="button" onClick={() => onOpenEdit(v)}>
                            <span className="edit-icon">✏️</span>
                            Edit
                          </button>
                          <button className="delete-vaccine-btn" type="button" onClick={() => onDelete(v.id)}>
                            <span className="delete-icon">🗑️</span>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">💉</div>
                  <h3>No vaccines received yet</h3>
                  <p>Start tracking your vaccinations by marking vaccines as received</p>
                </div>
              )}
            </div>
          </section>
          
          {/* Pending Vaccines Section */}
          <section className="vaccines-section">
            <div className="section-header">
              <h2 className="section-title">Pending Vaccines</h2>
              <div className="section-count">{vaccineStatus.pending.length} vaccines</div>
            </div>
            
            <div className="vaccines-list">
              {vaccineStatus.pending.length > 0 ? (
                vaccineStatus.pending.map(v => (
                  <div key={v.id} className="vaccine-card pending">
                    <div className="vaccine-header">
                      <div className="vaccine-name">{v.name}</div>
                      <div className="vaccine-company">{v.company}</div>
                      <div className="vaccine-status-badge pending">⏳ Pending</div>
                    </div>
                    
                    <div className="vaccine-details">
                      <div className="vaccine-date">
                        <span className="label">Due:</span>
                        <span className="value">{dueDates[v.id] || '—'}</span>
                      </div>
                      <div className="vaccine-schedule">
                        <span className="label">Schedule:</span>
                        <span className="value">{v.offsetMonths === 0 ? 'At birth' : `${v.offsetMonths} months after birth`}</span>
                      </div>
                    </div>
                    
                    <div className="vaccine-actions">
                      <label className="vaccine-checkbox">
                        <input
                          type="checkbox"
                          checked={!!v.administered}
                          onChange={onToggleAdmin(v.id)}
                        />
                        <span className="checkmark"></span>
                        Mark as vaccinated
                      </label>
                      
                      {/* Debug info for this vaccine */}
                      <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.5rem' }}>
                        {v.name}: isCustom = {String(v.isCustom)} ({typeof v.isCustom})
                      </div>
                      
                      {v.isCustom === true && (
                        <div className="custom-vaccine-actions">
                          <button className="edit-vaccine-btn" type="button" onClick={() => onOpenEdit(v)}>
                            <span className="edit-icon">✏️</span>
                            Edit
                          </button>
                          <button className="delete-vaccine-btn" type="button" onClick={() => onDelete(v.id)}>
                            <span className="delete-icon">🗑️</span>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🎉</div>
                  <h3>All caught up!</h3>
                  <p>No pending vaccines. You're up to date with your vaccination schedule.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <button type="button" className="fab" onClick={() => setOpenAdd(true)} aria-label="Add vaccine">+</button>

        {openAdd ? (
          <div className="add-vaccine-modal" role="dialog" aria-modal="true" onClick={() => setOpenAdd(false)}>
            <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Add Custom Vaccine</h2>
                <button className="close-btn" type="button" onClick={()=>setOpenAdd(false)}>✕</button>
              </div>
              <form className="modal-form" onSubmit={(e)=>{ e.preventDefault(); onAdd(e); setOpenAdd(false) }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="add-vaccine-name">Vaccine name</label>
                  <input id="add-vaccine-name" className="form-input" placeholder="e.g., HepB" value={name} onChange={(e)=>setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="add-vaccine-company">Company</label>
                  <input id="add-vaccine-company" className="form-input" placeholder="e.g., Generic" value={company} onChange={(e)=>setCompany(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="add-vaccine-offset">Months after birth</label>
                  <input id="add-vaccine-offset" className="form-input" type="number" min="0" placeholder="Months" value={offset} onChange={(e)=>setOffset(e.target.value)} required />
                </div>
                <div className="modal-actions">
                  <button className="cancel-btn" type="button" onClick={()=>setOpenAdd(false)}>Cancel</button>
                  <button className="save-btn" type="submit">Add</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {editId ? (
          <div className="add-vaccine-modal" role="dialog" aria-modal="true" onClick={() => setEditId(null)}>
            <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Edit Vaccine</h2>
                <button className="close-btn" type="button" onClick={()=>setEditId(null)}>✕</button>
              </div>
              <form className="modal-form" onSubmit={(e)=>{ e.preventDefault(); onSaveEdit(e); setEditId(null) }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-vaccine-name">Vaccine name</label>
                  <input id="edit-vaccine-name" className="form-input" value={editName} onChange={(e)=>setEditName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-vaccine-company">Company</label>
                  <input id="edit-vaccine-company" className="form-input" value={editCompany} onChange={(e)=>setEditCompany(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-vaccine-offset">Months after birth</label>
                  <input id="edit-vaccine-offset" className="form-input" type="number" min="0" value={editOffset} onChange={(e)=>setEditOffset(e.target.value)} required />
                </div>
                <div className="modal-actions">
                  <button className="cancel-btn" type="button" onClick={()=>setEditId(null)}>Cancel</button>
                  <button className="save-btn" type="submit">Save</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default VaccinesPage


