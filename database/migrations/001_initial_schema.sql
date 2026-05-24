-- ============================================================
-- 001_initial_schema.sql
-- Run automatically by PostgreSQL on first container start.
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM types ─────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'educator', 'student');

CREATE TYPE question_type AS ENUM (
    'multiple_choice',
    'true_or_false',
    'fill_in_the_blank',
    'essay',
    'matching'
);

CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

CREATE TYPE exam_status AS ENUM ('draft', 'published', 'closed');

CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'scored');

-- ─── users ───────────────────────────────────────────────────
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    TEXT NOT NULL,            -- bcrypt hash
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    role        user_role NOT NULL DEFAULT 'student',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── subjects ────────────────────────────────────────────────
CREATE TABLE subjects (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    educator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── subject_enrollments (students per subject) ──────────────
CREATE TABLE subject_enrollments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subject_id, student_id)
);

-- ─── uploaded_documents ──────────────────────────────────────
CREATE TABLE uploaded_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    original_name   VARCHAR(500) NOT NULL,
    stored_path     TEXT NOT NULL,          -- path inside container /app/uploads
    file_size_bytes BIGINT,
    page_count      INT,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
                                            -- pending | processing | ready | failed
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── document_chunks ─────────────────────────────────────────
-- Metadata only; actual vectors live in Milvus.
CREATE TABLE document_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES uploaded_documents(id) ON DELETE CASCADE,
    chunk_index     INT NOT NULL,           -- order within document
    content         TEXT NOT NULL,          -- raw text of the chunk
    token_count     INT,
    milvus_id       BIGINT,                 -- corresponding Milvus vector ID
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, chunk_index)
);

-- ─── generated_questions ─────────────────────────────────────
CREATE TABLE generated_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES uploaded_documents(id) ON DELETE CASCADE,
    chunk_id        UUID REFERENCES document_chunks(id) ON DELETE SET NULL,
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    question_text   TEXT NOT NULL,
    question_type   question_type NOT NULL,
    difficulty      difficulty_level NOT NULL DEFAULT 'medium',
    topic_tag       VARCHAR(200),

    -- correct_answer stores: plain text for short types, letter for MC
    correct_answer  TEXT NOT NULL,

    -- choices: JSON array for MC / matching; NULL for others
    -- MC:      [{"key":"A","text":"..."},{"key":"B","text":"..."},...]
    -- Matching:[{"left":"term","right":"definition"},...]
    choices         JSONB,

    is_approved     BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── exams ───────────────────────────────────────────────────
CREATE TABLE exams (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id          UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_by          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    title               VARCHAR(300) NOT NULL,
    instructions        TEXT,
    time_limit_minutes  INT,                -- NULL = no limit
    passing_score       NUMERIC(5,2),       -- percentage, e.g. 75.00
    randomize_questions BOOLEAN NOT NULL DEFAULT TRUE,
    status              exam_status NOT NULL DEFAULT 'draft',

    available_from      TIMESTAMPTZ,
    available_until     TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── exam_questions (junction) ───────────────────────────────
CREATE TABLE exam_questions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES generated_questions(id) ON DELETE CASCADE,
    position    INT NOT NULL,               -- display order when not randomised
    points      NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    UNIQUE (exam_id, question_id)
);

-- ─── student_exam_attempts ───────────────────────────────────
CREATE TABLE student_exam_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          attempt_status NOT NULL DEFAULT 'in_progress',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at    TIMESTAMPTZ,
    total_score     NUMERIC(7,2),           -- raw points earned
    max_score       NUMERIC(7,2),           -- total possible points
    percentage      NUMERIC(5,2),           -- computed percentage
    UNIQUE (exam_id, student_id)            -- one attempt per student per exam
);

-- ─── student_answers ─────────────────────────────────────────
CREATE TABLE student_answers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id      UUID NOT NULL REFERENCES student_exam_attempts(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES generated_questions(id) ON DELETE CASCADE,
    answer_text     TEXT,                   -- raw student answer
    is_correct      BOOLEAN,               -- NULL until scored
    points_earned   NUMERIC(5,2),
    scored_by       VARCHAR(20),            -- 'auto' or 'manual'
    scored_at       TIMESTAMPTZ,
    UNIQUE (attempt_id, question_id)
);

-- ─── topic_performance ───────────────────────────────────────
CREATE TABLE topic_performance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    topic_tag       VARCHAR(200) NOT NULL,
    total_questions INT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, subject_id, topic_tag)
);

-- ─── Seed: default admin account ────────────────────────────
-- Password: Admin@1234  (bcrypt cost 10, generated via pgcrypto)
INSERT INTO users (email, password, first_name, last_name, role)
VALUES (
    'admin@examplatform.local',
    crypt('Admin@1234', gen_salt('bf', 10)),
    'System',
    'Admin',
    'admin'
);
