-- ============================================================
-- 002_indexes.sql
-- Performance indexes for common query patterns.
-- ============================================================

-- users
CREATE INDEX idx_users_email   ON users(email);
CREATE INDEX idx_users_role    ON users(role);

-- subjects
CREATE INDEX idx_subjects_educator ON subjects(educator_id);

-- subject_enrollments
CREATE INDEX idx_enrollments_student ON subject_enrollments(student_id);
CREATE INDEX idx_enrollments_subject ON subject_enrollments(subject_id);

-- uploaded_documents
CREATE INDEX idx_docs_subject  ON uploaded_documents(subject_id);
CREATE INDEX idx_docs_uploader ON uploaded_documents(uploaded_by);
CREATE INDEX idx_docs_status   ON uploaded_documents(status);

-- document_chunks
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_milvus   ON document_chunks(milvus_id);

-- generated_questions
CREATE INDEX idx_questions_document  ON generated_questions(document_id);
CREATE INDEX idx_questions_subject   ON generated_questions(subject_id);
CREATE INDEX idx_questions_type      ON generated_questions(question_type);
CREATE INDEX idx_questions_difficulty ON generated_questions(difficulty);
CREATE INDEX idx_questions_approved  ON generated_questions(is_approved) WHERE is_deleted = FALSE;
CREATE INDEX idx_questions_topic     ON generated_questions(topic_tag);

-- exams
CREATE INDEX idx_exams_subject  ON exams(subject_id);
CREATE INDEX idx_exams_status   ON exams(status);
CREATE INDEX idx_exams_dates    ON exams(available_from, available_until);

-- exam_questions
CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);

-- student_exam_attempts
CREATE INDEX idx_attempts_student ON student_exam_attempts(student_id);
CREATE INDEX idx_attempts_exam    ON student_exam_attempts(exam_id);
CREATE INDEX idx_attempts_status  ON student_exam_attempts(status);

-- student_answers
CREATE INDEX idx_answers_attempt  ON student_answers(attempt_id);
CREATE INDEX idx_answers_question ON student_answers(question_id);

-- topic_performance
CREATE INDEX idx_topic_perf_student ON topic_performance(student_id, subject_id);
