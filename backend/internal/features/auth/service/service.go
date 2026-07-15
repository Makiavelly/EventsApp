package auth_service

import (
	"context"
	"time"

	core_auth "github.com/Makiavelly/EventsApp/internal/core/auth"
	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

type UsersService interface {
	CreateUser(ctx context.Context, user domain.User) (domain.User, error)
	GetUser(ctx context.Context, id int) (domain.User, error)
	GetUserByEmail(ctx context.Context, email string) (domain.User, error)
	PatchUser(ctx context.Context, id int, patch domain.UserPatch) (domain.User, error)
}

type TokenIssuer interface {
	Issue(userID int) (string, error)
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
}

type AuthService struct {
	usersService        UsersService
	authRepository      AuthRepository
	accessTokenIssuer   TokenIssuer
	refreshTokenManager RefreshTokenManager
	refreshTokenTTL     time.Duration
}

func NewAuthService(
	usersService UsersService,
	authRepository AuthRepository,
	accessTokenIssuer TokenIssuer,
	refreshTokenManager RefreshTokenManager,
	refreshTokenTTL time.Duration,
) *AuthService {
	return &AuthService{
		usersService:        usersService,
		authRepository:      authRepository,
		accessTokenIssuer:   accessTokenIssuer,
		refreshTokenManager: refreshTokenManager,
		refreshTokenTTL:     refreshTokenTTL,
	}
}
