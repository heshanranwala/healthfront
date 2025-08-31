import { useEffect, useRef, useState, type FormEvent } from 'react'
import hvLogo from '../assets/hv.png'
import { useNavigate } from 'react-router-dom'
import { login, signup } from '../services/authService'
import './auth.css'

function Auth() {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [entered, setEntered] = useState(false)
  const navigate = useNavigate()
  const wheelHandledRef = useRef(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  
  
  useEffect(() => {
    // Trigger fade-in on mount
    const id = requestAnimationFrame(() => setEntered(true))

    const onWheel = (e: WheelEvent) => {
      if (wheelHandledRef.current) return
      // When modal is open, block navigation gestures
      if (isModalOpen) {
        e.preventDefault()
        return
      }
      // Disable downward scroll
      if (e.deltaY > 0) {
        e.preventDefault()
        return
      }
      // Upward scroll should go back to welcome
      if (e.deltaY < 0) {
        e.preventDefault()
        wheelHandledRef.current = true
        navigate('/')
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      // Prevent rubber-band on mobile
      e.preventDefault()
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchmove', onTouchMove)
      cancelAnimationFrame(id)
    }
  }, [navigate])

  return (
    <section className="auth-section" style={{ opacity: entered ? 1 : 0, transition: 'opacity 510ms ease' }}>
      <div className="auth-landing">
        <div
          className="auth-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2%',
            width: '100%'
          }}
        >
          <img
            src={hvLogo}
            alt="Health Vault"
            style={{ width: '20%', height: 'auto' }}
          />
          <h1 className="page-title" style={{ margin: 0 }}>Health Vault</h1>
        </div>
        <p className="page-subtitle">
          Keep your health and wellness on track with our all-in-one app. From staying up-to-date with your vaccinations to managing doctor visits, monitoring your growth, and recording important health milestones, we make it simple and secure to take control of your well-being. Your health journey, organized and at your fingertips.
        </p>
        <div className="actions-row">
          <button type="button" className="primary" onClick={() => { setAuthMode('login'); setIsModalOpen(true); }}>
            LOGIN
          </button>
          <button type="button" onClick={() => { setAuthMode('signup'); setIsModalOpen(true); }}>
            SIGNUP
          </button>
        </div>

        <h2 className="offer-title">What we offer</h2>
        <div className="offer-grid">
          <div className="offer-card">
            <div className="offer-card-content">
              <h3>Digital Vaccination Tracker</h3>
              <p>Stay on top of your immunization schedule with automatic reminders and a secure digital vaccination record.</p>
            </div>
          </div>
          <div className="offer-card">
            <div className="offer-card-content">
              <h3>Doctor Appointments Management</h3>
              <p>Record and track medical visits, prescriptions, and follow-ups so you never miss an important consultation.</p>
            </div>
          </div>
          <div className="offer-card">
            <div className="offer-card-content">
              <h3>BMI & Growth Monitoring</h3>
              <p>Monitor your BMI and growth trends over time with easy-to-read charts and insights.</p>
            </div>
          </div>
          <div className="offer-card">
            <div className="offer-card-content">
              <h3>Health Notes & Milestones</h3>
              <p>Add special notes about allergies, health conditions, or milestones to keep a complete picture of your well-being.</p>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <AuthModal onClose={() => setIsModalOpen(false)}>
          {authMode === 'login' ? <LoginForm navigate={navigate} /> : <SignupForm navigate={navigate} />}
        </AuthModal>
      ) : null}
    </section>
  );
}

export default Auth

// Validation helpers
const gmailRegex = /^[A-Za-z0-9._%+-]+@gmail\.com$/
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

function isValidGmail(email: string): boolean {
  return gmailRegex.test(email)
}

function isStrongPassword(password: string): boolean {
  return strongPasswordRegex.test(password)
}

function LoginForm({ navigate }: { navigate: (path: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // Frontend validation
    if (!isValidGmail(email)) {
      setError('Please use a Gmail address (example@gmail.com).')
      return
    }
    if (!isStrongPassword(password)) {
      setError('Password must be at least 8 chars and include uppercase, lowercase, number, and symbol.')
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      sessionStorage.setItem('onboard_needed', '1')
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        pattern="[A-Za-z0-9._%+-]+@gmail\.com"
        title="Email must be a Gmail address (example@gmail.com)"
      />

      <label htmlFor="login-password">Password</label>
      <div className="password-field">
        <input
          id="login-password"
          type={showPassword ? 'text' : 'password'}
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          className="toggle-password"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>

      {error ? <div style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>{error}</div> : null}

      <button type="submit" className="primary" disabled={loading}>
        {loading ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  )
}

function SignupForm({ navigate }: { navigate: (path: string) => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState('male')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // Frontend validation
    if (!isValidGmail(email)) {
      setError('Please use a Gmail address (example@gmail.com).')
      return
    }
    if (!isStrongPassword(password)) {
      setError('Password must be at least 8 chars and include uppercase, lowercase, number, and symbol.')
      return
    }

    setLoading(true)
    try {
      // Call the signup function with all user details including phone number
      const data = await signup(firstName, lastName, email, password, gender, dateOfBirth, phoneNumber)
      
      // Check if backend wants to redirect to already-vaccinated page
      if (data.redirectTo === 'already-vaccinated') {
        navigate('/already-vaccinated')
      } else {
        // Fallback redirect
        navigate('/already-vaccinated')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="signup-firstname">First Name</label>
          <input
            id="signup-firstname"
            type="text"
            required
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="signup-lastname">Last Name</label>
          <input
            id="signup-lastname"
            type="text"
            required
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <label htmlFor="signup-email">Email</label>
      <input
        id="signup-email"
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        pattern="[A-Za-z0-9._%+-]+@gmail\.com"
        title="Email must be a Gmail address (example@gmail.com)"
      />

      <label htmlFor="signup-password">Password</label>
      <div className="password-field">
        <input
          id="signup-password"
          type={showPassword ? 'text' : 'password'}
          required
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          className="toggle-password"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            required
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="date-of-birth">Date of Birth</label>
          <input
            id="date-of-birth"
            type="date"
            required
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>
      </div>

      <label htmlFor="phone-number">Phone Number</label>
      <input
        id="phone-number"
        type="tel"
        required
        placeholder="Phone number"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />

      {error ? <div style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>{error}</div> : null}

      <button type="submit" className="primary" disabled={loading}>
        {loading ? 'Creating...' : 'Create account'}
      </button>
    </form>
  )
}

type AuthModalProps = { onClose: () => void; children: React.ReactNode }
function AuthModal({ onClose, children }: AuthModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="auth-tabs" style={{ marginBottom: 12 }}>
          {/* tabs hidden in modal; heading handled by page buttons */}
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}


