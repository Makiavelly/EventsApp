package events_postgres_repository

import (
	"context"
	"fmt"
)

func (r *EventsRepository) DeleteExpiredEvents(ctx context.Context) (int64, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	DELETE FROM eventsapp.events
	WHERE date_meeting IS NOT NULL
	AND (
		(auto_delete_policy = 'at_start' AND date_meeting <= CURRENT_TIMESTAMP)
		OR (
			auto_delete_policy = 'after_interval'
			AND date_meeting + make_interval(secs => auto_delete_after_seconds) <= CURRENT_TIMESTAMP
		)
	);
	`

	command, err := r.pool.Exec(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("delete expired events: %w", err)
	}

	return command.RowsAffected(), nil
}
