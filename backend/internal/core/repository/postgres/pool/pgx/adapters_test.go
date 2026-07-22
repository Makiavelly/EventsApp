package core_pgx_pool

import (
	"errors"
	"testing"

	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func TestMapError(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		err  error
		want error
	}{
		{name: "no rows", err: pgx.ErrNoRows, want: core_postgres_pool.ErrNoRows},
		{name: "foreign key", err: &pgconn.PgError{Code: "23503"}, want: core_postgres_pool.ErrViolatesForeignKey},
		{name: "unique", err: &pgconn.PgError{Code: "23505"}, want: core_postgres_pool.ErrViolatesUnique},
		{name: "check", err: &pgconn.PgError{Code: "23514"}, want: core_postgres_pool.ErrViolatesCheck},
		{name: "unknown", err: errors.New("network error"), want: core_postgres_pool.ErrUnknown},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			if err := mapError(test.err); !errors.Is(err, test.want) {
				t.Fatalf("mapError() = %v, want %v", err, test.want)
			}
		})
	}
}
