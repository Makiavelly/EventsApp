package participants_postgres_repository

import core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"

type ParticipantsRepository struct {
	pool core_postgres_pool.Pool
}

func NewParticipantsRepository(pool core_postgres_pool.Pool) *ParticipantsRepository {
	return &ParticipantsRepository{pool: pool}
}
