-- =======================================================
-- ISMT College: Student Attendance & Cohort Migration System
-- Relational Database DDL Schema (PostgreSQL)
-- Includes multi-section cohorts and intake batches.
-- Execute this script directly in your Supabase SQL Editor.
-- =======================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BATCHES (Intakes)
CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(50) PRIMARY KEY, -- e.g., 'jan_2026', 'apr_2026'
    title VARCHAR(255) NOT NULL, -- e.g., 'January 2026 Intake'
    sections VARCHAR(255) NOT NULL DEFAULT 'A,B', -- e.g., 'A,B,C'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PROGRAMS
CREATE TABLE IF NOT EXISTS programs (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    duration_years INT NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. STUDENTS (Includes section and batch assignment)
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    contact_number VARCHAR(50),
    personal_email VARCHAR(255),
    parent_name VARCHAR(255),
    parent_contact_number VARCHAR(50),
    student_code VARCHAR(100),
    program_id VARCHAR(50) REFERENCES programs(id) ON DELETE RESTRICT,
    batch_id VARCHAR(50) REFERENCES batches(id) ON DELETE RESTRICT,
    stage INT NOT NULL CHECK (stage BETWEEN 1 AND 3),
    trimester INT NOT NULL CHECK (trimester BETWEEN 1 AND 3),
    section VARCHAR(50) NOT NULL DEFAULT 'A',
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Graduated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Existing Supabase databases created before this update need these nullable student profile fields too.
ALTER TABLE students ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_contact_number VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_code VARCHAR(100);

-- 4. MODULES
CREATE TABLE IF NOT EXISTS modules (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    program_id VARCHAR(50) REFERENCES programs(id) ON DELETE CASCADE,
    batch_id VARCHAR(50) REFERENCES batches(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL DEFAULT 'A',
    stage INT NOT NULL CHECK (stage BETWEEN 1 AND 3),
    trimester INT NOT NULL CHECK (trimester BETWEEN 1 AND 3),
    tutor VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ENROLLMENTS (Links students to modules they take)
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    module_id VARCHAR(50) REFERENCES modules(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Retake')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, module_id)
);

-- 6. ATTENDANCE RECORDS (Tracks status per student enrollment per date)
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    enrollment_id INT REFERENCES enrollments(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    status VARCHAR(1) NOT NULL CHECK (status IN ('P', 'A', 'L', 'E')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (enrollment_id, record_date)
);

-- 7. LEAVE APPLICATIONS (Digital requests filed by students)
CREATE TABLE IF NOT EXISTS leave_applications (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Medical', 'Personal', 'College Event')),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. MIGRATION LOGS (History tracker of cohort migrations)
CREATE TABLE IF NOT EXISTS migration_logs (
    id SERIAL PRIMARY KEY,
    program_id VARCHAR(50) REFERENCES programs(id) ON DELETE CASCADE,
    origin_stage INT NOT NULL,
    origin_trimester INT NOT NULL,
    target_stage INT NOT NULL,
    target_trimester INT NOT NULL,
    target_section VARCHAR(50) NOT NULL,
    student_count INT NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =======================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =======================================================
CREATE INDEX IF NOT EXISTS idx_students_cohort ON students (program_id, stage, trimester, section);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students (batch_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_code_unique ON students (student_code) WHERE student_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_modules_trimester ON modules (program_id, stage, trimester);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (record_date);
CREATE INDEX IF NOT EXISTS idx_leaves_student ON leave_applications (student_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_date ON migration_logs (executed_at);
