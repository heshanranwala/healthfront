import { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { classifyBmi, computeBmi, listBmi, deleteBmi, updateBmi, fetchBmiRecords, addBmiRecordToBackend, checkGrowth } from '../services/bmiService'
import type { BmiEntry } from '../services/bmiService'
import { getProfile } from '../services/profileService'
import './bmi.css'
import SideNav from '../components/SideNav'

function BmiPage() {
  useNavigate()
  const [entries, setEntries] = useState<BmiEntry[]>([])
  
  // Load BMI entries on component mount
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const data = await listBmi()
        setEntries(data)
      } catch (error) {
        console.error('Error loading BMI entries:', error)
      }
    }
    loadEntries()
  }, [])
  const last = entries.length ? entries[entries.length - 1] : null
  const currentBmi = last ? computeBmi(last.heightCm, last.weightKg) : 0
  const status = classifyBmi(currentBmi)
  const [growthInfo, setGrowthInfo] = useState<string>('')
  const [isModalOpen, setModalOpen] = useState(false)
  const [dateISO, setDateISO] = useState<string>(new Date().toISOString().slice(0,10))
  const [heightCm, setHeightCm] = useState<number>(120)
  const [weightKg, setWeightKg] = useState<number>(25)
  const [notes, setNotes] = useState<string>('')
  const [edit, setEdit] = useState<{ originalDateISO: string; dateISO: string; heightCm: number; weightKg: number; notes: string } | null>(null)

  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getProfile>>>(null)

  // Load profile and BMI records from backend
  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null))
    ;(async () => {
      const backend = await fetchBmiRecords()
      if (backend.length) {
        setEntries(backend)
      }
    })()
  }, [])

  useEffect(() => {
    if (last) {
      checkGrowth(last.weightKg, last.heightCm).then(res => {
        if (!res) { setGrowthInfo(''); return }
        if (typeof res.ageInMonths === 'number' && res.ageInMonths < 24 && res.weightStatus) {
          setGrowthInfo(`Weight-for-age: ${res.weightStatus}`)
        } else if (typeof res.bmi === 'number' && res.bmiStatus) {
          setGrowthInfo(`BMI ${res.bmi.toFixed(1)}: ${res.bmiStatus}`)
        } else {
          setGrowthInfo(res.message || '')
        }
      })
    }
  }, [last?.dateISO])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setModalOpen(false)
      }
    }
    
    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isModalOpen])

  const graphRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<{ visible: boolean; left: number; top: number; entry?: BmiEntry; age?: string }>(
    { visible: false, left: 0, top: 0 }
  )

  const graph = useMemo(() => buildGraphData(entries), [entries])

  function onPointClick(e: React.MouseEvent<SVGCircleElement>, entry: BmiEntry) {
    const container = graphRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    
    // Calculate position relative to the graph container
    const left = e.clientX - rect.left
    const top = e.clientY - rect.top
    
    // Adjust tooltip position to appear near the dot but not under it
    let tooltipLeft = left + 15 // Offset to the right of the dot
    let tooltipTop = top - 60   // Offset above the dot
    
    // Ensure tooltip stays within container bounds
    const tooltipWidth = 200 // Approximate tooltip width
    const tooltipHeight = 120 // Approximate tooltip height
    
    if (tooltipLeft + tooltipWidth > rect.width) {
      tooltipLeft = left - tooltipWidth - 15 // Show to the left of the dot
    }
    
    if (tooltipTop < 0) {
      tooltipTop = top + 15 // Show below the dot if not enough space above
    }
    
    if (tooltipTop + tooltipHeight > rect.height) {
      tooltipTop = rect.height - tooltipHeight - 10 // Keep within bottom bounds
    }

    const age = formatAgeAt(entry.dateISO, profile?.dateOfBirth)

    setTooltip({ visible: true, left: tooltipLeft, top: tooltipTop, entry, age })
  }

  function closeTooltip() { setTooltip({ visible: false, left: 0, top: 0 }) }

  async function handleSaveNew() {
    const newEntry: BmiEntry = { dateISO, heightCm, weightKg, notes }
    // Save to backend first
    await addBmiRecordToBackend(newEntry)
    // Refresh from backend; if empty, fall back to local
    const latestFromBackend = await fetchBmiRecords()
    if (latestFromBackend.length) {
      setEntries(latestFromBackend)
    } else {
      // Fallback to local storage
      const { addBmi } = await import('../services/bmiService')
      addBmi(newEntry)
      const updatedEntries = await listBmi()
      setEntries(updatedEntries)
    }
    setModalOpen(false)
    // Reset form
    setNotes('')
  }

  function onEdit(entry: BmiEntry) {
    setEdit({ 
      originalDateISO: entry.dateISO, 
      dateISO: entry.dateISO, 
      heightCm: entry.heightCm, 
      weightKg: entry.weightKg,
      notes: entry.notes || ''
    })
  }

  async function onSaveEdit() {
    if (!edit) return
    try {
      await updateBmi(edit.originalDateISO, { 
        dateISO: edit.dateISO, 
        heightCm: edit.heightCm, 
        weightKg: edit.weightKg,
        notes: edit.notes
      })
      const updatedEntries = await listBmi()
      setEntries(updatedEntries)
      setEdit(null)
    } catch (error) {
      console.error('Error updating BMI record:', error)
      alert('Failed to update BMI record')
    }
  }

  async function onDelete(date: string) {
    if (!confirm('Delete this record?')) return
    await deleteBmi(date)
    const updatedEntries = await listBmi()
    setEntries(updatedEntries)
  }

  // Note: previously used for UI sections; no longer needed

  return (
    <div className="bmi-page">
      <SideNav />
      <main className="bmi-main">
        <header className="bmi-header">
          <h1 className="bmi-title">BMI & Growth Tracking</h1>
          <button className="add-bmi-btn" onClick={() => {
          setModalOpen(true)
          // Reset form fields
          setDateISO(new Date().toISOString().slice(0,10))
          setHeightCm(120)
          setWeightKg(25)
          setNotes('')
        }}>
            <span className="add-icon">+</span>
            Add Entry
          </button>
        </header>

        {/* BMI Add Entry Modal */}
        {isModalOpen && (
          <div className="bmi-modal-backdrop" onClick={() => setModalOpen(false)}>
            <div className="bmi-modal" onClick={(e) => e.stopPropagation()}>
              <div className="bmi-modal-header">
                <h2>Add BMI Entry</h2>
                <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
              </div>
              
              <form className="bmi-form" onSubmit={(e) => { e.preventDefault(); handleSaveNew(); }}>
                <div className="form-group">
                  <label htmlFor="bmi-date">Date</label>
                  <input
                    id="bmi-date"
                    type="date"
                    value={dateISO}
                    onChange={(e) => setDateISO(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="bmi-height">Height (cm)</label>
                    <input
                      id="bmi-height"
                      type="number"
                      min="50"
                      max="250"
                      step="0.1"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="bmi-weight">Weight (kg)</label>
                    <input
                      id="bmi-weight"
                      type="number"
                      min="1"
                      max="300"
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="bmi-notes">Notes (Optional)</label>
                  <textarea
                    id="bmi-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this BMI record..."
                    rows={3}
                  />
                </div>

                <div className="bmi-preview">
                  <div className="preview-label">BMI Preview:</div>
                  <div className="preview-value">
                    {computeBmi(heightCm, weightKg).toFixed(1)}
                    <span className="preview-category">({classifyBmi(computeBmi(heightCm, weightKg)).label})</span>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bmi-dashboard">
          <div className="bmi-stats">
            <div className={`bmi-card ${status.color}`}>
              <div className="bmi-card-header">
                <h3>Current BMI</h3>
                <div className={`bmi-status ${status.color}`}>{status.label}</div>
              </div>
              <div className="bmi-value">{currentBmi ? currentBmi.toFixed(1) : '—'}</div>
              <div className="bmi-details">
                <div className="bmi-detail">
                  <span className="label">Height</span>
                  <span className="value">{last?.heightCm ?? '—'} cm</span>
                </div>
                <div className="bmi-detail">
                  <span className="label">Weight</span>
                  <span className="value">{last?.weightKg ?? '—'} kg</span>
                </div>
              </div>
            </div>

            <div className="bmi-ranges">
              <h3>BMI Categories</h3>
              <div className="range-bars">
                {[
                  { label: 'Underweight', color: 'danger', range: '< 18.5' },
                  { label: 'Healthy', color: 'ok', range: '18.5 - 24.9' },
                  { label: 'Overweight', color: 'warn', range: '25.0 - 29.9' },
                  { label: 'Obese', color: 'danger', range: '≥ 30.0' }
                ].map((category) => (
                  <div key={category.label} className={`range-bar ${category.color}`}>
                    <div className="range-label">{category.label}</div>
                    <div className="range-value">{category.range}</div>
                  </div>
                ))}
              </div>
            </div>

            {growthInfo && (
              <div className="growth-info">
                <h3>Growth Status</h3>
                <div className="growth-message">{growthInfo}</div>
              </div>
            )}
          </div>

        <section className="bmi-graph" ref={graphRef} onClick={closeTooltip}>
          <div className="graph-header">
            <h3>BMI Trend</h3>
            <p>Click on points to see details</p>
          </div>
          
          <div className="graph-container">
            <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid meet" className="modern-graph">
              {/* Background grid */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3"/>
                </pattern>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4A90E2" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#7C8BFF" stopOpacity="1"/>
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Background */}
              <rect x={graph.margins.left} y={graph.margins.top} width={graph.innerWidth} height={graph.innerHeight} fill="url(#grid)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" rx="2"/>
              
              {/* Grid lines */}
              {graph.yTicks.map(t => (
                <line key={`y-${t.y}`} x1={graph.margins.left} y1={t.y} x2={graph.margins.left + graph.innerWidth} y2={t.y} stroke="rgba(255,255,255,0.12)" strokeWidth="0.3"/>
              ))}
              {graph.xTicks.map(t => (
                <line key={`x-${t.x}`} x1={t.x} y1={graph.margins.top} x2={t.x} y2={graph.margins.top + graph.innerHeight} stroke="rgba(255,255,255,0.12)" strokeWidth="0.3"/>
              ))}
              
              {/* Trend line with gradient and glow */}
              <polyline 
                fill="none" 
                stroke="url(#lineGradient)" 
                strokeWidth="1.2" 
                points={graph.polyPoints}
                filter="url(#glow)"
                style={{ transition: 'all 0.3s ease' }}
              />
              
              {/* Data points with hover effects */}
              {graph.circles.map((c) => (
                <g key={c.key}>
                  {/* Glow effect */}
                  <circle 
                    cx={c.cx} 
                    cy={c.cy} 
                    r="2.5" 
                    fill="rgba(74, 144, 226, 0.3)" 
                    className="point-glow"
                  />
                  {/* Main point */}
                  <circle 
                    cx={c.cx} 
                    cy={c.cy} 
                    r="1.8" 
                    fill="#4A90E2" 
                    stroke="#FFFFFF" 
                    strokeWidth="0.4" 
                    className="data-point"
                    style={{ cursor: 'pointer' }} 
                    onClick={(e) => { e.stopPropagation(); onPointClick(e, c.entry) }}
                  />
                  {/* Inner highlight */}
                  <circle 
                    cx={c.cx} 
                    cy={c.cy} 
                    r="0.8" 
                    fill="rgba(255,255,255,0.8)"
                    className="point-highlight"
                  />
                </g>
              ))}
              
              {/* Axis labels */}
              <text x={graph.margins.left + graph.innerWidth / 2} y={graph.margins.top + graph.innerHeight + 12} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="5" fontWeight="600">Date</text>
              <text x={graph.margins.left - 12} y={graph.margins.top + 8} textAnchor="end" fill="rgba(255,255,255,0.8)" fontSize="5" fontWeight="600" transform={`rotate(-90, ${graph.margins.left - 12}, ${graph.margins.top + 8})`}>BMI</text>
              
              {/* Tick labels */}
              {graph.yTicksLabeled.map(t => (
                <text key={`yl-${t.y}`} x={graph.margins.left - 5} y={t.y + 2} textAnchor="end" fill="rgba(255,255,255,0.7)" fontSize="3.5" fontWeight="500">{t.label}</text>
              ))}
              {graph.xTicksLabeled.map(t => (
                <text key={`xl-${t.x}`} x={t.x} y={graph.margins.top + graph.innerHeight + 8} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="3.5" fontWeight="500">{t.label}</text>
              ))}
            </svg>
          </div>

          {/* Modern tooltip */}
          {tooltip.visible && tooltip.entry && (
            <div className="bmi-tooltip-modern" style={{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }} onClick={(e)=>e.stopPropagation()}>
              <div className="tooltip-header">
                <div className="tooltip-date">{new Date(tooltip.entry.dateISO).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}</div>
                <div className="tooltip-bmi">BMI: {computeBmi(tooltip.entry.heightCm, tooltip.entry.weightKg).toFixed(1)}</div>
              </div>
              <div className="tooltip-content">
                <div className="tooltip-row">
                  <span className="tooltip-label">Height:</span>
                  <span className="tooltip-value">{tooltip.entry.heightCm} cm</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Weight:</span>
                  <span className="tooltip-value">{tooltip.entry.weightKg} kg</span>
                </div>
                {tooltip.age && (
                  <div className="tooltip-row">
                    <span className="tooltip-label">Age:</span>
                    <span className="tooltip-value">{tooltip.age}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

          <div className="bmi-entries">
            <div className="entries-header">
              <h2>BMI History</h2>
              <p>Track all your measurements</p>
            </div>
            
            <div className="entries-list">
              {entries.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <h3>No BMI entries yet</h3>
                  <p>Start tracking your BMI by adding your first entry</p>
                  <button className="primary-btn" onClick={() => setModalOpen(true)}>Add First Entry</button>
                </div>
              ) : (
                [...entries].reverse().map(e => (
                  <div key={e.dateISO} className="entry-card">
                    <div className="entry-date">{e.dateISO}</div>
                    <div className="entry-metrics">
                      <div className="metric">
                        <span className="metric-label">Height</span>
                        <span className="metric-value">{e.heightCm} cm</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Weight</span>
                        <span className="metric-value">{e.weightKg} kg</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">BMI</span>
                        <span className="metric-value bmi-value-display">{computeBmi(e.heightCm, e.weightKg).toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="entry-actions">
                      <button className="edit-btn" onClick={() => onEdit(e)}>Edit</button>
                      <button className="delete-btn" onClick={() => onDelete(e.dateISO)}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Edit BMI Modal */}
        {edit && (
          <div className="bmi-modal-backdrop" onClick={() => setEdit(null)}>
            <div className="bmi-modal" onClick={(e) => e.stopPropagation()}>
              <div className="bmi-modal-header">
                <h2>Edit BMI Entry</h2>
                <button className="modal-close" onClick={() => setEdit(null)}>✕</button>
              </div>
              
              <form className="bmi-form" onSubmit={(e) => { e.preventDefault(); onSaveEdit(); }}>
                <div className="form-group">
                  <label htmlFor="edit-bmi-date">Date</label>
                  <input
                    id="edit-bmi-date"
                    type="date"
                    value={edit.dateISO}
                    onChange={(e) => setEdit({ ...edit, dateISO: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-bmi-height">Height (cm)</label>
                    <input
                      id="edit-bmi-height"
                      type="number"
                      min="50"
                      max="250"
                      step="0.1"
                      value={edit.heightCm}
                      onChange={(e) => setEdit({ ...edit, heightCm: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-bmi-weight">Weight (kg)</label>
                    <input
                      id="edit-bmi-weight"
                      type="number"
                      min="1"
                      max="300"
                      step="0.1"
                      value={edit.weightKg}
                      onChange={(e) => setEdit({ ...edit, weightKg: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-bmi-notes">Notes (Optional)</label>
                  <textarea
                    id="edit-bmi-notes"
                    value={edit.notes}
                    onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                    placeholder="Add any notes about this BMI record..."
                    rows={3}
                  />
                </div>

                <div className="bmi-preview">
                  <div className="preview-label">BMI Preview:</div>
                  <div className="preview-value">
                    {computeBmi(edit.heightCm, edit.weightKg).toFixed(1)}
                    <span className="preview-category">({classifyBmi(computeBmi(edit.heightCm, edit.weightKg)).label})</span>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={() => setEdit(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    Update BMI Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


      </main>
    </div>
  )
}

export default BmiPage

function buildGraphData(entries: BmiEntry[]): {
  polyPoints: string;
  circles: Array<{ key: string; cx: number; cy: number; entry: BmiEntry }>;
  margins: { left: number; right: number; top: number; bottom: number };
  innerWidth: number;
  innerHeight: number;
  yTicks: Array<{ y: number }>;
  xTicks: Array<{ x: number }>;
  yTicksLabeled: Array<{ y: number; label: string }>;
  xTicksLabeled: Array<{ x: number; label: string }>;
} {
  const margins = { left: 20, right: 15, top: 15, bottom: 20 }
  const width = 160
  const height = 90
  const innerWidth = width - margins.left - margins.right
  const innerHeight = height - margins.top - margins.bottom

  if (!entries.length) {
    return {
      polyPoints: '', circles: [], margins, innerWidth, innerHeight,
      yTicks: [], xTicks: [], yTicksLabeled: [], xTicksLabeled: []
    }
  }

  // Sort by date
  const sorted = [...entries].sort((a,b)=>new Date(a.dateISO).getTime()-new Date(b.dateISO).getTime())

  const times = sorted.map(e => new Date(e.dateISO).getTime())
  const minDate = Math.min(...times)
  const maxDate = Math.max(...times)
  const bmis = sorted.map(e => computeBmi(e.heightCm, e.weightKg))
  const minBmi = Math.min(...bmis)
  const maxBmi = Math.max(...bmis)

  const span = Math.max(1, maxDate - minDate)
  const range = Math.max(1, maxBmi - minBmi)

  const toX = (t: number) => margins.left + ((t - minDate) / span) * innerWidth
  const toY = (b: number) => margins.top + (1 - (b - minBmi) / range) * innerHeight

  const points = sorted.map(e => {
    const x = toX(new Date(e.dateISO).getTime())
    const y = toY(computeBmi(e.heightCm, e.weightKg))
    return { x, y, entry: e }
  })

  let poly = ''
  if (points.length === 1) {
    const p = points[0]
    poly = `${margins.left},${p.y.toFixed(2)} ${margins.left + innerWidth},${p.y.toFixed(2)}`
  } else {
    poly = points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  }

  const circles = points.map(p => ({ key: p.entry.dateISO, cx: +p.x.toFixed(2), cy: +p.y.toFixed(2), entry: p.entry }))

  // Y ticks: min, mid, max
  const yMin = toY(minBmi)
  const yMid = toY(minBmi + range / 2)
  const yMax = toY(maxBmi)
  const yTicks = [{ y: yMin }, { y: yMid }, { y: yMax }]
  const yTicksLabeled = [
    { y: yMax, label: maxBmi.toFixed(1) },
    { y: yMid, label: (minBmi + range / 2).toFixed(1) },
    { y: yMin, label: minBmi.toFixed(1) },
  ]

  // X ticks: first, middle, last
  const firstX = toX(minDate)
  const lastX = toX(maxDate)
  const midX = toX(minDate + span / 2)
  const fmt = (t: number) => {
    const d = new Date(t)
    return `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`
  }
  const xTicks = [{ x: firstX }, { x: midX }, { x: lastX }]
  const xTicksLabeled = [
    { x: firstX, label: fmt(minDate) },
    { x: midX, label: fmt(minDate + span / 2) },
    { x: lastX, label: fmt(maxDate) },
  ]

  return { polyPoints: poly, circles, margins, innerWidth, innerHeight, yTicks, xTicks, yTicksLabeled, xTicksLabeled }
}



function formatAgeAt(dateISO: string, birthISO?: string): string | undefined {
  if (!birthISO) return undefined
  const d = new Date(dateISO)
  const b = new Date(birthISO)
  let years = d.getFullYear() - b.getFullYear()
  let months = d.getMonth() - b.getMonth()
  if (d.getDate() < b.getDate()) months -= 1
  while (months < 0) { years -= 1; months += 12 }
  if (years < 0) return undefined
  return years ? `${years}y ${months}m` : `${months}m`
}


