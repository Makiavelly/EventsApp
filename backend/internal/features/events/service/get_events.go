package events_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func (s *EventsService) GetEvents(
	ctx context.Context,
	latitude *float64,
	longitude *float64,
	radius *int,
	limit *int,
	offset *int,
) ([]domain.Event, error) {
	var (
		hasLatitude  = latitude != nil
		hasLongitude = longitude != nil
		hasRadius    = radius != nil
	)

	if hasLatitude != hasLongitude || hasLatitude != hasRadius {
		return nil, fmt.Errorf(
			"latitude, longitude and radius must be either all set or all unset: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	if hasLatitude && (*latitude < -90 || *latitude > 90) {
		return nil, fmt.Errorf(
			"latitude must be between -90 and 90: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	if hasLongitude && (*longitude < -180 || *longitude > 180) {
		return nil, fmt.Errorf(
			"longitude must be between -180 and 180: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	if hasRadius && (*radius < 0 || *radius > 100_000) {
		return nil, fmt.Errorf(
			"radius must be between 0 and 100 000 meters: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	if limit != nil && *limit < 0 {
		return nil, fmt.Errorf("limit must be non-negative: %w", core_errors.ErrInvalidArgument)
	}

	if offset != nil && *offset < 0 {
		return nil, fmt.Errorf("offset must be non-negative: %w", core_errors.ErrInvalidArgument)
	}

	events, err := s.eventsRepository.GetEvents(
		ctx,
		latitude,
		longitude,
		radius,
		limit,
		offset,
	)
	if err != nil {
		return nil, fmt.Errorf("get events from repository: %w", err)
	}

	return events, nil
}
