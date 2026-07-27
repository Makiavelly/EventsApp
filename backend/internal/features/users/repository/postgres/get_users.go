package users_postgres_repository

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (r *UsersRepository) GetPublicUsers(
	ctx context.Context,
	limit *int,
	offset *int,
) ([]domain.PublicUser, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	SELECT id, name
	FROM eventsapp.users
	ORDER BY id ASC
	LIMIT $1
	OFFSET $2;
	`

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("select users: %w", err)
	}
	defer rows.Close()

	var userModels []PublicUserModel
	for rows.Next() {
		var userModel PublicUserModel

		err := rows.Scan(
			&userModel.ID,
			&userModel.Name,
		)
		if err != nil {
			return nil, fmt.Errorf("scan users: %w", err)
		}

		userModels = append(userModels, userModel)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("next rows: %w", err)
	}

	userDomains := publicUserDomainsFromModels(userModels)

	return userDomains, nil
}
