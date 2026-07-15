package core_auth

import (
	"errors"
	"testing"
	"time"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func TestAccessTokenIssueAndVerify(t *testing.T) {
	t.Parallel()

	manager := NewAccessTokenManager(testConfig())
	userID := 42

	token, err := manager.Issue(userID)
	if err != nil {
		t.Fatalf("Issue() error = %v", err)
	}

	gotUserID, err := manager.Verify(token)
	if err != nil {
		t.Fatalf("Verify() error = %v", err)
	}
	if gotUserID != userID {
		t.Fatalf("Verify() userID = %d, want %d", gotUserID, userID)
	}
}

func TestAccessTokenRejectsExpiredToken(t *testing.T) {
	t.Parallel()

	manager := NewAccessTokenManager(testConfig())
	issuedAt := time.Date(2026, time.July, 15, 12, 0, 0, 0, time.UTC)
	manager.now = func() time.Time { return issuedAt }

	token, err := manager.Issue(42)
	if err != nil {
		t.Fatalf("Issue() error = %v", err)
	}

	manager.now = func() time.Time { return issuedAt.Add(2 * time.Minute) }
	_, err = manager.Verify(token)
	if !errors.Is(err, core_errors.ErrUnauthorized) {
		t.Fatalf("Verify() error = %v, want ErrUnauthorized", err)
	}
}

func TestAccessTokenRejectsAnotherSecret(t *testing.T) {
	t.Parallel()

	manager := NewAccessTokenManager(testConfig())
	token, err := manager.Issue(42)
	if err != nil {
		t.Fatalf("Issue() error = %v", err)
	}

	otherConfig := testConfig()
	otherConfig.Secret = "another-production-secret-with-32-bytes"
	otherManager := NewAccessTokenManager(otherConfig)
	_, err = otherManager.Verify(token)
	if !errors.Is(err, core_errors.ErrUnauthorized) {
		t.Fatalf("Verify() error = %v, want ErrUnauthorized", err)
	}
}

func testConfig() Config {
	return Config{
		Secret:         "production-test-secret-with-32-bytes",
		AccessTokenTTL: time.Minute,
		Issuer:         "eventsapp-test",
		Audience:       "eventsapp-test-web",
	}
}
