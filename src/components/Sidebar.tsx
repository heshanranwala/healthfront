import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getProfile } from '../services/profileService'
import type { UserProfile } from '../services/profileService'
import { logout } from '../services/authService'
import './sidebar.css'
import hvLogo from '../assets/hv.png'

type SidebarProps = {
  className?: string
}

function Sidebar({ className }: SidebarProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null))
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <>
      <button
        className="hamburger"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>
      {open ? <div className="drawer-backdrop" onClick={() => setOpen(false)} /> : null}
      <nav className={['dash-nav', 'sidebar', open ? 'open' : '', className].filter(Boolean).join(' ')} aria-label="Primary">
        <div style={{ display: 'grid', justifyItems: 'center', gap: '1vmin', padding: '0 2vmin', marginBottom: '1vmin' }}>
          <img src={hvLogo} alt="Health Vault" style={{ width: '50%', height: 'auto' }} />
          <strong style={{ textAlign: 'center' }}>Health Vault</strong>
        </div>
        <div
          className="avatar"
          style={profile?.photoDataUrl ? { backgroundImage: `url(${profile.photoDataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        />
        <ul className="menu">
          <li>
            <NavLink to="/dashboard" onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>📊 Dashboard</NavLink>
          </li>
          <li>
            <NavLink to="/profile" onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>👤 Profile</NavLink>
          </li>
          <li>
            <NavLink to="/bmi" onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>📈 BMI</NavLink>
          </li>
          <li>
            <NavLink to="/vaccines" onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>💉 Vaccines</NavLink>
          </li>
          <li>
            <button 
              onClick={handleLogout} 
              className="nav-item"
              style={{ 
                width: '100%', 
                textAlign: 'left', 
                background: 'var(--muted)', 
                border: 'none', 
                color: 'var(--fg)',
                cursor: 'pointer',
                padding: '1.4vmin 1.8vmin',
                fontSize: '2vmin',
                borderRadius: '1vmin',
                transition: 'background 120ms ease, transform 120ms ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--muted) 70%, var(--accent))';
                e.currentTarget.style.transform = 'translateX(0.2vmin)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--muted)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              🚪 Logout
            </button>
          </li>
        </ul>
      </nav>
    </>
  )
}

export default Sidebar


