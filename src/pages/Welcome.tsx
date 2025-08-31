import { useEffect, useRef, useState } from 'react'
import hvLogo from '../assets/hv.png'
import { useNavigate } from 'react-router-dom'
import './welcome.css'

function Welcome() {
  const navigate = useNavigate()
  const [fade, setFade] = useState(0)
  const wheelHandledRef = useRef(false)

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (wheelHandledRef.current) return
      // Only react to downward scroll intent
      if (e.deltaY > 0) {
        e.preventDefault()
        wheelHandledRef.current = true
        // Animate opacity fade-out quickly, then navigate
        setFade(1)
        setTimeout(() => navigate('/auth'), 350)
      } else {
        // Block rubber-band on upward at top
        e.preventDefault()
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      // Prevent rubber-band stretching
      e.preventDefault()
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [navigate])

  return (
    <section
      className="welcome-section"
      style={{ opacity: 1 - fade, transition: 'opacity 500ms ease' }}
    >
      <div className="welcome-content">
        <img
          src={hvLogo}
          alt="Health Vault"
          style={{ display: 'block', width: '35%', margin: '0 auto 3%' }}
        />
        <h1 className="welcome-title">Health Vault</h1>
        <p className="scroll-hint">Scroll to continue</p>
      </div>
    </section>
  )
}

export default Welcome



