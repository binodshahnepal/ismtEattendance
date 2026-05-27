/**
 * StudentDashboard.jsx - Student Personal Attendance & Leave Filing Portal (Batch-Aware)
 * 
 * Shows overall attendance rate gauges, subject breakdown lists,
 * calendar diaries, and digital leave application triggers.
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';

const StudentDashboard = ({ studentId }) => {
  const [student, setStudent] = useState(null);
  const [program, setProgram] = useState(null);
  const [batch, setBatch] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaves, setLeaves] = useState([]);
  
  // Leave filing states
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveType, setLeaveType] = useState('Medical');
  const [leaveReason, setLeaveReason] = useState('');

  // Calendar states
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  const loadStudentData = async () => {
    const students = await dbService.getStudents();
    const activeStudent = students.find(s => s.id === studentId);
    if (!activeStudent) return;

    setStudent(activeStudent);

    const progs = await dbService.getPrograms();
    const prog = progs.find(p => p.id === activeStudent.program_id);
    setProgram(prog);

    const bts = await dbService.getBatches();
    const studentBatch = bts.find(b => b.id === activeStudent.batch_id);
    setBatch(studentBatch);

    const hist = await dbService.getStudentAttendanceHistory(studentId);
    setHistory(hist);

    const lvs = await dbService.getStudentLeaves(studentId);
    setLeaves(lvs);
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason) {
      alert("Please fill in all leave request inputs.");
      return;
    }

    await dbService.submitLeave(studentId, leaveStart, leaveEnd, leaveType, leaveReason);
    alert("Leave application submitted successfully!");
    
    // Reset forms and reload
    setLeaveStart('');
    setLeaveEnd('');
    setLeaveReason('');
    
    const lvs = await dbService.getStudentLeaves(studentId);
    setLeaves(lvs);
  };

  if (!student) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading student profile...</p>
      </div>
    );
  }

  // Calculate statistics
  const total = history.length;
  let presents = 0;
  let absents = 0;
  let lates = 0;
  let excused = 0;

  history.forEach(h => {
    if (h.status === 'P') presents++;
    else if (h.status === 'A') absents++;
    else if (h.status === 'L') lates++;
    else if (h.status === 'E') excused++;
  });

  const rate = total > 0 ? Math.round(((presents + lates + excused) / total) * 100) : 100;
  
  // Set safety threshold warning flags
  let warningClass = 'var(--accent-present)';
  let warningText = 'Excellent attendance!';
  if (rate < 75) {
    warningClass = 'var(--accent-absent)';
    warningText = 'Critical Alert: Attendance below threshold (75%)!';
  } else if (rate < 80) {
    warningClass = 'var(--accent-late)';
    warningText = 'Warning: Attendance near boundary (80%)!';
  }

  const offset = 144 - (144 * (rate / 100)); // circular dial stroke offset

  // Group attendance statistics by subject (trimester modules)
  const modulesRates = {};
  history.forEach(h => {
    if (!modulesRates[h.moduleId]) {
      modulesRates[h.moduleId] = { title: h.moduleTitle, total: 0, present: 0 };
    }
    modulesRates[h.moduleId].total++;
    if (h.status === 'P' || h.status === 'L' || h.status === 'E') {
      modulesRates[h.moduleId].present++;
    }
  });

  // Calendar calculations
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDayRaw = new Date(currentYear, currentMonth, 1).getDay();
  const firstDay = firstDayRaw === 0 ? 6 : firstDayRaw - 1;
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handleMonthOffset = (offset) => {
    let nextMonth = currentMonth + offset;
    let nextYear = currentYear;

    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    } else if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    }

    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
  };

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="mini-cell empty"></div>);
    }

    for (let day = 1; day <= totalDays; day++) {
      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${mm}-${dd}`;

      const dayRecords = history.filter(h => h.date === dateStr);
      let statusClass = '';
      let titleTooltip = '';

      if (dayRecords.length > 0) {
        const isAbsent = dayRecords.some(r => r.status === 'A');
        const isLate = dayRecords.some(r => r.status === 'L');
        const isExcused = dayRecords.some(r => r.status === 'E');

        const mainStatus = isAbsent ? 'A' : (isLate ? 'L' : (isExcused ? 'E' : 'P'));
        statusClass = `marked-${mainStatus}`;
        
        titleTooltip = dayRecords.map(r => 
          `${r.moduleTitle}: ${r.status === 'P' ? 'Present' : r.status === 'A' ? 'Absent' : r.status === 'L' ? 'Late' : 'Excused'}`
        ).join('\n');
      }

      cells.push(
        <div key={`day-${day}`} className={`mini-cell ${statusClass}`} title={titleTooltip}>
          {day}
        </div>
      );
    }
    return cells;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header Profile overview */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--brand-blue)' }}>Welcome, {student.name}!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
            🎓 Course: {program?.title || 'General'} • Stage {student.stage}, Trimester {student.trimester} • Section {student.section} • <strong style={{ color: 'var(--brand-orange)' }}>{batch?.title || 'General Intake'}</strong>
          </p>
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: warningClass, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '0.4rem 1rem' }}>
          {warningText}
        </div>
      </div>

      {/* 2. Global rate and personal calendar layout */}
      <div className="migration-grid">
        
        {/* Left: Overall percentages & Subject lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '2rem' }}>
            <div>
              <div className="stat-label" style={{ fontSize: '0.9rem' }}>My Attendance Score</div>
              <div className="stat-value" style={{ fontSize: '2.5rem', marginBlockStart: '0.25rem', color: warningClass }}>{rate}%</div>
            </div>
            <div className="radial-progress" style={{ width: '80px', height: '80px' }}>
              <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle className="radial-bg" cx="40" cy="40" r="34" style={{ fill: 'none', strokeWidth: '6' }}></circle>
                <circle 
                  className="radial-fg" 
                  cx="40" 
                  cy="40" 
                  r="34" 
                  style={{ fill: 'none', strokeWidth: '6', stroke: warningClass }}
                  strokeDasharray="214" 
                  strokeDashoffset={214 - (214 * (rate / 100))}
                ></circle>
              </svg>
              <div className="radial-text" style={{ fontSize: '1.25rem' }}>{rate}%</div>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBlockEnd: '1rem', color: 'var(--brand-blue)' }}>Subject breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.keys(modulesRates).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No attendance logs entered for your enrolled subjects yet.</div>
              ) : (
                Object.entries(modulesRates).map(([modId, info]) => {
                  const subjectRate = Math.round((info.present / info.total) * 100);
                  const subColor = subjectRate >= 80 ? 'var(--accent-present)' : (subjectRate >= 75 ? 'var(--accent-late)' : 'var(--accent-absent)');
                  
                  return (
                    <div key={modId} className="migration-student-item" style={{ justifyContent: 'space-between', padding: '0.75rem 0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{info.title}</h4>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Enrolled Course • Logged: {info.total} Classes</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: subColor }}>{subjectRate}%</div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{info.present}/{info.total} present</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right: Personal Calendar Heatmap */}
        <div className="glass-card">
          <div className="calendar-header" style={{ marginBlockEnd: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--brand-blue)' }}>
              My Attendance Heatmap
            </h3>
            <div className="btn-group">
              <button className="cal-nav-btn" onClick={() => handleMonthOffset(-1)}>←</button>
              <h4 style={{ fontSize: '0.95rem', margin: '0 0.5rem', minWidth: '100px', textAlignment: 'center', fontWeight: 700 }}>
                {monthNames[currentMonth]} {currentYear}
              </h4>
              <button className="cal-nav-btn" onClick={() => handleMonthOffset(1)}>→</button>
            </div>
          </div>

          <div className="mini-calendar" style={{ gap: '6px' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
              <div key={`d-${idx}`} className="day-label" style={{ fontSize: '0.7rem' }}>{d}</div>
            ))}
            {renderCells()}
          </div>

          <div className="legend-row" style={{ marginBlockStart: '1.5rem' }}>
            <div className="legend-item"><div className="legend-color P"></div> Present</div>
            <div className="legend-item"><div className="legend-color A"></div> Absent</div>
            <div className="legend-item"><div className="legend-color L"></div> Late</div>
            <div className="legend-item"><div className="legend-color E"></div> Excused Leave</div>
          </div>
        </div>

      </div>

      {/* 3. Leave application submission & list logs */}
      <div className="migration-grid">
        
        {/* File leave form */}
        <form className="glass-card" onSubmit={handleApplyLeave}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBlockEnd: '1rem', color: 'var(--brand-blue)' }}>File Digital Leave Application</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" className="form-input" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" className="form-input" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label>Leave Category</label>
            <select className="form-select" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
              <option value="Medical">Medical Leave</option>
              <option value="Personal">Personal Leave</option>
              <option value="College Event">College Event Whitelist</option>
            </select>
          </div>

          <div className="form-group">
            <label>Explanation Reason</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
              placeholder="State the reason details here..."
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              required
            ></textarea>
          </div>

          <button type="submit" className="btn primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--brand-orange)', boxShadow: '0 4px 12px var(--brand-orange-glow)' }}>
            ⚡ Submit Application
          </button>
        </form>

        {/* Leave application history list */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBlockEnd: '1rem', color: 'var(--brand-blue)' }}>Leave Application Logs</h3>
          
          <div className="migration-list" style={{ flexGrow: 1, maxHeight: '310px' }}>
            {leaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No leave applications filed yet.</div>
            ) : (
              leaves.map(l => (
                <div key={l.id} className="migration-student-item" style={{ justifyContent: 'space-between', padding: '0.75rem 0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{l.type} Request</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Range: {l.start_date} to {l.end_date} • Reason: "{l.reason}"
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: l.status === 'Approved' ? 'var(--accent-present)' : (l.status === 'Rejected' ? 'var(--accent-absent)' : 'var(--accent-late)'),
                    background: 'rgba(15, 23, 42, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    padding: '0.2rem 0.6rem'
                  }}>
                    {l.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default StudentDashboard;
export { StudentDashboard };
