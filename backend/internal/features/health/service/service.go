package health_service

import (
	"context"
	"fmt"
	"time"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

const readinessTimeout = 3 * time.Second

type Database interface {
	Ping(ctx context.Context) error
}

type HealthService struct {
	database Database
}

func NewHealthService(database Database) *HealthService {
	return &HealthService{database: database}
}

func (s *HealthService) Ready(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, readinessTimeout)
	defer cancel()

	if err := s.database.Ping(ctx); err != nil {
		return fmt.Errorf("ping database: %v: %w", err, core_errors.ErrUnavailable)
	}

	return nil
}
