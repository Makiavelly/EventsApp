package users_postgres_repository

import (
	"context"
	"strings"
	"testing"
	"time"

	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
)

type projectionPoolStub struct {
	query string
}

func (*projectionPoolStub) Close() {}

func (*projectionPoolStub) OpTimeout() time.Duration {
	return time.Second
}

func (p *projectionPoolStub) Query(
	_ context.Context,
	query string,
	_ ...any,
) (core_postgres_pool.Rows, error) {
	p.query = query
	return &publicUserRowsStub{}, nil
}

func (p *projectionPoolStub) QueryRow(
	_ context.Context,
	query string,
	_ ...any,
) core_postgres_pool.Row {
	p.query = query
	return publicUserRowStub{}
}

func (*projectionPoolStub) Exec(
	context.Context,
	string,
	...any,
) (core_postgres_pool.CommandTag, error) {
	return nil, nil
}

type publicUserRowStub struct{}

func (publicUserRowStub) Scan(dest ...any) error {
	*dest[0].(*int) = 7
	*dest[1].(*string) = "Public name"
	return nil
}

type publicUserRowsStub struct {
	read bool
}

func (*publicUserRowsStub) Close() {}
func (*publicUserRowsStub) Err() error {
	return nil
}
func (r *publicUserRowsStub) Next() bool {
	if r.read {
		return false
	}
	r.read = true
	return true
}
func (*publicUserRowsStub) Scan(dest ...any) error {
	return publicUserRowStub{}.Scan(dest...)
}

func TestGetPublicUserSelectsOnlyPublicColumns(t *testing.T) {
	t.Parallel()

	pool := &projectionPoolStub{}
	repository := NewUsersRepository(pool)

	user, err := repository.GetPublicUser(context.Background(), 7)
	if err != nil {
		t.Fatalf("GetPublicUser() error = %v", err)
	}
	if user.ID != 7 || user.Name != "Public name" {
		t.Fatalf("GetPublicUser() = %+v", user)
	}

	lowerQuery := strings.ToLower(pool.query)
	if strings.Contains(lowerQuery, "email") ||
		strings.Contains(lowerQuery, "password") {
		t.Fatalf("public projection selected a private column: %s", pool.query)
	}
	if !strings.Contains(lowerQuery, "select id, name") {
		t.Fatalf("public projection does not explicitly select id/name: %s", pool.query)
	}
}

func TestGetPublicUsersSelectsOnlyPublicColumns(t *testing.T) {
	t.Parallel()

	pool := &projectionPoolStub{}
	repository := NewUsersRepository(pool)
	limit, offset := 10, 0

	users, err := repository.GetPublicUsers(
		context.Background(),
		&limit,
		&offset,
	)
	if err != nil {
		t.Fatalf("GetPublicUsers() error = %v", err)
	}
	if len(users) != 1 || users[0].Name != "Public name" {
		t.Fatalf("GetPublicUsers() = %+v", users)
	}

	lowerQuery := strings.ToLower(pool.query)
	if strings.Contains(lowerQuery, "email") ||
		strings.Contains(lowerQuery, "password") {
		t.Fatalf("public list projection selected a private column: %s", pool.query)
	}
	if !strings.Contains(lowerQuery, "select id, name") {
		t.Fatalf("public list does not explicitly select id/name: %s", pool.query)
	}
}
