/**
 * mockState.js - Local Fallback Persistent Database State Engine
 * 
 * Provides an in-memory/localStorage relational simulation.
 * Supporting programs, stages, trimesters, sections, leaves, and intakes/batches.
 */

class MockDatabaseClass {
  constructor() {
    this.storageKey = 'ismt_supabase_attendance_mock_db';
    this.data = {
      batches: {},          // { id: { id, title } }
      programs: {},
      students: [],
      modules: {},
      enrollments: [],      // { id, studentId, moduleId, status }
      attendance: {},       // YYYY-MM-DD => { moduleId => { studentId => { status, notes } } }
      leave_applications: [], // { id, studentId, startDate, endDate, type, reason, status }
      migration_logs: []      // { id, program_id, origin_stage, origin_trimester, target_stage, target_trimester, target_section, student_count, executed_at }
    };
    this.init();
  }

  init() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.data = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse mock state, re-seeding...", e);
        this.seedData();
      }
    } else {
      this.seedData();
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  seedData() {
    // 1. Core Batches (Intakes)
    this.data.batches = {
      'jan_2026': { id: 'jan_2026', title: 'January 2026 Intake', sections: 'A,B' },
      'apr_2026': { id: 'apr_2026', title: 'April 2026 Intake', sections: 'A,B,C' }
    };

    // 2. Core Programs
    this.data.programs = {
      'bsc_cse': { id: 'bsc_cse', title: 'BSc (Hons) Computer Systems Engineering', duration_years: 3 },
      'bsc_cyber': { id: 'bsc_cyber', title: 'BSc (Hons) Cybersecurity & Digital Forensics', duration_years: 3 },
      'bba': { id: 'bba', title: 'Business Administration (BBA)', duration_years: 3 },
      'bhm': { id: 'bhm', title: 'Hospitality Management (BHM)', duration_years: 3 },
      'mba': { id: 'mba', title: 'Master of Business Administration (MBA)', duration_years: 2 }
    };

    // 3. Academic Modules (Subjects)
    const modulesList = [
      // Computer Systems Engineering - Jan 2026 Sec A (Tri 1)
      { id: 'cse_s1_t1_net', title: 'Introduction to Networking', program_id: 'bsc_cse', stage: 1, trimester: 1, tutor: 'Dr. Susan Mahato', batch_id: 'jan_2026', section: 'A' },
      { id: 'cse_s1_t1_prog', title: 'Problem Solving & Programming', program_id: 'bsc_cse', stage: 1, trimester: 1, tutor: 'Er. Suman Rai', batch_id: 'jan_2026', section: 'A' },
      
      // Computer Systems Engineering - Apr 2026 Sec B (Tri 1)
      { id: 'cse_s1_t1_net_secB', title: 'Introduction to Networking (Sec B)', program_id: 'bsc_cse', stage: 1, trimester: 1, tutor: 'Dr. Susan Mahato', batch_id: 'apr_2026', section: 'B' },
      { id: 'cse_s1_t1_prog_secB', title: 'Problem Solving & Programming (Sec B)', program_id: 'bsc_cse', stage: 1, trimester: 1, tutor: 'Er. Suman Rai', batch_id: 'apr_2026', section: 'B' },
      
      // Computer Systems Engineering - Jan 2026 Sec A (Tri 2)
      { id: 'cse_s1_t2_db', title: 'Relational Database Systems', program_id: 'bsc_cse', stage: 1, trimester: 2, tutor: 'Mrs. Grishma Amatya', batch_id: 'jan_2026', section: 'A' },
      { id: 'cse_s1_t2_arch', title: 'Computer Architecture & Systems', program_id: 'bsc_cse', stage: 1, trimester: 2, tutor: 'Er. Bijay Upreti', batch_id: 'jan_2026', section: 'A' },
      
      // Computer Systems Engineering - Jan 2026 Sec A (Tri 3)
      { id: 'cse_s1_t3_os', title: 'Operating Systems & Linux', program_id: 'bsc_cse', stage: 1, trimester: 3, tutor: 'Er. Bijay Upreti', batch_id: 'jan_2026', section: 'A' },
      { id: 'cse_s1_t3_data', title: 'Data Structures & Algorithms', program_id: 'bsc_cse', stage: 1, trimester: 3, tutor: 'Mrs. Grishma Amatya', batch_id: 'jan_2026', section: 'A' },
      
      // Computer Systems Engineering - Jan 2026 Sec A (Stage 2 Tri 1)
      { id: 'cse_s2_t1_se', title: 'Software Engineering & Testing', program_id: 'bsc_cse', stage: 2, trimester: 1, tutor: 'Dr. Susan Mahato', batch_id: 'jan_2026', section: 'A' },
      { id: 'cse_s2_t1_web', title: 'Web Application Development', program_id: 'bsc_cse', stage: 2, trimester: 1, tutor: 'Er. Suman Rai', batch_id: 'jan_2026', section: 'A' },

      // Cybersecurity - Apr 2026 Sec A
      { id: 'cyb_s1_t1_fund', title: 'Fundamentals of Cyber Security', program_id: 'bsc_cyber', stage: 1, trimester: 1, tutor: 'Mr. Reyon Rai', batch_id: 'apr_2026', section: 'A' },
      { id: 'cyb_s1_t1_shell', title: 'Operating Systems & Scripting', program_id: 'bsc_cyber', stage: 1, trimester: 1, tutor: 'Er. Bijay Upreti', batch_id: 'apr_2026', section: 'A' },
      { id: 'cyb_s1_t2_netsec', title: 'Network Security & Firewalls', program_id: 'bsc_cyber', stage: 1, trimester: 2, tutor: 'Mr. Reyon Rai', batch_id: 'apr_2026', section: 'A' },
      { id: 'cyb_s1_t3_forensics', title: 'Digital Forensics & Incident Response', program_id: 'bsc_cyber', stage: 1, trimester: 3, tutor: 'Mr. Reyon Rai', batch_id: 'apr_2026', section: 'A' },

      // BBA - Jan 2026 Sec A
      { id: 'bba_s1_t1_mgmt', title: 'Principles of Management', program_id: 'bba', stage: 1, trimester: 1, tutor: 'Prof. Grishma Amatya', batch_id: 'jan_2026', section: 'A' },
      { id: 'bba_s1_t1_micro', title: 'Microeconomics for Business', program_id: 'bba', stage: 1, trimester: 1, tutor: 'Dr. Susan Mahato', batch_id: 'jan_2026', section: 'A' },

      // BHM - Apr 2026 Sec A
      { id: 'bhm_s1_t1_intro', title: 'Introduction to Hospitality Operations', program_id: 'bhm', stage: 1, trimester: 1, tutor: 'Mrs. Susmita Singh', batch_id: 'apr_2026', section: 'A' },
      { id: 'bhm_s1_t1_fb', title: 'Food & Beverage Service I', program_id: 'bhm', stage: 1, trimester: 1, tutor: 'Chef Suman Mahato', batch_id: 'apr_2026', section: 'A' },

      // MBA - Jan 2026 Sec A
      { id: 'mba_s1_t1_strat', title: 'Strategic Corporate Management', program_id: 'mba', stage: 1, trimester: 1, tutor: 'Dr. Bijay Upreti', batch_id: 'jan_2026', section: 'A' },
      { id: 'mba_s1_t1_ob', title: 'Organizational Behavior', program_id: 'mba', stage: 1, trimester: 1, tutor: 'Mrs. Susmita Singh', batch_id: 'jan_2026', section: 'A' }
    ];
    modulesList.forEach(m => {
      this.data.modules[m.id] = m;
    });

    // 4. Students across Sections and Batches
    const studentsList = [
      // BSc CSE Stage 1, Tri 1, Section A, January 2026 Intake
      { id: 'std_01', name: 'Aarav Sharma', email: 'aarav.sharma@ismt.edu.np', program_id: 'bsc_cse', batch_id: 'jan_2026', stage: 1, trimester: 1, section: 'A', status: 'Active' },
      { id: 'std_02', name: 'Bipana Thapa', email: 'bipana.thapa@ismt.edu.np', program_id: 'bsc_cse', batch_id: 'jan_2026', stage: 1, trimester: 1, section: 'A', status: 'Active' },
      { id: 'std_03', name: 'Chhitiz Gurung', email: 'chhitiz.gurung@ismt.edu.np', program_id: 'bsc_cse', batch_id: 'jan_2026', stage: 1, trimester: 1, section: 'A', status: 'Active' },
      
      // BSc CSE Stage 1, Tri 1, Section B, April 2026 Intake
      { id: 'std_04', name: 'Dinesh Shrestha', email: 'dinesh.shrestha@ismt.edu.np', program_id: 'bsc_cse', batch_id: 'apr_2026', stage: 1, trimester: 1, section: 'B', status: 'Active' },
      { id: 'std_05', name: 'Elina Joshi', email: 'elina.joshi@ismt.edu.np', program_id: 'bsc_cse', batch_id: 'apr_2026', stage: 1, trimester: 1, section: 'B', status: 'Active' },
      
      // BSc CSE Stage 1, Tri 2, Section A, January 2026 Intake
      { id: 'std_06', name: 'Gopal Adhikari', email: 'gopal.adhikari@ismt.edu.np', program_id: 'bsc_cse', batch_id: 'jan_2026', stage: 1, trimester: 2, section: 'A', status: 'Active' },
      { id: 'std_07', name: 'Hema Karki', email: 'hema.karki@ismt.edu.np', program_id: 'bsc_cse', batch_id: 'jan_2026', stage: 1, trimester: 2, section: 'A', status: 'Active' },
      
      // BSc Cybersecurity Stage 1, Tri 1, Section A, April 2026 Intake
      { id: 'std_08', name: 'Jeevan Pandey', email: 'jeevan.pandey@ismt.edu.np', program_id: 'bsc_cyber', batch_id: 'apr_2026', stage: 1, trimester: 1, section: 'A', status: 'Active' },
      { id: 'std_09', name: 'Kabita Bhatta', email: 'kabita.bhatta@ismt.edu.np', program_id: 'bsc_cyber', batch_id: 'apr_2026', stage: 1, trimester: 1, section: 'A', status: 'Active' },
      
      // BBA Stage 1, Tri 1, Section A, January 2026 Intake
      { id: 'std_10', name: 'Monika Dahal', email: 'monika.dahal@ismt.edu.np', program_id: 'bba', batch_id: 'jan_2026', stage: 1, trimester: 1, section: 'A', status: 'Active' },
      { id: 'std_11', name: 'Nabin Basnet', email: 'nabin.basnet@ismt.edu.np', program_id: 'bba', batch_id: 'jan_2026', stage: 1, trimester: 1, section: 'A', status: 'Active' },

      // BHM Stage 1, Tri 1, Section A, April 2026 Intake
      { id: 'std_12', name: 'Rupesh Shrestha', email: 'rupesh.shrestha@ismt.edu.np', program_id: 'bhm', batch_id: 'apr_2026', stage: 1, trimester: 1, section: 'A', status: 'Active' },
      { id: 'std_13', name: 'Sajina Maharjan', email: 'sajina.maharjan@ismt.edu.np', program_id: 'bhm', batch_id: 'apr_2026', stage: 1, trimester: 1, section: 'A', status: 'Active' },

      // MBA Stage 1, Tri 1, Section A, January 2026 Intake
      { id: 'std_14', name: 'Tsering Sherpa', email: 'tsering.sherpa@ismt.edu.np', program_id: 'mba', batch_id: 'jan_2026', stage: 1, trimester: 1, section: 'A', status: 'Active' }
    ];
    this.data.students = studentsList;

    // 5. Enroll Students
    this.data.students.forEach(s => {
      this.enrollStudentInDefaultModules(s);
    });

    // 6. Seed Leave Applications
    this.data.leave_applications = [
      { id: 1, student_id: 'std_02', start_date: '2026-05-15', end_date: '2026-05-18', type: 'Medical', reason: 'Fever and rest recommended by doctor.', status: 'Approved' },
      { id: 2, student_id: 'std_03', start_date: '2026-05-28', end_date: '2026-05-30', type: 'Personal', reason: 'Family wedding event in Pokhara.', status: 'Pending' },
      { id: 3, student_id: 'std_05', start_date: '2026-05-10', end_date: '2026-05-10', type: 'College Event', reason: 'Representing college at national IT hackathon.', status: 'Approved' }
    ];

    // 7. Seed migration logs (cohort migrations history)
    this.data.migration_logs = [
      {
        id: 1,
        program_id: 'bsc_cse',
        origin_stage: 1,
        origin_trimester: 1,
        target_stage: 1,
        target_trimester: 2,
        target_section: 'A',
        student_count: 2,
        executed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() // 5 days ago
      },
      {
        id: 2,
        program_id: 'bsc_cyber',
        origin_stage: 1,
        origin_trimester: 1,
        target_stage: 1,
        target_trimester: 2,
        target_section: 'A',
        student_count: 1,
        executed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString() // 12 days ago
      }
    ];

    // 8. Seed historical attendance (14 days)
    this.seedHistoricalAttendance();

    this.save();
  }

  enrollStudentInDefaultModules(student) {
    Object.values(this.data.modules).forEach(mod => {
      if (
        mod.program_id === student.program_id &&
        mod.stage === student.stage &&
        mod.trimester === student.trimester &&
        mod.batch_id === student.batch_id &&
        mod.section === student.section
      ) {
        this.data.enrollments.push({
          id: `enr_${student.id}_${mod.id}`,
          student_id: student.id,
          module_id: mod.id,
          status: 'Active'
        });
      }
    });
  }

  seedHistoricalAttendance() {
    const today = new Date();
    const statuses = ['P', 'P', 'P', 'P', 'P', 'A', 'L', 'P', 'P', 'E'];
    let daysSeeded = 0;
    let offset = 0;

    while (daysSeeded < 14) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      offset++;

      if (date.getDay() === 0) continue; // Skip Sundays

      const dateStr = date.toISOString().split('T')[0];
      this.data.attendance[dateStr] = {};
      daysSeeded++;

      Object.keys(this.data.modules).forEach(modId => {
        this.data.attendance[dateStr][modId] = {};
        
        const enrs = this.data.enrollments.filter(e => e.module_id === modId && e.status === 'Active');
        
        enrs.forEach(enr => {
          const student = this.data.students.find(s => s.id === enr.student_id);
          if (!student) return;

          const hasLeave = this.data.leave_applications.some(l => 
            l.student_id === student.id && 
            l.status === 'Approved' && 
            dateStr >= l.start_date && 
            dateStr <= l.end_date
          );

          if (hasLeave) {
            this.data.attendance[dateStr][modId][student.id] = { status: 'E', notes: 'Approved Academic Leave' };
          } else {
            const randomIdx = Math.floor(Math.random() * statuses.length);
            const status = statuses[randomIdx];
            this.data.attendance[dateStr][modId][student.id] = {
              status: status,
              notes: status === 'L' ? 'Late 10 mins' : ''
            };
          }
        });
      });
    }
  }

  // --- CRUD and Operations Facade ---

  fetchBatches() {
    return Object.values(this.data.batches || {});
  }

  addBatch(id, title, sections = 'A,B') {
    if (!this.data.batches) this.data.batches = {};
    this.data.batches[id] = { id, title, sections };
    this.save();
    return true;
  }

  updateBatchSections(id, sections) {
    if (this.data.batches && this.data.batches[id]) {
      this.data.batches[id].sections = sections;
      this.save();
      return true;
    }
    return false;
  }

  fetchPrograms() {
    return Object.values(this.data.programs);
  }

  fetchModules(programId = null, stage = null, trimester = null, section = null, batchId = null) {
    let list = Object.values(this.data.modules);
    if (programId) list = list.filter(m => m.program_id === programId);
    if (stage) list = list.filter(m => m.stage === parseInt(stage));
    if (trimester) list = list.filter(m => m.trimester === parseInt(trimester));
    if (section) list = list.filter(m => m.section === section);
    if (batchId) list = list.filter(m => m.batch_id === batchId);
    return list;
  }

  fetchStudents(programId = null, stage = null, trimester = null, section = null, batchId = null, includeAllStatuses = false) {
    let list = this.data.students;
    if (!includeAllStatuses) {
      list = list.filter(s => s.status === 'Active');
    }
    if (programId) list = list.filter(s => s.program_id === programId);
    if (stage) list = list.filter(s => s.stage === parseInt(stage));
    if (trimester) list = list.filter(s => s.trimester === parseInt(trimester));
    if (section) list = list.filter(s => s.section === section);
    if (batchId) list = list.filter(s => s.batch_id === batchId);
    return list;
  }

  fetchEnrolledStudents(moduleId, section = null) {
    const activeStudentIds = this.data.enrollments
      .filter(e => e.module_id === moduleId && e.status === 'Active')
      .map(e => e.student_id);

    let list = this.data.students.filter(s => activeStudentIds.includes(s.id) && s.status === 'Active');
    if (section) list = list.filter(s => s.section === section);
    return list;
  }

  fetchAttendance(dateStr, moduleId) {
    if (this.data.attendance[dateStr] && this.data.attendance[dateStr][moduleId]) {
      return this.data.attendance[dateStr][moduleId];
    }
    return {};
  }

  saveAttendance(dateStr, moduleId, studentId, status, notes = '') {
    if (!this.data.attendance[dateStr]) this.data.attendance[dateStr] = {};
    if (!this.data.attendance[dateStr][moduleId]) this.data.attendance[dateStr][moduleId] = {};

    this.data.attendance[dateStr][moduleId][studentId] = { status, notes };
    this.save();
    return true;
  }

  saveAttendanceBulk(dateStr, moduleId, attendanceMap) {
    if (!this.data.attendance[dateStr]) this.data.attendance[dateStr] = {};
    this.data.attendance[dateStr][moduleId] = attendanceMap;
    this.save();
    return true;
  }

  fetchLeaves() {
    return this.data.leave_applications;
  }

  fetchStudentLeaves(studentId) {
    return this.data.leave_applications.filter(l => l.student_id === studentId);
  }

  submitLeave(studentId, startDate, endDate, type, reason) {
    const newLeave = {
      id: Date.now(),
      student_id: studentId,
      start_date: startDate,
      end_date: endDate,
      type,
      reason,
      status: 'Pending'
    };
    this.data.leave_applications.push(newLeave);
    this.save();
    return newLeave;
  }

  auditLeave(leaveId, status) {
    const leave = this.data.leave_applications.find(l => l.id === parseInt(leaveId));
    if (!leave) return false;

    leave.status = status;

    if (status === 'Approved') {
      const studentId = leave.student_id;
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (this.data.attendance[dateStr]) {
          Object.keys(this.data.attendance[dateStr]).forEach(modId => {
            const records = this.data.attendance[dateStr][modId];
            const isEnrolled = this.data.enrollments.some(e => e.student_id === studentId && e.module_id === modId && e.status === 'Active');
            if (isEnrolled) {
              records[studentId] = {
                status: 'E',
                notes: `Excused: ${leave.type} Leave`
              };
            }
          });
        }
      }
    }

    this.save();
    return true;
  }

  migrateCohort(programId, stage, fromTri, toTri, studentIds, newSection = null) {
    const originStage = (parseInt(fromTri) === 3 && parseInt(toTri) === 1) ? parseInt(stage) - 1 : parseInt(stage);
    const destModules = this.fetchModules(programId, stage, toTri);

    studentIds.forEach(id => {
      const student = this.data.students.find(s => s.id === id);
      if (!student) return;

      this.data.enrollments.forEach(enr => {
        if (enr.student_id === id && enr.status === 'Active') {
          const mod = this.data.modules[enr.module_id];
          if (mod && mod.program_id === programId && mod.stage === originStage && mod.trimester === parseInt(fromTri)) {
            enr.status = 'Completed';
          }
        }
      });

      student.stage = parseInt(stage);
      student.trimester = parseInt(toTri);
      if (newSection) student.section = newSection;

      destModules.forEach(mod => {
        const exists = this.data.enrollments.some(e => e.student_id === id && e.module_id === mod.id);
        if (!exists) {
          this.data.enrollments.push({
            id: `enr_${id}_${mod.id}`,
            student_id: id,
            module_id: mod.id,
            status: 'Active'
          });
        }
      });
    });

    // Write historical record in migration_logs
    if (!this.data.migration_logs) this.data.migration_logs = [];
    this.data.migration_logs.push({
      id: Date.now(),
      program_id: programId,
      origin_stage: originStage,
      origin_trimester: parseInt(fromTri),
      target_stage: parseInt(stage),
      target_trimester: parseInt(toTri),
      target_section: newSection || 'A',
      student_count: studentIds.length,
      executed_at: new Date().toISOString()
    });

    this.save();
    return true;
  }

  fetchMigrationLogs() {
    return this.data.migration_logs || [];
  }

  addStudent(name, programId, stage, trimester, section = 'A', batchId = 'jan_2026', studentDetails = {}) {
    const id = `std_${Date.now()}`;
    const email = studentDetails.college_email || name.toLowerCase().replace(/\s+/g, '.') + '@ismt.edu.np';
    
    const s = {
      id,
      name,
      email,
      contact_number: studentDetails.contact_number || '',
      personal_email: studentDetails.personal_email || '',
      parent_name: studentDetails.parent_name || '',
      parent_contact_number: studentDetails.parent_contact_number || '',
      student_code: studentDetails.student_code || '',
      program_id: programId,
      batch_id: batchId,
      stage: parseInt(stage),
      trimester: parseInt(trimester),
      section,
      status: 'Active'
    };

    this.data.students.push(s);
    this.enrollStudentInDefaultModules(s);
    this.save();
    return s;
  }

  updateStudent(id, studentData) {
    const student = this.data.students.find(s => s.id === id);
    if (!student) return null;

    const programChanged = studentData.program_id && studentData.program_id !== student.program_id;
    const stageChanged = studentData.stage && parseInt(studentData.stage) !== student.stage;
    const trimesterChanged = studentData.trimester && parseInt(studentData.trimester) !== student.trimester;

    if (studentData.name) {
      student.name = studentData.name;
      student.email = studentData.college_email || studentData.name.toLowerCase().replace(/\s+/g, '.') + '@ismt.edu.np';
    }
    if (studentData.college_email) student.email = studentData.college_email;
    if (studentData.contact_number !== undefined) student.contact_number = studentData.contact_number;
    if (studentData.personal_email !== undefined) student.personal_email = studentData.personal_email;
    if (studentData.parent_name !== undefined) student.parent_name = studentData.parent_name;
    if (studentData.parent_contact_number !== undefined) student.parent_contact_number = studentData.parent_contact_number;
    if (studentData.student_code !== undefined) student.student_code = studentData.student_code;
    if (studentData.program_id) student.program_id = studentData.program_id;
    if (studentData.batch_id) student.batch_id = studentData.batch_id;
    if (studentData.stage) student.stage = parseInt(studentData.stage);
    if (studentData.trimester) student.trimester = parseInt(studentData.trimester);
    if (studentData.section) student.section = studentData.section;
    if (studentData.status) student.status = studentData.status;

    // Side effect: enrollment update on cohort changes
    if (programChanged || stageChanged || trimesterChanged) {
      // Clear current active enrollments
      this.data.enrollments = this.data.enrollments.filter(
        e => !(e.student_id === id && e.status === 'Active')
      );
      // Re-enroll in new default modules
      this.enrollStudentInDefaultModules(student);
    }

    this.save();
    return student;
  }

  deleteStudent(id) {
    // 1. Remove from students list
    this.data.students = this.data.students.filter(s => s.id !== id);

    // 2. Remove enrollments (cascade)
    this.data.enrollments = this.data.enrollments.filter(e => e.student_id !== id);

    // 3. Remove leave applications (cascade)
    this.data.leave_applications = this.data.leave_applications.filter(l => l.student_id !== id);

    // 4. Remove attendance records (cascade)
    Object.keys(this.data.attendance).forEach(dateStr => {
      Object.keys(this.data.attendance[dateStr]).forEach(moduleId => {
        if (this.data.attendance[dateStr][moduleId][id]) {
          delete this.data.attendance[dateStr][moduleId][id];
        }
      });
    });

    this.save();
    return true;
  }

  addProgram(id, title) {
    this.data.programs[id] = { id, title, duration_years: 3 };
    this.save();
    return true;
  }

  addModule(id, title, programId, stage, trimester, tutor, batchId, section = 'A') {
    const mod = { 
      id, 
      title, 
      program_id: programId, 
      stage: parseInt(stage), 
      trimester: parseInt(trimester), 
      tutor, 
      batch_id: batchId, 
      section 
    };
    this.data.modules[id] = mod;
    this.save();
    return true;
  }

  updateModule(id, moduleData) {
    const mod = this.data.modules[id];
    if (!mod) return false;

    if (moduleData.title !== undefined) mod.title = moduleData.title;
    if (moduleData.program_id !== undefined) mod.program_id = moduleData.program_id;
    if (moduleData.stage !== undefined) mod.stage = parseInt(moduleData.stage);
    if (moduleData.trimester !== undefined) mod.trimester = parseInt(moduleData.trimester);
    if (moduleData.tutor !== undefined) mod.tutor = moduleData.tutor;
    if (moduleData.batch_id !== undefined) mod.batch_id = moduleData.batch_id;
    if (moduleData.section !== undefined) mod.section = moduleData.section;

    this.save();
    return true;
  }

  bulkEnroll(studentIds, moduleId) {
    const mod = this.data.modules[moduleId];
    if (!mod || !Array.isArray(studentIds)) return false;

    studentIds.forEach(studentId => {
      const student = this.data.students.find(s => s.id === studentId);
      if (!student) return;

      const existing = this.data.enrollments.find(e => e.student_id === studentId && e.module_id === moduleId);
      if (existing) {
        existing.status = 'Active';
      } else {
        this.data.enrollments.push({
          id: `enr_${studentId}_${moduleId}`,
          student_id: studentId,
          module_id: moduleId,
          status: 'Active'
        });
      }
    });

    this.save();
    return true;
  }

  manualEnroll(studentId, moduleId) {
    const student = this.data.students.find(s => s.id === studentId);
    const mod = this.data.modules[moduleId];
    if (!student || !mod) return false;

    const existing = this.data.enrollments.find(e => e.student_id === studentId && e.module_id === moduleId);
    if (existing) {
      existing.status = 'Active';
    } else {
      this.data.enrollments.push({
        id: `enr_${studentId}_${moduleId}`,
        student_id: studentId,
        module_id: moduleId,
        status: 'Active'
      });
    }
    this.save();
    return true;
  }

  manualUnenroll(studentId, moduleId) {
    this.data.enrollments = this.data.enrollments.filter(
      e => !(e.student_id === studentId && e.module_id === moduleId)
    );
    this.save();
    return true;
  }

  getDateStatusForCalendar(dateStr) {
    if (!this.data.attendance[dateStr]) return 'unmarked';

    const dayAttendance = this.data.attendance[dateStr];
    const moduleIds = Object.keys(dayAttendance);

    if (moduleIds.length === 0) return 'unmarked';

    let completedModules = 0;
    let activeModules = 0;

    Object.keys(this.data.modules).forEach(modId => {
      const enrollCount = this.data.enrollments.filter(e => e.module_id === modId && e.status === 'Active').length;
      if (enrollCount === 0) return;

      activeModules++;

      const record = dayAttendance[modId];
      if (record && Object.keys(record).length >= enrollCount) {
        completedModules++;
      }
    });

    if (completedModules === 0) return 'unmarked';
    if (completedModules === activeModules) return 'complete';
    return 'partial';
  }

  getStudentAttendanceHistory(studentId) {
    const history = [];
    Object.entries(this.data.attendance).forEach(([dateStr, modules]) => {
      Object.entries(modules).forEach(([moduleId, studentMap]) => {
        if (studentMap[studentId]) {
          const mod = this.data.modules[moduleId];
          history.push({
            date: dateStr,
            moduleId,
            moduleTitle: mod ? mod.title : 'Unknown Module',
            status: studentMap[studentId].status,
            notes: studentMap[studentId].notes
          });
        }
      });
    });
    return history;
  }
}

export const MockDatabase = new MockDatabaseClass();
