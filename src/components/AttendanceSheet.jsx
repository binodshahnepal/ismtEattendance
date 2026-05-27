/**
 * AttendanceSheet.jsx - Class Register Mark Sheet Component
 * 
 * Renders interactive student rows, segmented P/A/L/E buttons, search inputs,
 * remarks textboxes, and background autosave indicators.
 */

import React, { useState, useEffect } from 'react';

const AttendanceSheet = ({ date, moduleId, students, attendance, onSaveRecord, onBulkMark, onStudentClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState('synced'); // 'synced' | 'saving'

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStatusChange = (studentId, status, notes = '') => {
    setSaveStatus('saving');
    onSaveRecord(studentId, status, notes);
    setTimeout(() => {
      setSaveStatus('synced');
    }, 400);
  };

  const handleBulkClick = (status) => {
    setSaveStatus('saving');
    onBulkMark(status);
    setTimeout(() => {
      setSaveStatus('synced');
    }, 500);
  };

  if (!moduleId) {
    return (
      <div className="glass-card" style={{ height: '100%', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          Please select a program, stage, trimester, section, and module to load the daily register sheet.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      
      {/* 1. Header Area with save indicators */}
      <div className="sheet-header">
        <div className="sheet-title-area">
          <h2 id="active-sheet-title" style={{ fontSize: '1.4rem', fontWeight: 600 }}>Daily Register</h2>
          <span id="active-sheet-subtitle" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Date: {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
        
        <div className="autosave-indicator">
          <div 
            className="autosave-dot" 
            style={{ background: saveStatus === 'saving' ? 'var(--accent-late)' : 'var(--accent-present)' }}
          ></div>
          <span style={{ color: saveStatus === 'saving' ? 'var(--accent-late)' : 'var(--accent-present)' }}>
            {saveStatus === 'saving' ? 'Autosaving...' : 'All Changes Synced'}
          </span>
        </div>
      </div>

      {/* 2. Search Box and Bulk Action buttons */}
      <div className="controls-row">
        <input
          type="text"
          className="form-input search"
          placeholder="Search students by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="btn-group">
          <button className="btn success" onClick={() => handleBulkClick('P')}>All Present</button>
          <button className="btn" style={{ color: 'var(--accent-absent)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => handleBulkClick('A')}>All Absent</button>
        </div>
      </div>

      {/* 3. Student list */}
      <div className="student-list-container" style={{ maxHeight: '460px' }}>
        {filteredStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            {searchQuery ? 'No students match your search filter.' : 'No active students enrolled in this section.'}
          </div>
        ) : (
          filteredStudents.map(student => {
            const record = attendance[student.id] || {};
            const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            return (
              <div key={student.id} className="student-row">
                
                {/* Profile Details */}
                <div className="student-profile" onClick={() => onStudentClick(student.id)}>
                  <div className="avatar">{initials}</div>
                  <div className="student-info">
                    <h4>{student.name}</h4>
                    <span>{student.email}</span>
                  </div>
                </div>

                {/* Inline Comment remark and status segmented control */}
                <div className="row-actions">
                  <input
                    type="text"
                    className="notes-input"
                    placeholder="Add comment..."
                    value={record.notes || ''}
                    onChange={(e) => handleStatusChange(student.id, record.status || 'P', e.target.value)}
                  />

                  <div className="marking-pills">
                    {['P', 'A', 'L', 'E'].map(status => (
                      <button
                        key={status}
                        className={`pill-btn ${record.status === status ? 'active' : ''}`}
                        data-status={status}
                        onClick={() => handleStatusChange(student.id, status, record.notes || '')}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default AttendanceSheet;
export { AttendanceSheet };
