package events_service

import (
	"context"
	"fmt"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func (s *EventsService) DeleteEvent(
	ctx context.Context,
	id int,
	actorUserID int,
) error {
	event, err := s.eventsRepository.GetEvent(ctx, id)
	if err != nil {
		return fmt.Errorf("get event: %w", err)
	}
	if event.CreatorID != actorUserID {
		return fmt.Errorf("only the event creator can delete it: %w", core_errors.ErrForbidden)
	}

	if err := s.eventsRepository.DeleteEvent(ctx, id); err != nil {
		return fmt.Errorf("delete event from repository: %w", err)
	}

	return nil
}
