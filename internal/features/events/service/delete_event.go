package events_service

import (
	"context"
	"fmt"
)

func (s *EventsService) DeleteEvent(
	ctx context.Context,
	id int,
) error {
	if err := s.eventsRepository.DeleteEvent(ctx, id); err != nil {
		return fmt.Errorf("delete event from repository: %w", err)
	}

	return nil
}
