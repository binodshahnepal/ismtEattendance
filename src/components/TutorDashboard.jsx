/**
 * TutorDashboard.jsx - Tutor Attendance Marking Dashboard
 * 
 * Provides tutors with section selection filters, calendar compliance calendars,
 * interactive student registers, bulk selectors, and student diagnostic modal popups.
 */

import React, { useState, useEffect } from 'react';
import Calendar from './Calendar';
import AttendanceSheet from './AttendanceSheet';
import StudentModal from './StudentModal';
import { dbService } from '../services/dbService';

const TutorDashboard = () => {
  // Filters
  const [programs, setPrograms] = useState([]);
  const [modules, setModules] = useState([]);
  
  const [selectedProgram, setSelectedProgram] = useState('bsc_cse'); // default CSE
  const [selectedStage, setSelectedStage] = useState('1');
  const [selectedTrimester, setSelectedTrimester] = useState('1');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedModule, setSelectedModule] = useState('');
  const [sections, setSections] = useState(['A', 'B']);

  // Sheet states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [calendarStatuses, setCalendarStatuses] = useState({});

  // Student history modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStudent, setModalStudent] = useState(null);
  const [modalHistory, setModalHistory] = useState([]);

  // Load programs initially
  useEffect(() => {
    loadPrograms();
  }, []);

  // Load unique sections defined in all batches
  useEffect(() => {
    const loadSectionsList = async () => {
      const bts = await dbService.getBatches();
      const allSecs = new Set();
      bts.forEach(b => {
        if (b.sections) {
          b.sections.split(',').forEach(s => allSecs.add(s.trim()));
        }
      });
      if (allSecs.size > 0) {
        const sortedSecs = Array.from(allSecs).sort();
        setSections(sortedSecs);
        if (!sortedSecs.includes(selectedSection)) {
          setSelectedSection(sortedSecs[0]);
        }
      } else {
        setSections(['A', 'B']);
      }
    };
    loadSectionsList();
  }, []);

  // Update modules list when filters change
  useEffect(() => {
    loadModules();
  }, [selectedProgram, selectedStage, selectedTrimester, selectedSection]);

  // Update register sheet and calendar status dots
  useEffect(() => {
    loadRegisterSheet();
  }, [selectedDate, selectedModule, selectedSection]);

  const loadPrograms = async () => {
    const data = await dbService.getPrograms();
    setPrograms(data);
  };

  const loadModules = async () => {
    if (!selectedProgram) {
      setModules([]);
      setSelectedModule('');
      return;
    }
    const data = await dbService.getModules(selectedProgram, selectedStage, selectedTrimester, selectedSection);
    setModules(data);
    
    // auto select first module
    if (data.length > 0) {
      setSelectedModule(data[0].id);
    } else {
      setSelectedModule('');
    }
  };

  const loadRegisterSheet = async () => {
    if (!selectedModule) {
      setEnrolledStudents([]);
      setAttendanceRecords({});
      setCalendarStatuses({});
      return;
    }

    // 1. Fetch enrolled students filtered by section
    const students = await dbService.getEnrolledStudents(selectedModule, selectedSection);
    setEnrolledStudents(students);

    // 2. Fetch attendance records for this date/module
    const records = await dbService.getAttendance(selectedDate, selectedModule);
    setAttendanceRecords(records);

    // 3. Fetch calendar indicators for this section cohort
    const statuses = await dbService.getCalendarDateStatuses(
      selectedProgram, selectedStage, selectedTrimester, selectedSection
    );
    setCalendarStatuses(statuses);
  };

  const handleSaveRecord = async (studentId, status, notes = '') => {
    await dbService.saveAttendance(selectedDate, selectedModule, studentId, status, notes);
    
    // Reload register sheet and calendar dots
    loadRegisterSheet();
  };

  const handleBulkMark = async (status) => {
    const bulkMap = { ...attendanceRecords };
    enrolledStudents.forEach(s => {
      bulkMap[s.id] = {
        status: status,
        notes: attendanceRecords[s.id] ? attendanceRecords[s.id].notes : ''
      };
    });

    await dbService.saveAttendanceBulk(selectedDate, selectedModule, bulkMap);
    loadRegisterSheet();
  };

  const handleStudentClick = async (studentId) => {
    const student = enrolledStudents.find(s => s.id === studentId);
    if (!student) return;

    setModalStudent(student);
    const hist = await dbService.getStudentAttendanceHistory(studentId);
    setModalHistory(hist);
    setIsModalOpen(true);
  };

  // Calculate statistics
  const enrolledCount = enrolledStudents.length;
  let presents = 0;
  let absents = 0;
  let lates = 0;
  let excused = 0;

  enrolledStudents.forEach(s => {
    const r = attendanceRecords[s.id];
    if (r) {
      if (r.status === 'P') presents++;
      else if (r.status === 'A') absents++;
      else if (r.status === 'L') lates++;
      else if (r.status === 'E') excused++;
    }
  });

  const totalMarked = presents + absents + lates + excused;
  const rate = totalMarked > 0 ? Math.round(((presents + lates + excused) / totalMarked) * 100) : 0;
  
  // stroke offset for stats ring (radius=23, perimeter = 144)
  const offset = 144 - (144 * (rate / 100));

  return (
    <div className="dashboard-grid">
      
      {/* Left Column: Filter Sidebar + Stats Dial + Calendar picker */}
      <aside className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBlockEnd: '0.75rem', fontWeight: 600 }}>Tutor Selection</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Academic Program</label>
            <select 
              className="form-select" 
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">-- Choose Program --</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stage</label>
                <select className="form-select" value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
                  <option value="1">Stage 1</option>
                  <option value="2">Stage 2</option>
                  <option value="3">Stage 3</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Trimester</label>
                <select className="form-select" value={selectedTrimester} onChange={(e) => setSelectedTrimester(e.target.value)}>
                  <option value="1">Tri 1</option>
                  <option value="2">Tri 2</option>
                  <option value="3">Tri 3</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Section</label>
                <select className="form-select" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                  {sections.map(sec => (
                    <option key={sec} value={sec}>Sec {sec}</option>
                  ))}
                </select>
              </div>
            </div>

            {modules.length > 0 && (
              <>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBlockStart: '0.25rem' }}>Active Subject / Module</label>
                <select 
                  className="form-select" 
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </>
            )}

          </div>
        </div>

        {/* Live stats circle dial widget */}
        <div className="stats-container">
          <div className="stat-item rate">
            <div>
              <div className="stat-label">Daily Register Rate</div>
              <div className="stat-value">{rate}%</div>
            </div>
            <div className="radial-progress">
              <svg>
                <circle className="radial-bg" cx="27" cy="27" r="23"></circle>
                <circle 
                  className="radial-fg" 
                  cx="27" 
                  cy="27" 
                  r="23" 
                  strokeDasharray="144" 
                  strokeDashoffset={offset}
                ></circle>
              </svg>
              <div className="radial-text">{rate}%</div>
            </div>
          </div>
          
          <div className="stat-item present">
            <div className="stat-label">Attended</div>
            <div className="stat-value">{presents + lates}</div>
          </div>
          <div className="stat-item absent">
            <div className="stat-label">Absent</div>
            <div className="stat-value">{absents}</div>
          </div>
        </div>

        {/* Calendar Grid Picker */}
        <Calendar 
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          dateStatuses={calendarStatuses}
        />

      </aside>

      {/* Right Column: Attendance Register Sheet */}
      <section>
        <AttendanceSheet 
          date={selectedDate}
          moduleId={selectedModule}
          students={enrolledStudents}
          attendance={attendanceRecords}
          onSaveRecord={handleSaveRecord}
          onBulkMark={handleBulkMark}
          onStudentClick={handleStudentClick}
        />
      </section>

      {/* Student history detail modal */}
      <StudentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={modalStudent}
        history={modalHistory}
      />

    </div>
  );
};

export default TutorDashboard;
export { TutorDashboard };
