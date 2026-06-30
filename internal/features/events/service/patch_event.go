package events_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *EventsService) PatchEvent(
	ctx context.Context,
	id int,
	patch domain.EventPatch,
) (domain.Event, error) {
	event, err := s.eventsRepository.GetEvent(ctx, id)
	if err != nil {
		return domain.Event{}, fmt.Errorf("get event: %w", err)
	}

	if err := event.ApplyPatch(patch); err != nil {
		return domain.Event{}, fmt.Errorf("apply event patch: %w", err)
	}

	patchedEvent, err := s.eventsRepository.PatchEvent(ctx, id, event)
	if err != nil {
		return domain.Event{}, fmt.Errorf("patch event: %w", err)
	}

	return patchedEvent, nil
}
