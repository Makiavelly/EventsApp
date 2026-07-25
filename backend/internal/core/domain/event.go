package domain

import (
	"fmt"
	"time"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

const (
	EventTitleMinLength       = 1
	EventTitleMaxLength       = 50
	EventDescriptionMinLength = 1
	EventDescriptionMaxLength = 300
	EventAutoDeleteMinSeconds = 60
	EventAutoDeleteMaxSeconds = 365 * 24 * 60 * 60
)

type EventAutoDeletePolicy string

const (
	EventAutoDeleteAtStart       EventAutoDeletePolicy = "at_start"
	EventAutoDeleteAfterInterval EventAutoDeletePolicy = "after_interval"
	EventAutoDeleteNever         EventAutoDeletePolicy = "never"
)

type Event struct {
	ID                     int
	CreatorID              int
	Title                  string
	Description            *string
	Location               *EventLocation
	Marker                 *EventMarker
	MarkerSize             EventMarkerSize
	DateMeeting            *time.Time
	AutoDeletePolicy       EventAutoDeletePolicy
	AutoDeleteAfterSeconds *int
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
		ID:               id,
		CreatorID:        creatorID,
		Title:            title,
		Description:      description,
		Location:         location,
		MarkerSize:       EventMarkerNormal,
		DateMeeting:      DateMeeting,
		AutoDeletePolicy: EventAutoDeleteNever,
	}
}

func NewEventWithPolicy(
	id int,
	creatorID int,
	title string,
	description *string,
	location *EventLocation,
	dateMeeting *time.Time,
	autoDeletePolicy EventAutoDeletePolicy,
	autoDeleteAfterSeconds *int,
) Event {
	event := NewEvent(id, creatorID, title, description, location, dateMeeting)
	event.AutoDeletePolicy = autoDeletePolicy
	event.AutoDeleteAfterSeconds = autoDeleteAfterSeconds

	return event
}

func NewEventUninitialized(
	creatorID int,
	title string,
	description *string,
	location *EventLocation,
	dateMeeting *time.Time,
) Event {
	return Event{
		ID:               UninitializedID,
		CreatorID:        creatorID,
		Title:            title,
		Description:      description,
		Location:         location,
		MarkerSize:       EventMarkerNormal,
		DateMeeting:      dateMeeting,
		AutoDeletePolicy: EventAutoDeleteNever,
	}
}

func NewEventUninitializedWithPolicy(
	creatorID int,
	title string,
	description *string,
	location *EventLocation,
	dateMeeting *time.Time,
	autoDeletePolicy EventAutoDeletePolicy,
	autoDeleteAfterSeconds *int,
) Event {
	event := NewEventUninitialized(creatorID, title, description, location, dateMeeting)
	event.AutoDeletePolicy = autoDeletePolicy
	event.AutoDeleteAfterSeconds = autoDeleteAfterSeconds

	return event
}

func (e *Event) Validate() error {
	if err := ValidateEventTitle(e.Title); err != nil {
		return err
	}
	if err := ValidateEventDescription(e.Description); err != nil {
		return err
	}
	if err := ValidateEventLocation(e.Location); err != nil {
		return err
	}
	if err := ValidateEventMarker(e.Marker); err != nil {
		return err
	}
	if err := ValidateEventMarkerSize(e.MarkerSize); err != nil {
		return err
	}
	if err := ValidateEventDateMeeting(e.DateMeeting, time.Now()); err != nil {
		return err
	}
	if err := ValidateEventAutoDelete(e.AutoDeletePolicy, e.AutoDeleteAfterSeconds, e.DateMeeting); err != nil {
		return err
	}

	return nil
}

func ValidateEventAutoDelete(
	policy EventAutoDeletePolicy,
	afterSeconds *int,
	dateMeeting *time.Time,
) error {
	switch policy {
	case EventAutoDeleteNever:
		if afterSeconds != nil {
			return fmt.Errorf("'AutoDeleteAfterSeconds' must be NULL for 'never': %w", core_errors.ErrInvalidArgument)
		}
	case EventAutoDeleteAtStart:
		if dateMeeting == nil {
			return fmt.Errorf("'DateMeeting' is required for 'at_start': %w", core_errors.ErrInvalidArgument)
		}
		if afterSeconds != nil {
			return fmt.Errorf("'AutoDeleteAfterSeconds' must be NULL for 'at_start': %w", core_errors.ErrInvalidArgument)
		}
	case EventAutoDeleteAfterInterval:
		if dateMeeting == nil {
			return fmt.Errorf("'DateMeeting' is required for 'after_interval': %w", core_errors.ErrInvalidArgument)
		}
		if afterSeconds == nil || *afterSeconds < EventAutoDeleteMinSeconds || *afterSeconds > EventAutoDeleteMaxSeconds {
			return fmt.Errorf(
				"'AutoDeleteAfterSeconds' must be between %d and %d: %w",
				EventAutoDeleteMinSeconds,
				EventAutoDeleteMaxSeconds,
				core_errors.ErrInvalidArgument,
			)
		}
	default:
		return fmt.Errorf("invalid 'AutoDeletePolicy': %w", core_errors.ErrInvalidArgument)
	}

	return nil
}

func ValidateEventTitle(title string) error {
	titleLen := len([]rune(title))
	if titleLen < EventTitleMinLength || titleLen > EventTitleMaxLength {
		return fmt.Errorf(
			"invalid 'Title' length: %d: %w",
			titleLen,
			core_errors.ErrInvalidArgument,
		)
	}

	return nil
}

func ValidateEventDescription(description *string) error {
	if description != nil {
		descriptionLen := len([]rune(*description))
		if descriptionLen < EventDescriptionMinLength ||
			descriptionLen > EventDescriptionMaxLength {
			return fmt.Errorf(
				"invalid 'Description' length: %d: %w",
				descriptionLen,
				core_errors.ErrInvalidArgument,
			)
		}
	}

	return nil
}

func ValidateEventLocation(location *EventLocation) error {
	if location != nil {
		if location.Latitude < -90 || location.Latitude > 90 {
			return fmt.Errorf(
				"'Latitude' must be between -90 and 90: %w",
				core_errors.ErrInvalidArgument,
			)
		}

		if location.Longitude < -180 || location.Longitude > 180 {
			return fmt.Errorf(
				"'Longitude' must be between -180 and 180: %w",
				core_errors.ErrInvalidArgument,
			)
		}
	}

	return nil
}

func ValidateEventDateMeeting(dateMeeting *time.Time, now time.Time) error {
	if dateMeeting != nil {
		maxDate := now.AddDate(1, 0, 0)

		if !dateMeeting.After(now) {
			return fmt.Errorf(
				"'DateMeeting' must be in the future: %w",
				core_errors.ErrInvalidArgument,
			)
		}

		if dateMeeting.After(maxDate) {
			return fmt.Errorf(
				"'DateMeeting' must not be later than one year from now: %w",
				core_errors.ErrInvalidArgument,
			)
		}
	}

	return nil
}

type EventPatch struct {
	Title                  Nullable[string]
	Description            Nullable[string]
	Location               Nullable[EventLocation]
	Marker                 Nullable[EventMarker]
	DateMeeting            Nullable[time.Time]
	AutoDeletePolicy       Nullable[EventAutoDeletePolicy]
	AutoDeleteAfterSeconds Nullable[int]
}

func NewEventPatchWithPolicy(
	title Nullable[string],
	description Nullable[string],
	location Nullable[EventLocation],
	dateMeeting Nullable[time.Time],
	autoDeletePolicy Nullable[EventAutoDeletePolicy],
	autoDeleteAfterSeconds Nullable[int],
) EventPatch {
	patch := NewEventPatch(title, description, location, dateMeeting)
	patch.AutoDeletePolicy = autoDeletePolicy
	patch.AutoDeleteAfterSeconds = autoDeleteAfterSeconds

	return patch
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
	if p.Title.Set {
		if p.Title.Value == nil {
			return fmt.Errorf("'Title' can't be patched to NULL: %w", core_errors.ErrInvalidArgument)
		}
		if err := ValidateEventTitle(*p.Title.Value); err != nil {
			return err
		}
	}

	if p.Description.Set {
		if err := ValidateEventDescription(p.Description.Value); err != nil {
			return err
		}
	}

	if p.Location.Set {
		if err := ValidateEventLocation(p.Location.Value); err != nil {
			return err
		}
	}

	if p.Marker.Set {
		if err := ValidateEventMarker(p.Marker.Value); err != nil {
			return err
		}
	}

	if p.DateMeeting.Set {
		if err := ValidateEventDateMeeting(p.DateMeeting.Value, time.Now()); err != nil {
			return err
		}
	}

	if p.AutoDeletePolicy.Set && p.AutoDeletePolicy.Value == nil {
		return fmt.Errorf("'AutoDeletePolicy' can't be patched to NULL: %w", core_errors.ErrInvalidArgument)
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

	if patch.Marker.Set {
		tmp.Marker = patch.Marker.Value
	}

	if patch.DateMeeting.Set {
		tmp.DateMeeting = patch.DateMeeting.Value
	}

	if patch.AutoDeletePolicy.Set {
		tmp.AutoDeletePolicy = *patch.AutoDeletePolicy.Value
	}

	if patch.AutoDeleteAfterSeconds.Set {
		tmp.AutoDeleteAfterSeconds = patch.AutoDeleteAfterSeconds.Value
	}

	if err := ValidateEventTitle(tmp.Title); err != nil {
		return fmt.Errorf("validate patched event title: %w", err)
	}
	if err := ValidateEventDescription(tmp.Description); err != nil {
		return fmt.Errorf("validate patched event description: %w", err)
	}
	if err := ValidateEventLocation(tmp.Location); err != nil {
		return fmt.Errorf("validate patched event location: %w", err)
	}
	if err := ValidateEventMarker(tmp.Marker); err != nil {
		return fmt.Errorf("validate patched event marker: %w", err)
	}
	if err := ValidateEventMarkerSize(tmp.MarkerSize); err != nil {
		return fmt.Errorf("validate patched event marker size: %w", err)
	}
	if err := ValidateEventAutoDelete(tmp.AutoDeletePolicy, tmp.AutoDeleteAfterSeconds, tmp.DateMeeting); err != nil {
		return fmt.Errorf("validate patched event auto delete: %w", err)
	}

	*e = tmp

	return nil
}
