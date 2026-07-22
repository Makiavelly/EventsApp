package participants_service

import (
	"context"
	"fmt"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func (s *ParticipantsService) DeleteParticipant(
	ctx context.Context,
	eventID int,
	participantID int,
) error {
	event, err := s.eventsReader.GetEvent(ctx, eventID)
	if err != nil {
		return fmt.Errorf("get event: %w", err)
	}
	if event.CreatorID == participantID {
		return fmt.Errorf("event creator can't leave their own event: %w", core_errors.ErrForbidden)
	}

	if err := s.participantsRepository.DeleteParticipant(ctx, eventID, participantID); err != nil {
		return fmt.Errorf("delete participant: %w", err)
	}

	return nil
}
