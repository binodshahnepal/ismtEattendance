/**
 * App.jsx - Main Application Shell & Role Router
 * 
 * Manages the global session role (Landing Portal, Admin, Tutor, Student),
 * displays a premium responsive navigation bar, and handles back-routing.
 */

import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import TutorDashboard from './components/TutorDashboard';
import StudentDashboard from './components/StudentDashboard';

function App() {
  const [activeRole, setActiveRole] = useState('landing'); // 'landing' | 'admin' | 'tutor' | 'student'
  const [activeStudentId, setActiveStudentId] = useState('');

  const handleSelectRole = (role, studentId = '') => {
    setActiveRole(role);
    if (role === 'student') {
      setActiveStudentId(studentId);
    }
  };

  const handleLogout = () => {
    setActiveRole('landing');
    setActiveStudentId('');
  };

  return (
    <div className="app-container">
      
      {/* Premium Top Navigation Bar */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem',
        marginBlockEnd: '2rem',
        paddingBlockEnd: '1.25rem',
        borderBlockEnd: '1px solid var(--border-glass)'
      }}>
        <div 
          className="logo-section" 
          onClick={handleLogout} 
          style={{ cursor: 'pointer', transition: 'var(--transition-smooth)' }}
          title="Return to Portal Home"
        >
          <h1>ISMT COLLEGE <span>Academic & Attendance System</span></h1>
        </div>

        {activeRole !== 'landing' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-muted)', 
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: '20px',
              padding: '0.4rem 1.25rem',
              fontWeight: 500
            }}>
              Logged in: <strong style={{ color: 'var(--accent-purple)' }}>
                {activeRole === 'admin' ? 'Administrator' : activeRole === 'tutor' ? 'Tutor Account' : 'Student Account'}
              </strong>
            </div>
            
            <button 
              className="btn" 
              style={{ 
                minHeight: '38px', 
                padding: '0.4rem 1.25rem', 
                fontSize: '0.85rem', 
                fontWeight: 600,
                borderColor: 'var(--border-glass)',
                color: 'var(--text-primary)'
              }}
              onClick={handleLogout}
            >
              ← Portal Home
            </button>
          </div>
        )}
      </header>

      {/* Main Core Dashboard Views Switcher */}
      <main>
        {activeRole === 'landing' && (
          <LandingPage onSelectRole={handleSelectRole} />
        )}
        
        {activeRole === 'admin' && (
          <AdminDashboard />
        )}
        
        {activeRole === 'tutor' && (
          <TutorDashboard />
        )}
        
        {activeRole === 'student' && (
          <StudentDashboard studentId={activeStudentId} />
        )}
      </main>

    </div>
  );
}

export default App;
