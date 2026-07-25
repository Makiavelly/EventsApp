package events_postgres_repository

import (
	"time"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

type EventModel struct {
	ID                     int
	CreatorID              int
	Title                  string
	Description            *string
	Latitude               *float64
	Longitude              *float64
	MarkerKind             *string
	MarkerValue            *string
	MarkerSize             string
	DateMeeting            *time.Time
	AutoDeletePolicy       string
	AutoDeleteAfterSeconds *int
}

func eventDomainFromModel(eventModel EventModel) domain.Event {
	var (
		location *domain.EventLocation
	)
	if eventModel.Latitude != nil && eventModel.Longitude != nil {
		location = &domain.EventLocation{
			Latitude:  *eventModel.Latitude,
			Longitude: *eventModel.Longitude,
		}
	}

	event := domain.NewEventWithPolicy(
		eventModel.ID,
		eventModel.CreatorID,
		eventModel.Title,
		eventModel.Description,
		location,
		eventModel.DateMeeting,
		domain.EventAutoDeletePolicy(eventModel.AutoDeletePolicy),
		eventModel.AutoDeleteAfterSeconds,
	)
	if eventModel.MarkerKind != nil && eventModel.MarkerValue != nil {
		event.Marker = &domain.EventMarker{
			Kind:  domain.EventMarkerKind(*eventModel.MarkerKind),
			Value: *eventModel.MarkerValue,
		}
	}
	event.MarkerSize = domain.EventMarkerSize(eventModel.MarkerSize)

	return event
}

func eventsDomainsFromModels(eventModels []EventModel) []domain.Event {
	domains := make([]domain.Event, len(eventModels))

	for i, model := range eventModels {
		domains[i] = eventDomainFromModel(model)
	}

	return domains
}
