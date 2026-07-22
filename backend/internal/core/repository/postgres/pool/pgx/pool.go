package core_pgx_pool

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/url"
	"time"

	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type transactionContextKey struct{}

type Pool struct {
	*pgxpool.Pool
	opTimeout time.Duration
}

func NewPool(ctx context.Context, config Config) (*Pool, error) {
	connectionURL := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(config.User, config.Password),
		Host:   net.JoinHostPort(config.Host, config.Port),
		Path:   config.Database,
	}
	query := connectionURL.Query()
	query.Set("sslmode", config.SSLMode)
	if config.SSLRootCert != "" {
		query.Set("sslrootcert", config.SSLRootCert)
	}
	connectionURL.RawQuery = query.Encode()

	pgxconfig, err := pgxpool.ParseConfig(connectionURL.String())
	if err != nil {
		return nil, fmt.Errorf("parse pgxconfig: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(ctx, pgxconfig)
	if err != nil {
		return nil, fmt.Errorf("create pgxpool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("pgxpool ping: %w", err)
	}

	return &Pool{
		Pool:      pool,
		opTimeout: config.Timeout,
	}, nil
}

func (p *Pool) Query(ctx context.Context, sql string, args ...any) (core_postgres_pool.Rows, error) {
	rows, err := p.executor(ctx).Query(ctx, sql, args...)
	if err != nil {
		return nil, mapError(err)
	}

	return pgxRows{rows}, nil
}

func (p *Pool) QueryRow(ctx context.Context, sql string, args ...any) core_postgres_pool.Row {
	row := p.executor(ctx).QueryRow(ctx, sql, args...)

	return pgxRow{row}
}

func (p *Pool) Exec(ctx context.Context, sql string, args ...any) (core_postgres_pool.CommandTag, error) {
	tag, err := p.executor(ctx).Exec(ctx, sql, args...)
	if err != nil {
		return nil, mapError(err)
	}

	return pgxCommandTag{tag}, nil
}

func (p *Pool) OpTimeout() time.Duration {
	return p.opTimeout
}

func (p *Pool) WithTransaction(
	ctx context.Context,
	operation func(context.Context) error,
) error {
	if _, ok := ctx.Value(transactionContextKey{}).(pgx.Tx); ok {
		return operation(ctx)
	}

	tx, err := p.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", mapError(err))
	}

	txCtx := context.WithValue(ctx, transactionContextKey{}, tx)
	if err := operation(txCtx); err != nil {
		if rollbackErr := tx.Rollback(context.Background()); rollbackErr != nil {
			return errors.Join(
				err,
				fmt.Errorf("rollback transaction: %w", mapError(rollbackErr)),
			)
		}

		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", mapError(err))
	}

	return nil
}

type pgxExecutor interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
}

func (p *Pool) executor(ctx context.Context) pgxExecutor {
	if tx, ok := ctx.Value(transactionContextKey{}).(pgx.Tx); ok {
		return tx
	}

	return p.Pool
}
