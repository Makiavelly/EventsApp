package domain

import (
	"fmt"
	"time"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

type Event struct {
	ID          int
	CreatorID   int
	Title       string
	Description *string
	Location    *EventLocation
	DateMeeting *time.Time
}

func NewEvent(
	id int,
	creatorID int,
	title string,
	description *string,
	location *EventLocation,
	DateMeeting *time.Time,
) Event {
	return Event{
		ID:          id,
		CreatorID:   creatorID,
		Title:       title,
		Description: description,
		Location:    location,
		DateMeeting: DateMeeting,
	}
}

func NewEventUninitialized(
	creatorID int,
	title string,
	description *string,
	location *EventLocation,
	dateMeeting *time.Time,
) Event {
	return Event{
		ID:          UninitializedID,
		CreatorID:   creatorID,
		Title:       title,
		Description: description,
		Location:    location,
		DateMeeting: dateMeeting,
	}
}

func (e *Event) Validate() error {
	titleLen := len([]rune(e.Title))
	if titleLen < 1 || titleLen > 50 {
		return fmt.Errorf(
			"invalid 'Title' len: %d: %w",
			titleLen,
			core_errors.ErrInvalidArgument,
		)
	}

	if e.Description != nil {
		descriptionLen := len([]rune(*e.Description))
		if descriptionLen < 1 || descriptionLen > 300 {
			return fmt.Errorf(
				"invalid 'Description' len: %d: %w",
				descriptionLen,
				core_errors.ErrInvalidArgument,
			)
		}
	}

	if e.Location != nil {
		if e.Location.Latitude < -90 || e.Location.Latitude > 90 {
			return fmt.Errorf(
				"'Latitude' must be between -90 and 90: %w",
				core_errors.ErrInvalidArgument,
			)
		}

		if e.Location.Longitude < -180 || e.Location.Longitude > 180 {
			return fmt.Errorf(
				"'Longitude' must be between -180 and 180: %w",
				core_errors.ErrInvalidArgument,
			)
		}
	}

	if e.DateMeeting != nil {
		var (
			now     = time.Now()
			maxDate = now.AddDate(1, 0, 0)
		)

		if e.DateMeeting.Before(now) {
			return fmt.Errorf(
				"'DateMeeting' must be in the future: %w",
				core_errors.ErrInvalidArgument,
			)
		}

		if e.DateMeeting.After(maxDate) {
			return fmt.Errorf(
				"'DateMeeting' must not be later than one year from now: %w",
				core_errors.ErrInvalidArgument,
			)
		}
	}

	return nil
}

type EventPatch struct {
	Title       Nullable[string]
	Description Nullable[string]
	Location    Nullable[EventLocation]
	DateMeeting Nullable[time.Time]
}

func NewEventPatch(
	title Nullable[string],
	description Nullable[string],
	location Nullable[EventLocation],
	dateMeeting Nullable[time.Time],
) EventPatch {
	return EventPatch{
		Title:       title,
		Description: description,
		Location:    location,
		DateMeeting: dateMeeting,
	}
}

func (p *EventPatch) Validate() error {
	if p.Title.Set && p.Title.Value == nil {
		return fmt.Errorf("'Title' can't be patched to NULL: %w", core_errors.ErrInvalidArgument)
	}

	return nil
}

func (e *Event) ApplyPatch(patch EventPatch) error {
	if err := patch.Validate(); err != nil {
		return fmt.Errorf("validate event patch: %w", err)
	}

	tmp := *e

	if patch.Title.Set {
		tmp.Title = *patch.Title.Value
	}

	if patch.Description.Set {
		tmp.Description = patch.Description.Value
	}

	if patch.Location.Set {
		tmp.Location = patch.Location.Value
	}

	if patch.DateMeeting.Set {
		tmp.DateMeeting = patch.DateMeeting.Value
	}

	if err := tmp.Validate(); err != nil {
		return fmt.Errorf("validate patched event: %w", err)
	}

	*e = tmp

	return nil
}
