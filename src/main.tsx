import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Welcome from './pages/Welcome.tsx'
import Auth from './pages/Auth.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Profile from './pages/Profile.tsx'
import Bmi from './pages/Bmi.tsx'
import Vaccines from './pages/Vaccines.tsx'
import DoctorAppointments from './pages/DoctorAppointments.tsx'
import AlreadyVaccinated from './pages/AlreadyVaccinated.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="auth" element={<Auth />} />
        <Route path="already-vaccinated" element={<AlreadyVaccinated />} />
        <Route path="dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="bmi" element={
          <ProtectedRoute>
            <Bmi />
          </ProtectedRoute>
        } />
        <Route path="vaccines" element={
          <ProtectedRoute>
            <Vaccines />
          </ProtectedRoute>
        } />
        <Route path="doctor-appointments" element={
          <ProtectedRoute>
            <DoctorAppointments />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
