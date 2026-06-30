package events_postgres_repository

import (
	"context"
	"fmt"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func (r *EventsRepository) DeleteEvent(
	ctx context.Context,
	id int,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	DELETE FROM eventsapp.events
	WHERE id=$1;
	`

	cmdTag, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("exec query: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("task with id='%d': %w", id, core_errors.ErrNotFound)
	}

	return nil
}
