/**
 * LandingPage.jsx - Modern Landing & Role Selection Portal (Batch-Aware)
 * 
 * Beautiful gateway page showcasing the institution's features,
 * with cards to log in as Administrator, Tutor, or Student.
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const LandingPage = ({ onSelectRole }) => {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [tutorEmail, setTutorEmail] = useState('');
  const [tutorPassword, setTutorPassword] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    const list = await dbService.getStudents();
    setStudents(list.sort((a,b) => a.name.localeCompare(b.name)));
    
    const bts = await dbService.getBatches();
    setBatches(bts);
  };

  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Credentials required',
        text: 'Please enter admin email and password.'
      });
      return;
    }

    const admin = await dbService.validateAdminLogin(adminEmail, adminPassword);
    if (!admin) {
      Swal.fire({
        icon: 'error',
        title: 'Login failed',
        text: 'Invalid admin credentials.'
      });
      return;
    }

    onSelectRole('admin', admin.id);
  };

  const handleStudentLogin = async () => {
    if (!studentEmail.trim() || !studentPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Credentials required',
        text: 'Please enter student college email and password.'
      });
      return;
    }

    const student = await dbService.validateStudentLogin(studentEmail, studentPassword);
    if (!student) {
      Swal.fire({
        icon: 'error',
        title: 'Login failed',
        text: 'Invalid student credentials.'
      });
      return;
    }

    onSelectRole('student', student.id);
  };

  const handleTutorLogin = async () => {
    if (!tutorEmail.trim() || !tutorPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Credentials required',
        text: 'Please enter tutor college email and password.'
      });
      return;
    }

    const tutor = await dbService.validateTutorLogin(tutorEmail, tutorPassword);
    if (!tutor) {
      Swal.fire({
        icon: 'error',
        title: 'Login failed',
        text: 'Invalid tutor credentials.'
      });
      return;
    }

    onSelectRole('tutor', tutor.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '900px', margin: '3rem auto 0 auto', padding: '1rem' }}>
      
      {/* Visual Hero Intro Banner */}
      <div style={{ marginBlockEnd: '1.5rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 800, 
          letterSpacing: '-0.03em', 
          background: 'linear-gradient(135deg, var(--brand-blue) 30%, var(--brand-orange) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBlockEnd: '0.5rem',
          textAlign: 'center'
        }}>
          ISMT Academic & Attendance Portal
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center', fontWeight: 500 }}>
          An integrated ecosystem for tutors to log registers in seconds, students to track their progress, and administrators to orchestrate trimester migrations.
        </p>
      </div>

      {/* Role Selection Grid */}
      <div className="migration-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
        
        {/* Card 1: Administrator */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', transition: 'var(--transition-smooth)' }}>
          <div style={{ fontSize: '2.5rem', color: 'var(--brand-blue)' }}>🛡️</div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBlockEnd: '0.4rem', color: 'var(--brand-blue)' }}>Administrator Portal</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Orchestrate trimester bulk migrations, manage student databases, setup modules, and audit leaves.
            </p>
            <div className="form-group" style={{ textAlign: 'left', marginBlockStart: '0.75rem', marginBlockEnd: 0 }}>
              <input
                className="form-input"
                type="email"
                placeholder="admin@ismt.edu.np"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                style={{ marginBlockEnd: '0.5rem' }}
              />
              <input
                className="form-input"
                type="password"
                placeholder="Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          </div>
          <button 
            className="btn primary" 
            style={{ width: '100%', justifyContent: 'center', marginBlockStart: 'auto' }}
            onClick={handleAdminLogin}
          >
            Enter Admin Panel
          </button>
        </div>

        {/* Card 2: Tutor */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', transition: 'var(--transition-smooth)' }}>
          <div style={{ fontSize: '2.5rem', color: 'var(--brand-orange)' }}>🧑‍🏫</div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBlockEnd: '0.4rem', color: 'var(--brand-blue)' }}>Tutor Dashboard</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Select assigned modules, mark daily section registers in seconds, add comments, and diagnose profiles.
            </p>
            <div className="form-group" style={{ textAlign: 'left', marginBlockStart: '0.75rem', marginBlockEnd: 0 }}>
              <input
                className="form-input"
                type="email"
                placeholder="college.email@ismt.edu.np"
                value={tutorEmail}
                onChange={(e) => setTutorEmail(e.target.value)}
                style={{ marginBlockEnd: '0.5rem' }}
              />
              <input
                className="form-input"
                type="password"
                placeholder="Password"
                value={tutorPassword}
                onChange={(e) => setTutorPassword(e.target.value)}
              />
            </div>
          </div>
          <button 
            className="btn primary" 
            style={{ width: '100%', justifyContent: 'center', marginBlockStart: 'auto' }}
            onClick={handleTutorLogin}
          >
            Enter Tutor Panel
          </button>
        </div>

        {/* Card 3: Student */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', transition: 'var(--transition-smooth)' }}>
          <div style={{ fontSize: '2.5rem', color: 'var(--brand-blue)' }}>🎓</div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBlockEnd: '0.4rem', color: 'var(--brand-blue)' }}>Student Profile</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBlockEnd: '0.75rem' }}>
              Track attendance score gauges, analyze subject stats, view heatmap logs, and file leave requests.
            </p>
            <div className="form-group" style={{ textAlign: 'left', marginBlockStart: '0.75rem', marginBlockEnd: 0 }}>
              <input
                className="form-input"
                type="email"
                placeholder="student@ismt.edu.np"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                style={{ marginBlockEnd: '0.5rem' }}
              />
              <input
                className="form-input"
                type="password"
                placeholder="Password"
                value={studentPassword}
                onChange={(e) => setStudentPassword(e.target.value)}
              />
            </div>
          </div>
          
          <button 
            className="btn primary" 
            style={{ width: '100%', justifyContent: 'center', marginBlockStart: 'auto', background: 'var(--brand-orange)', boxShadow: '0 4px 12px var(--brand-orange-glow)' }}
            onClick={handleStudentLogin}
          >
            Enter Student Portal
          </button>
        </div>

      </div>

      {/* Footer Branding */}
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginBlockStart: '2rem' }}>
        © 2026 ISMT College College Management System. Powered by Supabase & Vite React.
      </div>

    </div>
  );
};

export default LandingPage;
export { LandingPage };
