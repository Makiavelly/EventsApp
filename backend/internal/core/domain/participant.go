package domain

import (
	"fmt"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

type Participant struct {
	EventID       int
	ParticipantID int
}

type EventParticipant struct {
	EventID       int
	ParticipantID int
	Name          string
}

func NewParticipant(
	eventID int,
	participantID int,
) Participant {
	return Participant{
		EventID:       eventID,
		ParticipantID: participantID,
	}
}

func (p *Participant) Validate() error {
	if p.EventID <= 0 || p.ParticipantID <= 0 {
		return fmt.Errorf(
			"event and participant IDs must be positive: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	return nil
}
