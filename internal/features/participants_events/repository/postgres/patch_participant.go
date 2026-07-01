package participants_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
)

func (r *ParticipantsRepository) PatchParticipant(
	ctx context.Context,
	eventID int,
	participantID int,
	participant domain.Participant,
) (domain.Participant, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	UPDATE eventsapp.participants_events
	SET status=$1
	WHERE event_id=$2 AND participant_id=$3
	RETURNING
		event_id,
		participant_id,
		status;
	`

	row := r.pool.QueryRow(ctx, query, participant.Status, eventID, participantID)

	var participantModel ParticipantModel
	err := row.Scan(
		&participantModel.EventID,
		&participantModel.ParticipantID,
		&participantModel.Status,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.Participant{}, fmt.Errorf(
				"participant with id='%d' and event with id='%d': %w",
				participantID,
				eventID,
				core_errors.ErrNotFound,
			)
		}

		return domain.Participant{}, fmt.Errorf("scan error: %w", err)
	}

	participantDomain := participantDomainFromModel(participantModel)

	return participantDomain, nil
}
