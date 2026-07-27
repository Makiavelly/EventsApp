package events_service

import (
	"context"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

type EventsService struct {
	eventsRepository   EventsRepository
	transactionManager TransactionManager
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
		creatorID *int,
		participantID *int,
		withoutLocation bool,
		limit *int,
		offset *int,
	) ([]domain.Event, error)

	GetEvent(
		ctx context.Context,
		id int,
	) (domain.Event, error)

	GetEventForUpdate(
		ctx context.Context,
		id int,
	) (domain.Event, error)

	DeleteExpiredEvents(ctx context.Context) (int64, error)

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

type TransactionManager interface {
	WithTransaction(
		ctx context.Context,
		operation func(context.Context) error,
	) error
}

func NewEventsService(
	eventsRepository EventsRepository,
	transactionManager TransactionManager,
) *EventsService {
	return &EventsService{
		eventsRepository:   eventsRepository,
		transactionManager: transactionManager,
	}
}
