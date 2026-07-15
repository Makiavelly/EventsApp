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

func (r *UsersRepository) GetUserByEmail(ctx context.Context, email string) (domain.User, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	row := r.pool.QueryRow(ctx, `
		SELECT id, name, email, password
		FROM eventsapp.users
		WHERE lower(email) = lower($1);
	`, strings.TrimSpace(email))

	var model UserModel
	if err := row.Scan(&model.ID, &model.Name, &model.Email, &model.Password); err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.User{}, fmt.Errorf("user with this email: %w", core_errors.ErrNotFound)
		}
		return domain.User{}, fmt.Errorf("scan error: %w", err)
	}

	return domain.NewUser(model.ID, model.Name, model.Email, model.Password), nil
}
