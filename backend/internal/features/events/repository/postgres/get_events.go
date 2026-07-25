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
	bounds *domain.EventBounds,
	creatorID *int,
	participantID *int,
	withoutLocation bool,
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
		e.marker_kind,
		e.marker_value,
		e.date_meeting,
		e.auto_delete_policy,
		e.auto_delete_after_seconds
	FROM eventsapp.events e
	WHERE (
		$1::double precision IS NULL
    	OR ST_DWithin(
			e.location,
        	ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        	$3::double precision
    	)
	)
	AND (
		$4::double precision IS NULL
		OR ST_Intersects(
			e.location,
			ST_MakeEnvelope($4, $5, $6, $7, 4326)::geography
		)
	)
	AND ($8::bigint IS NULL OR e.creator_id = $8)
	AND (
		$9::bigint IS NULL
		OR EXISTS (
			SELECT 1
			FROM eventsapp.participants_events pe
			WHERE pe.event_id = e.id AND pe.participant_id = $9
		)
	)
	AND (NOT $10::boolean OR e.location IS NULL)
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
	ORDER BY
		CASE
			WHEN $1::double precision IS NULL OR e.location IS NULL THEN NULL
			ELSE ST_Distance(
				e.location,
				ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
			)
		END ASC NULLS LAST,
		e.id ASC
	LIMIT $11
	OFFSET $12;
	`

	var west, south, east, north *float64
	if bounds != nil {
		west = &bounds.West
		south = &bounds.South
		east = &bounds.East
		north = &bounds.North
	}

	rows, err := r.pool.Query(
		ctx,
		query,
		latitude,
		longitude,
		radius,
		west,
		south,
		east,
		north,
		creatorID,
		participantID,
		withoutLocation,
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
			&eventModel.MarkerKind,
			&eventModel.MarkerValue,
			&eventModel.DateMeeting,
			&eventModel.AutoDeletePolicy,
			&eventModel.AutoDeleteAfterSeconds,
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
