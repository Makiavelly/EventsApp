package auth_service

import (
	"context"
	"fmt"
)

func (s *AuthService) CleanupSessions(ctx context.Context) error {
	if err := s.authRepository.CleanupSessions(ctx); err != nil {
		return fmt.Errorf("cleanup authentication sessions: %w", err)
	}

	return nil
}
