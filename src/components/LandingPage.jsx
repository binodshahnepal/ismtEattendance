/**
 * LandingPage.jsx - Modern Landing & Role Selection Portal (Batch-Aware)
 * 
 * Beautiful gateway page showcasing the institution's features,
 * with cards to log in as Administrator, Tutor, or Student.
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';

const LandingPage = ({ onSelectRole }) => {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    const list = await dbService.getStudents();
    setStudents(list.sort((a,b) => a.name.localeCompare(b.name)));
    
    const bts = await dbService.getBatches();
    setBatches(bts);

    if (list.length > 0) {
      setSelectedStudent(list[0].id);
    }
  };

  const handleStudentLogin = () => {
    if (!selectedStudent) {
      alert("Please select a student profile first.");
      return;
    }
    onSelectRole('student', selectedStudent);
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
          </div>
          <button 
            className="btn primary" 
            style={{ width: '100%', justifyContent: 'center', marginBlockStart: 'auto' }}
            onClick={() => onSelectRole('admin')}
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
          </div>
          <button 
            className="btn primary" 
            style={{ width: '100%', justifyContent: 'center', marginBlockStart: 'auto' }}
            onClick={() => onSelectRole('tutor')}
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
            
            {students.length > 0 && (
              <div className="form-group" style={{ textAlign: 'left', marginBlockEnd: '0' }}>
                <select 
                  className="form-select" 
                  value={selectedStudent} 
                  onChange={(e) => setSelectedStudent(e.target.value)} 
                  style={{ width: '100%', minHeight: '38px', padding: '0.4rem' }}
                >
                  {students.map(s => {
                    const b = batches.find(batch => batch.id === s.batch_id);
                    const batchLabel = b ? b.title.substring(0, 12) : 'Intake';
                    return (
                      <option key={s.id} value={s.id}>{s.name} ({batchLabel} - S{s.stage}T{s.trimester})</option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
          
          <button 
            className="btn primary" 
            style={{ width: '100%', justifyContent: 'center', marginBlockStart: 'auto', background: 'var(--brand-orange)', boxShadow: '0 4px 12px var(--brand-orange-glow)' }}
            onClick={handleStudentLogin}
            disabled={students.length === 0}
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
