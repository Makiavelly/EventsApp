package events_transport_http

import "github.com/Makiavelly/EventsApp/internal/core/domain"

type EventMarkerDTO struct {
	Kind  domain.EventMarkerKind `json:"kind" enums:"emoji,color,image" example:"emoji"`
	Value string                 `json:"value" example:"⚽"`
}

func markerDomainFromDTO(marker *EventMarkerDTO) *domain.EventMarker {
	if marker == nil {
		return nil
	}

	return &domain.EventMarker{
		Kind:  marker.Kind,
		Value: marker.Value,
	}
}

func markerDTOFromDomain(marker *domain.EventMarker) *EventMarkerDTO {
	if marker == nil {
		return nil
	}

	return &EventMarkerDTO{
		Kind:  marker.Kind,
		Value: marker.Value,
	}
}
