package domain

import (
	"fmt"
	"math"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

type EventBounds struct {
	West  float64
	South float64
	East  float64
	North float64
}

func (b EventBounds) Validate() error {
	values := []float64{b.West, b.South, b.East, b.North}
	for _, value := range values {
		if math.IsNaN(value) || math.IsInf(value, 0) {
			return fmt.Errorf("bounds must contain only finite values: %w", core_errors.ErrInvalidArgument)
		}
	}

	if b.West < -180 || b.West > 180 || b.East < -180 || b.East > 180 {
		return fmt.Errorf(
			"west and east must be between -180 and 180: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	if b.South < -90 || b.South > 90 || b.North < -90 || b.North > 90 {
		return fmt.Errorf(
			"south and north must be between -90 and 90: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	if b.West >= b.East {
		return fmt.Errorf("west must be less than east: %w", core_errors.ErrInvalidArgument)
	}

	if b.South >= b.North {
		return fmt.Errorf("south must be less than north: %w", core_errors.ErrInvalidArgument)
	}

	return nil
}
