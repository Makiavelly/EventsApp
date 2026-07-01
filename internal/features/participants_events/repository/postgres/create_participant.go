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
		participant_id,
		status
	)
	VALUES (
		$1,
		$2,
		$3
	)
	RETURNING
		event_id,
		participant_id,
		status;
	`

	row := r.pool.QueryRow(
		ctx,
		query,
		participant.EventID,
		participant.ParticipantID,
		participant.Status,
	)

	var participantModel ParticipantModel
	err := row.Scan(
		&participantModel.EventID,
		&participantModel.ParticipantID,
		&participantModel.Status,
	)
	if err != nil {
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
