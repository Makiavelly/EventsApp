package participants_postgres_repository

import (
	"context"
	"fmt"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func (r *ParticipantsRepository) DeleteParticipant(
	ctx context.Context,
	eventID int,
	participantID int,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	DELETE FROM eventsapp.participants_events
	WHERE event_id=$1 AND participant_id=$2;
	`

	cmdTag, err := r.pool.Exec(ctx, query, eventID, participantID)
	if err != nil {
		return fmt.Errorf("exec query: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf(
			"participant with id='%d' and event with id='%d': %w",
			participantID,
			eventID,
			core_errors.ErrNotFound,
		)
	}

	return nil
}
