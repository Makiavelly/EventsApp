package participants_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *ParticipantsService) CreateParticipant(
	ctx context.Context,
	participant domain.Participant,
) (domain.Participant, error) {
	if err := participant.Validate(); err != nil {
		return domain.Participant{}, fmt.Errorf("validate participant domain: %w", err)
	}

	participant, err := s.participantsRepository.CreateParticipant(ctx, participant)
	if err != nil {
		return domain.Participant{}, fmt.Errorf("create participant: %w", err)
	}

	return participant, nil
}
