package participants_postgres_repository

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (r *ParticipantsRepository) GetParticipants(
	ctx context.Context,
	eventID *int,
	limit *int,
	offset *int,
) ([]domain.EventParticipant, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	SELECT
		pe.event_id,
		u.id,
		u.name,
		pe.status
	FROM eventsapp.participants_events pe
	JOIN eventsapp.users u ON u.id = pe.participant_id
	WHERE ($1::bigint IS NULL OR pe.event_id = $1)
	ORDER BY pe.event_id, u.id
	LIMIT $2
	OFFSET $3;
	`

	rows, err := r.pool.Query(ctx, query, eventID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("select participants: %w", err)
	}
	defer rows.Close()

	participants := make([]domain.EventParticipant, 0)
	for rows.Next() {
		var model EventParticipantModel
		if err := rows.Scan(
			&model.EventID,
			&model.ParticipantID,
			&model.Name,
			&model.Status,
		); err != nil {
			return nil, fmt.Errorf("scan participant: %w", err)
		}

		participants = append(participants, eventParticipantDomainFromModel(model))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate participants: %w", err)
	}

	return participants, nil
}
