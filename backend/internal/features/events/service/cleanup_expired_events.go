package events_service

import (
	"context"
	"fmt"
)

func (s *EventsService) CleanupExpiredEvents(ctx context.Context) (int64, error) {
	deleted, err := s.eventsRepository.DeleteExpiredEvents(ctx)
	if err != nil {
		return 0, fmt.Errorf("cleanup expired events: %w", err)
	}

	return deleted, nil
}
