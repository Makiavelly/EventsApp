package users_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
)

func (r *UsersRepository) PatchUser(ctx context.Context, id int, user domain.User) (domain.User, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	UPDATE eventsapp.users
	SET
		name=$1,
		password=$2
	WHERE id=$3
	RETURNING 
		id,
		name,
		email,
		password;
	`

	row := r.pool.QueryRow(ctx, query, user.Name, user.Password, id)

	var userModel UserModel
	err := row.Scan(
		&userModel.ID,
		&userModel.Name,
		&userModel.Email,
		&userModel.Password,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.User{}, fmt.Errorf("user with id='%d' : %w", id, core_errors.ErrNotFound)
		}

		return domain.User{}, fmt.Errorf("scan error: %w", err)
	}

	userDomain := domain.NewUser(
		userModel.ID,
		userModel.Name,
		userModel.Email,
		userModel.Password,
	)

	return userDomain, nil
}
