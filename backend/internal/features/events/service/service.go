package events_service

import (
	"context"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

type EventsService struct {
	eventsRepository EventsRepository
}

type EventsRepository interface {
	CreateEvent(
		ctx context.Context,
		event domain.Event,
	) (domain.Event, error)

	GetEvents(
		ctx context.Context,
		latitude *float64,
		longitude *float64,
		radius *int,
		bounds *domain.EventBounds,
		limit *int,
		offset *int,
	) ([]domain.Event, error)

	GetEvent(
		ctx context.Context,
		id int,
	) (domain.Event, error)

	DeleteEvent(
		ctx context.Context,
		id int,
	) error

	PatchEvent(
		ctx context.Context,
		id int,
		event domain.Event,
	) (domain.Event, error)
}

func NewEventsService(eventsRepository EventsRepository) *EventsService {
	return &EventsService{eventsRepository: eventsRepository}
}
