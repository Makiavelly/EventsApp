package users_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
)

func (r *UsersRepository) GetPublicUser(
	ctx context.Context,
	id int,
) (domain.PublicUser, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	const query = `
	SELECT id, name
	FROM eventsapp.users
	WHERE id=$1;
	`

	var userModel PublicUserModel
	if err := r.pool.QueryRow(ctx, query, id).Scan(
		&userModel.ID,
		&userModel.Name,
	); err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.PublicUser{}, fmt.Errorf(
				"user with id='%d': %w",
				id,
				core_errors.ErrNotFound,
			)
		}

		return domain.PublicUser{}, fmt.Errorf("scan public user: %w", err)
	}

	return domain.NewPublicUser(userModel.ID, userModel.Name), nil
}
