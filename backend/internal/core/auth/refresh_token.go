package core_auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strings"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	"github.com/google/uuid"
)

const refreshSecretSize = 32

type RefreshToken struct {
	SessionID string
	Value     string
	Hash      []byte
}

type RefreshTokenManager struct{}

func NewRefreshTokenManager() *RefreshTokenManager {
	return &RefreshTokenManager{}
}

func (m *RefreshTokenManager) Generate(sessionID string) (RefreshToken, error) {
	if sessionID == "" {
		sessionID = uuid.NewString()
	} else if _, err := uuid.Parse(sessionID); err != nil {
		return RefreshToken{}, fmt.Errorf("parse refresh session ID: %w", err)
	}

	secret := make([]byte, refreshSecretSize)
	if _, err := rand.Read(secret); err != nil {
		return RefreshToken{}, fmt.Errorf("generate refresh token secret: %w", err)
	}

	value := sessionID + "." + base64.RawURLEncoding.EncodeToString(secret)
	return RefreshToken{
		SessionID: sessionID,
		Value:     value,
		Hash:      hashRefreshToken(value),
	}, nil
}

func (m *RefreshTokenManager) Parse(value string) (RefreshToken, error) {
	parts := strings.Split(value, ".")
	if len(parts) != 2 {
		return RefreshToken{}, fmt.Errorf("invalid refresh token format: %w", core_errors.ErrUnauthorized)
	}

	if _, err := uuid.Parse(parts[0]); err != nil {
		return RefreshToken{}, fmt.Errorf("invalid refresh session ID: %w", core_errors.ErrUnauthorized)
	}

	secret, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || len(secret) != refreshSecretSize {
		return RefreshToken{}, fmt.Errorf("invalid refresh token secret: %w", core_errors.ErrUnauthorized)
	}

	return RefreshToken{
		SessionID: parts[0],
		Value:     value,
		Hash:      hashRefreshToken(value),
	}, nil
}

func hashRefreshToken(value string) []byte {
	hash := sha256.Sum256([]byte(value))
	return hash[:]
}
