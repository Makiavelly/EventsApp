package participants_service

import (
	"context"
	"fmt"
)

func (s *ParticipantsService) DeleteParticipant(
	ctx context.Context,
	eventID int,
	participantID int,
) error {
	if err := s.participantsRepository.DeleteParticipant(ctx, eventID, participantID); err != nil {
		return fmt.Errorf("delete participant: %w", err)
	}

	return nil
}
