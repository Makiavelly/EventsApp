package auth_service

import (
	"context"
	"fmt"
)

func (s *AuthService) ValidateSession(
	ctx context.Context,
	sessionID string,
	userID int,
) error {
	if err := s.authRepository.ValidateSession(ctx, sessionID, userID); err != nil {
		return fmt.Errorf("validate authentication session: %w", err)
	}

	return nil
}
