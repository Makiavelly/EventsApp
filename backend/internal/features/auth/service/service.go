package auth_service

import (
	"context"
	"time"

	core_auth "github.com/Makiavelly/EventsApp/internal/core/auth"
	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
)

type UsersService interface {
	CreateUser(
		ctx context.Context,
		registration domain.UserRegistration,
	) (domain.User, error)
	GetUser(ctx context.Context, id int) (domain.User, error)
	GetUserByEmail(ctx context.Context, email string) (domain.UserAccount, error)
}

type TokenIssuer interface {
	Issue(userID int, sessionID string) (string, error)
}

type RefreshTokenManager interface {
	Generate(sessionID string) (core_auth.RefreshToken, error)
	Parse(value string) (core_auth.RefreshToken, error)
}

type AuthRepository interface {
	CreateSession(ctx context.Context, session domain.RefreshSession) error
	RotateSession(
		ctx context.Context,
		sessionID string,
		currentTokenHash []byte,
		newTokenHash []byte,
	) (int, time.Time, error)
	RevokeSession(ctx context.Context, sessionID string, tokenHash []byte) error
	ValidateSession(ctx context.Context, sessionID string, userID int) error
	CleanupSessions(ctx context.Context) error
}

type AuthService struct {
	usersService        UsersService
	authRepository      AuthRepository
	accessTokenIssuer   TokenIssuer
	refreshTokenManager RefreshTokenManager
	refreshTokenTTL     time.Duration
	transactionManager  core_postgres_pool.TransactionManager
}

func NewAuthService(
	usersService UsersService,
	authRepository AuthRepository,
	accessTokenIssuer TokenIssuer,
	refreshTokenManager RefreshTokenManager,
	refreshTokenTTL time.Duration,
	transactionManager core_postgres_pool.TransactionManager,
) *AuthService {
	return &AuthService{
		usersService:        usersService,
		authRepository:      authRepository,
		accessTokenIssuer:   accessTokenIssuer,
		refreshTokenManager: refreshTokenManager,
		refreshTokenTTL:     refreshTokenTTL,
		transactionManager:  transactionManager,
	}
}
