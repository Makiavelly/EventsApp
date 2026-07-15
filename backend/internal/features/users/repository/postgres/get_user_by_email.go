package users_postgres_repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
)

func (r *UsersRepository) GetUserByEmail(
	ctx context.Context,
	email string,
) (domain.UserAccount, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	row := r.pool.QueryRow(ctx, `
		SELECT id, name, email, password
		FROM eventsapp.users
		WHERE lower(email) = lower($1);
	`, strings.TrimSpace(email))

	var model UserAccountModel
	if err := row.Scan(
		&model.ID,
		&model.Name,
		&model.Email,
		&model.PasswordHash,
	); err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.UserAccount{}, fmt.Errorf("user with this email: %w", core_errors.ErrNotFound)
		}
		return domain.UserAccount{}, fmt.Errorf("scan error: %w", err)
	}

	return domain.UserAccount{
		User:         domain.NewUser(model.ID, model.Name, model.Email),
		PasswordHash: model.PasswordHash,
	}, nil
}
