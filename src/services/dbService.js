/**
 * dbService.js - Unified Database Query Facade (Batch-Aware)
 * 
 * Routes queries to cloud Supabase or mock fallback, adding support for Student Intakes/Batches.
 */

import { supabase } from './supabase';
import { MockDatabase } from './mockState';

const isCloudActive = () => supabase !== null;
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const isFutureAttendanceDate = (dateStr) => dateStr > getLocalDateString();

export const dbService = {
  
  // --- 1. Batch / Intake Queries ---
  async getBatches() {
    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .order('title', { ascending: true });
      if (!error) return data;
      console.error("Supabase getBatches error, using mock fallback:", error);
    }
    return MockDatabase.fetchBatches();
  },

  async addBatch(id, title, sections = 'A,B') {
    if (isCloudActive()) {
      const { error } = await supabase
        .from('batches')
        .insert([{ id, title, sections }]);
      if (!error) return true;
      console.error("Supabase addBatch error:", error);
    }
    return MockDatabase.addBatch(id, title, sections);
  },

  async updateBatchSections(id, sections) {
    if (isCloudActive()) {
      const { error } = await supabase
        .from('batches')
        .update({ sections })
        .eq('id', id);
      if (!error) return true;
      console.error("Supabase updateBatchSections error:", error);
    }
    return MockDatabase.updateBatchSections(id, sections);
  },

  // --- 2. Program Queries ---
  async getPrograms() {
    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('title', { ascending: true });
      if (!error) return data;
      console.error("Supabase getPrograms error, using mock fallback:", error);
    }
    return MockDatabase.fetchPrograms();
  },

  async addProgram(id, title) {
    if (isCloudActive()) {
      const { error } = await supabase
        .from('programs')
        .insert([{ id, title }]);
      if (!error) return true;
      console.error("Supabase addProgram error:", error);
    }
    return MockDatabase.addProgram(id, title);
  },

  // --- 3. Admin Accounts & Access Control ---
  async getAdmins(includeInactive = false) {
    if (isCloudActive()) {
      let query = supabase.from('admins').select('*').order('name', { ascending: true });
      if (!includeInactive) query = query.eq('status', 'Active');
      const { data, error } = await query;
      if (!error) return data;
      console.error("Supabase getAdmins error, using mock fallback:", error);
    }
    return MockDatabase.fetchAdmins(includeInactive);
  },

  async addAdmin(name, email, privilege = 'partial', permissions = []) {
    const payload = {
      id: `admin_${Date.now()}`,
      name,
      email: email.trim().toLowerCase(),
      password: 'Admin@123',
      privilege,
      permissions,
      status: 'Active'
    };

    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('admins')
        .insert([payload])
        .select()
        .single();
      if (!error) return data;
      console.error("Supabase addAdmin error:", error);
      return { error: error.message || 'Unable to add admin.' };
    }
    return MockDatabase.addAdmin(name, email, privilege, permissions);
  },

  async validateAdminLogin(email, password) {
    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('password', password)
        .eq('status', 'Active')
        .maybeSingle();
      if (!error) return data;
      console.error("Supabase validateAdminLogin error, using mock fallback:", error);
    }
    return MockDatabase.validateAdminLogin(email, password);
  },

  async resetTutorPassword(tutorId) {
    if (isCloudActive()) {
      const { error } = await supabase
        .from('tutors')
        .update({ password: 'ChangeMe@123', must_change_password: true })
        .eq('id', tutorId);
      if (!error) return true;
      console.error("Supabase resetTutorPassword error:", error);
    }
    return MockDatabase.resetTutorPassword(tutorId);
  },

  async resetStudentPassword(studentId) {
    if (isCloudActive()) {
      const { error } = await supabase
        .from('students')
        .update({ password: 'Student@123', must_change_password: true })
        .eq('id', studentId);
      if (!error) return true;
      console.error("Supabase resetStudentPassword error:", error);
    }
    return MockDatabase.resetStudentPassword(studentId);
  },

  // --- 4. Tutor Accounts & Credentials ---
  async getTutors(includeInactive = false) {
    if (isCloudActive()) {
      let query = supabase.from('tutors').select('*').order('name', { ascending: true });
      if (!includeInactive) query = query.eq('status', 'Active');
      const { data, error } = await query;
      if (!error) return data;
      console.error("Supabase getTutors error, using mock fallback:", error);
    }
    return MockDatabase.fetchTutors(includeInactive);
  },

  async addTutor(name, email, phone = '', department = '') {
    const payload = {
      id: `tutor_${Date.now()}`,
      name,
      email: email.trim().toLowerCase(),
      phone,
      department,
      password: 'ChangeMe@123',
      must_change_password: true,
      status: 'Active'
    };

    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('tutors')
        .insert([payload])
        .select()
        .single();
      if (!error) return data;
      console.error("Supabase addTutor error:", error);
      return { error: error.message || 'Unable to add tutor.' };
    }
    return MockDatabase.addTutor(name, email, phone, department);
  },

  async validateTutorLogin(email, password) {
    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('tutors')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('password', password)
        .eq('status', 'Active')
        .maybeSingle();
      if (!error) return data;
      console.error("Supabase validateTutorLogin error, using mock fallback:", error);
    }
    return MockDatabase.validateTutorLogin(email, password);
  },

  async updateTutorPassword(tutorId, currentPassword, newPassword) {
    if (isCloudActive()) {
      const { data: tutor, error: fetchError } = await supabase
        .from('tutors')
        .select('id')
        .eq('id', tutorId)
        .eq('password', currentPassword)
        .maybeSingle();
      if (fetchError || !tutor) return false;

      const { error } = await supabase
        .from('tutors')
        .update({ password: newPassword, must_change_password: false })
        .eq('id', tutorId);
      if (!error) return true;
      console.error("Supabase updateTutorPassword error:", error);
    }
    return MockDatabase.updateTutorPassword(tutorId, currentPassword, newPassword);
  },

  async validateStudentLogin(email, password) {
    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('password', password)
        .eq('status', 'Active')
        .maybeSingle();
      if (!error) return data;
      console.error("Supabase validateStudentLogin error, using mock fallback:", error);
    }
    return MockDatabase.validateStudentLogin(email, password);
  },

  async updateStudentPassword(studentId, currentPassword, newPassword) {
    if (isCloudActive()) {
      const { data: student, error: fetchError } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .eq('password', currentPassword)
        .maybeSingle();
      if (fetchError || !student) return false;

      const { error } = await supabase
        .from('students')
        .update({ password: newPassword, must_change_password: false })
        .eq('id', studentId);
      if (!error) return true;
      console.error("Supabase updateStudentPassword error:", error);
    }
    return MockDatabase.updateStudentPassword(studentId, currentPassword, newPassword);
  },

  // --- 5. Academic Module Queries ---
  async getModules(programId = null, stage = null, trimester = null, section = null, batchId = null) {
    if (isCloudActive()) {
      let query = supabase.from('modules').select('*');
      if (programId) query = query.eq('program_id', programId);
      if (stage) query = query.eq('stage', parseInt(stage));
      if (trimester) query = query.eq('trimester', parseInt(trimester));
      if (section) query = query.eq('section', section);
      if (batchId) query = query.eq('batch_id', batchId);
      
      const { data, error } = await query;
      if (!error) return data;
      console.error("Supabase getModules error, using mock fallback:", error);
    }
    return MockDatabase.fetchModules(programId, stage, trimester, section, batchId);
  },

  async addModule(id, title, programId, stage, trimester, tutor, batchId, section = 'A', moduleDetails = {}) {
    if (isCloudActive()) {
      const { error } = await supabase
        .from('modules')
        .insert([{
          id,
          title,
          program_id: programId,
          stage: parseInt(stage),
          trimester: parseInt(trimester),
          tutor,
          tutor_id: moduleDetails.tutor_id || null,
          batch_id: batchId,
          section,
          class_start_date: moduleDetails.class_start_date || null,
          class_end_date: moduleDetails.class_end_date || null
        }]);
      if (!error) return true;
      console.error("Supabase addModule error:", error);
    }
    return MockDatabase.addModule(id, title, programId, stage, trimester, tutor, batchId, section, moduleDetails);
  },

  async updateModule(id, moduleData) {
    if (isCloudActive()) {
      const payload = {
        title: moduleData.title,
        program_id: moduleData.program_id,
        stage: moduleData.stage !== undefined ? parseInt(moduleData.stage) : undefined,
        trimester: moduleData.trimester !== undefined ? parseInt(moduleData.trimester) : undefined,
        tutor: moduleData.tutor,
        tutor_id: moduleData.tutor_id,
        batch_id: moduleData.batch_id,
        section: moduleData.section,
        class_start_date: moduleData.class_start_date,
        class_end_date: moduleData.class_end_date
      };

      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      const { error } = await supabase
        .from('modules')
        .update(payload)
        .eq('id', id);

      if (!error) return true;
      console.error("Supabase updateModule error:", error);
    }

    return MockDatabase.updateModule(id, moduleData);
  },

  async bulkEnroll(studentIds, moduleId) {
    if (!Array.isArray(studentIds) || studentIds.length === 0) return true;

    if (isCloudActive()) {
      const enrollmentsToInsert = studentIds.map(studentId => ({
        student_id: studentId,
        module_id: moduleId,
        status: 'Active'
      }));

      const { error } = await supabase
        .from('enrollments')
        .upsert(enrollmentsToInsert, { onConflict: 'student_id,module_id' });

      if (!error) return true;
      console.error("Supabase bulkEnroll error:", error);
    }

    return MockDatabase.bulkEnroll(studentIds, moduleId);
  },

  // --- 4. Student Queries (Batch-Filtered) ---
  async getStudents(programId = null, stage = null, trimester = null, section = null, batchId = null, includeAllStatuses = false) {
    if (isCloudActive()) {
      let query = supabase.from('students').select('*');
      if (!includeAllStatuses) {
        query = query.eq('status', 'Active');
      }
      if (programId) query = query.eq('program_id', programId);
      if (stage) query = query.eq('stage', parseInt(stage));
      if (trimester) query = query.eq('trimester', parseInt(trimester));
      if (section) query = query.eq('section', section);
      if (batchId) query = query.eq('batch_id', batchId);

      const { data, error } = await query;
      if (!error) return data;
      console.error("Supabase getStudents error, using mock fallback:", error);
    }
    return MockDatabase.fetchStudents(programId, stage, trimester, section, batchId, includeAllStatuses);
  },

  async getEnrolledStudents(moduleId, section = null) {
    if (isCloudActive()) {
      let query = supabase
        .from('enrollments')
        .select('student_id, students(*)')
        .eq('module_id', moduleId)
        .eq('status', 'Active')
        .eq('students.status', 'Active');

      if (section) {
        query = query.eq('students.section', section);
      }

      const { data, error } = await query;
      if (!error) {
        return data.filter(d => d.students !== null).map(d => d.students);
      }
      console.error("Supabase getEnrolledStudents error, using mock fallback:", error);
    }
    return MockDatabase.fetchEnrolledStudents(moduleId, section);
  },

  async addStudent(name, programId, stage, trimester, section = 'A', batchId = 'jan_2026', studentDetails = {}) {
    const collegeEmail = studentDetails.college_email || name.toLowerCase().replace(/\s+/g, '.') + '@ismt.edu.np';
    const studentPayload = {
      name,
      email: collegeEmail,
      contact_number: studentDetails.contact_number || null,
      personal_email: studentDetails.personal_email || null,
      parent_name: studentDetails.parent_name || null,
      parent_contact_number: studentDetails.parent_contact_number || null,
      student_code: studentDetails.student_code || null,
      program_id: programId,
      batch_id: batchId,
      stage: parseInt(stage),
      trimester: parseInt(trimester),
      section,
      status: 'Active',
      password: studentDetails.password || 'Student@123',
      must_change_password: studentDetails.must_change_password !== undefined ? studentDetails.must_change_password : true
    };

    if (isCloudActive()) {
      const id = `std_${Date.now()}`;
      
      const { error } = await supabase
        .from('students')
        .insert([{ id, ...studentPayload }]);
      
      if (!error) {
        const modules = await this.getModules(programId, stage, trimester, section, batchId);
        const enrollmentsToInsert = modules.map(m => ({
          student_id: id,
          module_id: m.id,
          status: 'Active'
        }));
        if (enrollmentsToInsert.length > 0) {
          await supabase.from('enrollments').insert(enrollmentsToInsert);
        }
        return { id, ...studentPayload };
      }
      console.error("Supabase addStudent error:", error);
    }
    return MockDatabase.addStudent(name, programId, stage, trimester, section, batchId, studentDetails);
  },

  async updateStudent(id, studentData) {
    if (isCloudActive()) {
      const programChanged = studentData.program_id !== undefined;
      const stageChanged = studentData.stage !== undefined;
      const trimesterChanged = studentData.trimester !== undefined;
      
      const payload = {
        name: studentData.name,
        contact_number: studentData.contact_number,
        personal_email: studentData.personal_email,
        parent_name: studentData.parent_name,
        parent_contact_number: studentData.parent_contact_number,
        student_code: studentData.student_code,
        program_id: studentData.program_id,
        batch_id: studentData.batch_id,
        stage: studentData.stage ? parseInt(studentData.stage) : undefined,
        trimester: studentData.trimester ? parseInt(studentData.trimester) : undefined,
        section: studentData.section,
        status: studentData.status
      };
      
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
      
      if (studentData.college_email) {
        payload.email = studentData.college_email;
      } else if (payload.name) {
        payload.email = studentData.name.toLowerCase().replace(/\s+/g, '.') + '@ismt.edu.np';
      }

      const { error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', id);
      
      if (!error) {
        if (programChanged || stageChanged || trimesterChanged) {
          await supabase
            .from('enrollments')
            .delete()
            .eq('student_id', id)
            .eq('status', 'Active');
          
          const { data: updatedStudent } = await supabase
            .from('students')
            .select('*')
            .eq('id', id)
            .single();
          
          if (updatedStudent) {
            const modules = await this.getModules(
              updatedStudent.program_id,
              updatedStudent.stage,
              updatedStudent.trimester,
              updatedStudent.section,
              updatedStudent.batch_id
            );
            const enrollmentsToInsert = modules.map(m => ({
              student_id: id,
              module_id: m.id,
              status: 'Active'
            }));
            if (enrollmentsToInsert.length > 0) {
              await supabase.from('enrollments').insert(enrollmentsToInsert);
            }
          }
        }
        return true;
      }
      console.error("Supabase updateStudent error:", error);
    }
    return MockDatabase.updateStudent(id, studentData);
  },

  async deleteStudent(id) {
    if (isCloudActive()) {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);
      if (!error) return true;
      console.error("Supabase deleteStudent error:", error);
    }
    return MockDatabase.deleteStudent(id);
  },

  // --- 5. Enrollment Mutators ---
  async manualEnroll(studentId, moduleId) {
    if (isCloudActive()) {
      const { error } = await supabase
        .from('enrollments')
        .upsert([{ student_id: studentId, module_id: moduleId, status: 'Active' }], { onConflict: 'student_id,module_id' });
      if (!error) return true;
      console.error("Supabase manualEnroll error:", error);
    }
    return MockDatabase.manualEnroll(studentId, moduleId);
  },

  async manualUnenroll(studentId, moduleId) {
    if (isCloudActive()) {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('student_id', studentId)
        .eq('module_id', moduleId);
      if (!error) return true;
      console.error("Supabase manualUnenroll error:", error);
    }
    return MockDatabase.manualUnenroll(studentId, moduleId);
  },

  async getStudentEnrollments(studentId) {
    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, modules(*)')
        .eq('student_id', studentId)
        .eq('status', 'Active');
      if (!error) {
        return data.map(d => d.modules).filter(m => m !== null);
      }
      console.error("Supabase getStudentEnrollments error:", error);
    }
    const enrIds = MockDatabase.data.enrollments
      .filter(e => e.student_id === studentId && e.status === 'Active')
      .map(e => e.module_id);
    return Object.values(MockDatabase.data.modules).filter(m => enrIds.includes(m.id));
  },

  // --- 6. Attendance Operations ---
  async getAttendance(dateStr, moduleId) {
    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('attendance')
        .select('status, notes, enrollments(student_id)')
        .eq('record_date', dateStr)
        .eq('enrollments.module_id', moduleId);

      if (!error) {
        const attendanceMap = {};
        data.forEach(d => {
          if (d.enrollments && d.enrollments.student_id) {
            attendanceMap[d.enrollments.student_id] = {
              status: d.status,
              notes: d.notes
            };
          }
        });
        return attendanceMap;
      }
      console.error("Supabase getAttendance error:", error);
    }
    return MockDatabase.fetchAttendance(dateStr, moduleId);
  },

  async saveAttendance(dateStr, moduleId, studentId, status, notes = '') {
    if (isFutureAttendanceDate(dateStr)) {
      console.warn("Future attendance date blocked:", dateStr);
      return false;
    }

    if (isCloudActive()) {
      const { data: enr, error: enrErr } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('module_id', moduleId)
        .single();
      
      if (!enrErr && enr) {
        const { error } = await supabase
          .from('attendance')
          .upsert([{ enrollment_id: enr.id, record_date: dateStr, status, notes }], { onConflict: 'enrollment_id,record_date' });
        if (!error) return true;
        console.error("Supabase saveAttendance error:", error);
      }
    }
    return MockDatabase.saveAttendance(dateStr, moduleId, studentId, status, notes);
  },

  async saveAttendanceBulk(dateStr, moduleId, attendanceMap) {
    if (isFutureAttendanceDate(dateStr)) {
      console.warn("Future bulk attendance date blocked:", dateStr);
      return false;
    }

    if (isCloudActive()) {
      const studentIds = Object.keys(attendanceMap);
      const { data: enrs, error: enrErr } = await supabase
        .from('enrollments')
        .select('id, student_id')
        .eq('module_id', moduleId)
        .in('student_id', studentIds);

      if (!enrErr && enrs) {
        const upsertPayload = enrs.map(e => ({
          enrollment_id: e.id,
          record_date: dateStr,
          status: attendanceMap[e.student_id].status,
          notes: attendanceMap[e.student_id].notes || ''
        }));
        
        const { error } = await supabase
          .from('attendance')
          .upsert(upsertPayload, { onConflict: 'enrollment_id,record_date' });
        if (!error) return true;
        console.error("Supabase saveAttendanceBulk error:", error);
      }
    }
    return MockDatabase.saveAttendanceBulk(dateStr, moduleId, attendanceMap);
  },

  // --- 7. Leave Request System ---
  async getLeaves() {
    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('leave_applications')
        .select('*, students(name, email, program_id, stage, trimester, section)')
        .order('created_at', { ascending: false });
      if (!error) return data;
      console.error("Supabase getLeaves error:", error);
    }
    return MockDatabase.fetchLeaves().map(l => {
      const s = MockDatabase.data.students.find(student => student.id === l.student_id);
      return { ...l, students: s || null };
    });
  },

  async getStudentLeaves(studentId) {
    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('student_id', studentId)
        .order('start_date', { ascending: false });
      if (!error) return data;
      console.error("Supabase getStudentLeaves error:", error);
    }
    return MockDatabase.fetchStudentLeaves(studentId);
  },

  async submitLeave(studentId, startDate, endDate, type, reason) {
    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('leave_applications')
        .insert([{ student_id: studentId, start_date: startDate, end_date: endDate, type, reason, status: 'Pending' }])
        .select()
        .single();
      if (!error) return data;
      console.error("Supabase submitLeave error:", error);
    }
    return MockDatabase.submitLeave(studentId, startDate, endDate, type, reason);
  },

  async auditLeave(leaveId, status) {
    if (isCloudActive()) {
      const { error } = await supabase
        .from('leave_applications')
        .update({ status })
        .eq('id', parseInt(leaveId));
      
      if (!error) {
        if (status === 'Approved') {
          const { data: leave } = await supabase
            .from('leave_applications')
            .select('*')
            .eq('id', parseInt(leaveId))
            .single();

          if (leave) {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              
              const { data: enrs } = await supabase
                .from('enrollments')
                .select('id')
                .eq('student_id', leave.student_id)
                .eq('status', 'Active');
              
              if (enrs && enrs.length > 0) {
                const upsertPayload = enrs.map(e => ({
                  enrollment_id: e.id,
                  record_date: dateStr,
                  status: 'E',
                  notes: `Excused: Approved ${leave.type} Leave`
                }));
                await supabase.from('attendance').upsert(upsertPayload, { onConflict: 'enrollment_id,record_date' });
              }
            }
          }
        }
        return true;
      }
      console.error("Supabase auditLeave error:", error);
    }
    return MockDatabase.auditLeave(leaveId, status);
  },

  // --- 8. Trimester Migration Engine ---
  async migrateCohort(programId, stage, fromTri, toTri, studentIds, newSection = null) {
    if (isCloudActive()) {
      const destModules = await this.getModules(programId, stage, toTri);

      for (const id of studentIds) {
        const { data: activeEnrs } = await supabase
          .from('enrollments')
          .select('id, module_id, modules!inner(*)')
          .eq('student_id', id)
          .eq('status', 'Active')
          .eq('modules.program_id', programId)
          .eq('modules.stage', stage)
          .eq('modules.trimester', fromTri);

        if (activeEnrs && activeEnrs.length > 0) {
          const activeEnrIds = activeEnrs.map(ae => ae.id);
          await supabase
            .from('enrollments')
            .update({ status: 'Completed' })
            .in('id', activeEnrIds);
        }
        const originStage = (parseInt(fromTri) === 3 && parseInt(toTri) === 1) ? parseInt(stage) - 1 : parseInt(stage);
        const updatePayload = { stage: parseInt(stage), trimester: toTri };
        if (newSection) updatePayload.section = newSection;

        await supabase
          .from('students')
          .update(updatePayload)
          .eq('id', id);

        const enrollmentsToInsert = destModules.map(m => ({
          student_id: id,
          module_id: m.id,
          status: 'Active'
        }));

        if (enrollmentsToInsert.length > 0) {
          await supabase.from('enrollments').upsert(enrollmentsToInsert, { onConflict: 'student_id,module_id' });
        }
      }

      const originStage = (parseInt(fromTri) === 3 && parseInt(toTri) === 1) ? parseInt(stage) - 1 : parseInt(stage);
      await supabase
        .from('migration_logs')
        .insert([{
          program_id: programId,
          origin_stage: originStage,
          origin_trimester: parseInt(fromTri),
          target_stage: parseInt(stage),
          target_trimester: parseInt(toTri),
          target_section: newSection || 'A',
          student_count: studentIds.length
        }]);

      return true;
    }
    return MockDatabase.migrateCohort(programId, stage, fromTri, toTri, studentIds, newSection);
  },

  async getMigrationLogs() {
    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('migration_logs')
        .select('*')
        .order('executed_at', { ascending: false });
      if (!error) return data;
      console.error("Supabase getMigrationLogs error:", error);
    }
    const logs = MockDatabase.fetchMigrationLogs();
    return [...logs].sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at));
  },

  // --- 9. Analytics & Heatmaps Queries ---
  async getStudentAttendanceHistory(studentId) {
    if (isCloudActive()) {
      const { data, error } = await supabase
        .from('attendance')
        .select('record_date, status, notes, enrollments!inner(student_id, module_id, modules(*))')
        .eq('enrollments.student_id', studentId);

      if (!error) {
        return data.map(d => ({
          date: d.record_date,
          moduleId: d.enrollments.module_id,
          moduleTitle: d.enrollments.modules ? d.enrollments.modules.title : 'Unknown Module',
          module: d.enrollments.modules || null,
          tutor: d.enrollments.modules ? d.enrollments.modules.tutor : 'Unassigned',
          batchId: d.enrollments.modules ? d.enrollments.modules.batch_id : null,
          section: d.enrollments.modules ? d.enrollments.modules.section : null,
          status: d.status,
          notes: d.notes
        }));
      }
      console.error("Supabase getStudentAttendanceHistory error:", error);
    }
    return MockDatabase.getStudentAttendanceHistory(studentId);
  },

  async getCalendarDateStatuses(programId, stage, trimester, section) {
    if (isCloudActive()) {
      const modules = await this.getModules(programId, stage, trimester);
      const modIds = modules.map(m => m.id);

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('record_date, status, enrollments!inner(module_id, student_id, students!inner(section))')
        .in('enrollments.module_id', modIds)
        .eq('enrollments.students.section', section);

      if (attendanceData) {
        const dateMap = {};
        attendanceData.forEach(ad => {
          const date = ad.record_date;
          const mId = ad.enrollments.module_id;
          if (!dateMap[date]) dateMap[date] = {};
          if (!dateMap[date][mId]) dateMap[date][mId] = 0;
          dateMap[date][mId]++;
        });

        const statusMap = {};
        const enrollCounts = {};
        for (const m of modules) {
          const students = await this.getEnrolledStudents(m.id, section);
          enrollCounts[m.id] = students.length;
        }

        Object.entries(dateMap).forEach(([date, modMap]) => {
          let completeMods = 0;
          let activeMods = 0;

          Object.entries(enrollCounts).forEach(([mId, count]) => {
            if (count === 0) return;
            activeMods++;
            const marked = modMap[mId] || 0;
            if (marked >= count) {
              completeMods++;
            }
          });

          if (completeMods === 0) statusMap[date] = 'unmarked';
          else if (completeMods === activeMods) statusMap[date] = 'complete';
          else statusMap[date] = 'partial';
        });

        return statusMap;
      }
    }

    const statusMap = {};
    Object.keys(MockDatabase.data.attendance).forEach(dateStr => {
      statusMap[dateStr] = MockDatabase.getDateStatusForCalendar(dateStr);
    });
    return statusMap;
  }
};
export default dbService;
