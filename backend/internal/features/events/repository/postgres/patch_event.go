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
		marker_kind=$5,
		marker_value=$6,
		date_meeting=$7,
		auto_delete_policy=$8,
		auto_delete_after_seconds=$9
	WHERE id=$10
	RETURNING 
		id, 
		creator_id, 
		title, 
		description, 
		ST_Y(location::geometry) AS latitude,
    	ST_X(location::geometry) AS longitude,
		marker_kind,
		marker_value,
		date_meeting,
		auto_delete_policy,
		auto_delete_after_seconds;
	`

	var (
		longitude *float64
		latitude  *float64
	)
	if event.Location != nil {
		longitude = &event.Location.Longitude
		latitude = &event.Location.Latitude
	}
	var markerKind *domain.EventMarkerKind
	var markerValue *string
	if event.Marker != nil {
		markerKind = &event.Marker.Kind
		markerValue = &event.Marker.Value
	}

	row := r.pool.QueryRow(
		ctx,
		query,
		event.Title,
		event.Description,
		longitude,
		latitude,
		markerKind,
		markerValue,
		event.DateMeeting,
		event.AutoDeletePolicy,
		event.AutoDeleteAfterSeconds,
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
		&eventModel.MarkerKind,
		&eventModel.MarkerValue,
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
		if errors.Is(err, core_postgres_pool.ErrViolatesCheck) {
			return domain.Event{}, fmt.Errorf(
				"event violates database constraints: %w",
				core_errors.ErrInvalidArgument,
			)
		}

		return domain.Event{}, fmt.Errorf("scan error: %w", err)
	}

	eventDomain := eventDomainFromModel(eventModel)

	return eventDomain, nil
}
