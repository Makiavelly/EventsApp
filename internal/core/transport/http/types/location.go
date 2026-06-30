package core_http_types

import (
	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

func (l *Location) ToDomain() domain.EventLocation {
	return domain.EventLocation{
		Latitude:  l.Latitude,
		Longitude: l.Longitude,
	}
}
