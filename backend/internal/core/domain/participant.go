package domain

import (
	"fmt"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

type Participant struct {
	EventID       int
	ParticipantID int
	Status        string
}

type EventParticipants struct {
	EventID int
	Users   []User
}

func NewParticipant(
	eventID int,
	participantID int,
	status string,
) Participant {
	return Participant{
		EventID:       eventID,
		ParticipantID: participantID,
		Status:        status,
	}
}

func NewParticipantUninitialized(
	eventID int,
	participantID int,
) Participant {
	return NewParticipant(
		eventID,
		participantID,
		UninitializedStatus,
	)
}

func (p *Participant) Validate() error {
	var (
		availableStatuses = []string{"planned", "underway", "over"}
		absent            = true
		status            = p.Status
	)

	for _, availableStatus := range availableStatuses {
		if status == availableStatus {
			absent = false

			break
		}
	}

	if absent {
		return fmt.Errorf(
			"'Status' must be 'planned', 'underway' or 'over': %w",
			core_errors.ErrInvalidArgument,
		)
	}

	return nil
}
