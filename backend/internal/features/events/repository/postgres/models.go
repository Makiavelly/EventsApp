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

	return domain.NewEventWithPolicy(
		eventModel.ID,
		eventModel.CreatorID,
		eventModel.Title,
		eventModel.Description,
		location,
		eventModel.DateMeeting,
		domain.EventAutoDeletePolicy(eventModel.AutoDeletePolicy),
		eventModel.AutoDeleteAfterSeconds,
	)
}

func eventsDomainsFromModels(eventModels []EventModel) []domain.Event {
	domains := make([]domain.Event, len(eventModels))

	for i, model := range eventModels {
		domains[i] = eventDomainFromModel(model)
	}

	return domains
}
