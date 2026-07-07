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
) ([]domain.EventParticipants, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	SELECT
		pe.event_id,
		u.id,
		u.name,
		u.email,
		u.password
	FROM eventsapp.users u
	JOIN eventsapp.participants_events pe ON pe.participant_id = u.id
	%s
	ORDER BY pe.event_id, u.id
	LIMIT $1
	OFFSET $2;
	`

	args := []any{queryParamArg(limit), queryParamArg(offset)}

	if eventID != nil {
		query = fmt.Sprintf(query, "WHERE pe.event_id = $3")
		args = append(args, *eventID)
	} else {
		query = fmt.Sprintf(query, "")
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select participants: %w", err)
	}
	defer rows.Close()

	participantsByEventID := make(map[int][]domain.User)
	eventIDs := make([]int, 0)

	for rows.Next() {
		var participantModel EventParticipantUserModel

		err := rows.Scan(
			&participantModel.EventID,
			&participantModel.User.ID,
			&participantModel.User.Name,
			&participantModel.User.Email,
			&participantModel.User.Password,
		)
		if err != nil {
			return nil, fmt.Errorf("scan participants: %w", err)
		}

		if _, ok := participantsByEventID[participantModel.EventID]; !ok {
			eventIDs = append(eventIDs, participantModel.EventID)
		}

		participantsByEventID[participantModel.EventID] = append(
			participantsByEventID[participantModel.EventID],
			userDomainFromModel(participantModel.User),
		)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("next participants: %w", err)
	}

	eventParticipants := make([]domain.EventParticipants, 0, len(eventIDs))
	for _, eventID := range eventIDs {
		eventParticipants = append(eventParticipants, domain.EventParticipants{
			EventID: eventID,
			Users:   participantsByEventID[eventID],
		})
	}

	return eventParticipants, nil
}

func queryParamArg(param *int) any {
	if param == nil {
		return nil
	}

	return *param
}
