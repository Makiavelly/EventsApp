package events_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
)

func (r *EventsRepository) GetEvent(
	ctx context.Context,
	id int,
) (domain.Event, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	SELECT 
		id,
		creator_id,
		title,
		description,
		ST_Y(location::geometry) AS latitude,
		ST_X(location::geometry) AS longitude,
		date_meeting,
		auto_delete_policy,
		auto_delete_after_seconds
	FROM eventsapp.events
	WHERE id=$1
	AND NOT (
		date_meeting IS NOT NULL
		AND (
			(auto_delete_policy = 'at_start' AND date_meeting <= CURRENT_TIMESTAMP)
			OR (
				auto_delete_policy = 'after_interval'
				AND date_meeting + make_interval(secs => auto_delete_after_seconds) <= CURRENT_TIMESTAMP
			)
		)
	);
	`

	row := r.pool.QueryRow(ctx, query, id)

	var eventModel EventModel

	err := row.Scan(
		&eventModel.ID,
		&eventModel.CreatorID,
		&eventModel.Title,
		&eventModel.Description,
		&eventModel.Latitude,
		&eventModel.Longitude,
		&eventModel.DateMeeting,
		&eventModel.AutoDeletePolicy,
		&eventModel.AutoDeleteAfterSeconds,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.Event{}, fmt.Errorf(
				"event with id='%d': %w",
				id,
				core_errors.ErrNotFound,
			)
		}

		return domain.Event{}, fmt.Errorf("scan error: %w", err)
	}

	eventDomain := eventDomainFromModel(eventModel)

	return eventDomain, nil
}
