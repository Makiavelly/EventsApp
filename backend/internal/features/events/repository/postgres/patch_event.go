package events_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
)

func (r *EventsRepository) PatchEvent(
	ctx context.Context,
	id int,
	event domain.Event,
) (domain.Event, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	UPDATE eventsapp.events
	SET
		title=$1,
		description=$2,
		location=
		CASE
        	WHEN $3::double precision IS NULL OR $4::double precision IS NULL THEN NULL
        	ELSE ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
    	END,
		date_meeting=$5
	WHERE id=$6
	RETURNING 
		id, 
		creator_id, 
		title, 
		description, 
		ST_Y(location::geometry) AS latitude,
    	ST_X(location::geometry) AS longitude,
		date_meeting;
	`

	var (
		longitude *float64
		latitude  *float64
	)
	if event.Location != nil {
		longitude = &event.Location.Longitude
		latitude = &event.Location.Latitude
	}

	row := r.pool.QueryRow(
		ctx,
		query,
		event.Title,
		event.Description,
		longitude,
		latitude,
		event.DateMeeting,
		id,
	)

	var eventModel EventModel

	err := row.Scan(
		&eventModel.ID,
		&eventModel.CreatorID,
		&eventModel.Title,
		&eventModel.Description,
		&eventModel.Latitude,
		&eventModel.Longitude,
		&eventModel.DateMeeting,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.Event{}, fmt.Errorf(
				"event with id='%d': %w",
				id,
				core_errors.ErrNotFound,
			)
		}
		if errors.Is(err, core_postgres_pool.ErrViolatesCheck) {
			return domain.Event{}, fmt.Errorf(
				"event date violates database constraints: %w",
				core_errors.ErrInvalidArgument,
			)
		}

		return domain.Event{}, fmt.Errorf("scan error: %w", err)
	}

	eventDomain := eventDomainFromModel(eventModel)

	return eventDomain, nil
}
