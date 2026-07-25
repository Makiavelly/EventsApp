package events_transport_http

import (
	"time"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_http_types "github.com/Makiavelly/EventsApp/internal/core/transport/http/types"
)

type EventDTOResponse struct {
	ID                     int                          `json:"id"              example:"1"`
	CreatorUserID          int                          `json:"creator_user_id" example:"1"`
	Title                  string                       `json:"title"           example:"Sport meetup"`
	Description            *string                      `json:"description"     example:"Go to football"`
	Location               *core_http_types.Location    `json:"location"`
	Marker                 *EventMarkerDTO              `json:"marker"`
	MarkerSize             domain.EventMarkerSize       `json:"marker_size" enums:"normal,large" example:"normal"`
	DateMeeting            *time.Time                   `json:"date_meeting"    example:"2026-08-01T13:52:14Z"`
	AutoDeletePolicy       domain.EventAutoDeletePolicy `json:"auto_delete_policy" example:"never"`
	AutoDeleteAfterSeconds *int                         `json:"auto_delete_after_seconds" example:"7200"`
}

func eventDTOFromDomain(event domain.Event) EventDTOResponse {
	return EventDTOResponse{
		ID:                     event.ID,
		CreatorUserID:          event.CreatorID,
		Title:                  event.Title,
		Description:            event.Description,
		Location:               locationDTOFromDomain(event.Location),
		Marker:                 markerDTOFromDomain(event.Marker),
		MarkerSize:             event.MarkerSize,
		DateMeeting:            event.DateMeeting,
		AutoDeletePolicy:       event.AutoDeletePolicy,
		AutoDeleteAfterSeconds: event.AutoDeleteAfterSeconds,
	}
}

func eventDTOsFromDomains(events []domain.Event) []EventDTOResponse {
	dtos := make([]EventDTOResponse, len(events))

	for i, event := range events {
		dtos[i] = eventDTOFromDomain(event)
	}

	return dtos
}

func locationDomainFromDTO(location *core_http_types.Location) *domain.EventLocation {
	if location == nil {
		return nil
	}

	domainLocation := location.ToDomain()
	return &domainLocation
}

func locationDTOFromDomain(domainLocation *domain.EventLocation) *core_http_types.Location {
	if domainLocation == nil {
		return nil
	}

	location := core_http_types.Location{
		Latitude:  domainLocation.Latitude,
		Longitude: domainLocation.Longitude,
	}

	return &location
}
