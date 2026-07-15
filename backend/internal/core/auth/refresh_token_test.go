package core_auth

import (
	"bytes"
	"errors"
	"testing"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func TestRefreshTokenGenerateAndParse(t *testing.T) {
	t.Parallel()

	manager := NewRefreshTokenManager()
	generated, err := manager.Generate("")
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	parsed, err := manager.Parse(generated.Value)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	if parsed.SessionID != generated.SessionID {
		t.Fatalf("Parse() sessionID = %q, want %q", parsed.SessionID, generated.SessionID)
	}
	if !bytes.Equal(parsed.Hash, generated.Hash) {
		t.Fatal("Parse() returned a different token hash")
	}
}

func TestRefreshTokenRotationKeepsSessionAndChangesSecret(t *testing.T) {
	t.Parallel()

	manager := NewRefreshTokenManager()
	first, err := manager.Generate("")
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}
	second, err := manager.Generate(first.SessionID)
	if err != nil {
		t.Fatalf("Generate(sessionID) error = %v", err)
	}

	if second.SessionID != first.SessionID {
		t.Fatalf("rotated sessionID = %q, want %q", second.SessionID, first.SessionID)
	}
	if second.Value == first.Value || bytes.Equal(second.Hash, first.Hash) {
		t.Fatal("rotated refresh token must use a new random secret")
	}
}

func TestRefreshTokenRejectsInvalidValue(t *testing.T) {
	t.Parallel()

	manager := NewRefreshTokenManager()
	_, err := manager.Parse("not-a-refresh-token")
	if !errors.Is(err, core_errors.ErrUnauthorized) {
		t.Fatalf("Parse() error = %v, want ErrUnauthorized", err)
	}
}
