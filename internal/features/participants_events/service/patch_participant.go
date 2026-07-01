package participants_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *ParticipantsService) PatchParticipant(
	ctx context.Context,
	eventID int,
	participantID int,
	participant domain.Participant,
) (domain.Participant, error) {
	if err := participant.Validate(); err != nil {
		return domain.Participant{}, fmt.Errorf("validate participant domain: %w", err)
	}

	participant, err := s.participantsRepository.PatchParticipant(
		ctx,
		eventID,
		participantID,
		participant,
	)
	if err != nil {
		return domain.Participant{}, fmt.Errorf("patch participant: %w", err)
	}

	return participant, nil
}
