import React, { useState } from 'react';
import hvLogo from '../assets/hv.png';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../services/authService';
import './sidenav.css';

const SideNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    try {
      await logout();
      // Clear browser history and redirect to home
      window.history.replaceState(null, '', '/');
      navigate('/', { replace: true });
      // Force a page reload to clear any cached state
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <button className="hamburger" onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Sidebar */}
      <nav className={`sidenav ${isOpen ? 'open' : ''}`}>
        <div className="nav-header" style={{ display: 'grid', justifyItems: 'center', gap: '1vmin' }}>
          <img src={hvLogo} alt="Health Vault" style={{ width: '55%', height: 'auto' }} />
          <h3 style={{ margin: 0, textAlign: 'center' }}>Health Vault</h3>
        </div>
        
        <div className="nav-links">
          <NavLink to="/dashboard" onClick={() => setIsOpen(false)}>
            <span className="icon">📊</span>
            Dashboard
          </NavLink>
          
          <NavLink to="/profile" onClick={() => setIsOpen(false)}>
            <span className="icon">👶</span>
            Profile
          </NavLink>
          
          <NavLink to="/vaccines" onClick={() => setIsOpen(false)}>
            <span className="icon">💉</span>
            Vaccines
          </NavLink>
          
          <NavLink to="/doctor-appointments" onClick={() => setIsOpen(false)}>
            <span className="icon">👨‍⚕️</span>
            Doctor Appointments
          </NavLink>
          
          <NavLink to="/bmi" onClick={() => setIsOpen(false)}>
            <span className="icon">📈</span>
            BMI
          </NavLink>
          
          <button 
            onClick={handleLogout} 
            className="nav-link logout-button"
            style={{ 
              width: '100%', 
              textAlign: 'left', 
              background: 'none', 
              border: 'none', 
              color: 'inherit',
              cursor: 'pointer',
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="icon">🚪</span>
            Logout
          </button>
        </div>
      </nav>

      {/* Backdrop */}
      {isOpen && <div className="backdrop" onClick={toggleMenu} />}
    </>
  );
};

export default SideNav;


