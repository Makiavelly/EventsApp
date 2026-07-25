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
	WITH inserted_event AS (
	INSERT INTO eventsapp.events (
		creator_id, 
		title, 
		description, 
		location, 
		marker_kind,
		marker_value,
		date_meeting,
		auto_delete_policy,
		auto_delete_after_seconds
	)
	VALUES (
		$1, 
		$2, 
		$3,
		CASE
        	WHEN $4::double precision IS NULL OR $5::double precision IS NULL THEN NULL
        	ELSE ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography
		END,
		$6,
		$7,
		$8,
		$9,
		$10
	)
	RETURNING 
		id, 
		creator_id, 
		title, 
		description, 
		ST_Y(location::geometry) AS latitude,
    	ST_X(location::geometry) AS longitude,
		marker_kind,
		marker_value,
		marker_size,
		date_meeting,
		auto_delete_policy,
		auto_delete_after_seconds
	), inserted_participant AS (
		INSERT INTO eventsapp.participants_events (event_id, participant_id)
		SELECT id, creator_id
		FROM inserted_event
	)
	SELECT * FROM inserted_event;
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
		event.CreatorID,
		event.Title,
		event.Description,
		longitude,
		latitude,
		markerKind,
		markerValue,
		event.DateMeeting,
		event.AutoDeletePolicy,
		event.AutoDeleteAfterSeconds,
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
		&eventModel.MarkerSize,
		&eventModel.DateMeeting,
		&eventModel.AutoDeletePolicy,
		&eventModel.AutoDeleteAfterSeconds,
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
