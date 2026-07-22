package participants_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
)

func (r *ParticipantsRepository) CreateParticipant(
	ctx context.Context,
	participant domain.Participant,
) (domain.Participant, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	INSERT INTO eventsapp.participants_events (
		event_id,
		participant_id
	)
	SELECT $1::bigint, $2::bigint
	FROM eventsapp.events e
	WHERE e.id = $1::bigint
	AND NOT (
		e.date_meeting IS NOT NULL
		AND (
			(e.auto_delete_policy = 'at_start' AND e.date_meeting <= CURRENT_TIMESTAMP)
			OR (
				e.auto_delete_policy = 'after_interval'
				AND e.date_meeting + make_interval(secs => e.auto_delete_after_seconds) <= CURRENT_TIMESTAMP
			)
		)
	)
	RETURNING
		event_id,
		participant_id;
	`

	row := r.pool.QueryRow(
		ctx,
		query,
		participant.EventID,
		participant.ParticipantID,
	)

	var participantModel ParticipantModel
	err := row.Scan(
		&participantModel.EventID,
		&participantModel.ParticipantID,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.Participant{}, fmt.Errorf(
				"event with id='%d': %w",
				participant.EventID,
				core_errors.ErrNotFound,
			)
		}
		if errors.Is(err, core_postgres_pool.ErrViolatesForeignKey) {
			return domain.Participant{}, fmt.Errorf(
				"%v: participant with id='%d' or event with id='%d': %w",
				err,
				participant.ParticipantID,
				participant.EventID,
				core_errors.ErrNotFound,
			)
		}

		if errors.Is(err, core_postgres_pool.ErrViolatesUnique) {
			return domain.Participant{}, fmt.Errorf(
				"%v: participant with id='%d' already exists in event with id='%d': %w",
				err,
				participant.ParticipantID,
				participant.EventID,
				core_errors.ErrConflict,
			)
		}

		return domain.Participant{}, fmt.Errorf("scan error: %w", err)
	}

	participantDomain := participantDomainFromModel(participantModel)

	return participantDomain, nil
}
