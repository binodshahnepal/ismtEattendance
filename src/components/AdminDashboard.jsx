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

const STAGE_UNIT_TEMPLATES = {
  1: [
    { id: 'academic_skills', title: 'Academic Skills and Digital Literacy', trimester: 1 },
    { id: 'programming_fundamentals', title: 'Programming Fundamentals', trimester: 1 },
    { id: 'computer_systems', title: 'Computer Systems', trimester: 1 },
    { id: 'database_foundations', title: 'Database Foundations', trimester: 2 },
    { id: 'web_technologies', title: 'Web Technologies', trimester: 2 },
    { id: 'networking_basics', title: 'Networking Basics', trimester: 3 }
  ],
  2: [
    { id: 'software_engineering', title: 'Software Engineering', trimester: 1 },
    { id: 'data_structures', title: 'Data Structures and Algorithms', trimester: 1 },
    { id: 'cloud_computing', title: 'Cloud Computing', trimester: 2 },
    { id: 'information_security', title: 'Information Security', trimester: 2 },
    { id: 'research_methods', title: 'Research Methods', trimester: 3 },
    { id: 'project_management', title: 'Project Management', trimester: 3 }
  ],
  3: [
    { id: 'advanced_development', title: 'Advanced Application Development', trimester: 1 },
    { id: 'enterprise_systems', title: 'Enterprise Systems', trimester: 1 },
    { id: 'data_analytics', title: 'Data Analytics', trimester: 2 },
    { id: 'professional_practice', title: 'Professional Practice', trimester: 2 },
    { id: 'major_project', title: 'Major Project', trimester: 3 },
    { id: 'innovation_strategy', title: 'Innovation and Strategy', trimester: 3 }
  ]
};

const buildStageUnitModuleId = (programId, stage, unitId, batchId, section) =>
  `${programId}_s${stage}_${unitId}_${batchId}_sec${section}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');

const ADMIN_PERMISSION_OPTIONS = [
  { id: 'overview', label: 'Overview', description: 'View dashboard metrics and pending summaries' },
  { id: 'operations', label: 'Cohort Ops', description: 'Run migrations and manual enrollments' },
  { id: 'setup', label: 'Setup', description: 'Enroll students and manage setup panels' },
  { id: 'leaves', label: 'Leaves', description: 'Approve or reject leave requests' },
  { id: 'students', label: 'Students', description: 'View and manage student directory' },
  { id: 'attendance', label: 'Attendance', description: 'View attendance cards and registers' },
  { id: 'modules', label: 'Modules', description: 'Create modules and manage rosters' },
  { id: 'assignments', label: 'Tutor Assignments', description: 'Assign tutors and date windows' },
  { id: 'batches', label: 'Batches', description: 'Manage intake batches and sections' },
  { id: 'programs', label: 'Programs', description: 'Manage academic programs' },
  { id: 'migrations', label: 'History', description: 'View migration history' },
  { id: 'access', label: 'Access', description: 'Create admins and reset passwords' }
];

const DEFAULT_PARTIAL_ADMIN_PERMISSIONS = ['overview', 'students', 'attendance', 'migrations'];
const ALL_ADMIN_PERMISSIONS = ADMIN_PERMISSION_OPTIONS.map(permission => permission.id);

const AdminDashboard = ({ adminId }) => {
  // Lists
  const [admins, setAdmins] = useState([]);
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [modules, setModules] = useState([]);
  const [students, setStudents] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState([]);
  const [attendanceRegisterStudents, setAttendanceRegisterStudents] = useState([]);

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
  const [newStudentContact, setNewStudentContact] = useState('');
  const [newStudentPersonalEmail, setNewStudentPersonalEmail] = useState('');
  const [newStudentCollegeEmail, setNewStudentCollegeEmail] = useState('');
  const [newStudentParentName, setNewStudentParentName] = useState('');
  const [newStudentParentContact, setNewStudentParentContact] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');
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

  const [unitEnrollProgram, setUnitEnrollProgram] = useState('bsc_cse');
  const [unitEnrollStage, setUnitEnrollStage] = useState('1');
  const [unitEnrollBatch, setUnitEnrollBatch] = useState('jan_2026');
  const [unitEnrollSection, setUnitEnrollSection] = useState('A');
  const [unitEnrollMode, setUnitEnrollMode] = useState('all');
  const [selectedStageUnitIds, setSelectedStageUnitIds] = useState(STAGE_UNIT_TEMPLATES[1].map(unit => unit.id));
  const [unitEnrollSelectedStudents, setUnitEnrollSelectedStudents] = useState([]);

  // Global Admin filters for directory table
  const [adminProgFilter, setAdminProgFilter] = useState('');
  const [adminStageFilter, setAdminStageFilter] = useState('');
  const [adminBatchFilter, setAdminBatchFilter] = useState('');
  const [attendanceViewMode, setAttendanceViewMode] = useState('overall');
  const [attendanceMonthFilter, setAttendanceMonthFilter] = useState('');
  const [attendanceModuleFilter, setAttendanceModuleFilter] = useState('');

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
  const [assignmentTutorId, setAssignmentTutorId] = useState('');
  const [assignmentStartDate, setAssignmentStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignmentEndDate, setAssignmentEndDate] = useState(new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().split('T')[0]);
  const [assignmentModuleId, setAssignmentModuleId] = useState('');
  const [assignmentProgramFilter, setAssignmentProgramFilter] = useState('');
  const [assignmentBatchFilter, setAssignmentBatchFilter] = useState('');
  const [assignmentSectionFilter, setAssignmentSectionFilter] = useState('');
  const [newTutorName, setNewTutorName] = useState('');
  const [newTutorEmail, setNewTutorEmail] = useState('');
  const [newTutorPhone, setNewTutorPhone] = useState('');
  const [newTutorDepartment, setNewTutorDepartment] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPrivilege, setNewAdminPrivilege] = useState('partial');
  const [newAdminPermissions, setNewAdminPermissions] = useState(DEFAULT_PARTIAL_ADMIN_PERMISSIONS);
  const [resetTutorId, setResetTutorId] = useState('');
  const [resetStudentId, setResetStudentId] = useState('');

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
    const mod = modules.find(m => m.id === managedModuleId);
    if (!mod) return;

    setNewModTri(String(mod.trimester || '1'));
    setNewModBatch(mod.batch_id || batches[0]?.id || 'jan_2026');
    setNewModSection(mod.section || 'A');
    setNewModTutor(mod.tutor && mod.tutor !== 'Unassigned' ? mod.tutor : '');
  }, [managedModuleId, modules, batches]);

  useEffect(() => {
    loadManagedModuleRoster();
  }, [managedModuleId, modules, newModSection]);

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

  useEffect(() => {
    const selectedBatchObj = batches.find(b => b.id === unitEnrollBatch);
    const allowed = selectedBatchObj?.sections ? selectedBatchObj.sections.split(',') : ['A', 'B'];
    if (allowed.length > 0 && !allowed.includes(unitEnrollSection)) {
      setUnitEnrollSection(allowed[0]);
    }
  }, [unitEnrollBatch, batches, unitEnrollSection]);

  useEffect(() => {
    const availableUnitIds = (STAGE_UNIT_TEMPLATES[unitEnrollStage] || []).slice(0, 6).map(unit => unit.id);
    setSelectedStageUnitIds(prev => {
      const retained = prev.filter(id => availableUnitIds.includes(id));
      return retained.length > 0 ? retained : availableUnitIds;
    });
  }, [unitEnrollStage]);

  // Update student edit section when selected batch changes
  useEffect(() => {
    const selectedBatchObj = batches.find(b => b.id === editBatch);
    const allowed = selectedBatchObj?.sections ? selectedBatchObj.sections.split(',').map(s => s.trim()) : ['A', 'B'];
    if (editingStudent && allowed.length > 0 && !allowed.includes(editSection)) {
      setEditSection(allowed[0]);
    }
  }, [editBatch, batches, editSection, editingStudent]);

  useEffect(() => {
    const mod = modules.find(m => m.id === managedModuleId);
    if (!mod) {
      setNewModSelectedStudents([]);
      return;
    }

    const eligibleIds = students
      .filter(s => s.status === 'Active')
      .filter(s => s.program_id === mod.program_id)
      .filter(s => s.stage === parseInt(mod.stage))
      .filter(s => s.trimester === parseInt(newModTri))
      .filter(s => s.batch_id === newModBatch)
      .filter(s => s.section === newModSection)
      .map(s => s.id);

    setNewModSelectedStudents(prev => prev.filter(id => eligibleIds.includes(id)));
  }, [students, modules, managedModuleId, newModTri, newModBatch, newModSection]);

  useEffect(() => {
    const eligibleIds = students
      .filter(s => s.status === 'Active')
      .filter(s => s.program_id === unitEnrollProgram)
      .filter(s => s.stage === parseInt(unitEnrollStage))
      .filter(s => s.batch_id === unitEnrollBatch)
      .filter(s => s.section === unitEnrollSection)
      .map(s => s.id);

    setUnitEnrollSelectedStudents(prev => prev.filter(id => eligibleIds.includes(id)));
  }, [students, unitEnrollProgram, unitEnrollStage, unitEnrollBatch, unitEnrollSection]);

  useEffect(() => {
    if (!assignmentModuleId && modules.length > 0) {
      setAssignmentModuleId(modules[0].id);
    }
  }, [modules, assignmentModuleId]);

  useEffect(() => {
    const mod = modules.find(item => item.id === assignmentModuleId);
    if (!mod) return;
    setAssignmentTutorId(mod.tutor_id || tutors.find(t => t.name === mod.tutor)?.id || '');
    setAssignmentStartDate(mod.class_start_date || new Date().toISOString().split('T')[0]);
    setAssignmentEndDate(mod.class_end_date || new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().split('T')[0]);
  }, [assignmentModuleId, modules, tutors]);

  useEffect(() => {
    const loadAttendanceRegisterStudents = async () => {
      if (!attendanceModuleFilter) {
        setAttendanceRegisterStudents([]);
        return;
      }

      const mod = modules.find(item => item.id === attendanceModuleFilter);
      const roster = await dbService.getEnrolledStudents(attendanceModuleFilter, mod?.section || null);
      setAttendanceRegisterStudents(roster.slice().sort((a, b) => a.name.localeCompare(b.name)));
    };

    loadAttendanceRegisterStudents();
  }, [attendanceModuleFilter, modules]);

  const loadAllAdminData = async () => {
    const adminList = await dbService.getAdmins(true);
    setAdmins(adminList);

    const bts = await dbService.getBatches();
    setBatches(bts);

    const progs = await dbService.getPrograms();
    setPrograms(progs);

    const tutorList = await dbService.getTutors(true);
    setTutors(tutorList);
    if (!resetTutorId && tutorList.length > 0) setResetTutorId(tutorList[0].id);

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
    if (!resetStudentId && studs.length > 0) setResetStudentId(studs[0].id);
    const summaries = await buildAttendanceSummaries(studs, mods, bts, progs);
    setAttendanceSummaries(summaries);

    const lvs = await dbService.getLeaves();
    setLeaves(lvs);

    const logs = await dbService.getMigrationLogs();
    setMigrationLogs(logs);

    // Default select values
    if (bts.length > 0) {
      setNewStudentBatch(bts[0].id);
      setNewModBatch(bts[0].id);
      setUnitEnrollBatch(bts[0].id);
    }
    if (progs.length > 0) {
      setNewStudentProgram(progs[0].id);
      setNewModProg(progs[0].id);
      setUnitEnrollProgram(progs[0].id);
    }
  };

  const buildAttendanceSummaries = async (studentList, moduleList, batchList, programList) => {
    const moduleLookup = new Map(moduleList.map(mod => [mod.id, mod]));
    const batchLookup = new Map(batchList.map(batch => [batch.id, batch]));
    const programLookup = new Map(programList.map(program => [program.id, program]));

    return Promise.all(studentList.map(async (student) => {
      const history = await dbService.getStudentAttendanceHistory(student.id);
      const totals = { P: 0, A: 0, L: 0, E: 0 };
      const moduleMap = {};

      history.forEach(record => {
        if (totals[record.status] !== undefined) totals[record.status] += 1;
        const mod = record.module || moduleLookup.get(record.moduleId) || {};
        if (!moduleMap[record.moduleId]) {
          const batch = batchLookup.get(mod.batch_id || record.batchId);
          moduleMap[record.moduleId] = {
            moduleId: record.moduleId,
            title: mod.title || record.moduleTitle || 'Unknown Module',
            tutor: mod.tutor || record.tutor || 'Unassigned',
            batchTitle: batch?.title || mod.batch_id || record.batchId || 'Unknown Batch',
            section: mod.section || record.section || student.section,
            stage: mod.stage || student.stage,
            trimester: mod.trimester || student.trimester,
            totals: { P: 0, A: 0, L: 0, E: 0 },
            totalMarked: 0,
            rate: 0,
            records: []
          };
        }
        if (moduleMap[record.moduleId].totals[record.status] !== undefined) {
          moduleMap[record.moduleId].totals[record.status] += 1;
        }
        moduleMap[record.moduleId].totalMarked += 1;
        moduleMap[record.moduleId].records.push(record);
      });

      const totalMarked = totals.P + totals.A + totals.L + totals.E;
      const attended = totals.P + totals.L + totals.E;
      const moduleBreakdown = Object.values(moduleMap).map(item => ({
        ...item,
        rate: item.totalMarked > 0
          ? Math.round(((item.totals.P + item.totals.L + item.totals.E) / item.totalMarked) * 100)
          : 0
      })).sort((a, b) => a.title.localeCompare(b.title));

      const batch = batchLookup.get(student.batch_id);
      const program = programLookup.get(student.program_id);

      return {
        student,
        batchTitle: batch?.title || 'Unknown Batch',
        programTitle: program?.title || 'Unknown Program',
        totals,
        totalMarked,
        attended,
        absent: totals.A,
        rate: totalMarked > 0 ? Math.round((attended / totalMarked) * 100) : 0,
        moduleBreakdown
      };
    }));
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

    const roster = await dbService.getEnrolledStudents(managedModuleId, newModSection || null);
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

  const saveManagedModuleRegistrationContext = async () => {
    if (!managedModuleId || !newModTutor.trim()) {
      alert("Please select a module and enter the tutor name for this registration.");
      return false;
    }

    await dbService.updateModule(managedModuleId, {
      trimester: newModTri,
      batch_id: newModBatch,
      section: newModSection,
      tutor: newModTutor.trim()
    });

    return true;
  };

  const ensureSelectedStageUnitModules = async () => {
    const selectedUnits = (STAGE_UNIT_TEMPLATES[unitEnrollStage] || [])
      .slice(0, 6)
      .filter(unit => selectedStageUnitIds.includes(unit.id));
    const resolvedModuleIds = [];
    const knownModules = [...modules];

    for (const unit of selectedUnits) {
      const moduleId = buildStageUnitModuleId(unitEnrollProgram, unitEnrollStage, unit.id, unitEnrollBatch, unitEnrollSection);
      const existingModule = knownModules.find(mod => mod.id === moduleId);

      if (existingModule) {
        await dbService.updateModule(moduleId, {
          title: unit.title,
          program_id: unitEnrollProgram,
          stage: unitEnrollStage,
          trimester: unit.trimester,
          batch_id: unitEnrollBatch,
          section: unitEnrollSection
        });
      } else {
        await dbService.addModule(
          moduleId,
          unit.title,
          unitEnrollProgram,
          unitEnrollStage,
          unit.trimester,
          'Unassigned',
          unitEnrollBatch,
          unitEnrollSection
        );
        knownModules.push({
          id: moduleId,
          title: unit.title,
          program_id: unitEnrollProgram,
          stage: parseInt(unitEnrollStage),
          trimester: unit.trimester,
          tutor: 'Unassigned',
          tutor_id: null,
          batch_id: unitEnrollBatch,
          section: unitEnrollSection
        });
      }

      resolvedModuleIds.push(moduleId);
    }

    return resolvedModuleIds;
  };

  const handleEnrollStageUnits = async () => {
    if (!unitEnrollProgram || !unitEnrollStage || !unitEnrollBatch || !unitEnrollSection) {
      alert("Please choose the program, stage, batch, and section.");
      return;
    }

    if (selectedStageUnitIds.length === 0) {
      alert("Please select at least one stage unit.");
      return;
    }

    const studentIds = unitEnrollMode === 'all'
      ? unitEnrollCandidateStudents.map(student => student.id)
      : unitEnrollSelectedStudents;

    if (studentIds.length === 0) {
      alert(unitEnrollMode === 'all'
        ? "No matching active students are available for this batch and section."
        : "Please select at least one student.");
      return;
    }

    const moduleIds = await ensureSelectedStageUnitModules();
    await Promise.all(moduleIds.map(moduleId => dbService.bulkEnroll(studentIds, moduleId)));

    Swal.fire({
      icon: 'success',
      title: 'Students enrolled',
      text: `Enrolled ${studentIds.length} student(s) into ${moduleIds.length} selected unit(s).`
    });
    setUnitEnrollSelectedStudents([]);
    await loadAllAdminData();
  };

  const handleRegisterAllForManagedModule = async () => {
    if (!managedModuleId) return;
    const saved = await saveManagedModuleRegistrationContext();
    if (!saved) return;

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
    const saved = await saveManagedModuleRegistrationContext();
    if (!saved) return;

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
    const saved = await saveManagedModuleRegistrationContext();
    if (!saved) return;

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

  const handleAssignTutorToModule = async () => {
    if (!requireFullAdmin()) return;
    if (!assignmentModuleId) {
      Swal.fire({
        icon: 'error',
        title: 'Module required',
        text: 'Please select a module instance to assign.'
      });
      return;
    }

    const tutor = tutors.find(t => t.id === assignmentTutorId);
    if (!tutor) {
      Swal.fire({
        icon: 'error',
        title: 'Tutor required',
        text: 'Please select a tutor account.'
      });
      return;
    }

    if (!assignmentStartDate || !assignmentEndDate || assignmentStartDate > assignmentEndDate) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid date window',
        text: 'Please provide a valid assignment start and end date.'
      });
      return;
    }

    await dbService.updateModule(assignmentModuleId, {
      tutor: tutor.name,
      tutor_id: tutor.id,
      class_start_date: assignmentStartDate,
      class_end_date: assignmentEndDate
    });

    Swal.fire({
      icon: 'success',
      title: 'Tutor assigned',
      text: `${tutor.name} has been assigned to this module.`
    });
    await loadAllAdminData();
  };

  const handleAddTutor = async () => {
    if (!requireFullAdmin()) return;
    if (!newTutorName.trim() || !newTutorEmail.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Tutor details required',
        text: 'Please enter tutor name and college email.'
      });
      return;
    }

    const result = await dbService.addTutor(
      newTutorName.trim(),
      newTutorEmail.trim(),
      newTutorPhone.trim(),
      newTutorDepartment.trim()
    );

    if (result?.error) {
      Swal.fire({
        icon: 'error',
        title: 'Tutor not created',
        text: result.error
      });
      return;
    }

    Swal.fire({
      icon: 'success',
      title: 'Tutor account created',
      html: `Username: <strong>${result.email}</strong><br />Default password: <strong>ChangeMe@123</strong>`
    });
    setNewTutorName('');
    setNewTutorEmail('');
    setNewTutorPhone('');
    setNewTutorDepartment('');
    await loadAllAdminData();
  };

  const requirePermission = (permissionId) => {
    if (hasPermission(permissionId)) return true;
    Swal.fire({
      icon: 'error',
      title: 'Permission denied',
      text: 'Your admin account is not allowed to perform this action.'
    });
    return false;
  };

  const requireFullAdmin = () => requirePermission('access');

  const toggleNewAdminPermission = (permissionId) => {
    setNewAdminPermissions(prev => (
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    ));
  };

  const handleAddAdmin = async () => {
    if (!requireFullAdmin()) return;
    if (!newAdminName.trim() || !newAdminEmail.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Admin details required',
        text: 'Please enter admin name and email.'
      });
      return;
    }
    if (newAdminPrivilege === 'partial' && newAdminPermissions.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Permissions required',
        text: 'Please select at least one allowed area for this partial admin.'
      });
      return;
    }

    const permissions = newAdminPrivilege === 'full' ? ALL_ADMIN_PERMISSIONS : newAdminPermissions;
    const result = await dbService.addAdmin(newAdminName.trim(), newAdminEmail.trim(), newAdminPrivilege, permissions);
    if (result?.error) {
      Swal.fire({
        icon: 'error',
        title: 'Admin not created',
        text: result.error
      });
      return;
    }

    Swal.fire({
      icon: 'success',
      title: 'Admin user created',
      html: `Username: <strong>${result.email}</strong><br />Default password: <strong>Admin@123</strong><br />Privilege: <strong>${result.privilege === 'full' ? 'Full' : 'Partial'}</strong>`
    });
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminPrivilege('partial');
    setNewAdminPermissions(DEFAULT_PARTIAL_ADMIN_PERMISSIONS);
    await loadAllAdminData();
  };

  const handleResetTutorPassword = async () => {
    if (!requireFullAdmin()) return;
    if (!resetTutorId) return;
    const tutor = tutors.find(item => item.id === resetTutorId);
    const updated = await dbService.resetTutorPassword(resetTutorId);
    Swal.fire({
      icon: updated ? 'success' : 'error',
      title: updated ? 'Tutor password reset' : 'Reset failed',
      html: updated
        ? `${tutor?.name || 'Tutor'} can now log in with <strong>ChangeMe@123</strong>.`
        : 'Unable to reset tutor password.'
    });
    await loadAllAdminData();
  };

  const handleResetStudentPassword = async () => {
    if (!requireFullAdmin()) return;
    if (!resetStudentId) return;
    const student = students.find(item => item.id === resetStudentId);
    const updated = await dbService.resetStudentPassword(resetStudentId);
    Swal.fire({
      icon: updated ? 'success' : 'error',
      title: updated ? 'Student password reset' : 'Reset failed',
      html: updated
        ? `${student?.name || 'Student'} can now log in with <strong>Student@123</strong>.`
        : 'Unable to reset student password.'
    });
    await loadAllAdminData();
  };

  const handleEditAssignment = (moduleId) => {
    setAssignmentModuleId(moduleId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAssignment = async (mod) => {
    if (!requireFullAdmin()) return;
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Remove tutor assignment?',
      text: `This will unassign ${mod.tutor || 'the tutor'} from ${mod.title}.`,
      showCancelButton: true,
      confirmButtonText: 'Remove Assignment',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626'
    });

    if (!result.isConfirmed) return;

    await dbService.updateModule(mod.id, {
      tutor: 'Unassigned',
      tutor_id: null,
      class_start_date: null,
      class_end_date: null
    });

    Swal.fire({
      icon: 'success',
      title: 'Assignment removed',
      text: 'The tutor assignment has been deleted.'
    });
    await loadAllAdminData();
  };

  // --- Leave Application Auditing ---
  const handleAuditLeave = async (leaveId, status) => {
    if (!requireFullAdmin()) return;
    await dbService.auditLeave(leaveId, status);
    alert(`Leave application marked as ${status}.`);
    const lvs = await dbService.getLeaves();
    setLeaves(lvs);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!requireFullAdmin()) return;
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
        newStudentBatch,
        {
          contact_number: newStudentContact,
          personal_email: newStudentPersonalEmail,
          college_email: newStudentCollegeEmail,
          parent_name: newStudentParentName,
          parent_contact_number: newStudentParentContact,
          student_code: newStudentCode
        }
      );
      Swal.fire({
        icon: 'success',
        title: 'Student Registered',
        html: `Successfully registered new student: <strong>${s.name}</strong><br />Username: <strong>${s.email}</strong><br />Default password: <strong>Student@123</strong>`,
        confirmButtonColor: 'var(--brand-orange)',
      });
      setNewStudentName('');
      setNewStudentContact('');
      setNewStudentPersonalEmail('');
      setNewStudentCollegeEmail('');
      setNewStudentParentName('');
      setNewStudentParentContact('');
      setNewStudentCode('');
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
    if (!newModId || !newModTitle || !newModProg || !newModStage) {
      alert("Please fill in module code, title, program, and stage.");
      return;
    }

    const defaultBatchId = batches[0]?.id || 'jan_2026';

    await dbService.addModule(
      newModId,
      newModTitle,
      newModProg,
      newModStage,
      1,
      'Unassigned',
      defaultBatchId,
      'A'
    );

    alert("New academic module created successfully. It is now available in the configured modules ledger.");
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

  const selectedUnitEnrollBatchObj = batches.find(b => b && b.id === unitEnrollBatch);
  const allowedUnitEnrollSections = selectedUnitEnrollBatchObj?.sections
    ? selectedUnitEnrollBatchObj.sections.split(',').map(s => s.trim())
    : ['A', 'B'];

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
        .filter(s => s.trimester === parseInt(newModTri))
        .filter(s => s.batch_id === newModBatch)
        .filter(s => s.section === newModSection)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const managedModuleAvailableStudents = managedModuleCandidateStudents
    .filter(s => !managedRosterIds.includes(s.id));

  const selectedStageUnits = (STAGE_UNIT_TEMPLATES[unitEnrollStage] || []).slice(0, 6);
  const unitEnrollCandidateStudents = students
    .filter(s => s.status === 'Active')
    .filter(s => s.program_id === unitEnrollProgram)
    .filter(s => s.stage === parseInt(unitEnrollStage))
    .filter(s => s.batch_id === unitEnrollBatch)
    .filter(s => s.section === unitEnrollSection)
    .sort((a, b) => a.name.localeCompare(b.name));
  const selectedStageUnitModuleIds = selectedStageUnits
    .filter(unit => selectedStageUnitIds.includes(unit.id))
    .map(unit => buildStageUnitModuleId(unitEnrollProgram, unitEnrollStage, unit.id, unitEnrollBatch, unitEnrollSection));
  const selectedStageUnitRegisteredTotal = selectedStageUnitModuleIds.reduce(
    (total, moduleId) => total + (moduleEnrollmentCounts[moduleId] || 0),
    0
  );
  const assignmentFilteredModules = modules
    .filter(mod => !assignmentProgramFilter || mod.program_id === assignmentProgramFilter)
    .filter(mod => !assignmentBatchFilter || mod.batch_id === assignmentBatchFilter)
    .filter(mod => !assignmentSectionFilter || mod.section === assignmentSectionFilter)
    .sort((a, b) => `${a.program_id}-${a.batch_id}-${a.section}-${a.title}`.localeCompare(`${b.program_id}-${b.batch_id}-${b.section}-${b.title}`));
  const assignmentSelectedModule = modules.find(mod => mod.id === assignmentModuleId);
  const assignmentTutorLoads = tutors
    .filter(tutor => tutor.status === 'Active')
    .map(tutor => {
    const assignedModules = modules.filter(mod => mod.tutor_id === tutor.id || mod.tutor === tutor.name);
    return {
      tutor: tutor.name,
      email: tutor.email,
      moduleCount: assignedModules.length,
      batchCount: new Set(assignedModules.map(mod => mod.batch_id)).size,
      sectionCount: new Set(assignedModules.map(mod => `${mod.batch_id}-${mod.section}`)).size
    };
  });
  const assignedModuleRows = modules
    .filter(mod => mod.tutor && mod.tutor !== 'Unassigned')
    .sort((a, b) => `${a.tutor}-${a.batch_id}-${a.section}-${a.title}`.localeCompare(`${b.tutor}-${b.batch_id}-${b.section}-${b.title}`));

  // Filter Directory Table
  const filteredStudents = students.filter(s => {
    if (adminProgFilter && s.program_id !== adminProgFilter) return false;
    if (adminStageFilter && s.stage !== parseInt(adminStageFilter)) return false;
    if (adminBatchFilter && s.batch_id !== adminBatchFilter) return false;
    return true;
  });
  const attendanceMonthMatches = (date) => !attendanceMonthFilter || (date || '').slice(0, 7) === attendanceMonthFilter;
  const recalculateModuleAttendance = (item) => {
    const records = (item.records || []).filter(record => attendanceMonthMatches(record.date));
    const totals = records.reduce((acc, record) => {
      if (acc[record.status] !== undefined) acc[record.status] += 1;
      return acc;
    }, { P: 0, A: 0, L: 0, E: 0 });
    const totalMarked = totals.P + totals.A + totals.L + totals.E;
    const attended = totals.P + totals.L + totals.E;
    return {
      ...item,
      records,
      totals,
      totalMarked,
      rate: totalMarked > 0 ? Math.round((attended / totalMarked) * 100) : 0
    };
  };
  const attendanceMonthOptions = Array.from(new Set(
    attendanceSummaries.flatMap(summary => summary.moduleBreakdown.flatMap(item => (item.records || []).map(record => (record.date || '').slice(0, 7))))
  )).filter(Boolean).sort((a, b) => b.localeCompare(a));
  const monthFilteredAttendanceSummaries = attendanceSummaries.map(summary => {
    const moduleBreakdown = summary.moduleBreakdown
      .map(recalculateModuleAttendance)
      .filter(item => item.totalMarked > 0);
    const totals = moduleBreakdown.reduce((acc, item) => {
      acc.P += item.totals.P;
      acc.A += item.totals.A;
      acc.L += item.totals.L;
      acc.E += item.totals.E;
      return acc;
    }, { P: 0, A: 0, L: 0, E: 0 });
    const totalMarked = totals.P + totals.A + totals.L + totals.E;
    const attended = totals.P + totals.L + totals.E;
    return {
      ...summary,
      totals,
      totalMarked,
      attended,
      absent: totals.A,
      rate: totalMarked > 0 ? Math.round((attended / totalMarked) * 100) : 0,
      moduleBreakdown
    };
  });
  const filteredAttendanceSummaries = monthFilteredAttendanceSummaries.filter(summary => {
    const s = summary.student;
    const query = studentSearch.trim().toLowerCase();
    if (adminProgFilter && s.program_id !== adminProgFilter) return false;
    if (adminStageFilter && s.stage !== parseInt(adminStageFilter)) return false;
    if (adminBatchFilter && s.batch_id !== adminBatchFilter) return false;
    if (attendanceModuleFilter && !summary.moduleBreakdown.some(item => item.moduleId === attendanceModuleFilter)) return false;
    if (query) {
      const searchable = `${s.name} ${s.email} ${s.student_code || ''} ${summary.batchTitle} ${summary.programTitle}`.toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  }).sort((a, b) => a.student.name.localeCompare(b.student.name));
  const visibleAttendanceSummaries = filteredAttendanceSummaries.filter(summary => summary.totalMarked > 0);
  const selectedAttendanceModule = modules.find(mod => mod.id === attendanceModuleFilter);
  const selectedAttendanceBatch = selectedAttendanceModule
    ? batches.find(batch => batch.id === selectedAttendanceModule.batch_id)
    : null;
  const selectedAttendanceProgram = selectedAttendanceModule
    ? programs.find(program => program.id === selectedAttendanceModule.program_id)
    : null;
  const attendanceSummaryByStudentId = new Map(monthFilteredAttendanceSummaries.map(summary => [summary.student.id, summary]));
  const registerRows = attendanceModuleFilter
    ? attendanceRegisterStudents
        .filter(student => {
          const query = studentSearch.trim().toLowerCase();
          if (adminProgFilter && student.program_id !== adminProgFilter) return false;
          if (adminStageFilter && student.stage !== parseInt(adminStageFilter)) return false;
          if (adminBatchFilter && student.batch_id !== adminBatchFilter) return false;
          if (!query) return true;
          const summary = attendanceSummaryByStudentId.get(student.id);
          const searchable = `${student.name} ${student.email} ${student.student_code || ''} ${summary?.batchTitle || ''} ${summary?.programTitle || ''}`.toLowerCase();
          return searchable.includes(query);
        })
        .map(student => {
          const fallbackBatch = batches.find(batch => batch.id === student.batch_id);
          const fallbackProgram = programs.find(program => program.id === student.program_id);
          const summary = attendanceSummaryByStudentId.get(student.id) || {
            student,
            batchTitle: fallbackBatch?.title || 'Unknown Batch',
            programTitle: fallbackProgram?.title || 'Unknown Program',
            moduleBreakdown: []
          };
          const emptyModuleAttendance = {
            moduleId: attendanceModuleFilter,
            title: selectedAttendanceModule?.title || 'Unknown Module',
            tutor: selectedAttendanceModule?.tutor || 'Unassigned',
            batchTitle: selectedAttendanceBatch?.title || selectedAttendanceModule?.batch_id || 'Unknown Batch',
            section: selectedAttendanceModule?.section || student.section,
            stage: selectedAttendanceModule?.stage || student.stage,
            trimester: selectedAttendanceModule?.trimester || student.trimester,
            totals: { P: 0, A: 0, L: 0, E: 0 },
            totalMarked: 0,
            rate: 0,
            records: []
          };
          return {
            ...summary,
            student,
            moduleAttendance: summary.moduleBreakdown.find(item => item.moduleId === attendanceModuleFilter) || emptyModuleAttendance
          };
        })
    : [];
  const registerDateColumns = Array.from(new Set(
    registerRows.flatMap(summary => (summary.moduleAttendance?.records || []).map(record => record.date))
  )).sort((a, b) => new Date(a) - new Date(b));

  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const activeStudentsCount = students.filter(s => s.status === 'Active').length;
  const activeAdmin = admins.find(admin => admin.id === adminId) || admins.find(admin => admin.privilege === 'full') || null;
  const isFullAdmin = !activeAdmin || activeAdmin.privilege === 'full';
  const activeAdminPermissions = isFullAdmin
    ? ALL_ADMIN_PERMISSIONS
    : (Array.isArray(activeAdmin?.permissions) && activeAdmin.permissions.length > 0
      ? activeAdmin.permissions
      : DEFAULT_PARTIAL_ADMIN_PERMISSIONS);
  const hasPermission = (permissionId) => isFullAdmin || activeAdminPermissions.includes(permissionId);
  const sectionCount = new Set(
    batches.flatMap(b => b && b.sections ? b.sections.split(',').map(s => s.trim()) : [])
  ).size;
  const adminTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'operations', label: 'Cohort Ops' },
    { id: 'setup', label: 'Setup' },
    { id: 'leaves', label: 'Leaves' },
    { id: 'students', label: 'Students' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'access', label: 'Access' },
    { id: 'modules', label: 'Modules' },
    { id: 'assignments', label: 'Tutor Assignments' },
    { id: 'batches', label: 'Batches' },
    { id: 'programs', label: 'Programs' },
    { id: 'migrations', label: 'History' }
  ].filter(tab => hasPermission(tab.id));
  const directoryTabs = ['students', 'attendance', 'access', 'modules', 'assignments', 'batches', 'programs', 'migrations'].filter(hasPermission);

  useEffect(() => {
    if (adminTabs.length > 0 && !adminTabs.some(tab => tab.id === activeTab)) {
      setActiveTab(adminTabs[0].id);
    }
  }, [activeTab, adminTabs]);

  return (
    <div className="admin-console">
      <section className="admin-command-center">
        <div className="admin-command-copy">
          <span className="admin-eyebrow">Administrator workspace</span>
          <h2>Academic Operations Control</h2>
          <p>Manage cohorts, student records, intakes, modules, and leave decisions from one focused console.</p>
          {activeAdmin && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBlockStart: '0.35rem' }}>
              Signed in as <strong>{activeAdmin.name}</strong> • {isFullAdmin ? 'Full administrator' : 'Partial administrator'}
            </p>
          )}
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
      {((activeTab === 'overview' && hasPermission('leaves')) || activeTab === 'leaves') && (
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
      {((activeTab === 'overview' && hasPermission('setup')) || activeTab === 'setup') && (
      <div className="admin-grid">

        {/* Left: Quick Setup additions */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBlockEnd: '1rem', color: 'var(--brand-blue)' }}>Quick Setup Panel</h3>

          <form onSubmit={handleAddStudent} style={{ marginBlockEnd: '1.5rem', borderBlockEnd: '1px solid var(--border-glass)', paddingBlockEnd: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBlockEnd: '0.5rem' }}>Enroll New Student</h4>

            <div className="form-group" style={{ marginBlockEnd: '0.75rem' }}>
              <label>Student Name <span style={{ color: 'var(--accent-absent)' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Grishma Amatya"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                required
              />
            </div>

            <div className="student-enrollment-grid">
              <div className="form-group">
                <label>Student ID</label>
                <input type="text" className="form-input" placeholder="e.g. ISMT-2026-001" value={newStudentCode} onChange={(e) => setNewStudentCode(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input type="tel" className="form-input" placeholder="Student phone" value={newStudentContact} onChange={(e) => setNewStudentContact(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Personal Email</label>
                <input type="email" className="form-input" placeholder="personal@example.com" value={newStudentPersonalEmail} onChange={(e) => setNewStudentPersonalEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>College Email</label>
                <input type="email" className="form-input" placeholder="student@ismt.edu.np" value={newStudentCollegeEmail} onChange={(e) => setNewStudentCollegeEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Parent Name</label>
                <input type="text" className="form-input" placeholder="Parent or guardian" value={newStudentParentName} onChange={(e) => setNewStudentParentName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Parent Contact Number</label>
                <input type="tel" className="form-input" placeholder="Parent phone" value={newStudentParentContact} onChange={(e) => setNewStudentParentContact(e.target.value)} />
              </div>
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
              Enroll Student
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
              { id: 'attendance', label: 'Attendance' },
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
                  placeholder="Search student name, email, ID, or contact..."
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
                        const codeMatch = (s.student_code || '').toLowerCase().includes(studentSearch.toLowerCase());
                        const contactMatch = (s.contact_number || '').toLowerCase().includes(studentSearch.toLowerCase());
                        return nameMatch || emailMatch || codeMatch || contactMatch;
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
                                  {(s.student_code || s.contact_number) && (
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                      {s.student_code ? `ID: ${s.student_code}` : ''}{s.student_code && s.contact_number ? ' • ' : ''}{s.contact_number || ''}
                                    </span>
                                  )}
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

          {/* TAB: ATTENDANCE OVERVIEW */}
          {activeTab === 'attendance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--brand-blue)', marginBlockEnd: '0.2rem' }}>Attendance</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Review overall attendance cards or switch to a monthly module register sheet.
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button type="button" className={`admin-workspace-tab ${attendanceViewMode === 'overall' ? 'active' : ''}`} onClick={() => setAttendanceViewMode('overall')}>Overall View</button>
                <button type="button" className={`admin-workspace-tab ${attendanceViewMode === 'register' ? 'active' : ''}`} onClick={() => setAttendanceViewMode('register')}>Register View</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <input type="text" className="form-input" placeholder="Search student, email, batch..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                <select className="form-select" value={adminProgFilter} onChange={(e) => setAdminProgFilter(e.target.value)}>
                  <option value="">All Programs</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <select className="form-select" value={adminBatchFilter} onChange={(e) => setAdminBatchFilter(e.target.value)}>
                  <option value="">All Batches</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
                <select className="form-select" value={adminStageFilter} onChange={(e) => setAdminStageFilter(e.target.value)}>
                  <option value="">All Stages</option>
                  <option value="1">Stage 1</option>
                  <option value="2">Stage 2</option>
                  <option value="3">Stage 3</option>
                </select>
                <select className="form-select" value={attendanceMonthFilter} onChange={(e) => setAttendanceMonthFilter(e.target.value)}>
                  <option value="">All Months</option>
                  {attendanceMonthOptions.map(month => (
                    <option key={month} value={month}>{new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>
                  ))}
                </select>
                <select className="form-select" value={attendanceModuleFilter} onChange={(e) => setAttendanceModuleFilter(e.target.value)}>
                  <option value="">{attendanceViewMode === 'register' ? 'Select Module Register' : 'All Modules'}</option>
                  {modules.slice().sort((a, b) => a.title.localeCompare(b.title)).map(mod => (
                    <option key={mod.id} value={mod.id}>{mod.title} | {mod.tutor || 'Unassigned'} | Sec {mod.section}</option>
                  ))}
                </select>
              </div>

              {attendanceViewMode === 'overall' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                    <div className="admin-metric-card"><span>Students Shown</span><strong>{visibleAttendanceSummaries.length}</strong></div>
                    <div className="admin-metric-card"><span>Marked Records</span><strong>{visibleAttendanceSummaries.reduce((sum, item) => sum + item.totalMarked, 0)}</strong></div>
                    <div className="admin-metric-card">
                      <span>Average Rate</span>
                      <strong>{visibleAttendanceSummaries.length > 0 ? Math.round(visibleAttendanceSummaries.reduce((sum, item) => sum + item.rate, 0) / visibleAttendanceSummaries.length) : 0}%</strong>
                    </div>
                  </div>

                  {visibleAttendanceSummaries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                      No attendance records match the selected filters.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {visibleAttendanceSummaries.map(summary => {
                        const s = summary.student;
                        return (
                          <div key={`attendance-card-${s.id}`} style={{ border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '1rem', background: 'rgba(255,255,255,0.75)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(5, minmax(70px, 0.35fr))', gap: '0.75rem', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ margin: 0, color: 'var(--brand-blue)', fontSize: '0.95rem' }}>{s.name}</h4>
                                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                  {summary.programTitle} • {summary.batchTitle} • Stage {s.stage} Tri {s.trimester} • Sec {s.section}
                                </p>
                                <code style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{s.student_code || s.id}</code>
                              </div>
                              <div><span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)' }}>Rate</span><strong style={{ color: summary.rate >= 80 ? 'var(--accent-present)' : summary.rate >= 60 ? 'var(--accent-late)' : 'var(--accent-absent)' }}>{summary.rate}%</strong></div>
                              <div><span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)' }}>Present</span><strong>{summary.totals.P}</strong></div>
                              <div><span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)' }}>Late</span><strong>{summary.totals.L}</strong></div>
                              <div><span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)' }}>Excused</span><strong>{summary.totals.E}</strong></div>
                              <div><span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)' }}>Absent</span><strong style={{ color: 'var(--accent-absent)' }}>{summary.totals.A}</strong></div>
                            </div>

                            <div style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px', marginBlockStart: '0.85rem' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', minWidth: '760px' }}>
                                <thead>
                                  <tr style={{ background: 'rgba(15, 23, 42, 0.04)', color: 'var(--brand-blue)' }}>
                                    <th style={{ padding: '0.65rem', textAlign: 'left' }}>Module</th>
                                    <th style={{ padding: '0.65rem', textAlign: 'left' }}>Batch / Section</th>
                                    <th style={{ padding: '0.65rem', textAlign: 'left' }}>Tutor</th>
                                    <th style={{ padding: '0.65rem', textAlign: 'center' }}>P</th>
                                    <th style={{ padding: '0.65rem', textAlign: 'center' }}>L</th>
                                    <th style={{ padding: '0.65rem', textAlign: 'center' }}>E</th>
                                    <th style={{ padding: '0.65rem', textAlign: 'center' }}>A</th>
                                    <th style={{ padding: '0.65rem', textAlign: 'center' }}>Rate</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {summary.moduleBreakdown.map(item => (
                                    <tr key={`${s.id}-${item.moduleId}`} style={{ borderBlockStart: '1px solid var(--border-glass)' }}>
                                      <td style={{ padding: '0.65rem', fontWeight: 700 }}>{item.title}</td>
                                      <td style={{ padding: '0.65rem' }}>{item.batchTitle} • Sec {item.section} • S{item.stage}T{item.trimester}</td>
                                      <td style={{ padding: '0.65rem' }}>{item.tutor || 'Unassigned'}</td>
                                      <td style={{ padding: '0.65rem', textAlign: 'center' }}>{item.totals.P}</td>
                                      <td style={{ padding: '0.65rem', textAlign: 'center' }}>{item.totals.L}</td>
                                      <td style={{ padding: '0.65rem', textAlign: 'center' }}>{item.totals.E}</td>
                                      <td style={{ padding: '0.65rem', textAlign: 'center', color: 'var(--accent-absent)', fontWeight: 800 }}>{item.totals.A}</td>
                                      <td style={{ padding: '0.65rem', textAlign: 'center', color: item.rate >= 80 ? 'var(--accent-present)' : item.rate >= 60 ? 'var(--accent-late)' : 'var(--accent-absent)', fontWeight: 900 }}>{item.rate}%</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {attendanceViewMode === 'register' && (
                <>
                  {selectedAttendanceModule && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '0.85rem', background: 'rgba(15, 23, 42, 0.02)' }}>
                      <div><span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>MODULE</span><strong style={{ color: 'var(--brand-blue)' }}>{selectedAttendanceModule.title}</strong></div>
                      <div><span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>TUTOR</span><strong>{selectedAttendanceModule.tutor || 'Unassigned'}</strong></div>
                      <div><span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>BATCH / SECTION</span><strong>{selectedAttendanceBatch?.title || selectedAttendanceModule.batch_id || 'Unknown'} - Sec {selectedAttendanceModule.section}</strong></div>
                      <div><span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>PROGRAM</span><strong>{selectedAttendanceProgram?.title || selectedAttendanceModule.program_id}</strong></div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                    <div className="admin-metric-card"><span>Students In Register</span><strong>{registerRows.length}</strong></div>
                    <div className="admin-metric-card"><span>Register Dates</span><strong>{registerDateColumns.length}</strong></div>
                    <div className="admin-metric-card">
                      <span>Average Rate</span>
                      <strong>{registerRows.length > 0 ? Math.round(registerRows.reduce((sum, item) => sum + (item.moduleAttendance?.rate || 0), 0) / registerRows.length) : 0}%</strong>
                    </div>
                  </div>

                  {!attendanceModuleFilter ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                      Please select a module to display the register.
                    </div>
                  ) : registerRows.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                      No enrolled students are available for this module.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${620 + registerDateColumns.length * 44}px`, fontSize: '0.78rem' }}>
                        <thead>
                          <tr style={{ background: 'rgba(15, 23, 42, 0.04)', color: 'var(--brand-blue)' }}>
                            <th style={{ padding: '0.7rem', textAlign: 'center', border: '1px solid var(--border-glass)', width: '48px' }}>SN</th>
                            <th style={{ padding: '0.7rem', textAlign: 'left', border: '1px solid var(--border-glass)', minWidth: '210px' }}>Name of Student</th>
                            <th style={{ padding: '0.7rem', textAlign: 'left', border: '1px solid var(--border-glass)', minWidth: '120px' }}>Student ID</th>
                            {registerDateColumns.map(date => (
                              <th key={date} style={{ padding: '0.45rem', textAlign: 'center', border: '1px solid var(--border-glass)', minWidth: '42px' }}>{new Date(date).getDate()}</th>
                            ))}
                            <th style={{ padding: '0.7rem', textAlign: 'center', border: '1px solid var(--border-glass)' }}>P</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', border: '1px solid var(--border-glass)' }}>L</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', border: '1px solid var(--border-glass)' }}>E</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', border: '1px solid var(--border-glass)' }}>A</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', border: '1px solid var(--border-glass)' }}>Attendance %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registerRows.map((summary, idx) => {
                            const s = summary.student;
                            const item = summary.moduleAttendance;
                            const recordMap = new Map((item.records || []).map(record => [record.date, record]));
                            return (
                              <tr key={`${s.id}-${item.moduleId}`}>
                                <td style={{ padding: '0.6rem', textAlign: 'center', border: '1px solid var(--border-glass)', fontWeight: 700 }}>{idx + 1}</td>
                                <td style={{ padding: '0.6rem', border: '1px solid var(--border-glass)', fontWeight: 700 }}>{s.name}</td>
                                <td style={{ padding: '0.6rem', border: '1px solid var(--border-glass)' }}>{s.student_code || s.id}</td>
                                {registerDateColumns.map(date => {
                                  const status = recordMap.get(date)?.status || '';
                                  return (
                                    <td key={`${s.id}-${date}`} style={{ padding: '0.45rem', textAlign: 'center', border: '1px solid var(--border-glass)', fontWeight: 800, color: status === 'A' ? 'var(--accent-absent)' : status === 'L' ? 'var(--accent-late)' : status === 'E' ? 'var(--brand-blue)' : 'var(--accent-present)' }}>
                                      {status || '-'}
                                    </td>
                                  );
                                })}
                                <td style={{ padding: '0.6rem', textAlign: 'center', border: '1px solid var(--border-glass)' }}>{item.totals.P}</td>
                                <td style={{ padding: '0.6rem', textAlign: 'center', border: '1px solid var(--border-glass)' }}>{item.totals.L}</td>
                                <td style={{ padding: '0.6rem', textAlign: 'center', border: '1px solid var(--border-glass)' }}>{item.totals.E}</td>
                                <td style={{ padding: '0.6rem', textAlign: 'center', border: '1px solid var(--border-glass)', color: 'var(--accent-absent)', fontWeight: 800 }}>{item.totals.A}</td>
                                <td style={{ padding: '0.6rem', textAlign: 'center', border: '1px solid var(--border-glass)', fontWeight: 900, color: item.rate >= 80 ? 'var(--accent-present)' : item.rate >= 60 ? 'var(--accent-late)' : 'var(--accent-absent)' }}>{item.rate}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB: ACCESS CONTROL */}
          {activeTab === 'access' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--brand-blue)', marginBlockEnd: '0.2rem' }}>Admin Access Control</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Create admin accounts and reset tutor or student passwords. Full administrator access is required.
                </p>
              </div>

              {!isFullAdmin && (
                <div style={{ border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', padding: '0.85rem', color: 'var(--accent-late)', background: 'rgba(245, 158, 11, 0.08)', fontSize: '0.85rem' }}>
                  You are signed in as a partial administrator. Access tools are visible, but changes are restricted to full administrators.
                </div>
              )}

              <div className="module-admin-workspace">
                <div className="module-builder-panel">
                  <div className="module-panel-heading">
                    <h4>Create Admin User</h4>
                    <span>New admins use email as username and the default password Admin@123</span>
                  </div>
                  <div className="module-builder-grid">
                    <div className="form-group">
                      <label>Admin Name</label>
                      <input className="form-input" placeholder="Full name" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} disabled={!isFullAdmin} />
                    </div>
                    <div className="form-group">
                      <label>Admin Email</label>
                      <input className="form-input" type="email" placeholder="admin@ismt.edu.np" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} disabled={!isFullAdmin} />
                    </div>
                    <div className="form-group">
                      <label>Privilege</label>
                      <select className="form-select" value={newAdminPrivilege} onChange={(e) => setNewAdminPrivilege(e.target.value)} disabled={!isFullAdmin}>
                        <option value="partial">Partial Privilege</option>
                        <option value="full">Full Privilege</option>
                      </select>
                    </div>
                  </div>

                  {newAdminPrivilege === 'partial' && (
                    <div style={{ border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.75rem', marginBlockEnd: '0.85rem', background: 'rgba(15, 23, 42, 0.02)' }}>
                      <h5 style={{ fontSize: '0.85rem', marginBlockEnd: '0.6rem', color: 'var(--brand-blue)' }}>Allowed Areas Checklist</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.55rem' }}>
                        {ADMIN_PERMISSION_OPTIONS.map(permission => (
                          <label key={permission.id} className="checkbox-container" style={{ alignItems: 'flex-start', fontSize: '0.78rem', gap: '0.45rem' }}>
                            <input
                              type="checkbox"
                              checked={newAdminPermissions.includes(permission.id)}
                              onChange={() => toggleNewAdminPermission(permission.id)}
                              disabled={!isFullAdmin}
                            />
                            <span>
                              <strong>{permission.label}</strong>
                              <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.68rem', marginBlockStart: '0.1rem' }}>{permission.description}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <button type="button" className="btn primary" style={{ justifyContent: 'center', width: '100%' }} onClick={handleAddAdmin} disabled={!isFullAdmin}>
                    Create Admin
                  </button>
                </div>

                <div className="module-roster-panel">
                  <div className="module-panel-heading">
                    <h4>Password Resets</h4>
                    <span>Reset users back to their default password and force change on next login</span>
                  </div>

                  <div className="form-group">
                    <label>Tutor Account</label>
                    <select className="form-select" value={resetTutorId} onChange={(e) => setResetTutorId(e.target.value)} disabled={!isFullAdmin}>
                      {tutors.map(tutor => (
                        <option key={tutor.id} value={tutor.id}>{tutor.name} | {tutor.email}</option>
                      ))}
                    </select>
                    <button type="button" className="btn" style={{ width: '100%', justifyContent: 'center', marginBlockStart: '0.5rem' }} onClick={handleResetTutorPassword} disabled={!isFullAdmin || !resetTutorId}>
                      Reset Tutor Password
                    </button>
                  </div>

                  <div className="form-group">
                    <label>Student Account</label>
                    <select className="form-select" value={resetStudentId} onChange={(e) => setResetStudentId(e.target.value)} disabled={!isFullAdmin}>
                      {students.slice().sort((a, b) => a.name.localeCompare(b.name)).map(student => (
                        <option key={student.id} value={student.id}>{student.name} | {student.email}</option>
                      ))}
                    </select>
                    <button type="button" className="btn" style={{ width: '100%', justifyContent: 'center', marginBlockStart: '0.5rem' }} onClick={handleResetStudentPassword} disabled={!isFullAdmin || !resetStudentId}>
                      Reset Student Password
                    </button>
                  </div>
                </div>
              </div>

              <div className="module-ledger-grid">
                {admins.map(admin => (
                  <div key={admin.id} className="module-ledger-card">
                    <div>
                      <code>{admin.email}</code>
                      <h4>{admin.name}</h4>
                      <p>{admin.privilege === 'full' ? 'Full administrator' : 'Partial administrator'}</p>
                    </div>
                    <div className="module-ledger-meta">
                      <span>{admin.status || 'Active'}</span>
                      <span>{admin.privilege === 'full' ? 'Complete system privileges' : `${(admin.permissions || DEFAULT_PARTIAL_ADMIN_PERMISSIONS).length} allowed area(s)`}</span>
                      {admin.privilege !== 'full' && (
                        <span>{ADMIN_PERMISSION_OPTIONS.filter(permission => (admin.permissions || DEFAULT_PARTIAL_ADMIN_PERMISSIONS).includes(permission.id)).map(permission => permission.label).join(', ')}</span>
                      )}
                    </div>
                  </div>
                ))}
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
                        <span>Add the academic module first for a program stage</span>
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
                        <label>Stage</label>
                        <select className="form-select" value={newModStage} onChange={(e) => setNewModStage(e.target.value)}>
                        <option value="1">Stage 1</option>
                        <option value="2">Stage 2</option>
                        <option value="3">Stage 3</option>
                      </select>
                    </div>
                    </div>

                    <button type="button" className="btn primary" style={{ justifyContent: 'center' }} onClick={handleAddModule}>
                      Create Module
                    </button>
                  </div>

                  <div className="module-builder-panel">
                    <div className="module-panel-heading">
                      <h4>Enroll Students To Stage Units</h4>
                      <span>Select up to six units for a stage, then enroll a batch section or custom students</span>
                    </div>

                    <div className="module-builder-grid">
                      <div className="form-group">
                        <label>Program</label>
                        <select className="form-select" value={unitEnrollProgram} onChange={(e) => setUnitEnrollProgram(e.target.value)}>
                          {programs.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Stage</label>
                        <select className="form-select" value={unitEnrollStage} onChange={(e) => setUnitEnrollStage(e.target.value)}>
                          <option value="1">Stage 1</option>
                          <option value="2">Stage 2</option>
                          <option value="3">Stage 3</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Intake Batch</label>
                        <select className="form-select" value={unitEnrollBatch} onChange={(e) => setUnitEnrollBatch(e.target.value)}>
                          {batches.map(b => (
                            <option key={b.id} value={b.id}>{b.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Section</label>
                        <select className="form-select" value={unitEnrollSection} onChange={(e) => setUnitEnrollSection(e.target.value)}>
                          {allowedUnitEnrollSections.map(sec => (
                            <option key={sec} value={sec}>Section {sec}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <label style={{ margin: 0 }}>Stage {unitEnrollStage} Units</label>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ minHeight: '30px', padding: '0.25rem 0.7rem', fontSize: '0.75rem', width: 'auto' }}
                            onClick={() => setSelectedStageUnitIds(selectedStageUnits.map(unit => unit.id))}
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ minHeight: '30px', padding: '0.25rem 0.7rem', fontSize: '0.75rem', width: 'auto' }}
                            onClick={() => setSelectedStageUnitIds([])}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="stage-unit-grid">
                        {selectedStageUnits.map(unit => (
                          <label key={unit.id} className="stage-unit-option">
                            <input
                              type="checkbox"
                              checked={selectedStageUnitIds.includes(unit.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStageUnitIds([...selectedStageUnitIds, unit.id]);
                                } else {
                                  setSelectedStageUnitIds(selectedStageUnitIds.filter(id => id !== unit.id));
                                }
                              }}
                            />
                            <span>
                              <strong>{unit.title}</strong>
                              <small>Trimester {unit.trimester}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBlockStart: '0.4rem' }}>
                        {selectedStageUnitIds.length} of {selectedStageUnits.length} stage units selected. Current registrations across selected units: {selectedStageUnitRegisteredTotal}.
                      </p>
                    </div>

                    <div className="form-group">
                      <label>Registration Type</label>
                      <div className="module-registration-toggle">
                        <button type="button" className={unitEnrollMode === 'all' ? 'active' : ''} onClick={() => setUnitEnrollMode('all')}>
                          Full section cohort
                        </button>
                        <button type="button" className={unitEnrollMode === 'custom' ? 'active' : ''} onClick={() => setUnitEnrollMode('custom')}>
                          Custom students
                        </button>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBlockStart: '0.4rem' }}>
                        Matching section cohort: {unitEnrollCandidateStudents.length} active student(s).
                      </p>
                    </div>

                    {unitEnrollMode === 'custom' && (
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                          <label style={{ margin: 0 }}>Select Students For These Units</label>
                          <button
                            type="button"
                            className="btn"
                            style={{ minHeight: '30px', padding: '0.25rem 0.7rem', fontSize: '0.75rem', width: 'auto' }}
                            onClick={() => setUnitEnrollSelectedStudents(unitEnrollCandidateStudents.map(s => s.id))}
                            disabled={unitEnrollCandidateStudents.length === 0}
                          >
                            Select All
                          </button>
                        </div>
                        <div className="module-registration-list">
                          {unitEnrollCandidateStudents.length === 0 ? (
                            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                              No active students match this program, stage, batch, and section.
                            </div>
                          ) : (
                            unitEnrollCandidateStudents.map(student => (
                              <label key={student.id} className="module-registration-student">
                                <input
                                  type="checkbox"
                                  checked={unitEnrollSelectedStudents.includes(student.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setUnitEnrollSelectedStudents([...unitEnrollSelectedStudents, student.id]);
                                    } else {
                                      setUnitEnrollSelectedStudents(unitEnrollSelectedStudents.filter(id => id !== student.id));
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

                    <button
                      type="button"
                      className="btn primary"
                      style={{ justifyContent: 'center' }}
                      onClick={handleEnrollStageUnits}
                      disabled={selectedStageUnitIds.length === 0 || (unitEnrollMode === 'custom' && unitEnrollSelectedStudents.length === 0)}
                    >
                      Enroll Students To Selected Units
                    </button>
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

          {/* TAB: TUTOR ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--brand-blue)', marginBlockEnd: '0.2rem' }}>Tutor Assignment System</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Assign one tutor to each module instance for a specific intake batch and section. The same tutor can own multiple modules, batches, and sections.
                </p>
              </div>

              <div className="module-admin-workspace">
                <div className="module-builder-panel">
                  <div className="module-panel-heading">
                    <h4>Add Tutor Account</h4>
                    <span>Create credentials using the college email as username and the default password</span>
                  </div>

                  <div className="module-builder-grid">
                    <div className="form-group">
                      <label>Tutor Name</label>
                      <input className="form-input" type="text" placeholder="e.g. Dr. Anita Sharma" value={newTutorName} onChange={(e) => setNewTutorName(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>College Email / Username</label>
                      <input className="form-input" type="email" placeholder="name@ismt.edu.np" value={newTutorEmail} onChange={(e) => setNewTutorEmail(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Contact Number</label>
                      <input className="form-input" type="text" placeholder="Optional" value={newTutorPhone} onChange={(e) => setNewTutorPhone(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Department</label>
                      <input className="form-input" type="text" placeholder="e.g. Computing" value={newTutorDepartment} onChange={(e) => setNewTutorDepartment(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Default Password</label>
                      <div style={{ minHeight: '42px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: 'var(--brand-blue)', background: '#f8fafc', fontSize: '0.85rem', fontWeight: 700 }}>
                        ChangeMe@123
                      </div>
                    </div>
                  </div>

                  <button type="button" className="btn primary" style={{ justifyContent: 'center' }} onClick={handleAddTutor}>
                    Create Tutor Credentials
                  </button>
                </div>

                <div className="module-builder-panel">
                  <div className="module-panel-heading">
                    <h4>Assign Tutor</h4>
                    <span>Choose the exact batch-section module instance, assignment window, and tutor owner</span>
                  </div>

                  <div className="module-builder-grid">
                    <div className="form-group">
                      <label>Program Filter</label>
                      <select className="form-select" value={assignmentProgramFilter} onChange={(e) => setAssignmentProgramFilter(e.target.value)}>
                        <option value="">All Programs</option>
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Batch Filter</label>
                      <select className="form-select" value={assignmentBatchFilter} onChange={(e) => setAssignmentBatchFilter(e.target.value)}>
                        <option value="">All Batches</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id}>{b.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Section Filter</label>
                      <select className="form-select" value={assignmentSectionFilter} onChange={(e) => setAssignmentSectionFilter(e.target.value)}>
                        <option value="">All Sections</option>
                        {allUniqueSections.map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Module Instance</label>
                      <select className="form-select" value={assignmentModuleId} onChange={(e) => {
                        setAssignmentModuleId(e.target.value);
                      }}>
                        {assignmentFilteredModules.length === 0 ? (
                          <option value="">No matching modules</option>
                        ) : (
                          assignmentFilteredModules.map(mod => {
                            const batch = batches.find(b => b.id === mod.batch_id);
                            return (
                              <option key={mod.id} value={mod.id}>
                                {mod.title} | {batch?.title || mod.batch_id || 'General'} | Sec {mod.section}
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Tutor Account</label>
                      <select className="form-select" value={assignmentTutorId} onChange={(e) => setAssignmentTutorId(e.target.value)}>
                        <option value="">Select Tutor</option>
                        {tutors.filter(tutor => tutor.status === 'Active').map(tutor => (
                          <option key={tutor.id} value={tutor.id}>{tutor.name} | {tutor.email}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Class Start Date</label>
                      <input className="form-input" type="date" value={assignmentStartDate} onChange={(e) => setAssignmentStartDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Class End Date</label>
                      <input className="form-input" type="date" value={assignmentEndDate} onChange={(e) => setAssignmentEndDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Current Assignment</label>
                      <div style={{ minHeight: '42px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: 'var(--text-muted)', background: '#f8fafc', fontSize: '0.8rem' }}>
                        {assignmentSelectedModule ? `${assignmentSelectedModule.tutor || 'Unassigned'} • ${assignmentSelectedModule.class_start_date || 'No start'} to ${assignmentSelectedModule.class_end_date || 'No end'}` : 'Select a module'}
                      </div>
                    </div>
                  </div>

                  <button type="button" className="btn primary" style={{ justifyContent: 'center' }} onClick={handleAssignTutorToModule} disabled={!assignmentModuleId}>
                    Save Tutor Assignment
                  </button>
                </div>

                <div className="module-builder-panel">
                  <div className="module-panel-heading">
                    <h4>Tutor Load Summary</h4>
                    <span>See which tutors are already covering multiple modules, batches, and sections</span>
                  </div>

                  <div className="module-registration-list" style={{ maxHeight: '360px' }}>
                    {assignmentTutorLoads.length === 0 ? (
                      <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                        No tutor assignments have been saved yet.
                      </div>
                    ) : (
                      assignmentTutorLoads.map(load => (
                        <div key={load.tutor} className="module-registration-student">
                          <span>
                            <strong>{load.tutor}</strong>
                            <small>{load.email} • {load.moduleCount} module(s) across {load.batchCount} batch(es) and {load.sectionCount} section(s)</small>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--brand-blue)', marginBlockEnd: '0.2rem' }}>Current Tutor Assignments</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Review every active assignment, update its tutor/date window, or remove it from the module.
                </p>
              </div>

              <div className="module-ledger-grid">
                {assignedModuleRows.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No tutor assignments have been configured yet.
                  </div>
                ) : (
                  assignedModuleRows.map(mod => {
                    const prog = programs.find(p => p.id === mod.program_id);
                    const batch = batches.find(b => b.id === mod.batch_id);
                    const tutor = tutors.find(t => t.id === mod.tutor_id || t.name === mod.tutor);
                    return (
                      <div key={`assignment-${mod.id}`} className="module-ledger-card">
                        <div>
                          <code>{mod.id}</code>
                          <h4>{mod.title}</h4>
                          <p>{prog?.title || 'Unknown Program'}</p>
                        </div>
                        <div className="module-ledger-meta">
                          <span>{tutor?.email || 'No email linked'}</span>
                          <span>{batch?.title || 'General Intake'}</span>
                          <span>Sec {mod.section}</span>
                          <span>Stage {mod.stage}</span>
                          <span>Tri {mod.trimester}</span>
                          <span>{mod.class_start_date || 'No start'} to {mod.class_end_date || 'No end'}</span>
                        </div>
                        <div className="module-ledger-footer">
                          <span>{mod.tutor || 'Unassigned'}</span>
                          <strong>{moduleEnrollmentCounts[mod.id] || 0} registered</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBlockStart: '0.85rem' }}>
                          <button type="button" className="btn" style={{ minHeight: '34px', justifyContent: 'center', fontSize: '0.78rem' }} onClick={() => handleEditAssignment(mod.id)}>
                            Edit
                          </button>
                          <button type="button" className="btn" style={{ minHeight: '34px', justifyContent: 'center', fontSize: '0.78rem', color: 'var(--accent-absent)', borderColor: 'rgba(239,68,68,0.25)' }} onClick={() => handleDeleteAssignment(mod)}>
                            Delete
                          </button>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
              <div className="form-group">
                <label>Stage</label>
                <select className="form-select" value={newModStage} onChange={(e) => setNewModStage(e.target.value)}>
                  <option value="1">Stage 1</option>
                  <option value="2">Stage 2</option>
                  <option value="3">Stage 3</option>
                </select>
              </div>
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

