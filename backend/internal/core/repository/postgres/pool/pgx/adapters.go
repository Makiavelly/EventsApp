package core_pgx_pool

import (
	"errors"
	"fmt"

	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type pgxRows struct {
	pgx.Rows
}

func (r pgxRows) Scan(dest ...any) error {
	if err := r.Rows.Scan(dest...); err != nil {
		return mapError(err)
	}

	return nil
}

func (r pgxRows) Err() error {
	if err := r.Rows.Err(); err != nil {
		return mapError(err)
	}

	return nil
}

type pgxRow struct {
	pgx.Row
}

func (r pgxRow) Scan(dest ...any) error {
	err := r.Row.Scan(dest...)

	if err != nil {
		return mapError(err)
	}

	return nil
}

type pgxCommandTag struct {
	pgconn.CommandTag
}

func mapError(err error) error {
	if err == nil {
		return nil
	}

	const (
		pgxViolatesForeignKeyErrorCode = "23503"
		pgxViolatesUniqueErrorCode     = "23505"
		pgxViolatesCheckErrorCode      = "23514"
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return core_postgres_pool.ErrNoRows
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		if pgErr.Code == pgxViolatesForeignKeyErrorCode {
			return fmt.Errorf(
				"%v: %w",
				err,
				core_postgres_pool.ErrViolatesForeignKey,
			)
		}

		if pgErr.Code == pgxViolatesUniqueErrorCode {
			return fmt.Errorf(
				"%v: %w",
				err,
				core_postgres_pool.ErrViolatesUnique,
			)
		}

		if pgErr.Code == pgxViolatesCheckErrorCode {
			return fmt.Errorf(
				"%v: %w",
				err,
				core_postgres_pool.ErrViolatesCheck,
			)
		}
	}

	return fmt.Errorf(
		"%v:%w",
		err,
		core_postgres_pool.ErrUnknown,
	)
}
