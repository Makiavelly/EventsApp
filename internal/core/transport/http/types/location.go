package core_http_types

import (
	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

type Location struct {
	Latitude  float64 `json:"latitude"  example:"57.34456344"`
	Longitude float64 `json:"longitude" example:"-30.345600"`
}

func (l *Location) ToDomain() domain.EventLocation {
	return domain.EventLocation{
		Latitude:  l.Latitude,
		Longitude: l.Longitude,
	}
}
