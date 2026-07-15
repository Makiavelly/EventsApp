package participants_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *ParticipantsService) GetParticipants(
	ctx context.Context,
	eventID *int,
	limit *int,
	offset *int,
) ([]domain.EventParticipant, error) {
	resolvedLimit, resolvedOffset, err := domain.ResolvePagination(limit, offset)
	if err != nil {
		return nil, fmt.Errorf("validate pagination: %w", err)
	}

	participants, err := s.participantsRepository.GetParticipants(
		ctx,
		eventID,
		&resolvedLimit,
		&resolvedOffset,
	)
	if err != nil {
		return nil, fmt.Errorf("get participants from repository: %w", err)
	}

	return participants, nil
}
