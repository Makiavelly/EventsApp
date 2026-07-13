package events_postgres_repository

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (r *EventsRepository) GetEvents(
	ctx context.Context,
	latitude *float64,
	longitude *float64,
	radius *int,
	limit *int,
	offset *int,
) ([]domain.Event, error) {
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
		date_meeting
	FROM eventsapp.events
	WHERE (
		$1::double precision IS NULL
    	OR ST_DWithin(
        	location,
        	ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        	$3::double precision
    	)
	)
	ORDER BY id ASC
	LIMIT $4
	OFFSET $5;
	`

	rows, err := r.pool.Query(
		ctx,
		query,
		latitude,
		longitude,
		radius,
		limit,
		offset,
	)
	if err != nil {
		return nil, fmt.Errorf("select events: %w", err)
	}
	defer rows.Close()

	var eventModels []EventModel

	for rows.Next() {
		var eventModel EventModel

		err := rows.Scan(
			&eventModel.ID,
			&eventModel.CreatorID,
			&eventModel.Title,
			&eventModel.Description,
			&eventModel.Latitude,
			&eventModel.Longitude,
			&eventModel.DateMeeting,
		)
		if err != nil {
			return nil, fmt.Errorf("scan events: %w", err)
		}

		eventModels = append(eventModels, eventModel)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("next rows: %w", err)
	}

	eventsDomains := eventsDomainsFromModels(eventModels)

	return eventsDomains, nil
}
