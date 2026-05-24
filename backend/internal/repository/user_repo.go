package repository

import (
	"context"
	"fmt"

	"github.com/ccsthesis/examplatform/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type userRepo struct{ db *pgxpool.Pool }

func NewUserRepo(db *pgxpool.Pool) UserRepository { return &userRepo{db: db} }

func (r *userRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(ctx,
		`SELECT id,email,password,first_name,last_name,role,is_active,created_at,updated_at
		 FROM users WHERE email=$1 AND is_active=true`, email).
		Scan(&u.ID, &u.Email, &u.Password, &u.FirstName, &u.LastName,
			&u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return u, nil
}

func (r *userRepo) FindByID(ctx context.Context, id string) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(ctx,
		`SELECT id,email,password,first_name,last_name,role,is_active,created_at,updated_at
		 FROM users WHERE id=$1`, id).
		Scan(&u.ID, &u.Email, &u.Password, &u.FirstName, &u.LastName,
			&u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return u, nil
}

func (r *userRepo) Create(ctx context.Context, email, password, firstName, lastName, role string) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO users(email,password,first_name,last_name,role)
		 VALUES($1,$2,$3,$4,$5)
		 RETURNING id,email,first_name,last_name,role,is_active,created_at,updated_at`,
		email, password, firstName, lastName, role).
		Scan(&u.ID, &u.Email, &u.FirstName, &u.LastName, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	return u, nil
}

func (r *userRepo) List(ctx context.Context) ([]*models.User, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id,email,first_name,last_name,role,is_active,created_at,updated_at FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []*models.User
	for rows.Next() {
		u := &models.User{}
		if err := rows.Scan(&u.ID, &u.Email, &u.FirstName, &u.LastName, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

func (r *userRepo) UpdateRole(ctx context.Context, id uuid.UUID, role models.UserRole) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET role=$1,updated_at=NOW() WHERE id=$2`, role, id)
	return err
}

func (r *userRepo) Deactivate(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET is_active=false,updated_at=NOW() WHERE id=$1`, id)
	return err
}
