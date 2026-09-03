-- PostgreSQL Migration Script (ai_campus_assistant)

-- Clean teardown (Migrate Down)
DROP TABLE IF EXISTS query_log CASCADE;
DROP TABLE IF EXISTS enrollment CASCADE;
DROP TABLE IF EXISTS assignment CASCADE;
DROP TABLE IF EXISTS course CASCADE;
DROP TABLE IF EXISTS student CASCADE;
DROP TABLE IF EXISTS instructor CASCADE;

-- Rebuild schema (Migrate Up)
CREATE TABLE instructor (
    instructor_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL
);

CREATE TABLE student (
    student_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    degree VARCHAR(100) NOT NULL,
    gpa NUMERIC(3, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Active'
);

CREATE TABLE course (
    course_id SERIAL PRIMARY KEY,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    credits INT NOT NULL CHECK (credits BETWEEN 1 AND 4),
    instructor_id INT NOT NULL,
    CONSTRAINT fk_course_instructor FOREIGN KEY (instructor_id) 
        REFERENCES instructor(instructor_id) ON DELETE RESTRICT
);

CREATE TABLE assignment (
    assignment_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    max_score INT NOT NULL,
    due_date DATE,
    course_id INT NOT NULL,
    CONSTRAINT fk_assignment_course FOREIGN KEY (course_id) 
        REFERENCES course(course_id) ON DELETE CASCADE
);

CREATE TABLE enrollment (
    enrollment_id SERIAL PRIMARY KEY,
    enrollment_date DATE NOT NULL,
    grade VARCHAR(5),
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    CONSTRAINT fk_enrollment_student FOREIGN KEY (student_id) 
        REFERENCES student(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollment_course FOREIGN KEY (course_id) 
        REFERENCES course(course_id) ON DELETE CASCADE,
    CONSTRAINT unique_student_course UNIQUE (student_id, course_id)
);

CREATE TABLE query_log (
    query_id SERIAL PRIMARY KEY,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    student_id INT NOT NULL,
    CONSTRAINT fk_query_log_student FOREIGN KEY (student_id) 
        REFERENCES student(student_id) ON DELETE CASCADE
);

-- Seed Initial Test Data
INSERT INTO student (name, email, degree, gpa, status) VALUES
('Hassan Naeem', 'hassan@example.com', 'Computer Science', 3.80, 'Active'),
('Shabih Haider', 'shabih@example.com', 'Software Engineering', 3.65, 'Active');

ALTER TABLE student 
ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '$2b$10$defaultHashPlaceholderValueForExistingRows123456789012';