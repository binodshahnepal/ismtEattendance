/**
 * StudentModal.jsx - Diagnostic Student Heatmap Profile Modal (Batch-Aware)
 * 
 * Exposes a detailed monthly calendar colored with the student's presence logs and intake.
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';

const StudentModal = ({ isOpen, onClose, student, history }) => {
  const [batchTitle, setBatchTitle] = useState('General Intake');

  useEffect(() => {
    if (student) {
      dbService.getBatches().then(bts => {
        const b = bts.find(batch => batch.id === student.batch_id);
        if (b) setBatchTitle(b.title);
      });
    }
  }, [student]);

  if (!isOpen || !student) return null;

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
  
  // Progress Ring Calculations (perimeter = 2 * PI * 20 = 125.6)
  const offset = 125 - (125 * (rate / 100));

  // Calendar rendering calculations (active month)
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const firstDayRaw = new Date(currentYear, currentMonth, 1).getDay();
  const firstDay = firstDayRaw === 0 ? 6 : firstDayRaw - 1;
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="mini-cell empty"></div>);
    }

    for (let day = 1; day <= totalDays; day++) {
      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${mm}-${dd}`;

      const record = history.find(h => h.date === dateStr);
      const cellClass = record ? `marked-${record.status}` : '';

      cells.push(
        <div 
          key={`day-${day}`} 
          className={`mini-cell ${cellClass}`}
          title={record ? `Subject: ${record.moduleTitle}\nStatus: ${record.status === 'P' ? 'Present' : record.status === 'A' ? 'Absent' : record.status === 'L' ? 'Late' : 'Excused'}${record.notes ? '\nNote: ' + record.notes : ''}` : ''}
        >
          {day}
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-content">
        
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBlockEnd: '0.15rem', color: 'var(--brand-blue)' }}>{student.name}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Section {student.section} • Stage {student.stage}, Trimester {student.trimester} • <strong style={{ color: 'var(--brand-orange)' }}>{batchTitle}</strong>
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="stats-container" style={{ marginBlockEnd: '1.5rem' }}>
          <div className="stat-item rate">
            <div>
              <div className="stat-label">Attendance Rate</div>
              <div className="stat-value">{rate}%</div>
            </div>
            <div className="radial-progress" style={{ width: '48px', height: '48px' }}>
              <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle className="radial-bg" cx="24" cy="24" r="20" style={{ fill: 'none', strokeWidth: '4' }}></circle>
                <circle 
                  className="radial-fg" 
                  cx="24" 
                  cy="24" 
                  r="20" 
                  style={{ fill: 'none', strokeWidth: '4', stroke: 'var(--brand-orange)' }}
                  strokeDasharray="125" 
                  strokeDashoffset={offset}
                ></circle>
              </svg>
              <div className="radial-text" style={{ fontSize: '0.75rem' }}>{rate}%</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Classes Attended</div>
            <div className="stat-value" style={{ color: 'var(--accent-present)' }}>{presents + lates}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Classes Absent</div>
            <div className="stat-value" style={{ color: 'var(--accent-absent)' }}>{absents}</div>
          </div>
        </div>

        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBlockEnd: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          Monthly Register Heatmap
        </h3>

        <div className="mini-calendar">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
            <div key={`d-${idx}`} className="day-label" style={{ fontSize: '0.65rem' }}>{d}</div>
          ))}
          {renderCells()}
        </div>

        <div className="legend-row">
          <div className="legend-item"><div className="legend-color P"></div> Present</div>
          <div className="legend-item"><div className="legend-color A"></div> Absent</div>
          <div className="legend-item"><div className="legend-color L"></div> Late</div>
          <div className="legend-item"><div className="legend-color E"></div> Excused</div>
        </div>

      </div>
    </div>
  );
};

export default StudentModal;
export { StudentModal };
