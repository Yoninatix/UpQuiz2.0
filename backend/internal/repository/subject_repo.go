package repository

import (
	"context"

	"github.com/ccsthesis/examplatform/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type subjectRepo struct{ db *pgxpool.Pool }

func NewSubjectRepo(db *pgxpool.Pool) SubjectRepository { return &subjectRepo{db: db} }

func (r *subjectRepo) Create(ctx context.Context, name, description string, educatorID uuid.UUID) (*models.Subject, error) {
	s := &models.Subject{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO subjects(name,description,educator_id) VALUES($1,$2,$3)
		 RETURNING id,name,description,educator_id,created_at,updated_at`,
		name, description, educatorID).
		Scan(&s.ID, &s.Name, &s.Description, &s.EducatorID, &s.CreatedAt, &s.UpdatedAt)
	return s, err
}

func (r *subjectRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.Subject, error) {
	s := &models.Subject{}
	err := r.db.QueryRow(ctx,
		`SELECT id,name,description,educator_id,created_at,updated_at FROM subjects WHERE id=$1`, id).
		Scan(&s.ID, &s.Name, &s.Description, &s.EducatorID, &s.CreatedAt, &s.UpdatedAt)
	return s, err
}

func (r *subjectRepo) ListByEducator(ctx context.Context, educatorID uuid.UUID) ([]*models.Subject, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id,name,description,educator_id,created_at,updated_at FROM subjects WHERE educator_id=$1 ORDER BY name`, educatorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var subjects []*models.Subject
	for rows.Next() {
		s := &models.Subject{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.EducatorID, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		subjects = append(subjects, s)
	}
	return subjects, nil
}

func (r *subjectRepo) ListAll(ctx context.Context) ([]*models.Subject, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id,name,description,educator_id,created_at,updated_at FROM subjects ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var subjects []*models.Subject
	for rows.Next() {
		s := &models.Subject{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.EducatorID, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		subjects = append(subjects, s)
	}
	return subjects, nil
}

func (r *subjectRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM subjects WHERE id=$1`, id)
	return err
}

func (r *subjectRepo) EnrollStudent(ctx context.Context, subjectID, studentID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO subject_enrollments(subject_id,student_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
		subjectID, studentID)
	return err
}

func (r *subjectRepo) ListForStudent(ctx context.Context, studentID uuid.UUID) ([]*models.Subject, error) {
	rows, err := r.db.Query(ctx,
		`SELECT s.id,s.name,s.description,s.educator_id,s.created_at,s.updated_at
		 FROM subjects s
		 JOIN subject_enrollments e ON e.subject_id=s.id
		 WHERE e.student_id=$1 ORDER BY s.name`, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var subjects []*models.Subject
	for rows.Next() {
		s := &models.Subject{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.EducatorID, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		subjects = append(subjects, s)
	}
	return subjects, nil
}
