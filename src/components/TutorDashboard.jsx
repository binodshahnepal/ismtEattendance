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
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TutorDashboard = ({ tutorId }) => {
  // Filters
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [modules, setModules] = useState([]);
  const [allAssignedModules, setAllAssignedModules] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [activeTutor, setActiveTutor] = useState(null);
  
  const [selectedTutor, setSelectedTutor] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('bsc_cse'); // default CSE
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStage, setSelectedStage] = useState('1');
  const [selectedTrimester, setSelectedTrimester] = useState('1');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedModule, setSelectedModule] = useState('');
  const [sections, setSections] = useState(['A', 'B']);

  // Sheet states
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [calendarStatuses, setCalendarStatuses] = useState({});

  // Student history modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStudent, setModalStudent] = useState(null);
  const [modalHistory, setModalHistory] = useState([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load programs initially
  useEffect(() => {
    loadInitialFilters();
  }, [tutorId]);

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
  }, [selectedTutor, selectedProgram, selectedBatch, selectedStage, selectedTrimester, selectedSection, tutorId]);

  // Update register sheet and calendar status dots
  useEffect(() => {
    loadRegisterSheet();
  }, [selectedDate, selectedModule, selectedSection, selectedBatch]);

  const loadInitialFilters = async () => {
    const data = await dbService.getPrograms();
    setPrograms(data);
    const bts = await dbService.getBatches();
    setBatches(bts);
    if (bts.length > 0) {
      setSelectedBatch(bts[0].id);
    }
    const tutorAccounts = await dbService.getTutors();
    setTutors(tutorAccounts);
    const loggedTutor = tutorAccounts.find(tutor => tutor.id === tutorId) || null;
    setActiveTutor(loggedTutor);
    if (loggedTutor) {
      setSelectedTutor(loggedTutor.name);
    } else if (tutorAccounts.length > 0) {
      setSelectedTutor(tutorAccounts[0].name);
    }
  };

  const applyModuleContext = (mod) => {
    if (!mod) return;
    setSelectedProgram(mod.program_id || '');
    setSelectedBatch(mod.batch_id || '');
    setSelectedStage(String(mod.stage || '1'));
    setSelectedTrimester(String(mod.trimester || '1'));
    setSelectedSection(mod.section || 'A');
  };

  const loadModules = async () => {
    if (!selectedTutor && !tutorId) {
      setModules([]);
      setAllAssignedModules([]);
      setSelectedModule('');
      return;
    }

    const data = await dbService.getModules();
    const assignedModules = data
      .filter(mod => mod.tutor === selectedTutor || mod.tutor_id === tutorId)
      .sort((a, b) => `${a.batch_id}-${a.section}-${a.stage}-${a.trimester}-${a.title}`.localeCompare(`${b.batch_id}-${b.section}-${b.stage}-${b.trimester}-${b.title}`));
    setAllAssignedModules(assignedModules);

    const contextMatches = assignedModules.filter(mod => {
      if (selectedProgram && mod.program_id !== selectedProgram) return false;
      if (selectedBatch && mod.batch_id !== selectedBatch) return false;
      if (selectedStage && parseInt(mod.stage) !== parseInt(selectedStage)) return false;
      if (selectedTrimester && parseInt(mod.trimester) !== parseInt(selectedTrimester)) return false;
      if (selectedSection && mod.section !== selectedSection) return false;
      return true;
    });

    const visibleModules = contextMatches.length > 0 ? contextMatches : assignedModules;
    setModules(visibleModules);

    if (visibleModules.length > 0) {
      const currentModule = visibleModules.find(mod => mod.id === selectedModule);
      const nextModule = currentModule || visibleModules[0];
      if (nextModule.id !== selectedModule) {
        setSelectedModule(nextModule.id);
      }
      applyModuleContext(nextModule);
    } else {
      setSelectedModule('');
    }
  };

  const handleModuleChange = (moduleId) => {
    const mod = allAssignedModules.find(item => item.id === moduleId) || modules.find(item => item.id === moduleId);
    setSelectedModule(moduleId);
    applyModuleContext(mod);
  };

  const loadRegisterSheet = async () => {
    if (!selectedModule) {
      setEnrolledStudents([]);
      setAttendanceRecords({});
      setCalendarStatuses({});
      return;
    }

    const mod = allAssignedModules.find(item => item.id === selectedModule) || modules.find(item => item.id === selectedModule);
    const moduleSection = mod?.section || selectedSection;

    // 1. Fetch enrolled students filtered by the selected module's section
    const students = await dbService.getEnrolledStudents(selectedModule, moduleSection);
    setEnrolledStudents(students);

    // 2. Fetch attendance records for this date/module
    const records = await dbService.getAttendance(selectedDate, selectedModule);
    setAttendanceRecords(records);

    // 3. Fetch calendar indicators for this section cohort
    const statuses = await dbService.getCalendarDateStatuses(
      mod?.program_id || selectedProgram,
      mod?.stage || selectedStage,
      mod?.trimester || selectedTrimester,
      moduleSection
    );
    setCalendarStatuses(statuses);
  };

  const handleSaveRecord = async (studentId, status, notes = '') => {
    if (isFutureDate) {
      Swal.fire({
        icon: 'error',
        title: 'Future date not allowed',
        text: 'Attendance cannot be marked for a future date.'
      });
      return;
    }
    if (!isSelectedDateAllowed) {
      Swal.fire({
        icon: 'error',
        title: 'Date not allowed',
        text: "Attendance can only be marked between this class assignment's start and end date, up to today."
      });
      return;
    }
    await dbService.saveAttendance(selectedDate, selectedModule, studentId, status, notes);
    
    // Reload register sheet and calendar dots
    loadRegisterSheet();
  };

  const handleBulkMark = async (status) => {
    if (isFutureDate) {
      Swal.fire({
        icon: 'error',
        title: 'Future date not allowed',
        text: 'Attendance cannot be marked for a future date.'
      });
      return;
    }
    if (!isSelectedDateAllowed) {
      Swal.fire({
        icon: 'error',
        title: 'Date not allowed',
        text: "Attendance can only be marked between this class assignment's start and end date, up to today."
      });
      return;
    }
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

  const handleChangePassword = async () => {
    if (!activeTutor) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Password fields required',
        text: 'Please fill all password fields.'
      });
      return;
    }
    if (newPassword.length < 8) {
      Swal.fire({
        icon: 'error',
        title: 'Password too short',
        text: 'New password must be at least 8 characters.'
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Password mismatch',
        text: 'New password and confirmation do not match.'
      });
      return;
    }

    const updated = await dbService.updateTutorPassword(activeTutor.id, currentPassword, newPassword);
    if (!updated) {
      Swal.fire({
        icon: 'error',
        title: 'Password not changed',
        text: 'Current password is incorrect.'
      });
      return;
    }

    Swal.fire({
      icon: 'success',
      title: 'Password updated',
      text: 'Your password has been changed successfully.'
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setActiveTutor({ ...activeTutor, must_change_password: false });
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
  const activeModule = allAssignedModules.find(m => m.id === selectedModule) || modules.find(m => m.id === selectedModule);
  const todayStr = getLocalDateString();
  const isFutureDate = selectedDate > todayStr;
  const isSelectedDateAllowed = activeModule
    ? (!activeModule.class_start_date || selectedDate >= activeModule.class_start_date) &&
      (!activeModule.class_end_date || selectedDate <= activeModule.class_end_date) &&
      !isFutureDate
    : false;
  
  // stroke offset for stats ring (radius=23, perimeter = 144)
  const offset = 144 - (144 * (rate / 100));

  return (
    <div className="dashboard-grid">
      
      {/* Left Column: Filter Sidebar + Stats Dial + Calendar picker */}
      <aside className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBlockEnd: '0.75rem', fontWeight: 600 }}>Tutor Selection</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tutor</label>
            <select
              className="form-select"
              value={selectedTutor}
              onChange={(e) => setSelectedTutor(e.target.value)}
              style={{ width: '100%' }}
              disabled={Boolean(activeTutor)}
            >
              <option value="">All Tutors</option>
              {tutors.map(tutor => (
                <option key={tutor.id} value={tutor.name}>{tutor.name}</option>
              ))}
            </select>
            
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

            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Intake Batch</label>
            <select
              className="form-select"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">All Batches</option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.id}>{batch.title}</option>
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
                  onChange={(e) => handleModuleChange(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {modules.map(m => {
                    const batch = batches.find(item => item.id === m.batch_id);
                    return (
                      <option key={m.id} value={m.id}>
                        {m.title} | {batch?.title || m.batch_id} | Sec {m.section}
                      </option>
                    );
                  })}
                </select>
              </>
            )}

            {allAssignedModules.length === 0 && (
              <div style={{ border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', background: '#f8fafc' }}>
                No modules have been assigned to this tutor yet. Please ask an administrator to assign a tutor to a module with class start and end dates.
              </div>
            )}

            {activeModule && (
              <div style={{ border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: isSelectedDateAllowed ? 'var(--text-muted)' : 'var(--accent-absent)', background: '#f8fafc' }}>
                Attendance window: {activeModule.class_start_date || 'No start'} to {activeModule.class_end_date || 'No end'}
              </div>
            )}

          </div>
        </div>

        {activeTutor && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBlockEnd: '0.75rem', fontWeight: 600 }}>Password</h3>
            {activeTutor.must_change_password && (
              <div style={{ border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--accent-late)', background: 'rgba(245, 158, 11, 0.08)', marginBlockEnd: '0.75rem' }}>
                Please change the default password.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input className="form-input" type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              <input className="form-input" type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <input className="form-input" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <button type="button" className="btn primary" style={{ justifyContent: 'center' }} onClick={handleChangePassword}>
                Change Password
              </button>
            </div>
          </div>
        )}

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
          maxDate={todayStr}
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
          disabled={!isSelectedDateAllowed}
          disabledMessage={isFutureDate
            ? 'Attendance cannot be marked for a future date.'
            : "Attendance can only be marked during this tutor assignment's class date window."}
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
