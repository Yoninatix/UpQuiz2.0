package repository

import (
	"context"

	"github.com/ccsthesis/examplatform/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type attemptRepo struct{ db *pgxpool.Pool }

func NewAttemptRepo(db *pgxpool.Pool) AttemptRepository { return &attemptRepo{db: db} }

func (r *attemptRepo) FindOrCreate(ctx context.Context, examID, studentID uuid.UUID) (*models.StudentExamAttempt, error) {
	a := &models.StudentExamAttempt{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO student_exam_attempts(exam_id,student_id)
		 VALUES($1,$2)
		 ON CONFLICT (exam_id,student_id)
		 DO UPDATE SET exam_id=EXCLUDED.exam_id
		 RETURNING id,exam_id,student_id,status,started_at,submitted_at,total_score,max_score,percentage`,
		examID, studentID).
		Scan(&a.ID, &a.ExamID, &a.StudentID, &a.Status, &a.StartedAt,
			&a.SubmittedAt, &a.TotalScore, &a.MaxScore, &a.Percentage)
	return a, err
}

func (r *attemptRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.StudentExamAttempt, error) {
	a := &models.StudentExamAttempt{}
	err := r.db.QueryRow(ctx,
		`SELECT id,exam_id,student_id,status,started_at,submitted_at,total_score,max_score,percentage
		 FROM student_exam_attempts WHERE id=$1`, id).
		Scan(&a.ID, &a.ExamID, &a.StudentID, &a.Status, &a.StartedAt,
			&a.SubmittedAt, &a.TotalScore, &a.MaxScore, &a.Percentage)
	return a, err
}

func (r *attemptRepo) UpsertAnswer(ctx context.Context, attemptID, questionID uuid.UUID, answerText string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO student_answers(attempt_id,question_id,answer_text)
		 VALUES($1,$2,$3)
		 ON CONFLICT (attempt_id,question_id) DO UPDATE SET answer_text=EXCLUDED.answer_text`,
		attemptID, questionID, answerText)
	return err
}

func (r *attemptRepo) GetAnswers(ctx context.Context, attemptID uuid.UUID) ([]*models.StudentAnswer, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id,attempt_id,question_id,answer_text,is_correct,points_earned,scored_by,scored_at
		 FROM student_answers WHERE attempt_id=$1`, attemptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var answers []*models.StudentAnswer
	for rows.Next() {
		a := &models.StudentAnswer{}
		if err := rows.Scan(&a.ID, &a.AttemptID, &a.QuestionID, &a.AnswerText,
			&a.IsCorrect, &a.PointsEarned, &a.ScoredBy, &a.ScoredAt); err != nil {
			return nil, err
		}
		answers = append(answers, a)
	}
	return answers, nil
}

func (r *attemptRepo) Submit(ctx context.Context, attemptID uuid.UUID, total, max, pct float64) error {
	_, err := r.db.Exec(ctx,
		`UPDATE student_exam_attempts
		 SET status='submitted', submitted_at=NOW(), total_score=$1, max_score=$2, percentage=$3
		 WHERE id=$4`,
		total, max, pct, attemptID)
	return err
}
