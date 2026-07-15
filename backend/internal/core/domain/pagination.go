package domain

import (
	"fmt"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

const (
	DefaultPageLimit = 100
	MaxPageLimit     = 500
)

func ValidatePagination(limit *int, offset *int) error {
	if limit != nil && (*limit < 0 || *limit > MaxPageLimit) {
		return fmt.Errorf(
			"limit must be between 0 and %d: %w",
			MaxPageLimit,
			core_errors.ErrInvalidArgument,
		)
	}

	if offset != nil && *offset < 0 {
		return fmt.Errorf("offset must be non-negative: %w", core_errors.ErrInvalidArgument)
	}

	return nil
}

func ResolvePagination(limit *int, offset *int) (int, int, error) {
	if err := ValidatePagination(limit, offset); err != nil {
		return 0, 0, err
	}

	resolvedLimit := DefaultPageLimit
	if limit != nil {
		resolvedLimit = *limit
	}
	resolvedOffset := 0
	if offset != nil {
		resolvedOffset = *offset
	}

	return resolvedLimit, resolvedOffset, nil
}
