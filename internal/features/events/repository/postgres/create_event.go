package events_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
)

func (r *EventsRepository) CreateEvent(
	ctx context.Context,
	event domain.Event,
) (domain.Event, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	INSERT INTO eventsapp.events (
		creator_id, 
		title, 
		description, 
		location, 
		date_meeting
	)
	VALUES (
		$1, 
		$2, 
		$3,
		CASE
        	WHEN $4::double precision IS NULL OR $5::double precision IS NULL THEN NULL
        	ELSE ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography
    	END,
		$6
	)
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
		event.CreatorID,
		event.Title,
		event.Description,
		longitude,
		latitude,
		event.DateMeeting,
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
		if errors.Is(err, core_postgres_pool.ErrViolatesForeignKey) {
			return domain.Event{}, fmt.Errorf(
				"%v: user with id='%d': %w",
				err,
				event.CreatorID,
				core_errors.ErrNotFound,
			)
		}

		return domain.Event{}, fmt.Errorf("scan error: %w", err)
	}

	eventDomain := eventDomainFromModel(eventModel)

	return eventDomain, nil
}
