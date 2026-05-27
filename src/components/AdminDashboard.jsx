/**
 * AdminDashboard.jsx - Administrative Control Center (Batch-Aware)
 * 
 * Supports bulk trimester cohort migrations, manual student registrations,
 * leave audits and approvals, new program/module/intake creation modals, and directories.
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const AdminDashboard = () => {
  // Lists
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [modules, setModules] = useState([]);
  const [students, setStudents] = useState([]);
  const [leaves, setLeaves] = useState([]);

  // Bulk Migration states
  const [migProgram, setMigProgram] = useState('bsc_cse');
  const [migStage, setMigStage] = useState('1');
  const [migFromTri, setMigFromTri] = useState('1');
  const [migToTri, setMigToTri] = useState('2');
  const [migToSection, setMigToSection] = useState('A');
  const [migStudents, setMigStudents] = useState([]);
  const [selectedMigStudents, setSelectedMigStudents] = useState([]);

  // Manual Enrollment overrides
  const [manualStudent, setManualStudent] = useState('');
  const [manualEnrollments, setManualEnrollments] = useState([]);
  const [manualAvailableModules, setManualAvailableModules] = useState([]);
  const [manualSelectedModule, setManualSelectedModule] = useState('');

  // Add Student states
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentProgram, setNewStudentProgram] = useState('bsc_cse');
  const [newStudentBatch, setNewStudentBatch] = useState('jan_2026');
  const [newStudentStage, setNewStudentStage] = useState('1');
  const [newStudentTri, setNewStudentTri] = useState('1');
  const [newStudentSection, setNewStudentSection] = useState('A');

  // Dialog open triggers
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [newBatchYear, setNewBatchYear] = useState('2026');
  const [newBatchMonth, setNewBatchMonth] = useState('January');
  const [newBatchSections, setNewBatchSections] = useState({ A: true, B: true, C: false, D: false });

  const [isProgOpen, setIsProgOpen] = useState(false);
  const [newProgId, setNewProgId] = useState('');
  const [newProgTitle, setNewProgTitle] = useState('');

  const [isModOpen, setIsModOpen] = useState(false);
  const [newModId, setNewModId] = useState('');
  const [newModTitle, setNewModTitle] = useState('');
  const [newModProg, setNewModProg] = useState('bsc_cse');
  const [newModStage, setNewModStage] = useState('1');
  const [newModTri, setNewModTri] = useState('1');
  const [newModTutor, setNewModTutor] = useState('');
  const [newModBatch, setNewModBatch] = useState('jan_2026');
  const [newModSection, setNewModSection] = useState('A');
  const [newModRegistrationMode, setNewModRegistrationMode] = useState('all');
  const [newModSelectedStudents, setNewModSelectedStudents] = useState([]);

  // Global Admin filters for directory table
  const [adminProgFilter, setAdminProgFilter] = useState('');
  const [adminStageFilter, setAdminStageFilter] = useState('');
  const [adminBatchFilter, setAdminBatchFilter] = useState('');

  // Edit Student states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editName, setEditName] = useState('');
  const [editProgram, setEditProgram] = useState('');
  const [editBatch, setEditBatch] = useState('');
  const [editStage, setEditStage] = useState('1');
  const [editTri, setEditTri] = useState('1');
  const [editSection, setEditSection] = useState('A');
  const [editStatus, setEditStatus] = useState('Active');

  // Master Hub states
  const [activeTab, setActiveTab] = useState('overview');
  const [studentSearch, setStudentSearch] = useState('');
  const [migrationLogs, setMigrationLogs] = useState([]);
  const [moduleEnrollmentCounts, setModuleEnrollmentCounts] = useState({});
  const [managedModuleId, setManagedModuleId] = useState('');
  const [managedModuleStudents, setManagedModuleStudents] = useState([]);
  const [managedAddStudentId, setManagedAddStudentId] = useState('');

  useEffect(() => {
    loadAllAdminData();
  }, []);

  // Update migration checklist when filters change
  useEffect(() => {
    loadMigrationCohort();
  }, [migProgram, migStage, migFromTri]);

  // Update manual student registrations when selection changes
  useEffect(() => {
    loadManualStudentEnrollments();
  }, [manualStudent]);

  useEffect(() => {
    if (!managedModuleId && modules.length > 0) {
      setManagedModuleId(modules[0].id);
    }
  }, [modules, managedModuleId]);

  useEffect(() => {
    loadManagedModuleRoster();
  }, [managedModuleId, modules]);

  // Update student registration section when selected batch changes
  useEffect(() => {
    const selectedBatchObj = batches.find(b => b.id === newStudentBatch);
    const allowed = selectedBatchObj?.sections ? selectedBatchObj.sections.split(',') : ['A', 'B'];
    if (allowed.length > 0 && !allowed.includes(newStudentSection)) {
      setNewStudentSection(allowed[0]);
    }
  }, [newStudentBatch, batches, newStudentSection]);

  // Update module creation section when selected batch changes
  useEffect(() => {
    const selectedBatchObj = batches.find(b => b.id === newModBatch);
    const allowed = selectedBatchObj?.sections ? selectedBatchObj.sections.split(',') : ['A', 'B'];
    if (allowed.length > 0 && !allowed.includes(newModSection)) {
      setNewModSection(allowed[0]);
    }
  }, [newModBatch, batches, newModSection]);

  // Update student edit section when selected batch changes
  useEffect(() => {
    const selectedBatchObj = batches.find(b => b.id === editBatch);
    const allowed = selectedBatchObj?.sections ? selectedBatchObj.sections.split(',').map(s => s.trim()) : ['A', 'B'];
    if (editingStudent && allowed.length > 0 && !allowed.includes(editSection)) {
      setEditSection(allowed[0]);
    }
  }, [editBatch, batches, editSection, editingStudent]);

  useEffect(() => {
    const eligibleIds = students
      .filter(s => s.status === 'Active')
      .filter(s => s.program_id === newModProg)
      .filter(s => s.stage === parseInt(newModStage))
      .filter(s => s.trimester === parseInt(newModTri))
      .filter(s => s.batch_id === newModBatch)
      .filter(s => s.section === newModSection)
      .map(s => s.id);

    setNewModSelectedStudents(prev => prev.filter(id => eligibleIds.includes(id)));
  }, [students, newModProg, newModStage, newModTri, newModBatch, newModSection]);

  const loadAllAdminData = async () => {
    const bts = await dbService.getBatches();
    setBatches(bts);

    const progs = await dbService.getPrograms();
    setPrograms(progs);

    const mods = await dbService.getModules();
    setModules(mods);

    const counts = {};
    await Promise.all(mods.map(async (mod) => {
      const enrolled = await dbService.getEnrolledStudents(mod.id, mod.section);
      counts[mod.id] = enrolled.length;
    }));
    setModuleEnrollmentCounts(counts);

    const studs = await dbService.getStudents(null, null, null, null, null, true);
    setStudents(studs);

    const lvs = await dbService.getLeaves();
    setLeaves(lvs);

    const logs = await dbService.getMigrationLogs();
    setMigrationLogs(logs);

    // Default select values
    if (bts.length > 0) {
      setNewStudentBatch(bts[0].id);
      setNewModBatch(bts[0].id);
    }
    if (progs.length > 0) {
      setNewStudentProgram(progs[0].id);
      setNewModProg(progs[0].id);
    }
  };

  // --- Bulk Cohort Migration Calculations ---
  const loadMigrationCohort = async () => {
    if (!migProgram) {
      setMigStudents([]);
      setSelectedMigStudents([]);
      return;
    }
    const cohort = await dbService.getStudents(migProgram, migStage, migFromTri);
    setMigStudents(cohort);
    setSelectedMigStudents([]); // Reset selection
  };

  const handleSelectStudentToggle = (studentId) => {
    if (selectedMigStudents.includes(studentId)) {
      setSelectedMigStudents(selectedMigStudents.filter(id => id !== studentId));
    } else {
      setSelectedMigStudents([...selectedMigStudents, studentId]);
    }
  };

  const handleSelectAllMigration = (e) => {
    if (e.target.checked) {
      setSelectedMigStudents(migStudents.map(s => s.id));
    } else {
      setSelectedMigStudents([]);
    }
  };

  const handleExecuteMigration = async () => {
    if (selectedMigStudents.length === 0) {
      alert("Please select at least one student to migrate.");
      return;
    }

    let targetStage = parseInt(migStage);
    let targetTri = parseInt(migToTri);

    if (migFromTri === '3' && migToTri === '1') {
      targetStage += 1;
      if (targetStage > 3) {
        alert("Students have completed Stage 3 and will be marked as Graduated.");
        for (const id of selectedMigStudents) {
          const s = students.find(stud => stud.id === id);
          if (s) {
            s.status = 'Graduated';
          }
        }
        await dbService.save(); // if mock
        alert("Students graduated successfully.");
        loadAllAdminData();
        return;
      }
    }

    await dbService.migrateCohort(
      migProgram,
      targetStage,
      parseInt(migFromTri),
      targetTri,
      selectedMigStudents,
      migToSection
    );

    alert(`Successfully migrated ${selectedMigStudents.length} student(s) to Stage ${targetStage}, Trimester ${targetTri}, Section ${migToSection}!`);
    loadAllAdminData();
  };

  // --- Manual Enrollments Overrides ---
  const loadManualStudentEnrollments = async () => {
    if (!manualStudent) {
      setManualEnrollments([]);
      setManualAvailableModules([]);
      return;
    }

    const enrolls = await dbService.getStudentEnrollments(manualStudent);
    setManualEnrollments(enrolls);

    const activeModIds = enrolls.map(m => m.id);
    const available = modules.filter(m => !activeModIds.includes(m.id));
    setManualAvailableModules(available);
    if (available.length > 0) {
      setManualSelectedModule(available[0].id);
    } else {
      setManualSelectedModule('');
    }
  };

  const loadManagedModuleRoster = async () => {
    if (!managedModuleId) {
      setManagedModuleStudents([]);
      setManagedAddStudentId('');
      setNewModSelectedStudents([]);
      return;
    }

    const selectedModule = modules.find(m => m.id === managedModuleId);
    const roster = await dbService.getEnrolledStudents(managedModuleId, selectedModule?.section || null);
    const sortedRoster = roster.sort((a, b) => a.name.localeCompare(b.name));
    setManagedModuleStudents(sortedRoster);
    setNewModSelectedStudents([]);
  };

  const handleAddManualEnrollment = async () => {
    if (!manualStudent || !manualSelectedModule) return;
    await dbService.manualEnroll(manualStudent, manualSelectedModule);
    alert("Student manually enrolled in module successfully!");
    loadManualStudentEnrollments();
  };

  const handleRemoveManualEnrollment = async (modId) => {
    if (confirm("Are you sure you want to unenroll this student from this module?")) {
      await dbService.manualUnenroll(manualStudent, modId);
      loadManualStudentEnrollments();
    }
  };

  const handleRegisterAllForManagedModule = async () => {
    if (!managedModuleId) return;
    const ids = managedModuleCandidateStudents.map(s => s.id);
    if (ids.length === 0) {
      alert("No matching active students are available for this module section.");
      return;
    }

    await dbService.bulkEnroll(ids, managedModuleId);
    alert(`Registered ${ids.length} student(s) for this module.`);
    await loadAllAdminData();
    await loadManagedModuleRoster();
  };

  const handleRegisterCustomForManagedModule = async () => {
    if (!managedModuleId) return;
    if (newModSelectedStudents.length === 0) {
      alert("Please select at least one student to register for this module.");
      return;
    }

    await dbService.bulkEnroll(newModSelectedStudents, managedModuleId);
    alert(`Registered ${newModSelectedStudents.length} selected student(s) for this module.`);
    setNewModSelectedStudents([]);
    setNewModRegistrationMode('all');
    await loadAllAdminData();
    await loadManagedModuleRoster();
  };

  const handleAddManagedStudent = async () => {
    if (!managedModuleId || !managedAddStudentId) return;
    await dbService.manualEnroll(managedAddStudentId, managedModuleId);
    setManagedAddStudentId('');
    await loadAllAdminData();
    await loadManagedModuleRoster();
  };

  const handleRemoveManagedStudent = async (studentId) => {
    if (!managedModuleId || !studentId) return;
    if (!confirm("Remove this student from the selected module?")) return;

    await dbService.manualUnenroll(studentId, managedModuleId);
    await loadAllAdminData();
    await loadManagedModuleRoster();
  };

  // --- Leave Application Auditing ---
  const handleAuditLeave = async (leaveId, status) => {
    await dbService.auditLeave(leaveId, status);
    alert(`Leave application marked as ${status}.`);
    const lvs = await dbService.getLeaves();
    setLeaves(lvs);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: "Please fill in the student's name.",
        confirmButtonColor: 'var(--brand-blue)'
      });
      return;
    }

    try {
      const s = await dbService.addStudent(
        newStudentName,
        newStudentProgram,
        newStudentStage,
        newStudentTri,
        newStudentSection,
        newStudentBatch
      );
      Swal.fire({
        icon: 'success',
        title: 'Student Registered',
        text: `Successfully registered new student: "${s.name}"`,
        confirmButtonColor: 'var(--brand-orange)',
        timer: 2000
      });
      setNewStudentName('');
      loadAllAdminData();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to register student.',
        confirmButtonColor: 'var(--brand-blue)'
      });
    }
  };

  const handleOpenEditModal = (student) => {
    if (!student) return;
    setEditingStudent(student);
    setEditName(student.name || '');
    setEditProgram(student.program_id || '');
    setEditBatch(student.batch_id || '');
    setEditStage(student.stage !== undefined && student.stage !== null ? String(student.stage) : '1');
    setEditTri(student.trimester !== undefined && student.trimester !== null ? String(student.trimester) : '1');
    setEditSection(student.section || 'A');
    setEditStatus(student.status || 'Active');
    setIsEditOpen(true);
  };

  const handleSaveStudentEdit = async () => {
    if (!editName) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Name cannot be empty.',
        confirmButtonColor: 'var(--brand-blue)'
      });
      return;
    }

    const payload = {
      name: editName,
      program_id: editProgram,
      batch_id: editBatch,
      stage: parseInt(editStage),
      trimester: parseInt(editTri),
      section: editSection,
      status: editStatus
    };

    try {
      await dbService.updateStudent(editingStudent.id, payload);
      
      Swal.fire({
        icon: 'success',
        title: 'Profile Updated',
        text: `Student "${editName}"'s profile has been updated successfully!`,
        confirmButtonColor: 'var(--brand-orange)',
        timer: 2000
      });
      
      setIsEditOpen(false);
      setEditingStudent(null);
      loadAllAdminData();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update student profile.',
        confirmButtonColor: 'var(--brand-blue)'
      });
    }
  };

  const handleDeleteStudent = async (id, name) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to permanently delete student "${name}". This will erase all their course registrations, leave applications, and historic attendance sheets. This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent-absent)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Yes, delete student!',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await dbService.deleteStudent(id);
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: `Student "${name}" has been successfully deleted.`,
            confirmButtonColor: 'var(--brand-orange)',
            timer: 2000
          });
          loadAllAdminData();
        } catch (err) {
          console.error(err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to delete student.',
            confirmButtonColor: 'var(--brand-blue)'
          });
        }
      }
    });
  };

  const handleAddBatch = async () => {
    const monthMap = {
      'January': 'jan', 'February': 'feb', 'March': 'mar', 'April': 'apr',
      'May': 'may', 'June': 'jun', 'July': 'jul', 'August': 'aug',
      'September': 'sep', 'October': 'oct', 'November': 'nov', 'December': 'dec'
    };
    const code = monthMap[newBatchMonth];
    const generatedId = `${code}_${newBatchYear}`;
    const generatedTitle = `${newBatchMonth} ${newBatchYear} Intake`;

    const exists = batches.some(b => b.id === generatedId);
    if (exists) {
      alert(`An intake batch with ID "${generatedId}" already exists!`);
      return;
    }

    const activeSecs = Object.entries(newBatchSections)
      .filter(([_, active]) => active)
      .map(([sec]) => sec)
      .sort()
      .join(',');

    if (!activeSecs) {
      alert("Please select at least one active section for the batch.");
      return;
    }

    await dbService.addBatch(generatedId, generatedTitle, activeSecs);
    alert(`Intake Batch "${generatedTitle}" created successfully!`);
    setIsBatchOpen(false);
    setNewBatchSections({ A: true, B: true, C: false, D: false });
    loadAllAdminData();
  };

  const handleAddSectionToBatch = async (batchId) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    const sectionName = prompt("Enter new section name (e.g. C, Morning, Evening, Section E):");
    if (sectionName === null) return; // User cancelled
    
    const cleanedName = sectionName.trim();
    if (!cleanedName) {
      alert("Section name cannot be empty.");
      return;
    }

    if (cleanedName.includes(',')) {
      alert("Section name cannot contain commas.");
      return;
    }

    const currentSecs = batch.sections ? batch.sections.split(',').map(s => s.trim()) : [];
    if (currentSecs.includes(cleanedName)) {
      alert(`Section "${cleanedName}" already exists for this batch.`);
      return;
    }

    const updatedSecs = [...currentSecs, cleanedName].join(',');
    await dbService.updateBatchSections(batchId, updatedSecs);
    alert(`Successfully added Section "${cleanedName}" to batch "${batch.title}"!`);
    loadAllAdminData();
  };

  const handleRemoveSectionFromBatch = async (batchId, sectionToRemove) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    const currentSecs = batch.sections ? batch.sections.split(',') : [];
    if (currentSecs.length <= 1) {
      alert("A batch must have at least one active section.");
      return;
    }

    if (!confirm(`Are you sure you want to remove Section ${sectionToRemove} from batch ${batch.title}?`)) {
      return;
    }

    const updatedSecs = currentSecs.filter(s => s !== sectionToRemove).join(',');
    await dbService.updateBatchSections(batchId, updatedSecs);
    alert(`Removed Section ${sectionToRemove} from batch ${batch.title}!`);
    loadAllAdminData();
  };

  const handleAddProgram = async () => {
    if (!newProgId || !newProgTitle) {
      alert("Please fill in the program code and title.");
      return;
    }
    await dbService.addProgram(newProgId, newProgTitle);
    alert("New Academic Program added successfully!");
    setNewProgId('');
    setNewProgTitle('');
    setIsProgOpen(false);
    loadAllAdminData();
  };

  const handleAddModule = async () => {
    if (!newModId || !newModTitle || !newModTutor || !newModBatch || !newModSection) {
      alert("Please fill in code, title, tutor, batch, and section details.");
      return;
    }

    await dbService.addModule(
      newModId,
      newModTitle,
      newModProg,
      newModStage,
      newModTri,
      newModTutor,
      newModBatch,
      newModSection
    );

    alert("New academic module created successfully. Select it from the registration dropdown to register students.");
    const createdModuleId = newModId;
    setNewModId('');
    setNewModTitle('');
    setNewModTutor('');
    setManagedModuleId(createdModuleId);
    setIsModOpen(false);
    loadAllAdminData();
  };

  const handleResetSystem = () => {
    if (confirm("WARNING: Are you sure you want to restore the registers? This deletes all current database modifications and seeds default values.")) {
      localStorage.removeItem('ismt_supabase_attendance_mock_db');
      window.location.reload();
    }
  };

  const selectedBatchObj = batches.find(b => b && b.id === newStudentBatch);
  const allowedSections = selectedBatchObj?.sections ? selectedBatchObj.sections.split(',') : ['A', 'B'];
  
  const selectedModBatchObj = batches.find(b => b && b.id === newModBatch);
  const allowedModSections = selectedModBatchObj?.sections ? selectedModBatchObj.sections.split(',') : ['A', 'B'];

  const selectedEditBatchObj = batches.find(b => b && b.id === editBatch);
  const allowedEditSections = typeof selectedEditBatchObj?.sections === 'string' ? selectedEditBatchObj.sections.split(',').map(s => s.trim()) : ['A', 'B'];

  const allUniqueSections = Array.from(new Set(
    batches.flatMap(b => b && b.sections ? b.sections.split(',').map(s => s.trim()) : ['A', 'B'])
  )).sort();

  const managedModule = modules.find(m => m.id === managedModuleId);
  const managedRosterIds = managedModuleStudents.map(s => s.id);
  const managedModuleCandidateStudents = managedModule
    ? students
        .filter(s => s.status === 'Active')
        .filter(s => s.program_id === managedModule.program_id)
        .filter(s => s.stage === parseInt(managedModule.stage))
        .filter(s => s.trimester === parseInt(managedModule.trimester))
        .filter(s => s.batch_id === managedModule.batch_id)
        .filter(s => s.section === managedModule.section)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const managedModuleAvailableStudents = managedModuleCandidateStudents
    .filter(s => !managedRosterIds.includes(s.id));

  // Filter Directory Table
  const filteredStudents = students.filter(s => {
    if (adminProgFilter && s.program_id !== adminProgFilter) return false;
    if (adminStageFilter && s.stage !== parseInt(adminStageFilter)) return false;
    if (adminBatchFilter && s.batch_id !== adminBatchFilter) return false;
    return true;
  });

  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const activeStudentsCount = students.filter(s => s.status === 'Active').length;
  const sectionCount = new Set(
    batches.flatMap(b => b && b.sections ? b.sections.split(',').map(s => s.trim()) : [])
  ).size;
  const adminTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'operations', label: 'Cohort Ops' },
    { id: 'setup', label: 'Setup' },
    { id: 'leaves', label: 'Leaves' },
    { id: 'students', label: 'Students' },
    { id: 'modules', label: 'Modules' },
    { id: 'batches', label: 'Batches' },
    { id: 'programs', label: 'Programs' },
    { id: 'migrations', label: 'History' }
  ];
  const directoryTabs = ['students', 'modules', 'batches', 'programs', 'migrations'];

  return (
    <div className="admin-console">
      <section className="admin-command-center">
        <div className="admin-command-copy">
          <span className="admin-eyebrow">Administrator workspace</span>
          <h2>Academic Operations Control</h2>
          <p>Manage cohorts, student records, intakes, modules, and leave decisions from one focused console.</p>
        </div>

        <div className="admin-metric-grid">
          <div className="admin-metric-card">
            <span>Active Students</span>
            <strong>{activeStudentsCount}</strong>
          </div>
          <div className="admin-metric-card warning">
            <span>Pending Leaves</span>
            <strong>{pendingLeaves.length}</strong>
          </div>
          <div className="admin-metric-card">
            <span>Intake Batches</span>
            <strong>{batches.length}</strong>
          </div>
          <div className="admin-metric-card">
            <span>Modules</span>
            <strong>{modules.length}</strong>
          </div>
          <div className="admin-metric-card">
            <span>Sections</span>
            <strong>{sectionCount}</strong>
          </div>
        </div>
      </section>

      <nav className="admin-workspace-tabs" aria-label="Admin workspace sections">
        {adminTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`admin-workspace-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      
      {/* SECTION 1: COHORT MIGRATIONS & MANUAL TRANSFERS */}
      {activeTab === 'operations' && (
      <div className="migration-grid">
        
        {/* Left Card: Bulk Cohort Migration */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBlockEnd: '1rem', color: 'var(--brand-blue)' }}>
            Bulk Trimester Cohort Migration
          </h3>

          <div className="filter-section">
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>1. Select Origin Cohort</label>
            
            <select 
              className="form-select" 
              value={migProgram} 
              onChange={(e) => setMigProgram(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">-- Select Program --</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Origin Stage</label>
                <select className="form-select" value={migStage} onChange={(e) => setMigStage(e.target.value)}>
                  <option value="1">Stage 1</option>
                  <option value="2">Stage 2</option>
                  <option value="3">Stage 3</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Origin Trimester</label>
                <select className="form-select" value={migFromTri} onChange={(e) => setMigFromTri(e.target.value)}>
                  <option value="1">Trimester 1</option>
                  <option value="2">Trimester 2</option>
                  <option value="3">Trimester 3</option>
                </select>
              </div>
            </div>

            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBlockStart: '0.5rem' }}>2. Destination Cohort Allocation</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Trimester</label>
                {migFromTri === '1' ? (
                  <select className="form-select" value={migToTri} onChange={(e) => setMigToTri(e.target.value)}>
                    <option value="2">Trimester 2 (Same Stage)</option>
                  </select>
                ) : migFromTri === '2' ? (
                  <select className="form-select" value={migToTri} onChange={(e) => setMigToTri(e.target.value)}>
                    <option value="3">Trimester 3 (Same Stage)</option>
                  </select>
                ) : (
                  <select className="form-select" value={migToTri} onChange={(e) => setMigToTri(e.target.value)}>
                    <option value="1">Trimester 1 (Next Stage)</option>
                    <option value="grad">Graduate Cohort</option>
                  </select>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Section</label>
                <select className="form-select" value={migToSection} onChange={(e) => setMigToSection(e.target.value)}>
                  {allUniqueSections.map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBlockStart: '1rem', marginBlockEnd: '0.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Active Origin Cohort</h4>
            <label className="checkbox-container" style={{ fontSize: '0.85rem', gap: '0.35rem' }}>
              <input 
                type="checkbox" 
                checked={selectedMigStudents.length === migStudents.length && migStudents.length > 0}
                onChange={handleSelectAllMigration} 
              /> Select All
            </label>
          </div>

          <div className="migration-list" style={{ maxHeight: '180px' }}>
            {migStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active students matching origin filters.
              </div>
            ) : (
              migStudents.map(student => (
                <div key={student.id} className="migration-student-item">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox"
                      checked={selectedMigStudents.includes(student.id)}
                      onChange={() => handleSelectStudentToggle(student.id)}
                    />
                  </label>
                  <div style={{ flexGrow: 1 }}>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 500 }}>{student.name}</h5>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Section {student.section} • {student.email}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <button 
            className="btn primary" 
            style={{ width: '100%', justifyContent: 'center', marginBlockStart: '1.25rem', minHeight: '52px', background: 'var(--brand-orange)', boxShadow: '0 4px 12px var(--brand-orange-glow)' }}
            onClick={handleExecuteMigration}
          >
            ⚡ Migrate Selected Cohort Students
          </button>
        </div>

        {/* Right Card: Manual Student enrollment override */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBlockEnd: '0.5rem', color: 'var(--brand-blue)' }}>
              Manual Module Enrollment
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBlockEnd: '1rem' }}>
              Manually add or unenroll a student to/from specific modules (useful for retakes or transfer credits).
            </p>

            <div className="form-group">
              <label>Select Student</label>
              <select className="form-select" value={manualStudent} onChange={(e) => setManualStudent(e.target.value)} style={{ width: '100%' }}>
                <option value="">-- Choose Student --</option>
                {students.filter(s => s.status === 'Active').sort((a,b) => a.name.localeCompare(b.name)).map(s => {
                  const prog = programs.find(p => p.id === s.program_id);
                  const batchObj = batches.find(b => b.id === s.batch_id);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({prog?.title ? prog.title.substring(0, 10) + '..' : 'Gen'} - S{s.stage}T{s.trimester} - Sec {s.section} - {batchObj ? batchObj.title.substring(0, 8) : 'Jan'})
                    </option>
                  );
                })}
              </select>
            </div>

            <h4 style={{ fontSize: '0.9rem', marginBlockEnd: '0.5rem', fontWeight: 600 }}>Active Registrations</h4>
            <div className="migration-list" style={{ maxHeight: '120px' }}>
              {manualEnrollments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No active custom module registrations.
                </div>
              ) : (
                manualEnrollments.map(mod => (
                  <div key={mod.id} className="migration-student-item" style={{ justifyContent: 'space-between', padding: '0.5rem' }}>
                    <div>
                      <h5 style={{ fontSize: '0.8rem', fontWeight: 500 }}>{mod.title}</h5>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Tutor: {mod.tutor}</span>
                    </div>
                    <button 
                      className="btn" 
                      style={{ minHeight: '26px', padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: 'var(--accent-absent)', borderColor: 'rgba(239,68,68,0.15)' }}
                      onClick={() => handleRemoveManualEnrollment(mod.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.01)', border: '1px dashed var(--border-glass)', borderRadius: '10px', padding: '0.75rem', marginBlockStart: '1rem' }}>
              <h5 style={{ fontSize: '0.85rem', marginBlockEnd: '0.5rem', fontWeight: 600 }}>➕ Register New Module</h5>
              <div className="form-group" style={{ marginBlockEnd: '0.5rem' }}>
                <select className="form-select" value={manualSelectedModule} onChange={(e) => setManualSelectedModule(e.target.value)} style={{ width: '100%', minHeight: '38px', padding: '0.5rem' }}>
                  {manualAvailableModules.length === 0 ? (
                    <option value="">No other modules available</option>
                  ) : (
                    manualAvailableModules.map(m => (
                      <option key={m.id} value={m.id}>{m.title} (S{m.stage}T{m.trimester})</option>
                    ))
                  )}
                </select>
              </div>
              <button 
                className="btn success" 
                style={{ width: '100%', minHeight: '38px' }}
                onClick={handleAddManualEnrollment}
                disabled={manualAvailableModules.length === 0}
              >
                Enroll in Module
              </button>
            </div>

          </div>
        </div>

      </div>
      )}

      {/* SECTION 2: LEAVE APPLICATIONS ARBITRATOR */}
      {(activeTab === 'overview' || activeTab === 'leaves') && (
      <div className="glass-card">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBlockEnd: '1rem', color: 'var(--brand-blue)' }}>
          Leave Applications Audit Queue
        </h3>
        <div className="migration-list" style={{ maxHeight: '180px' }}>
          {leaves.filter(l => l.status === 'Pending').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No pending leave applications requiring administrator review.
            </div>
          ) : (
            leaves.filter(l => l.status === 'Pending').map(l => (
              <div key={l.id} className="migration-student-item" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{l.students?.name || 'Student'} filed {l.type} Leave</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Dates: {l.start_date} to {l.end_date} • Reason: "{l.reason}"
                  </p>
                </div>
                <div className="btn-group">
                  <button className="btn success" style={{ minHeight: '32px', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleAuditLeave(l.id, 'Approved')}>Approve</button>
                  <button className="btn" style={{ minHeight: '32px', padding: '0.25rem 0.75rem', fontSize: '0.8rem', color: 'var(--accent-absent)', borderColor: 'rgba(239, 68, 68, 0.15)' }} onClick={() => handleAuditLeave(l.id, 'Rejected')}>Reject</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {/* SECTION 3: ADD ENTITIES AND SUMMARY DIRECTORY */}
      {(activeTab === 'overview' || activeTab === 'setup') && (
      <div className="admin-grid">
        
        {/* Left: Quick Setup additions */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBlockEnd: '1rem', color: 'var(--brand-blue)' }}>Quick Setup Panel</h3>
          
          <form onSubmit={handleAddStudent} style={{ marginBlockEnd: '1.5rem', borderBlockEnd: '1px solid var(--border-glass)', paddingBlockEnd: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBlockEnd: '0.5rem' }}>Register New Student</h4>
            
            <div className="form-group" style={{ marginBlockEnd: '0.75rem' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Grishma Amatya"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBlockEnd: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Program</label>
                <select className="form-select" value={newStudentProgram} onChange={(e) => setNewStudentProgram(e.target.value)}>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.title.substring(0, 15)}..</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Intake Batch</label>
                <select className="form-select" value={newStudentBatch} onChange={(e) => setNewStudentBatch(e.target.value)}>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginBlockEnd: '0.75rem' }}>
              <select className="form-select" value={newStudentStage} onChange={(e) => setNewStudentStage(e.target.value)}>
                <option value="1">Stage 1</option>
                <option value="2">Stage 2</option>
                <option value="3">Stage 3</option>
              </select>
              <select className="form-select" value={newStudentTri} onChange={(e) => setNewStudentTri(e.target.value)}>
                <option value="1">Tri 1</option>
                <option value="2">Tri 2</option>
                <option value="3">Tri 3</option>
              </select>
              <select className="form-select" value={newStudentSection} onChange={(e) => setNewStudentSection(e.target.value)}>
                {allowedSections.map(sec => (
                  <option key={sec} value={sec}>Sec {sec}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn primary" style={{ width: '100%', justifyContent: 'center' }}>
              Create Student Account
            </button>
          </form>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button className="btn" onClick={() => setIsBatchOpen(true)} style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.5rem 0.25rem' }}>➕ Batch</button>
            <button className="btn" onClick={() => setIsProgOpen(true)} style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.5rem 0.25rem' }}>➕ Program</button>
            <button className="btn" onClick={() => setIsModOpen(true)} style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.5rem 0.25rem' }}>➕ Module</button>
          </div>
        </div>

        {/* Middle: Intake Batches & Sections Manager */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-blue)' }}>Intake Batches & Sections</h3>
            <button className="btn success" style={{ minHeight: '34px', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setIsBatchOpen(true)}>
              ➕ Batch
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBlockEnd: '0.25rem' }}>
            Manage available intakes and physical student sections for each intake batch.
          </p>

          <div className="migration-list" style={{ flexGrow: 1, maxHeight: '250px' }}>
            {batches.map(b => (
              <div key={b.id} className="migration-student-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem', padding: '0.75rem 0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h5 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{b.title}</h5>
                    <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {b.id}</code>
                  </div>
                  <button 
                    className="btn" 
                    style={{ minHeight: '28px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: 'var(--brand-orange)', borderColor: 'var(--border-glass)' }}
                    onClick={() => handleAddSectionToBatch(b.id)}
                  >
                    ➕ Sec
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {(b.sections || 'A,B').split(',').map(sec => (
                    <span 
                      key={sec} 
                      style={{ 
                        background: 'rgba(30, 64, 175, 0.05)', 
                        border: '1px solid rgba(30, 64, 175, 0.1)', 
                        color: 'var(--brand-blue)', 
                        fontSize: '0.75rem', 
                        padding: '0.2rem 0.45rem', 
                        borderRadius: '6px', 
                        fontWeight: 'bold', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem' 
                      }}
                    >
                      Sec {sec}
                      <span 
                        style={{ 
                          cursor: 'pointer', 
                          color: 'var(--accent-absent)', 
                          fontWeight: 'bold',
                          marginLeft: '0.15rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: 'rgba(239, 68, 68, 0.08)'
                        }} 
                        onClick={() => handleRemoveSectionFromBatch(b.id, sec)}
                        title={`Remove Section ${sec}`}
                      >✕</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Enrolled student database */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-blue)' }}>Student Directory</h3>
            <button className="btn" style={{ color: 'var(--accent-absent)', borderColor: 'rgba(239,68,68,0.2)', minHeight: '34px', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={handleResetSystem}>
              ⚠️ Reset DB
            </button>
          </div>

          <div className="controls-row" style={{ margin: 0, gap: '0.35rem' }}>
            <select className="form-select" value={adminProgFilter} onChange={(e) => setAdminProgFilter(e.target.value)} style={{ flexGrow: 1, padding: '0.5rem' }}>
              <option value="">All Programs</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.title.substring(0, 10)}..</option>
              ))}
            </select>
            <select className="form-select" value={adminBatchFilter} onChange={(e) => setAdminBatchFilter(e.target.value)} style={{ flexGrow: 1, padding: '0.5rem' }}>
              <option value="">All Intakes</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.title.substring(0, 8)}</option>
              ))}
            </select>
            <select className="form-select" value={adminStageFilter} onChange={(e) => setAdminStageFilter(e.target.value)} style={{ padding: '0.5rem' }}>
              <option value="">Stages</option>
              <option value="1">S1</option>
              <option value="2">S2</option>
              <option value="3">S3</option>
            </select>
          </div>

          <div className="migration-list" style={{ flexGrow: 1, maxHeight: '250px' }}>
            {filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No student accounts matching criteria.</div>
            ) : (
              filteredStudents.sort((a,b) => a.name.localeCompare(b.name)).map(s => {
                const prog = programs.find(p => p && p.id === s.program_id);
                const batchObj = batches.find(b => b && b.id === s.batch_id);
                const batchTitle = batchObj ? batchObj.title : 'General Intake';

                return (
                  <div key={s.id} className="migration-student-item" style={{ justifyContent: 'space-between', padding: '0.65rem 0.5rem' }}>
                    <div>
                      <h5 style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.name}</h5>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {prog?.title ? prog.title.substring(0, 10) + '...' : 'General'} • S{s.stage}T{s.trimester} • Sec {s.section} • <strong style={{ color: 'var(--brand-orange)' }}>{batchTitle}</strong>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: s.status === 'Active' ? 'var(--accent-present)' : s.status === 'Graduated' ? 'var(--brand-blue)' : 'var(--accent-absent)', background: 'rgba(15, 23, 42, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '0.2rem 0.6rem' }}>
                        {s.status}
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button 
                          type="button"
                          className="btn" 
                          style={{ minHeight: '28px', padding: '0.2rem 0.4rem', fontSize: '0.75rem', borderColor: 'var(--border-glass)', cursor: 'pointer' }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenEditModal(s); }}
                          title="Edit Student"
                        >
                          ✏️
                        </button>
                        <button 
                          type="button"
                          className="btn" 
                          style={{ minHeight: '28px', padding: '0.2rem 0.4rem', fontSize: '0.75rem', color: 'var(--accent-absent)', borderColor: 'rgba(239,68,68,0.15)', cursor: 'pointer' }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteStudent(s.id, s.name); }}
                          title="Delete Student"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
      )}

      {/* SECTION 4: MASTER DIRECTORIES HUB */}
      {directoryTabs.includes(activeTab) && (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBlockStart: '0.5rem' }}>
        
        {/* Header & Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBlockEnd: '1px solid var(--border-glass)', paddingBlockEnd: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBlockEnd: '0.25rem' }}>
              🗂️ Master Database Directories Hub
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Search, audit, and inspect student rosters, academic programs, intake batches, and historical cohort migration ledgers.
            </p>
          </div>

          {/* Premium Selector Tabs */}
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.03)', padding: '0.3rem', borderRadius: '12px', border: '1px solid var(--border-glass)', gap: '0.25rem' }}>
              {[
              { id: 'students', label: 'Student Roster' },
              { id: 'modules', label: 'Modules' },
              { id: 'batches', label: 'Intakes & Sections' },
              { id: 'programs', label: 'Programs Grid' },
              { id: 'migrations', label: 'Migration History' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className="btn"
                style={{
                  minHeight: '34px',
                  padding: '0.4rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--brand-blue)' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : 'var(--text-primary)',
                  boxShadow: activeTab === tab.id ? '0 4px 10px rgba(30, 64, 175, 0.2)' : 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Panels */}
        <div style={{ minHeight: '320px' }}>

          {/* TAB 1: STUDENT MASTER ROSTER */}
          {activeTab === 'students' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Search & Filter Header */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="🔍 Search student name or email..." 
                  value={studentSearch} 
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{ flexGrow: 1, minWidth: '240px', minHeight: '40px' }}
                />
              </div>

              {/* Roster Grid View */}
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.03)', borderBlockEnd: '1px solid var(--border-glass)', color: 'var(--brand-blue)' }}>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Student</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Program</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Intake Batch</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Cohort Details</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Section</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .filter(s => {
                        const nameMatch = s.name.toLowerCase().includes(studentSearch.toLowerCase());
                        const emailMatch = s.email.toLowerCase().includes(studentSearch.toLowerCase());
                        return nameMatch || emailMatch;
                      })
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(s => {
                        const prog = programs.find(p => p && p.id === s.program_id);
                        const batchObj = batches.find(b => b && b.id === s.batch_id);
                        const initials = s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                        return (
                          <tr key={s.id} style={{ borderBlockEnd: '1px solid var(--border-glass)', transition: 'background 0.15s ease' }} className="hover-row-effect">
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, var(--brand-blue-glow) 0%, rgba(30, 64, 175, 0.2) 100%)',
                                  border: '1px solid rgba(30, 64, 175, 0.2)',
                                  color: 'var(--brand-blue)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {initials}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{s.name}</strong>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.email}</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{ 
                                background: 'rgba(30, 64, 175, 0.05)', 
                                border: '1px solid rgba(30, 64, 175, 0.1)', 
                                color: 'var(--brand-blue)', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '6px', 
                                fontSize: '0.75rem', 
                                fontWeight: 500 
                              }}>
                                {prog ? prog.title.substring(0, 25) + '...' : 'Unknown'}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--brand-orange)' }}>
                              {batchObj ? batchObj.title : 'Unknown Intake'}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>
                              Stage {s.stage} • Trimester {s.trimester}
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{ background: 'rgba(15, 23, 42, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.2rem 0.5rem', fontWeight: 'bold' }}>
                                Sec {s.section}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{ 
                                fontSize: '0.7rem', 
                                fontWeight: 700, 
                                color: s.status === 'Active' ? 'var(--accent-present)' : s.status === 'Graduated' ? 'var(--brand-blue)' : 'var(--accent-absent)', 
                                background: 'rgba(15, 23, 42, 0.03)', 
                                border: '1px solid var(--border-glass)', 
                                borderRadius: '12px', 
                                padding: '0.2rem 0.6rem' 
                              }}>
                                {s.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                <button 
                                  type="button" 
                                  className="btn" 
                                  style={{ minHeight: '30px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--border-glass)' }}
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenEditModal(s); }}
                                >
                                  ✏️ Edit
                                </button>
                                <button 
                                  type="button" 
                                  className="btn" 
                                  style={{ minHeight: '30px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--accent-absent)', borderColor: 'rgba(239, 68, 68, 0.15)' }}
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteStudent(s.id, s.name); }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: MODULE REGISTRATION LEDGER */}
          {activeTab === 'modules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--brand-blue)', marginBlockEnd: '0.2rem' }}>Program Stage Module Setup</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Create modules for each program stage, register a full section cohort, or maintain a custom student roster for that module.
                </p>
              </div>

              <div className="module-admin-workspace">
	                <div className="module-builder-panel">
	                  <div className="module-panel-heading">
	                    <h4>Create Module</h4>
	                    <span>Add modules first for every program stage and section</span>
	                  </div>

                  <div className="module-builder-grid">
                    <div className="form-group">
                      <label>Module Code</label>
                      <input type="text" className="form-input" placeholder="e.g. cse_s1_t1_algo" value={newModId} onChange={(e) => setNewModId(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Module Title</label>
                      <input type="text" className="form-input" placeholder="e.g. Data Structures & Algorithms" value={newModTitle} onChange={(e) => setNewModTitle(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Program</label>
                      <select className="form-select" value={newModProg} onChange={(e) => setNewModProg(e.target.value)}>
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Tutor Name</label>
                      <input type="text" className="form-input" placeholder="e.g. Dr. Susan Mahato" value={newModTutor} onChange={(e) => setNewModTutor(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Stage</label>
                      <select className="form-select" value={newModStage} onChange={(e) => setNewModStage(e.target.value)}>
                        <option value="1">Stage 1</option>
                        <option value="2">Stage 2</option>
                        <option value="3">Stage 3</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Trimester</label>
                      <select className="form-select" value={newModTri} onChange={(e) => setNewModTri(e.target.value)}>
                        <option value="1">Trimester 1</option>
                        <option value="2">Trimester 2</option>
                        <option value="3">Trimester 3</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Intake Batch</label>
                      <select className="form-select" value={newModBatch} onChange={(e) => setNewModBatch(e.target.value)}>
                        {batches.map(b => (
                          <option key={b.id} value={b.id}>{b.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Section</label>
                      <select className="form-select" value={newModSection} onChange={(e) => setNewModSection(e.target.value)}>
                        {allowedModSections.map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>
                  </div>

	                  <button type="button" className="btn primary" style={{ justifyContent: 'center' }} onClick={handleAddModule}>
	                    Create Module
	                  </button>
	                </div>

	                <div className="module-builder-panel">
	                  <div className="module-panel-heading">
	                    <h4>Register Students For Module</h4>
	                    <span>Choose a module from the dropdown, then register a section or selected students</span>
	                  </div>

                  <div className="form-group">
                    <label>Select Module</label>
                    <select className="form-select" value={managedModuleId} onChange={(e) => setManagedModuleId(e.target.value)}>
                      <option value="">-- Select Module --</option>
                      {modules
                        .sort((a, b) => a.id.localeCompare(b.id))
                        .map(mod => (
                          <option key={mod.id} value={mod.id}>{mod.id} - {mod.title}</option>
                        ))}
                    </select>
                  </div>

                  {managedModule && (
                    <div className="module-context-strip">
                      <span>{managedModule.program_id}</span>
                      <span>Stage {managedModule.stage}</span>
                      <span>Tri {managedModule.trimester}</span>
                      <span>Sec {managedModule.section}</span>
                      <span>{managedModule.tutor}</span>
	                    </div>
	                  )}

	                  <div className="form-group">
	                    <label>Registration Type</label>
	                    <div className="module-registration-toggle">
	                      <button type="button" className={newModRegistrationMode === 'all' ? 'active' : ''} onClick={() => setNewModRegistrationMode('all')}>
	                        Full section cohort
	                      </button>
	                      <button type="button" className={newModRegistrationMode === 'custom' ? 'active' : ''} onClick={() => setNewModRegistrationMode('custom')}>
	                        Custom students
	                      </button>
	                    </div>
	                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBlockStart: '0.4rem' }}>
	                      Matching section cohort: {managedModuleCandidateStudents.length} active student(s).
	                    </p>
	                  </div>

	                  {newModRegistrationMode === 'custom' && (
	                    <div className="form-group">
	                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
	                        <label style={{ margin: 0 }}>Select Students For This Module</label>
	                        <button
	                          type="button"
	                          className="btn"
	                          style={{ minHeight: '30px', padding: '0.25rem 0.7rem', fontSize: '0.75rem', width: 'auto' }}
	                          onClick={() => setNewModSelectedStudents(managedModuleAvailableStudents.map(s => s.id))}
	                          disabled={managedModuleAvailableStudents.length === 0}
	                        >
	                          Select All Available
	                        </button>
	                      </div>
	                      <div className="module-registration-list">
	                        {managedModuleAvailableStudents.length === 0 ? (
	                          <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
	                            No unregistered students are available in this module section.
	                          </div>
	                        ) : (
	                          managedModuleAvailableStudents.map(student => (
	                            <label key={student.id} className="module-registration-student">
	                              <input
	                                type="checkbox"
	                                checked={newModSelectedStudents.includes(student.id)}
	                                onChange={(e) => {
	                                  if (e.target.checked) {
	                                    setNewModSelectedStudents([...newModSelectedStudents, student.id]);
	                                  } else {
	                                    setNewModSelectedStudents(newModSelectedStudents.filter(id => id !== student.id));
	                                  }
	                                }}
	                              />
	                              <span>
	                                <strong>{student.name}</strong>
	                                <small>{student.email}</small>
	                              </span>
	                            </label>
	                          ))
	                        )}
	                      </div>
	                    </div>
	                  )}

	                  <div className="module-roster-actions">
	                    <select className="form-select" value={managedAddStudentId} onChange={(e) => setManagedAddStudentId(e.target.value)} disabled={!managedModuleId || managedModuleAvailableStudents.length === 0}>
                      <option value="">-- Add student from this section --</option>
                      {managedModuleAvailableStudents.map(student => (
                        <option key={student.id} value={student.id}>{student.name}</option>
                      ))}
                    </select>
                    <button type="button" className="btn success" onClick={handleAddManagedStudent} disabled={!managedAddStudentId}>
                      Add
                    </button>
                  </div>

	                  <button type="button" className="btn" style={{ justifyContent: 'center' }} onClick={handleRegisterAllForManagedModule} disabled={!managedModuleId}>
	                    Register Full Section Cohort
	                  </button>

	                  {newModRegistrationMode === 'custom' && (
	                    <button type="button" className="btn primary" style={{ justifyContent: 'center', marginBlockStart: '0.5rem' }} onClick={handleRegisterCustomForManagedModule} disabled={!managedModuleId || newModSelectedStudents.length === 0}>
	                      Register Selected Students
	                    </button>
	                  )}

                  <div className="module-roster-list">
                    {managedModuleStudents.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No students are currently registered for this module.
                      </div>
                    ) : (
                      managedModuleStudents.map(student => (
                        <div key={student.id} className="module-roster-row">
                          <div>
                            <strong>{student.name}</strong>
                            <span>{student.email}</span>
                          </div>
                          <button type="button" className="btn" onClick={() => handleRemoveManagedStudent(student.id)}>
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--brand-blue)', marginBlockEnd: '0.2rem' }}>Configured Modules</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                    Each module code belongs to a program, stage, trimester, intake, and section with its own registered student set.
                  </p>
                </div>
              </div>

              <div className="module-ledger-grid">
                {modules.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No modules have been configured yet.
                  </div>
                ) : (
                  modules
                    .sort((a, b) => `${a.program_id}-${a.stage}-${a.trimester}-${a.id}`.localeCompare(`${b.program_id}-${b.stage}-${b.trimester}-${b.id}`))
                    .map(mod => {
                      const prog = programs.find(p => p.id === mod.program_id);
                      const batch = batches.find(b => b.id === mod.batch_id);
                      return (
                        <div key={mod.id} className="module-ledger-card">
                          <div>
                            <code>{mod.id}</code>
                            <h4>{mod.title}</h4>
                            <p>{prog?.title || 'Unknown Program'}</p>
                          </div>
                          <div className="module-ledger-meta">
                            <span>Stage {mod.stage}</span>
                            <span>Tri {mod.trimester}</span>
                            <span>Sec {mod.section}</span>
                            <span>{batch?.title || 'General Intake'}</span>
                          </div>
                          <div className="module-ledger-footer">
                            <span>{mod.tutor}</span>
                            <strong>{moduleEnrollmentCounts[mod.id] || 0} registered</strong>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INTAKE BATCHES & SECTIONS GRID */}
          {activeTab === 'batches' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {batches.map(b => {
                const batchStudents = students.filter(s => s.batch_id === b.id);
                const definedSections = b.sections ? b.sections.split(',').map(s => s.trim()) : ['A', 'B'];

                return (
                  <div key={b.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', borderLeft: '4px solid var(--brand-orange)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{b.title}</h4>
                        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {b.id}</code>
                      </div>
                      <button 
                        type="button"
                        className="btn" 
                        style={{ minHeight: '28px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: 'var(--brand-orange)', borderColor: 'var(--border-glass)' }}
                        onClick={(e) => { e.preventDefault(); handleAddSectionToBatch(b.id); }}
                      >
                        ➕ Section
                      </button>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Students</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--brand-blue)' }}>{batchStudents.length}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Active Sections</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--brand-orange)' }}>{definedSections.length}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Physical Cohort Groups:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {definedSections.map(sec => {
                          const sectionStudents = batchStudents.filter(s => s.section === sec);
                          return (
                            <span 
                              key={sec} 
                              style={{ 
                                background: 'rgba(30, 64, 175, 0.04)', 
                                border: '1px solid rgba(30, 64, 175, 0.1)', 
                                color: 'var(--brand-blue)', 
                                fontSize: '0.75rem', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '6px', 
                                fontWeight: 700, 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.35rem' 
                              }}
                            >
                              Sec {sec} ({sectionStudents.length})
                              <span 
                                style={{ 
                                  cursor: 'pointer', 
                                  color: 'var(--accent-absent)', 
                                  fontWeight: 'bold',
                                  marginLeft: '0.15rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: 'rgba(239, 68, 68, 0.08)'
                                }} 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveSectionFromBatch(b.id, sec); }}
                              >✕</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: ACADEMIC PROGRAMS GRID */}
          {activeTab === 'programs' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {programs.map(p => {
                const programStudents = students.filter(s => s.program_id === p.id);
                const programModules = modules.filter(m => m.program_id === p.id);
                const initials = p.title.replace('BSc (Hons) ', '').split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase();

                return (
                  <div key={p.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', borderTop: '4px solid var(--brand-blue)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--brand-blue-glow) 0%, rgba(30, 64, 175, 0.15) 100%)',
                        border: '1px solid rgba(30, 64, 175, 0.15)',
                        color: 'var(--brand-blue)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {initials}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{p.title}</h4>
                        <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Code: {p.id}</code>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.02)', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                      <div>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>Students</span>
                        <strong style={{ fontSize: '1rem', color: 'var(--brand-orange)' }}>{programStudents.length}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>Modules</span>
                        <strong style={{ fontSize: '1rem', color: 'var(--brand-blue)' }}>{programModules.length}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>Duration</span>
                        <strong style={{ fontSize: '1.0rem', color: 'var(--text-primary)' }}>{p.duration_years || 3} Yrs</strong>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingBlockStart: '0.5rem' }}>
                      <span>Enrolled Active Status:</span>
                      <strong style={{ color: 'var(--accent-present)' }}>100% PERSISTENT</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: COHORT MIGRATION HISTORY LEDGER */}
          {activeTab === 'migrations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {migrationLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  📂 No historical cohort migration transactions have been logged yet.
                </div>
              ) : (
                migrationLogs.map((log, idx) => {
                  const prog = programs.find(p => p && p.id === log.program_id);
                  const logDate = new Date(log.executed_at).toLocaleString();

                  return (
                    <div key={log.id || idx} className="migration-student-item" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--brand-blue)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBlockEnd: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-blue)', background: 'rgba(30, 64, 175, 0.05)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                            {prog ? prog.title.substring(0, 20) + '...' : 'Unknown Program'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Transaction #{log.id || idx + 1}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>
                          Migrated <strong style={{ color: 'var(--brand-orange)' }}>{log.student_count} student(s)</strong> from: 
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', margin: '0 0.5rem', background: 'rgba(15, 23, 42, 0.03)', padding: '0.1rem 0.4rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            Stage {log.origin_stage} Tri {log.origin_trimester}
                          </span>
                          ➔
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', margin: '0 0.5rem', background: 'var(--brand-blue-glow)', color: 'var(--brand-blue)', padding: '0.1rem 0.4rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            Stage {log.target_stage} Tri {log.target_trimester} (Sec {log.target_section})
                          </span>
                        </p>
                      </div>

                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'block', fontWeight: 600 }}>Executed At:</span>
                        <span>{logDate}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      </div>
      )}

      {/* DIALOG POPUPS */}
      {isBatchOpen && (
        <div className="modal-overlay active">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700, color: 'var(--brand-blue)' }}>Create Intake Batch</h3>
              <button className="modal-close-btn" onClick={() => setIsBatchOpen(false)}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBlockEnd: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Select Year</label>
                <select className="form-select" value={newBatchYear} onChange={(e) => setNewBatchYear(e.target.value)}>
                  {['2026', '2027', '2028', '2029', '2030', '2031', '2032'].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Select Month</label>
                <select className="form-select" value={newBatchMonth} onChange={(e) => setNewBatchMonth(e.target.value)}>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBlockEnd: '1rem' }}>
              <label>Initial Sections Enabled</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', marginBlockStart: '0.25rem' }}>
                {['A', 'B', 'C', 'D'].map(sec => (
                  <label key={sec} className="checkbox-container" style={{ fontSize: '0.85rem', gap: '0.35rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                    <input 
                      type="checkbox" 
                      checked={newBatchSections[sec]} 
                      onChange={(e) => setNewBatchSections({ ...newBatchSections, [sec]: e.target.checked })}
                    />
                    Sec {sec}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(30, 64, 175, 0.03)', border: '1px solid var(--border-glass)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBlockEnd: '1rem' }}>
              <strong>Preview Output:</strong><br />
              Code ID: <code style={{ color: 'var(--brand-orange)', fontWeight: 'bold' }}>{newBatchMonth.substring(0,3).toLowerCase()}_{newBatchYear}</code><br />
              Batch Title: <code style={{ color: 'var(--brand-blue)', fontWeight: 'bold' }}>{newBatchMonth} {newBatchYear} Intake</code>
            </div>

            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginBlockStart: '0.5rem', background: 'var(--brand-orange)' }} onClick={handleAddBatch}>
              Create Intake Batch
            </button>
          </div>
        </div>
      )}

      {isProgOpen && (
        <div className="modal-overlay active">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700, color: 'var(--brand-blue)' }}>Add Program</h3>
              <button className="modal-close-btn" onClick={() => setIsProgOpen(false)}>✕</button>
            </div>
            <div className="form-group">
              <label>Program Code</label>
              <input type="text" className="form-input" placeholder="e.g. bsc_data" value={newProgId} onChange={(e) => setNewProgId(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Program Title</label>
              <input type="text" className="form-input" placeholder="e.g. BSc (Hons) Data Science" value={newProgTitle} onChange={(e) => setNewProgTitle(e.target.value)} />
            </div>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginBlockStart: '1rem', background: 'var(--brand-orange)' }} onClick={handleAddProgram}>
              Add Program
            </button>
          </div>
        </div>
      )}

      {isModOpen && (
        <div className="modal-overlay active">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700, color: 'var(--brand-blue)' }}>Add Module</h3>
              <button className="modal-close-btn" onClick={() => setIsModOpen(false)}>✕</button>
            </div>
            <div className="form-group">
              <label>Module Code</label>
              <input type="text" className="form-input" placeholder="e.g. cse_s1_t1_algo" value={newModId} onChange={(e) => setNewModId(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Module Title</label>
              <input type="text" className="form-input" placeholder="e.g. Data Structures & Algorithms" value={newModTitle} onChange={(e) => setNewModTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Academic Program</label>
              <select className="form-select" value={newModProg} onChange={(e) => setNewModProg(e.target.value)} style={{ width: '100%' }}>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div className="form-group">
                <label>Stage</label>
                <select className="form-select" value={newModStage} onChange={(e) => setNewModStage(e.target.value)}>
                  <option value="1">Stage 1</option>
                  <option value="2">Stage 2</option>
                  <option value="3">Stage 3</option>
                </select>
              </div>
              <div className="form-group">
                <label>Trimester</label>
                <select className="form-select" value={newModTri} onChange={(e) => setNewModTri(e.target.value)}>
                  <option value="1">Trimester 1</option>
                  <option value="2">Trimester 2</option>
                  <option value="3">Trimester 3</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div className="form-group">
                <label>Intake Batch</label>
                <select className="form-select" value={newModBatch} onChange={(e) => setNewModBatch(e.target.value)} style={{ width: '100%' }}>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Allocated Section</label>
                <select className="form-select" value={newModSection} onChange={(e) => setNewModSection(e.target.value)} style={{ width: '100%' }}>
                  {allowedModSections.map(sec => (
                    <option key={sec} value={sec}>Sec {sec}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Assigned Tutor</label>
              <input type="text" className="form-input" placeholder="e.g. Dr. Susan Mahato" value={newModTutor} onChange={(e) => setNewModTutor(e.target.value)} />
            </div>

            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginBlockStart: '1rem', background: 'var(--brand-orange)' }} onClick={handleAddModule}>
              Create Module
            </button>
          </div>
        </div>
      )}

      {isEditOpen && editingStudent && (
        <div className="modal-overlay active">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700, color: 'var(--brand-blue)' }}>Edit Student Profile</h3>
              <button type="button" className="modal-close-btn" onClick={(e) => { e.preventDefault(); setIsEditOpen(false); setEditingStudent(null); }}>✕</button>
            </div>
            
            <div className="form-group">
              <label>Student Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Academic Program</label>
              <select 
                className="form-select" 
                value={editProgram} 
                onChange={(e) => setEditProgram(e.target.value)} 
                style={{ width: '100%' }}
              >
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Intake Batch</label>
              <select 
                className="form-select" 
                value={editBatch} 
                onChange={(e) => setEditBatch(e.target.value)} 
                style={{ width: '100%' }}
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stage</label>
                <select className="form-select" value={editStage} onChange={(e) => setEditStage(e.target.value)}>
                  <option value="1">Stage 1</option>
                  <option value="2">Stage 2</option>
                  <option value="3">Stage 3</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trimester</label>
                <select className="form-select" value={editTri} onChange={(e) => setEditTri(e.target.value)}>
                  <option value="1">Tri 1</option>
                  <option value="2">Tri 2</option>
                  <option value="3">Tri 3</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Section</label>
                <select className="form-select" value={editSection} onChange={(e) => setEditSection(e.target.value)}>
                  {allowedEditSections.map(sec => (
                    <option key={sec} value={sec}>Sec {sec}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBlockEnd: '1rem' }}>
              <label>Student Status</label>
              <select 
                className="form-select" 
                value={editStatus} 
                onChange={(e) => setEditStatus(e.target.value)} 
                style={{ width: '100%' }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Graduated">Graduated</option>
              </select>
            </div>

            <button 
              type="button"
              className="btn primary" 
              style={{ width: '100%', justifyContent: 'center', marginBlockStart: '1rem', background: 'var(--brand-orange)', color: '#fff', fontWeight: 600 }} 
              onClick={(e) => { e.preventDefault(); handleSaveStudentEdit(); }}
            >
              Save Student Profile
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
export { AdminDashboard };
