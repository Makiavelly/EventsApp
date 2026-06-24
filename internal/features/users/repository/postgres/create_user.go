package users_postgres_repository

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (r *UsersRepository) CreateUser(
	ctx context.Context,
	user domain.User,
) (domain.User, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	INSERT INTO eventsapp.users (name, email, password)
	VALUES ($1, $2, $3)
	RETURNING id, name, email, password;
	`

	row := r.pool.QueryRow(ctx, query, user.Name, user.Email, user.Password)

	var userModel UserModel
	err := row.Scan(
		&userModel.ID,
		&userModel.Name,
		&userModel.Email,
		&userModel.Password,
	)
	if err != nil {
		return domain.User{}, fmt.Errorf("scan error: %w", err)
	}

	userDomain := domain.NewUser(
		userModel.ID,
		userModel.Name,
		userModel.Email,
		userModel.Password,
	)

	return userDomain, err
}
