package domain

import (
	"errors"
	"math"
	"testing"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func TestEventBoundsValidate(t *testing.T) {
	tests := []struct {
		name    string
		bounds  EventBounds
		wantErr bool
	}{
		{
			name:   "valid bounds",
			bounds: EventBounds{West: 37.1, South: 55.5, East: 38.0, North: 56.0},
		},
		{
			name:    "non finite value",
			bounds:  EventBounds{West: math.NaN(), South: 55.5, East: 38.0, North: 56.0},
			wantErr: true,
		},
		{
			name:    "longitude outside range",
			bounds:  EventBounds{West: -181, South: 55.5, East: 38.0, North: 56.0},
			wantErr: true,
		},
		{
			name:    "latitude outside range",
			bounds:  EventBounds{West: 37.1, South: -91, East: 38.0, North: 56.0},
			wantErr: true,
		},
		{
			name:    "reversed longitude",
			bounds:  EventBounds{West: 38.0, South: 55.5, East: 37.1, North: 56.0},
			wantErr: true,
		},
		{
			name:    "reversed latitude",
			bounds:  EventBounds{West: 37.1, South: 56.0, East: 38.0, North: 55.5},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.bounds.Validate()
			if tt.wantErr && !errors.Is(err, core_errors.ErrInvalidArgument) {
				t.Fatalf("Validate() error = %v, want ErrInvalidArgument", err)
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("Validate() unexpected error = %v", err)
			}
		})
	}
}
