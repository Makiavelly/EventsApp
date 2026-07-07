package events_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *EventsService) CreateEvent(
	ctx context.Context,
	event domain.Event,
) (domain.Event, error) {
	if err := event.Validate(); err != nil {
		return domain.Event{}, fmt.Errorf("validate event domain: %w", err)
	}

	event, err := s.eventsRepository.CreateEvent(ctx, event)
	if err != nil {
		return domain.Event{}, fmt.Errorf("create event: %w", err)
	}

	return event, nil
}
