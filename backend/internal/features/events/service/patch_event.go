package events_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func (s *EventsService) PatchEvent(
	ctx context.Context,
	id int,
	actorUserID int,
	patch domain.EventPatch,
) (domain.Event, error) {
	var patchedEvent domain.Event
	if err := s.transactionManager.WithTransaction(
		ctx,
		func(transactionContext context.Context) error {
			event, err := s.eventsRepository.GetEventForUpdate(
				transactionContext,
				id,
			)
			if err != nil {
				return fmt.Errorf("lock event for update: %w", err)
			}
			if event.CreatorID != actorUserID {
				return fmt.Errorf(
					"only the event creator can update it: %w",
					core_errors.ErrForbidden,
				)
			}

			if err := event.ApplyPatch(patch); err != nil {
				return fmt.Errorf("apply event patch: %w", err)
			}

			patchedEvent, err = s.eventsRepository.PatchEvent(
				transactionContext,
				id,
				event,
			)
			if err != nil {
				return fmt.Errorf("patch event: %w", err)
			}

			return nil
		},
	); err != nil {
		return domain.Event{}, fmt.Errorf("patch event transaction: %w", err)
	}

	return patchedEvent, nil
}
