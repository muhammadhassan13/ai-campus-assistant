CREATE DATABASE ai_campus_assistant;
USE ai_campus_assistant;

CREATE TABLE Instructor (
    instructor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL
);

CREATE TABLE Student (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    degree VARCHAR(100) NOT NULL,
    gpa DECIMAL(3, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Active'
);

CREATE TABLE Course (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    credits INT NOT NULL CHECK (credits BETWEEN 1 AND 4),
    instructor_id INT NOT NULL,
    FOREIGN KEY (instructor_id) REFERENCES Instructor(instructor_id) ON DELETE RESTRICT
);

CREATE TABLE Assignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    max_score INT NOT NULL,
    due_date DATE,
    course_id INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES Course(course_id) ON DELETE CASCADE
);

CREATE TABLE Enrollment (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_date DATE NOT NULL,
    grade VARCHAR(5),
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES Student(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES Course(course_id) ON DELETE CASCADE,
    CONSTRAINT unique_student_course UNIQUE (student_id, course_id)
);

CREATE TABLE Query_Log (
    query_id INT AUTO_INCREMENT PRIMARY KEY,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    student_id INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES Student(student_id) ON DELETE CASCADE
);

-- populating the tables with dummy data
INSERT INTO Instructor (name, email, department)
VALUES
('Dr. Sarah Ahmed', 'sarah.ahmed@campus.edu', 'Computer Science'),
('Prof. Usman Khan', 'usman.khan@campus.edu', 'Software Engineering');

INSERT INTO Student (name, email, degree, gpa, status)
VALUES
('Muhammad Hassan Naeem', 'hassan.naeem@student.campus.edu', 'BS Computer Science', 3.85, 'Active'),
('Syed Shabih Haider', 'shabih.haider@student.campus.edu', 'BS Software Engineering', 3.70, 'Active');

INSERT INTO Course (course_code, title, credits, instructor_id)
VALUES
('CS-201', 'Database Systems', 3, (SELECT instructor_id FROM Instructor WHERE email = 'sarah.ahmed@campus.edu')),
('SE-302', 'Software Architecture', 3, (SELECT instructor_id FROM Instructor WHERE email = 'usman.khan@campus.edu'));

INSERT INTO Assignment (title, max_score, due_date, course_id)
VALUES
('Assignment 1: ERD & Relational Schema', 100, '2026-09-15', (SELECT course_id FROM Course WHERE course_code = 'CS-201')),
('Quiz 1: Architectural Patterns', 50, '2026-09-20', (SELECT course_id FROM Course WHERE course_code = 'SE-302'));

INSERT INTO Enrollment (enrollment_date, grade, student_id, course_id)
VALUES
('2026-08-25', 'A', (SELECT student_id FROM Student WHERE email = 'hassan.naeem@student.campus.edu'), (SELECT course_id FROM Course WHERE course_code = 'CS-201')),
('2026-08-25', 'A-', (SELECT student_id FROM Student WHERE email = 'shabih.haider@student.campus.edu'), (SELECT course_id FROM Course WHERE course_code = 'SE-302'));

INSERT INTO Query_Log (prompt, response, student_id)
VALUES
('When is Assignment 1 for Database Systems due?', 'Assignment 1: ERD & Relational Schema is due on September 15, 2026.', (SELECT student_id FROM Student WHERE email = 'hassan.naeem@student.campus.edu'));

-- Invalid Foreign Key Test
INSERT INTO Course (course_code, title, credits, instructor_id) 
VALUES
('CS-999', 'Broken Reference Course', 3, 9999);

-- CHECK Constraint Violation Test
INSERT INTO Course (course_code, title, credits, instructor_id) 
VALUES
('CS-500', 'Invalid Credits Course', 10, 1);

-- UNIQUE Constraint Violation Test
INSERT INTO Enrollment (enrollment_date, grade, student_id, course_id) 
VALUES
('2026-09-02', 'B+', 1, 1);