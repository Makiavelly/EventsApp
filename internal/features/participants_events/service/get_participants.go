package participants_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func (s *ParticipantsService) GetParticipants(
	ctx context.Context,
	eventID *int,
	limit *int,
	offset *int,
) ([]domain.EventParticipants, error) {
	if limit != nil && *limit < 0 {
		return nil, fmt.Errorf("limit must be non-negative: %w", core_errors.ErrInvalidArgument)
	}

	if offset != nil && *offset < 0 {
		return nil, fmt.Errorf("offset must be non-negative: %w", core_errors.ErrInvalidArgument)
	}

	participants, err := s.participantsRepository.GetParticipants(
		ctx,
		eventID,
		limit,
		offset,
	)
	if err != nil {
		return nil, fmt.Errorf("get participants from repository: %w", err)
	}

	return participants, nil
}
