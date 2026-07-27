package users_service

import (
	"context"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

type UsersService struct {
	usersRepository    UsersRepository
	sessionRevoker     SessionRevoker
	transactionManager TransactionManager
}

type UsersRepository interface {
	CreateUser(ctx context.Context, user domain.User, passwordHash string) (domain.User, error)
	GetPublicUsers(ctx context.Context, limit *int, offset *int) ([]domain.PublicUser, error)
	GetPublicUser(ctx context.Context, id int) (domain.PublicUser, error)
	GetUser(ctx context.Context, id int) (domain.User, error)
	GetUserByEmail(ctx context.Context, email string) (domain.UserAccount, error)
	DeleteUser(ctx context.Context, id int) error
	PatchUser(
		ctx context.Context,
		id int,
		user domain.User,
		passwordHash *string,
	) (domain.User, error)
}

type SessionRevoker interface {
	RevokeUserSessions(ctx context.Context, userID int) error
}

type TransactionManager interface {
	WithTransaction(
		ctx context.Context,
		operation func(context.Context) error,
	) error
}

func NewUsersService(
	usersRepository UsersRepository,
	sessionRevoker SessionRevoker,
	transactionManager TransactionManager,
) *UsersService {
	return &UsersService{
		usersRepository:    usersRepository,
		sessionRevoker:     sessionRevoker,
		transactionManager: transactionManager,
	}
}
