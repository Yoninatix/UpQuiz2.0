package repository

import (
	"context"

	"github.com/ccsthesis/examplatform/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type documentRepo struct{ db *pgxpool.Pool }

func NewDocumentRepo(db *pgxpool.Pool) DocumentRepository { return &documentRepo{db: db} }

func (r *documentRepo) Create(ctx context.Context, subjectID, uploadedBy uuid.UUID, originalName, storedPath string, size int64) (*models.UploadedDocument, error) {
	d := &models.UploadedDocument{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO uploaded_documents(subject_id,uploaded_by,original_name,stored_path,file_size_bytes,status)
		 VALUES($1,$2,$3,$4,$5,'pending')
		 RETURNING id,subject_id,uploaded_by,original_name,stored_path,file_size_bytes,status,created_at,updated_at`,
		subjectID, uploadedBy, originalName, storedPath, size).
		Scan(&d.ID, &d.SubjectID, &d.UploadedBy, &d.OriginalName, &d.StoredPath,
			&d.FileSizeBytes, &d.Status, &d.CreatedAt, &d.UpdatedAt)
	return d, err
}

func (r *documentRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.UploadedDocument, error) {
	d := &models.UploadedDocument{}
	err := r.db.QueryRow(ctx,
		`SELECT id,subject_id,uploaded_by,original_name,stored_path,file_size_bytes,page_count,status,error_message,created_at,updated_at
		 FROM uploaded_documents WHERE id=$1`, id).
		Scan(&d.ID, &d.SubjectID, &d.UploadedBy, &d.OriginalName, &d.StoredPath,
			&d.FileSizeBytes, &d.PageCount, &d.Status, &d.ErrorMessage, &d.CreatedAt, &d.UpdatedAt)
	return d, err
}

func (r *documentRepo) ListBySubject(ctx context.Context, subjectID uuid.UUID) ([]*models.UploadedDocument, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id,subject_id,uploaded_by,original_name,stored_path,file_size_bytes,page_count,status,error_message,created_at,updated_at
		 FROM uploaded_documents WHERE subject_id=$1 ORDER BY created_at DESC`, subjectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var docs []*models.UploadedDocument
	for rows.Next() {
		d := &models.UploadedDocument{}
		if err := rows.Scan(&d.ID, &d.SubjectID, &d.UploadedBy, &d.OriginalName, &d.StoredPath,
			&d.FileSizeBytes, &d.PageCount, &d.Status, &d.ErrorMessage, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}
	return docs, nil
}

func (r *documentRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status, errMsg string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE uploaded_documents SET status=$1,error_message=$2,updated_at=NOW() WHERE id=$3`,
		status, errMsg, id)
	return err
}

func (r *documentRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM uploaded_documents WHERE id=$1`, id)
	return err
}
