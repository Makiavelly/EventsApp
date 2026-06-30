package events_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *EventsService) GetEvent(
	ctx context.Context,
	id int,
) (domain.Event, error) {
	event, err := s.eventsRepository.GetEvent(ctx, id)
	if err != nil {
		return domain.Event{}, fmt.Errorf("get event from repository: %w", err)
	}

	return event, nil
}
