package core_auth

import (
	"fmt"
	"strconv"
	"time"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type AccessTokenManager struct {
	secret   []byte
	ttl      time.Duration
	issuer   string
	audience string
	now      func() time.Time
}

type accessTokenClaims struct {
	SessionID string `json:"sid"`
	jwt.RegisteredClaims
}

func NewAccessTokenManager(config Config) *AccessTokenManager {
	return &AccessTokenManager{
		secret:   []byte(config.Secret),
		ttl:      config.AccessTokenTTL,
		issuer:   config.Issuer,
		audience: config.Audience,
		now:      time.Now,
	}
}

func (m *AccessTokenManager) Issue(userID int, sessionID string) (string, error) {
	if userID <= 0 {
		return "", fmt.Errorf("user ID must be positive: %w", core_errors.ErrInvalidArgument)
	}
	if _, err := uuid.Parse(sessionID); err != nil {
		return "", fmt.Errorf("parse access token session ID: %w", err)
	}

	now := m.now().UTC()
	claims := accessTokenClaims{
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   strconv.Itoa(userID),
			Audience:  jwt.ClaimStrings{m.audience},
			ExpiresAt: jwt.NewNumericDate(now.Add(m.ttl)),
			NotBefore: jwt.NewNumericDate(now),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        uuid.NewString(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(m.secret)
	if err != nil {
		return "", fmt.Errorf("sign access token: %w", err)
	}

	return signedToken, nil
}

func (m *AccessTokenManager) Verify(tokenValue string) (domain.AuthenticatedUser, error) {
	claims := &accessTokenClaims{}
	token, err := jwt.ParseWithClaims(
		tokenValue,
		claims,
		func(token *jwt.Token) (any, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, fmt.Errorf("unexpected signing method: %s", token.Method.Alg())
			}

			return m.secret, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(m.issuer),
		jwt.WithAudience(m.audience),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithLeeway(30*time.Second),
		jwt.WithTimeFunc(m.now),
	)
	if err != nil || !token.Valid {
		return domain.AuthenticatedUser{}, fmt.Errorf(
			"invalid access token: %w",
			core_errors.ErrUnauthorized,
		)
	}

	userID, err := strconv.Atoi(claims.Subject)
	if err != nil || userID <= 0 {
		return domain.AuthenticatedUser{}, fmt.Errorf(
			"invalid access token subject: %w",
			core_errors.ErrUnauthorized,
		)
	}
	if _, err := uuid.Parse(claims.SessionID); err != nil {
		return domain.AuthenticatedUser{}, fmt.Errorf(
			"invalid access token session: %w",
			core_errors.ErrUnauthorized,
		)
	}

	return domain.AuthenticatedUser{
		UserID:    userID,
		SessionID: claims.SessionID,
	}, nil
}
