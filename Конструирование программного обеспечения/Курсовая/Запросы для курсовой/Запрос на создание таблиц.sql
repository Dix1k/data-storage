-- 1. Создание таблиц

CREATE TABLE faculty (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    dean_name VARCHAR(100) NOT NULL
);

CREATE TABLE department (
    id INT IDENTITY(1,1) PRIMARY KEY,
    faculty_id INT NOT NULL
        CONSTRAINT fk_department_faculty
        REFERENCES faculty(id),
    name VARCHAR(100) NOT NULL
);

CREATE TABLE specialty (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(15) NOT NULL UNIQUE
);

CREATE TABLE edu_group (
    id INT IDENTITY(1,1) PRIMARY KEY,
    specialty_id INT NOT NULL
        CONSTRAINT fk_group_specialty
        REFERENCES specialty(id),
    name VARCHAR(20) NOT NULL UNIQUE,
    course INT 
        CONSTRAINT ck_group_course 
        CHECK (course BETWEEN 1 AND 6)
);

CREATE TABLE student (
    id INT IDENTITY(1,1) PRIMARY KEY,
    group_id INT NOT NULL
        CONSTRAINT fk_student_group
        REFERENCES edu_group(id),
    full_name VARCHAR(100) NOT NULL,
    student_id VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(20) 
        CONSTRAINT df_student_status 
        DEFAULT N'Обучается'
);

CREATE TABLE teacher (
    id INT IDENTITY(1,1) PRIMARY KEY,
    department_id INT NOT NULL
        CONSTRAINT fk_teacher_department
        REFERENCES department(id),
    full_name VARCHAR(100) NOT NULL,
    position VARCHAR(50) NOT NULL
);

CREATE TABLE subject (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    hours INT NOT NULL 
        CONSTRAINT ck_subject_hours 
        CHECK (hours > 0)
);

CREATE TABLE semester (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
);