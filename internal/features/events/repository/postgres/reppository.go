package events_postgres_repository

import core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"

type EventsRepository struct {
	pool core_postgres_pool.Pool
}

func NewEventsRepository(pool core_postgres_pool.Pool) *EventsRepository {
	return &EventsRepository{pool: pool}
}
